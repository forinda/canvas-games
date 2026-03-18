# Canvas Game Arcade — Implementation Plan

## Project Overview
A multi-game arcade platform built with TypeScript and HTML5 Canvas (Vite).
Each game is fully isolated, follows SOLID principles, and plugs into the platform via a shared adapter interface.

---

## Platform Architecture

```
src/
├── main.ts                        # Platform entry point
├── style.css                      # Global styles
├── platform/
│   ├── GameRegistry.ts            # Central game registration
│   ├── GameLauncher.ts            # Create/destroy game instances
│   └── PlatformMenu.ts            # Game selection screen UI
├── shared/
│   ├── GameInterface.ts           # GameDefinition + GameInstance (platform contract)
│   ├── Updatable.ts               # interface Updatable { update(dt): void }
│   ├── Renderable.ts              # interface Renderable { render(ctx): void }
│   └── InputHandler.ts            # interface InputHandler { attach(): void; detach(): void }
└── games/
    ├── tower-defense/             # (already SOLID — 16+ files)
    ├── snake/                     # Snake game
    ├── platformer/                # Platformer game
    ├── physics-puzzle/            # Physics puzzle game
    └── city-builder/              # City builder game
```

### SOLID Principles Applied

| Principle | How Applied |
|-----------|-------------|
| **S** — Single Responsibility | Each system/renderer does exactly one thing |
| **O** — Open/Closed | New mechanics = new system files, never modify existing ones |
| **L** — Liskov Substitution | Every game implements `GameInstance` — platform is game-agnostic |
| **I** — Interface Segregation | `Updatable`, `Renderable`, `InputHandler` — systems only implement what they need |
| **D** — Dependency Inversion | Systems depend on state interfaces, not concrete engine; adapters bridge to platform |

### Adapter Pattern
Each game has a `PlatformAdapter.ts` that:
- Implements `GameInstance` (the platform contract)
- Owns the game engine, wires systems, manages lifecycle
- Translates `onExit()` callback into the game's internal menu flow
- The game engine never imports from `platform/` or `shared/`

---

## Data Models

### Tower Types
| Tower   | Cost | Damage | Range | Fire Rate | Special          |
|---------|------|--------|-------|-----------|------------------|
| Archer  | 50   | 10     | 150   | Fast      | Basic            |
| Cannon  | 100  | 30     | 120   | Slow      | Splash (radius)  |
| Frost   | 75   | 5      | 130   | Medium    | Slows enemies    |
| Sniper  | 150  | 50     | 250   | Very Slow | Long range       |

### Enemy Types
| Enemy  | HP  | Speed       | Reward | Special                    |
|--------|-----|-------------|--------|----------------------------|
| Goblin | 30  | Fast (2.0)  | 10     | Basic                      |
| Orc    | 80  | Medium(1.0) | 25     | Tanky                      |
| Ghost  | 50  | VFast (2.5) | 20     | Phases (ignores slow)      |
| Boss   | 500 | Slow (0.5)  | 100    | End-of-wave boss           |

### Game State
```typescript
{
  screen: 'menu' | 'modeSelect' | 'playing' | 'paused' | 'gameover' | 'win',
  mode: 'classic' | 'endless' | 'challenge',
  lives: number,
  gold: number,
  score: number,
  currentWave: number,
  totalWaves: number,
  grid: Cell[][],           // 16x10 grid
  towers: PlacedTower[],
  enemies: ActiveEnemy[],
  projectiles: Projectile[],
  selectedTowerType: string | null,
  selectedPlacedTower: PlacedTower | null,
}
```

---

## Grid System
- **Size:** 16 columns × 10 rows
- **Cell size:** dynamic (canvas width / 16)
- **Cell types:** `empty` | `path` | `tower` | `start` | `end`
- Path defined as array of `{col, row}` waypoints
- Towers can only be placed on `empty` cells

### Path Layout (16×10)
```
. . . . . . . . . . . . . . . .
S > > > > > D . . . D < < < < .
. . . . . . D . . . D . . . . .
. . . . . . D . . . D . . . . .
. . . . . . D > > > U . . . . .
. . . . . . . . . . . . . . . E
```
(S=Start, E=End, D=Down, U=Up, >=Right, <=Left)

---

## Core Systems

### 1. GridSystem
- Initialize 16×10 grid with `empty` cells
- Mark path cells from waypoint list
- `getCellAt(x, y)` → convert pixel to grid coords
- `canPlaceTower(col, row)` → returns boolean
- `placeTower(col, row, type)` → mark cell as `tower`

### 2. PathSystem
- Waypoints array: list of `{col, row}` grid positions
- Enemies store `waypointIndex` and `progress` (0-1 between waypoints)
- `getPositionOnPath(enemy)` → pixel {x, y}
- `advanceEnemy(enemy, dt)` → move along path

### 3. EnemySystem
- Spawn from path start, follow waypoints
- Each enemy: `{id, type, hp, maxHp, speed, slowFactor, waypointIndex, progress, reward}`
- On reaching end: deduct life, remove enemy
- On HP ≤ 0: award gold, add score, remove enemy

### 4. TowerSystem
- `PlacedTower`: `{id, type, col, row, level, lastFiredAt, target}`
- Max level: 3 (upgrade costs multiply by 1.5x)
- Sell: refund 60% of total invested gold
- `findTarget(tower, enemies)` → first enemy in range
- Target priority: furthest along path (highest waypointIndex + progress)

### 5. CombatSystem
- Timer-based: each tower fires when `now - lastFiredAt >= fireInterval`
- On fire: create `Projectile {from, to, speed, damage, type}`
- Projectile reaches target: apply damage (+ splash for Cannon, + slow for Frost)
- Splash: damage all enemies within splash radius

### 6. WaveSystem
- Wave config: `{waveNumber, groups: [{enemyType, count, interval}]}`
- Classic: 10 waves with boss on wave 5 & 10
- Endless: waves scale infinitely (HP and count multiply by 1.1 per wave)
- Challenge: waves same as Classic but gold is halved
- Between waves: 5-second countdown before next wave

### 7. EconomySystem
- Starting gold: Classic=200, Endless=150, Challenge=100
- Gold earned: enemy.reward (+ 20% bonus in Classic on wave complete)
- Score: enemy killed = enemy.maxHp (boss = 500 bonus)

### 8. InputSystem
- Canvas click → determine action:
  - If menu/gameover screen: button hit test
  - If `selectedTowerType` set + empty cell clicked: place tower
  - If placed tower clicked: open upgrade panel
  - Elsewhere: deselect
- Right-click or Escape: deselect

---

## Screens / UI

### Menu Screen
- Title: "TOWER DEFENSE"
- Buttons: [Play Classic] [Endless Mode] [Challenge Mode]
- Animated background (scrolling gradient or idle enemies walking)

### HUD (during gameplay)
- Top bar: Lives ❤️ | Gold 💰 | Score ⭐ | Wave 🌊
- Bottom panel: Tower selection cards (Archer | Cannon | Frost | Sniper)
- Each card shows: icon, name, cost
- Greyed out if insufficient gold

### Upgrade Panel (slide-in on tower click)
- Tower name + current level
- Stats: Damage / Range / Fire Rate
- [Upgrade - cost] button (disabled at max level)
- [Sell - refund] button
- [Close] button

### Game Over Screen
- "GAME OVER" or "YOU WIN!" (Classic)
- Final score, wave reached
- [Play Again] [Main Menu]

---

## Game Modes

| Mode      | Waves | Lives | Start Gold | Special                         |
|-----------|-------|-------|------------|----------------------------------|
| Classic   | 10    | 20    | 200        | Win screen after wave 10         |
| Endless   | ∞     | 15    | 150        | No win, high score tracking      |
| Challenge | 10    | 10    | 100        | Speed bonus gold, no pause       |

---

## Rendering Pipeline (per frame)
1. Clear canvas
2. Render grid (path tiles highlighted)
3. Render towers (with range ring if selected)
4. Render enemies (with HP bar)
5. Render projectiles
6. Render HUD overlay
7. Render active panel (tower select / upgrade)
8. Render menu/pause overlay if applicable

---

## Implementation Checklist

### Phase 1 – Foundation
- [x] Project structure exists (Vite + TypeScript)
- [x] Refactor canvas-setup.ts (resize support)
- [x] Create types/index.ts
- [x] Create GameState.ts
- [x] Create data/towers.ts, enemies.ts, waves.ts

### Phase 2 – Core Systems
- [x] GridSystem.ts
- [x] PathSystem.ts
- [x] EnemySystem.ts
- [x] TowerSystem.ts
- [x] CombatSystem.ts
- [x] WaveSystem.ts
- [x] EconomySystem.ts
- [x] InputSystem.ts

### Phase 3 – Renderers
- [x] GridRenderer.ts
- [x] EnemyRenderer.ts
- [x] TowerRenderer.ts
- [x] ProjectileRenderer.ts
- [x] HUDRenderer.ts
- [x] UIRenderer.ts (tower panel, upgrade panel)
- [x] MenuRenderer.ts
- [x] ParticleRenderer.ts

### Phase 4 – Game Loop
- [x] Refactor game-engine.ts (full game loop)
- [x] Wire all systems into game loop
- [x] Screen transitions

### Phase 5 – Polish
- [x] Responsive canvas resize
- [x] Particle effects on enemy death
- [x] Win/loss animations
- [ ] Sound effects (optional future enhancement)

### Phase 6 – Balance & Polish Pass
- [x] Sniper tower rebalanced (cost 150→120, damage 50→55, fire rate 2500→2200ms)
- [x] Frost tower buffed (cost 75→70, damage 5→12, range 130→140, fire rate 1000→900ms)
- [x] Challenge mode gold 100→150
- [x] Wave completion bonus doubled (15→25 gold per wave level, all modes)
- [x] Endless boss HP scaling toned down (1.5x→1.2x multiplier)
- [x] Pause bug fixed (spawn queue timestamps shifted on resume)
- [x] Performance: particle cap (200), projectile cap (150), single-pass enemy cleanup
- [x] Tower barrel rotates toward current target
- [x] High score persisted to localStorage
- [x] Boss wave announcement (💀 BOSS INCOMING! with red pulse overlay)
- [x] Floating damage numbers (red for normal, blue for frost)
- [x] Placement failure red flash feedback
- [x] Particle IDs use incrementing counter (no Date.now collision)
- [x] Sell confirmation (click once → "Confirm?", click again → sell)
- [x] Removed duplicate countdown display from HUD (kept UI panel bar)

---

### Phase 7 – Multi-Game Platform
- [x] Shared `GameInterface` (GameDefinition + GameInstance)
- [x] Platform menu (GameLauncher + PlatformMenu with animated card selector)
- [x] GameRegistry (central game registration)
- [x] Tower Defense moved to `games/tower-defense/` (self-contained, exit button)
- [x] Snake game — classic snake with WASD/arrows, speed scaling, high score
- [x] Platformer — side-scrolling, coins, enemies, stomping, levels, camera
- [x] Physics Puzzle — place pieces, simulate gravity, guide ball to goal
- [x] City Builder — grid placement, economy (population/money/food/power/happiness)
- [x] Each game: full event cleanup on destroy(), exit-to-platform support
- [x] Shared abstractions: `Updatable`, `Renderable`, `InputHandler`
- [x] Refactor Snake → multi-file SOLID with PlatformAdapter
- [x] Refactor Platformer → multi-file SOLID with PlatformAdapter
- [x] Refactor Physics Puzzle → multi-file SOLID with PlatformAdapter
- [x] Refactor City Builder → multi-file SOLID with PlatformAdapter

---

## Per-Game SOLID Folder Structures

### Tower Defense (already SOLID)
```
games/tower-defense/
├── index.ts                   # GameDefinition export
├── game-engine.ts             # Game loop (orchestrator only)
├── GameState.ts               # State factory + types
├── types/index.ts             # All TD-specific interfaces
├── data/
│   ├── towers.ts              # Tower definitions & stats
│   ├── enemies.ts             # Enemy definitions & stats
│   └── waves.ts               # Wave configurations
├── systems/
│   ├── GridSystem.ts          # Grid layout, cell queries, tower placement
│   ├── PathSystem.ts          # Waypoint path, enemy routing
│   ├── TowerSystem.ts         # Targeting, projectile spawning
│   ├── EnemySystem.ts         # Spawning, movement, death, damage
│   ├── CombatSystem.ts        # Projectile movement, hit detection
│   ├── WaveSystem.ts          # Wave progression, spawn queue
│   ├── EconomySystem.ts       # Gold, score, high score persistence
│   └── InputSystem.ts         # Click/key handling, UI hit testing
└── renderers/
    ├── GridRenderer.ts        # Grid, path, hover, range preview
    ├── TowerRenderer.ts       # Towers, barrels, selection
    ├── EnemyRenderer.ts       # Enemies, HP bars, slow indicator
    ├── ProjectileRenderer.ts  # Projectile trails
    ├── ParticleRenderer.ts    # Death particles
    ├── HUDRenderer.ts         # Top bar stats
    ├── UIRenderer.ts          # Bottom panel, upgrade panel
    └── MenuRenderer.ts        # Menu, pause, game over, win
```

### Snake
```
games/snake/
├── index.ts                   # GameDefinition export
├── adapters/
│   └── PlatformAdapter.ts     # Implements GameInstance, wires engine
├── SnakeEngine.ts             # Game loop orchestrator
├── types.ts                   # SnakeState, Direction, Coord
├── systems/
│   ├── MovementSystem.ts      # Advance snake head, grow/shrink tail
│   ├── CollisionSystem.ts     # Wall, self, food collision detection
│   ├── FoodSystem.ts          # Spawn food, avoid snake body
│   ├── ScoreSystem.ts         # Score tracking, speed scaling, localStorage
│   └── InputSystem.ts         # Keyboard direction handling
└── renderers/
    ├── BoardRenderer.ts       # Grid lines, snake body, food
    └── HUDRenderer.ts         # Score bar, overlays (start/pause/game over)
```

### Platformer
```
games/platformer/
├── index.ts                   # GameDefinition export
├── adapters/
│   └── PlatformAdapter.ts     # Implements GameInstance, wires engine
├── PlatformerEngine.ts        # Game loop orchestrator
├── types.ts                   # PlatState, Platform, Coin, Enemy
├── data/
│   └── levels.ts              # Level generator (platforms, coins, enemies per level)
├── systems/
│   ├── PhysicsSystem.ts       # Gravity, velocity, position integration
│   ├── CollisionSystem.ts     # Platform landing, wall push, enemy stomp
│   ├── EnemySystem.ts         # Enemy patrol movement
│   ├── CoinSystem.ts          # Coin pickup detection
│   ├── CameraSystem.ts        # Smooth camera follow
│   ├── GoalSystem.ts          # Level completion check
│   └── InputSystem.ts         # WASD/arrows + jump
└── renderers/
    ├── WorldRenderer.ts       # Sky, stars, platforms, goal flag
    ├── EntityRenderer.ts      # Player, enemies, coins
    └── HUDRenderer.ts         # Score, lives, overlays
```

### Physics Puzzle
```
games/physics-puzzle/
├── index.ts                   # GameDefinition export
├── adapters/
│   └── PlatformAdapter.ts     # Implements GameInstance, wires engine
├── PuzzleEngine.ts            # Game loop orchestrator
├── types.ts                   # Body, PuzzleState, inventory types
├── data/
│   └── levels.ts              # Level definitions (bodies, inventory, goals)
├── systems/
│   ├── PhysicsSystem.ts       # Gravity, velocity, damping
│   ├── CollisionSystem.ts     # AABB overlap, bounce resolution
│   ├── GoalSystem.ts          # Ball-reaches-goal detection
│   ├── InventorySystem.ts     # Place pieces from inventory
│   └── InputSystem.ts         # Click-to-place, drag, keyboard shortcuts
└── renderers/
    ├── WorldRenderer.ts       # Bodies, goal glow, ball
    ├── InventoryRenderer.ts   # Bottom panel with remaining pieces
    └── HUDRenderer.ts         # Level, score, messages, overlays
```

### City Builder
```
games/city-builder/
├── index.ts                   # GameDefinition export
├── adapters/
│   └── PlatformAdapter.ts     # Implements GameInstance, wires engine
├── CityEngine.ts              # Game loop orchestrator
├── types.ts                   # Building, CityState, BuildingType
├── data/
│   └── buildings.ts           # Building definitions (cost, stats, icons)
├── systems/
│   ├── GridSystem.ts          # Grid queries, cell placement validation
│   ├── EconomySystem.ts       # Income, upkeep, resource tick
│   ├── StatsSystem.ts         # Recalculate population/happiness/power/food
│   └── InputSystem.ts         # Click grid, select building, hotkeys
└── renderers/
    ├── GridRenderer.ts        # Grid cells, buildings, hover highlight
    ├── PanelRenderer.ts       # Building selection panel
    └── HUDRenderer.ts         # Top bar stats, messages, overlays
```

### Game Interface Contract
```typescript
// shared/GameInterface.ts
interface GameInstance {
  start(): void;
  destroy(): void;  // Must remove ALL event listeners
}

interface GameDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  create(canvas: HTMLCanvasElement, onExit: () => void): GameInstance;
}

// shared/Updatable.ts
interface Updatable {
  update(state: unknown, dt: number): void;
}

// shared/Renderable.ts
interface Renderable {
  render(ctx: CanvasRenderingContext2D, state: unknown): void;
}

// shared/InputHandler.ts
interface InputHandler {
  attach(): void;
  detach(): void;
}
```

---

## Progress Log

| Date       | Status   | Notes |
|------------|----------|-------|
| 2026-03-18 | Start    | Base canvas project scaffolded |
| 2026-03-18 | Done     | Full TD implementation complete — 0 TS errors, build 33KB |
| 2026-03-18 | Polish   | Balance & polish pass — 0 TS errors, build 35KB |
| 2026-03-18 | Platform | Multi-game platform with 5 games — 0 TS errors, build 68KB |
| 2026-03-18 | SOLID    | All 4 games refactored to multi-file SOLID — 81 modules, 73KB |
