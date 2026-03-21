# Step 2: Enemy Spawning & Pathing

**Goal:** Spawn enemies at the start cell and have them follow the waypoint path to the exit, interpolating smoothly between waypoints.

**Time:** ~15 minutes

---

## What You'll Build

- **Enemy definitions** for four types: Goblin, Orc, Ghost, and Boss with distinct stats and visuals
- **Spawn system** that creates enemy instances and places them at the start of the path
- **Waypoint following** that moves enemies smoothly along the path at their own speed
- **Enemy renderer** that draws colored circles with emoji icons and HP bars

---

## Concepts

- **Entity Definitions vs. Instances**: `EnemyDef` is a blueprint (stats, color, icon). `ActiveEnemy` is a live instance with runtime state (current HP, position, waypoint progress). This flyweight pattern avoids duplicating static data across hundreds of enemies.
- **Waypoint Interpolation**: Each enemy tracks a `waypointIndex` (which segment it's on) and `progress` (0-1 within that segment). Each frame, `progress` advances by `speed * dt / segmentLength`. When progress reaches 1, the enemy advances to the next waypoint.
- **Delta-Time Movement**: Multiplying speed by `dt` (seconds since last frame) ensures enemies move at the same real-world speed regardless of frame rate. A goblin at 2.0 cells/sec moves 2 cells every second whether the game runs at 30fps or 144fps.
- **Pixel Position Calculation**: `getEnemyPixelPos` linearly interpolates between the `from` and `to` waypoint pixel positions using the enemy's progress, producing smooth sub-cell movement.

---

## Code

### 1. Create Enemy Definitions

**File:** `src/games/tower-defense/data/enemies.ts`

```typescript
import type { EnemyDef, EnemyType } from '../types';

export const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  goblin: {
    type: 'goblin',
    name: 'Goblin',
    baseHp: 30,
    baseSpeed: 2.0,    // cells per second
    reward: 10,
    color: '#6abf45',
    icon: '\u{1F47A}', // goblin emoji
    immuneToSlow: false,
    size: 0.28,         // radius as fraction of cellSize
  },
  orc: {
    type: 'orc',
    name: 'Orc',
    baseHp: 80,
    baseSpeed: 1.0,
    reward: 25,
    color: '#4e8c40',
    icon: '\u{1F479}',
    immuneToSlow: false,
    size: 0.36,
  },
  ghost: {
    type: 'ghost',
    name: 'Ghost',
    baseHp: 50,
    baseSpeed: 2.5,
    reward: 20,
    color: 'rgba(200,200,255,0.85)',
    icon: '\u{1F47B}',
    immuneToSlow: true,  // ghosts cannot be slowed
    size: 0.30,
  },
  boss: {
    type: 'boss',
    name: 'BOSS',
    baseHp: 500,
    baseSpeed: 0.5,
    reward: 100,
    color: '#c0392b',
    icon: '\u{1F480}',
    immuneToSlow: false,
    size: 0.44,
  },
};
```

**What's happening:**
- Each enemy type has balanced stats. Goblins are fast and weak, Orcs are slow and tanky, Ghosts are fast and immune to slowing, and Bosses are massive HP sponges that move slowly.
- `size` controls the drawn radius relative to cell size. Bosses at `0.44` nearly fill a cell, making them visually imposing.
- `reward` is the gold earned when the enemy is killed. Bosses give 100 gold, providing a strong economic incentive to kill them.
- `immuneToSlow` is a boolean that the Frost tower will check later in Step 4. Ghosts ignore slow effects, making them a strategic challenge.

---

### 2. Create the Enemy System

**File:** `src/games/tower-defense/systems/EnemySystem.ts`

Handles spawning, movement, and cleanup of enemies.

```typescript
import type { ActiveEnemy, EnemyType, GameStateData } from '../types';
import { ENEMY_DEFS } from '../data/enemies';
import { advanceEnemy, getEnemyPixelPos } from './PathSystem';
import type { GridSystem } from './GridSystem';

let _enemyCounter = 0;

export class EnemySystem {
  /** Create a new enemy at the start of the path */
  static spawnEnemy(
    state: GameStateData,
    type: EnemyType,
    hpMultiplier = 1,
    speedMultiplier = 1,
  ): void {
    const def = ENEMY_DEFS[type];
    const id = `enemy_${++_enemyCounter}`;
    const enemy: ActiveEnemy = {
      id,
      type,
      hp: Math.round(def.baseHp * hpMultiplier),
      maxHp: Math.round(def.baseHp * hpMultiplier),
      speed: def.baseSpeed * speedMultiplier,
      baseSpeed: def.baseSpeed * speedMultiplier,
      slowUntil: 0,
      reward: def.reward,
      waypointIndex: 1,  // heading toward waypoint[1] from waypoint[0]
      progress: 0,
      x: 0,
      y: 0,
      dead: false,
      reachedEnd: false,
      hpBarTimer: 0,
    };

    state.enemies.push(enemy);
  }

  /** Move all enemies along the path and remove dead/exited ones */
  static update(state: GameStateData, dt: number, grid: GridSystem): void {
    for (const enemy of state.enemies) {
      if (enemy.dead || enemy.reachedEnd) continue;

      // Calculate effective speed (slow effects applied in later steps)
      const effectiveSpeed = enemy.baseSpeed;
      enemy.speed = effectiveSpeed;

      // Move along path
      const distanceCells = effectiveSpeed * dt;
      const reachedEnd = advanceEnemy(enemy, distanceCells);

      // Update pixel position for rendering
      const pos = getEnemyPixelPos(enemy, grid.cellSize, grid.gridOffsetY);
      enemy.x = pos.x;
      enemy.y = pos.y;

      if (reachedEnd) {
        enemy.reachedEnd = true;
        state.lives = Math.max(0, state.lives - 1);
        if (state.lives <= 0) {
          state.screen = 'gameover';
        }
      }
    }

    // Remove dead and exited enemies
    state.enemies = state.enemies.filter(e => !e.dead && !e.reachedEnd);
  }
}
```

**What's happening:**
- `spawnEnemy` creates an `ActiveEnemy` instance from the definition blueprint. The `waypointIndex` starts at 1, meaning the enemy begins at waypoint[0] and heads toward waypoint[1].
- `hpMultiplier` and `speedMultiplier` allow waves to scale enemy difficulty without creating new enemy types.
- `update` runs every frame. For each living enemy, it calculates distance traveled this frame (`speed * dt`), calls `advanceEnemy` to update the waypoint/progress state, then converts to pixel coordinates.
- When an enemy reaches the end, it deducts a life. If lives hit zero, the game switches to the `gameover` screen.
- The filter at the end removes dead and exited enemies from the array, keeping the list clean for rendering.

---

### 3. Create the Enemy Renderer

**File:** `src/games/tower-defense/renderers/EnemyRenderer.ts`

```typescript
import type { ActiveEnemy, GameStateData } from '../types';
import { ENEMY_DEFS } from '../data/enemies';

export class EnemyRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    state: GameStateData,
    cellSize: number,
  ): void {
    const now = performance.now();

    for (const enemy of state.enemies) {
      if (enemy.dead || enemy.reachedEnd) continue;
      this.drawEnemy(ctx, enemy, cellSize, now);
    }
  }

  private drawEnemy(
    ctx: CanvasRenderingContext2D,
    enemy: ActiveEnemy,
    cellSize: number,
    now: number,
  ) {
    const def = ENEMY_DEFS[enemy.type];
    const r = cellSize * def.size;
    const { x, y } = enemy;

    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 5;

    // Body circle
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = def.color;
    ctx.fill();

    // Boss pulsing glow
    if (enemy.type === 'boss') {
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.005);
      ctx.beginPath();
      ctx.arc(x, y, r + 4 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,0,0,${0.3 + 0.4 * pulse})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.shadowBlur = 0;

    // Ghost transparency overlay
    if (enemy.type === 'ghost') {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fill();
    }

    // Emoji icon
    ctx.font = `${Math.max(10, r * 1.2)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.icon, x, y);

    // HP bar (always visible for bosses, visible for 2s after hit for others)
    const showHpBar = enemy.type === 'boss' || now < enemy.hpBarTimer;
    if (showHpBar) {
      const barW = r * 2.2;
      const barH = Math.max(3, r * 0.25);
      const barX = x - barW / 2;
      const barY = y - r - barH - 3;
      const hpPct = enemy.hp / enemy.maxHp;

      // Background
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

      // HP fill
      const hpColor = hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f39c12' : '#e74c3c';
      ctx.fillStyle = hpColor;
      ctx.fillRect(barX, barY, barW * hpPct, barH);
    }
  }
}
```

**What's happening:**
- Each enemy is drawn as a colored circle with its emoji icon centered on top. The radius scales with `cellSize * def.size`, so enemies shrink and grow with the viewport.
- Bosses get a special pulsing red glow ring using `Math.sin(now * 0.005)`, which oscillates smoothly over time. Ghosts get a white transparency overlay to look ethereal.
- The HP bar only appears after an enemy is hit (`hpBarTimer` is set when damage is applied in Step 5). Bosses always show their HP bar since they are key threats.
- The HP bar color transitions from green to yellow to red as health drops, giving the player instant visual feedback.

---

### 4. Update the Game Engine

**File:** `src/games/tower-defense/game-engine.ts`

Add the enemy system, renderer, and a temporary test spawn.

```typescript
import type { GameStateData } from './types';
import { createInitialState } from './GameState';
import { GridSystem } from './systems/GridSystem';
import { EnemySystem } from './systems/EnemySystem';
import { GridRenderer } from './renderers/GridRenderer';
import { EnemyRenderer } from './renderers/EnemyRenderer';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameStateData;
  private grid: GridSystem;
  private gridRenderer: GridRenderer;
  private enemyRenderer: EnemyRenderer;
  private lastTime = 0;
  private rafId = 0;
  private running = false;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    this.state = createInitialState('classic');
    this.grid = new GridSystem();
    this.gridRenderer = new GridRenderer();
    this.enemyRenderer = new EnemyRenderer();

    this.resizeHandler = () => this.handleResize();
    this.handleResize();
    window.addEventListener('resize', this.resizeHandler);

    // Test: spawn a few enemies so we can see them walk
    EnemySystem.spawnEnemy(this.state, 'goblin');
    setTimeout(() => EnemySystem.spawnEnemy(this.state, 'orc'), 1000);
    setTimeout(() => EnemySystem.spawnEnemy(this.state, 'ghost'), 2000);
    setTimeout(() => EnemySystem.spawnEnemy(this.state, 'boss'), 3000);
  }

  private handleResize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.grid.updateLayout(this.canvas.width, this.canvas.height, 52, 110);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(timestamp: number): void {
    if (!this.running) return;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number): void {
    EnemySystem.update(this.state, dt, this.grid);
  }

  private render(): void {
    const { ctx, canvas, state } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0a140a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.gridRenderer.render(ctx, state, this.grid);
    this.enemyRenderer.render(ctx, state, this.grid.cellSize);
  }
}
```

**What's happening:**
- The game loop now has separate `update` and `render` phases. The update phase runs `EnemySystem.update` with the delta time, which moves all enemies along the path.
- `dt` is clamped to a maximum of 0.05 seconds (50ms) to prevent huge jumps when the browser tab regains focus after being backgrounded.
- The constructor spawns four test enemies staggered by 1 second each using `setTimeout`. This lets you immediately see all four enemy types marching along the path at different speeds.
- The render phase draws the grid first, then enemies on top, ensuring enemies appear over the path.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Tower Defense game in your browser
3. **Observe:**
   - A **green Goblin** spawns immediately and walks quickly along the path
   - After 1 second, a slower **green Orc** spawns (bigger circle)
   - After 2 seconds, a fast **translucent Ghost** appears
   - After 3 seconds, a large **red Boss** spawns with a pulsing glow ring
   - All enemies follow the exact same winding path from START to END
   - When enemies reach the END cell, they disappear and lives decrease
   - Each enemy type has its emoji icon centered on its circle

---

## Challenges

**Easy:**
- Change the Goblin's `baseSpeed` to 3.5 and watch it zoom ahead of all others.
- Add a fifth enemy type called `'skeleton'` with 40 HP, speed 1.5, and the skull emoji.

**Medium:**
- Draw a direction arrow on each enemy showing which way it is heading by computing the angle between its current and next waypoint.

**Hard:**
- Implement a "trail" effect: store the last 8 positions of each enemy and draw fading circles behind them to create a motion trail, especially cool for Ghosts.

---

## What You Learned

- Separating entity definitions (blueprints) from active instances (runtime state)
- Interpolating movement along a waypoint path using progress and segment length
- Using delta-time for frame-rate-independent movement
- Drawing entities with type-specific visual effects (boss glow, ghost transparency)

**Next:** Tower Placement -- click on empty cells to place defensive towers!
