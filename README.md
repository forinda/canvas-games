# Canvas Game Arcade

A multi-game arcade platform with **52 playable games** built with TypeScript and HTML5 Canvas (Vite).

## Tutorial Series

Follow the **[step-by-step tutorial series](./tutorials/README.md)** to build all 50 games from scratch — ordered from beginner to advanced. Perfect for YouTube content creators and learners.

Browse the **[concept reference](./tutorials/concepts/README.md)** for standalone explainers on every math, algorithm, physics, and design pattern concept used.

## Quick Start

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # production build
```

## Games (52)

### Arcade (16)

| Game | Description | Tutorial | Key Concepts |
|------|-------------|----------|--------------|
| [Snake](src/games/snake/) | Eat food, grow longer, avoid yourself | [Tutorial (5 steps)](tutorials/10-snake/README.md) | [State Machines](tutorials/concepts/algorithms/a12-state-machines.md), [Delta Time](tutorials/concepts/algorithms/a13-delta-time.md) |
| [Breakout](src/games/breakout/) | Paddle + ball, break bricks, powerups | [Tutorial (6 steps)](tutorials/12-breakout/README.md) | [AABB Collision](tutorials/concepts/algorithms/a06-aabb-collision.md), [Angle Reflection](tutorials/concepts/math/m06-reflection.md) |
| [Asteroids](src/games/asteroids/) | Rotate, thrust, shoot splitting rocks | [Tutorial (6 steps)](tutorials/22-asteroids/README.md) | [Trigonometry](tutorials/concepts/math/m01-trigonometry.md), [Momentum](tutorials/concepts/physics/p04-momentum.md) |
| [Space Invaders](src/games/space-invaders/) | Shoot descending aliens, shield cover | [Tutorial (6 steps)](tutorials/21-space-invaders/README.md) | [Wave System](tutorials/concepts/game-systems/g01-wave-system.md) |
| [Flappy Bird](src/games/flappy-bird/) | Tap to fly through pipe gaps | [Tutorial (5 steps)](tutorials/13-flappy-bird/README.md) | [Gravity](tutorials/concepts/physics/p01-gravity.md), [Terminal Velocity](tutorials/concepts/physics/p06-terminal-velocity.md) |
| [Tetris](src/games/tetris/) | Stack blocks, clear lines | [Tutorial (7 steps)](tutorials/24-tetris/README.md) | [Matrix Rotation](tutorials/concepts/math/m10-matrix-rotation.md), [DAS](tutorials/concepts/game-systems/g10-das.md) |
| [Whack-a-Mole](src/games/whack-a-mole/) | Timed reflex clicking | [Tutorial (4 steps)](tutorials/08-whack-a-mole/README.md) | [Combo System](tutorials/concepts/game-systems/g03-combo.md) |
| [Helicopter](src/games/helicopter/) | One-button cave scroller | [Tutorial (4 steps)](tutorials/14-helicopter/README.md) | [Velocity](tutorials/concepts/physics/p02-velocity.md) |
| [Pong](src/games/pong/) | Paddle tennis vs AI or 2-player | [Tutorial (5 steps)](tutorials/11-pong/README.md) | [Bounce](tutorials/concepts/physics/p05-bounce.md), [Vectors](tutorials/concepts/math/m02-vectors.md) |
| [Pac-Man](src/games/pacman/) | Eat dots, avoid/eat ghosts | [Tutorial (7 steps)](tutorials/23-pacman/README.md) | [Pathfinding](tutorials/concepts/algorithms/a10-pathfinding.md), [Strategy Pattern](tutorials/concepts/design-patterns/d06-strategy.md) |
| [Doodle Jump](src/games/doodle-jump/) | Endless vertical platform jumping | [Tutorial (5 steps)](tutorials/15-doodle-jump/README.md) | [One-Way Platforms](tutorials/concepts/physics/p08-one-way-platforms.md), [Screen Wrap](tutorials/concepts/physics/p07-screen-wrap.md) |
| [Rhythm Tap](src/games/rhythm-tap/) | Tap shrinking circles in time | [Tutorial (5 steps)](tutorials/27-rhythm-tap/README.md) | [Sine Wave](tutorials/concepts/math/m12-sine-wave.md) |
| [Reaction Timer](src/games/reaction-timer/) | Test your reflexes | [Tutorial (3 steps)](tutorials/01-reaction-timer/README.md) | [Canvas Setup](tutorials/concepts/canvas/c01-canvas-setup.md), [localStorage](tutorials/concepts/engineering/e03-localstorage.md) |
| [Balloon Pop](src/games/balloon-pop/) | Click balloons before they escape | [Tutorial (4 steps)](tutorials/09-balloon-pop/README.md) | [Circle Collision](tutorials/concepts/algorithms/a08-circle-circle.md) |
| [Color Switch](src/games/color-switch/) | Pass through matching color gates | [Tutorial (5 steps)](tutorials/19-color-switch/README.md) | [Transforms](tutorials/concepts/canvas/c06-transforms.md) |
| [Frogger](src/games/frogger/) | Cross roads and rivers | [Tutorial (6 steps)](tutorials/20-frogger/README.md) | [Layered Rendering](tutorials/concepts/canvas/c14-layered-rendering.md) |
| [Typing Speed](src/games/typing-speed/) | Type falling words | [Tutorial (5 steps)](tutorials/26-typing-speed/README.md) | [Text Rendering](tutorials/concepts/canvas/c05-text-rendering.md) |

### Action (9)

| Game | Description | Tutorial | Key Concepts |
|------|-------------|----------|--------------|
| [Tower Defense](src/games/tower-defense/) | Place towers, survive enemy waves | [Tutorial (8 steps)](tutorials/47-tower-defense/README.md) | [Economy](tutorials/concepts/game-systems/g02-economy.md), [Wave System](tutorials/concepts/game-systems/g01-wave-system.md) |
| [Platformer](src/games/platformer/) | Jump, collect coins, stomp enemies | [Tutorial (7 steps)](tutorials/41-platformer/README.md) | [Camera](tutorials/concepts/game-systems/g05-camera.md), [Gravity](tutorials/concepts/physics/p01-gravity.md) |
| [Top-Down Shooter](src/games/topdown-shooter/) | WASD + mouse aim, wave survival | [Tutorial (6 steps)](tutorials/42-topdown-shooter/README.md) | [Trigonometry](tutorials/concepts/math/m01-trigonometry.md), [Particles](tutorials/concepts/game-systems/g06-particles.md) |
| [Zombie Survival](src/games/zombie-survival/) | Day/night cycle, barricades, ammo | [Tutorial (7 steps)](tutorials/44-zombie-survival/README.md) | [Day/Night](tutorials/concepts/game-systems/g07-day-night.md), [Fog of War](tutorials/concepts/game-systems/g08-fog-of-war.md) |
| [Racing](src/games/racing/) | Top-down track with AI opponents | [Tutorial (7 steps)](tutorials/43-racing/README.md) | [Friction](tutorials/concepts/physics/p03-friction.md), [Momentum](tutorials/concepts/physics/p04-momentum.md) |
| [Fruit Ninja](src/games/fruit-ninja/) | Slice flying fruit, avoid bombs | [Tutorial (5 steps)](tutorials/25-fruit-ninja/README.md) | [Line Intersection](tutorials/concepts/algorithms/a09-line-intersection.md), [Quadratic](tutorials/concepts/math/m08-quadratic.md) |
| [Lava Floor](src/games/lava-floor/) | Platforms sink into lava | [Tutorial (5 steps)](tutorials/18-lava-floor/README.md) | [One-Way Platforms](tutorials/concepts/physics/p08-one-way-platforms.md) |
| [Basketball](src/games/basketball/) | Drag to aim, physics arc shooting | [Tutorial (5 steps)](tutorials/16-basketball/README.md) | [Projectile Motion](tutorials/concepts/physics/p09-projectile-motion.md), [Parametric Equations](tutorials/concepts/math/m05-parametric.md) |
| [Golf](src/games/golf/) | Top-down mini golf, 9 holes | [Tutorial (6 steps)](tutorials/17-golf/README.md) | [Friction](tutorials/concepts/physics/p03-friction.md), [Reflection](tutorials/concepts/math/m06-reflection.md) |

### Puzzle (14)

| Game | Description | Tutorial | Key Concepts |
|------|-------------|----------|--------------|
| [Physics Puzzle](src/games/physics-puzzle/) | Place pieces, simulate gravity | [Tutorial (6 steps)](tutorials/37-physics-puzzle/README.md) | [AABB Collision](tutorials/concepts/algorithms/a06-aabb-collision.md), [Gravity](tutorials/concepts/physics/p01-gravity.md) |
| [Minesweeper](src/games/minesweeper/) | Reveal cells, flag mines | [Tutorial (5 steps)](tutorials/30-minesweeper/README.md) | [Flood Fill](tutorials/concepts/algorithms/a01-flood-fill.md), [Probability](tutorials/concepts/math/m09-probability.md) |
| [Match-3](src/games/match3/) | Swap gems, cascade combos | [Tutorial (6 steps)](tutorials/35-match3/README.md) | [Combo System](tutorials/concepts/game-systems/g03-combo.md), [Lerp](tutorials/concepts/math/m04-lerp.md) |
| [2048](src/games/game-2048/) | Slide + merge number tiles | [Tutorial (5 steps)](tutorials/06-2048/README.md) | [Colors & Gradients](tutorials/concepts/canvas/c04-colors-and-gradients.md) |
| [Sokoban](src/games/sokoban/) | Push boxes onto targets | [Tutorial (5 steps)](tutorials/29-sokoban/README.md) | [Stack (Undo)](tutorials/concepts/algorithms/a15-stack-queue.md) |
| [Maze Runner](src/games/maze-runner/) | Fog of war, timed procedural mazes | [Tutorial (5 steps)](tutorials/34-maze-runner/README.md) | [Maze Generation](tutorials/concepts/algorithms/a04-maze-generation.md), [Fog of War](tutorials/concepts/game-systems/g08-fog-of-war.md) |
| [Word Search](src/games/word-search/) | Find hidden words in letter grid | [Tutorial (5 steps)](tutorials/32-word-search/README.md) | [Coordinate Systems](tutorials/concepts/canvas/c13-coordinate-systems.md) |
| [Sudoku](src/games/sudoku/) | 9x9 number placement, 3 difficulties | [Tutorial (6 steps)](tutorials/31-sudoku/README.md) | [Backtracking](tutorials/concepts/algorithms/a03-backtracking.md), [Factory](tutorials/concepts/design-patterns/d05-factory.md) |
| [Pipe Connect](src/games/pipe-connect/) | Rotate pipes to connect water flow | [Tutorial (5 steps)](tutorials/33-pipe-connect/README.md) | [Flood Fill](tutorials/concepts/algorithms/a01-flood-fill.md) |
| [Lights Out](src/games/lights-out/) | Toggle adjacent lights off | [Tutorial (4 steps)](tutorials/02-lights-out/README.md) | [Shapes & Paths](tutorials/concepts/canvas/c02-shapes-and-paths.md), [Shadows](tutorials/concepts/canvas/c08-shadows-and-glow.md) |
| [Memory Match](src/games/memory-match/) | Flip cards to find pairs | [Tutorial (5 steps)](tutorials/03-memory-match/README.md) | [Shuffle](tutorials/concepts/algorithms/a05-shuffle.md), [Rounded Rects](tutorials/concepts/canvas/c11-rounded-rectangles.md) |
| [Simon Says](src/games/simon-says/) | Repeat growing color sequences | [Tutorial (4 steps)](tutorials/07-simon-says/README.md) | [Circles & Arcs](tutorials/concepts/canvas/c03-circles-and-arcs.md) |
| [Gravity Ball](src/games/gravity-ball/) | Toggle gravity direction | [Tutorial (5 steps)](tutorials/36-gravity-ball/README.md) | [Level Progression](tutorials/concepts/game-systems/g04-level-progression.md) |
| [Hangman](src/games/hangman/) | Guess the word letter by letter | [Tutorial (4 steps)](tutorials/05-hangman/README.md) | [Text Rendering](tutorials/concepts/canvas/c05-text-rendering.md) |

### Strategy (7)

| Game | Description | Tutorial | Key Concepts |
|------|-------------|----------|--------------|
| [City Builder](src/games/city-builder/) | Manage population, food, power, happiness | [Tutorial (6 steps)](tutorials/45-city-builder/README.md) | [Economy](tutorials/concepts/game-systems/g02-economy.md), [Registry](tutorials/concepts/design-patterns/d08-registry.md) |
| [Card Battle](src/games/card-battle/) | Draw cards, defeat AI enemies | [Tutorial (6 steps)](tutorials/38-card-battle/README.md) | [State Pattern](tutorials/concepts/design-patterns/d04-state-pattern.md) |
| [Ant Colony](src/games/ant-colony/) | Emergent ant simulation | [Tutorial (6 steps)](tutorials/46-ant-colony/README.md) | [Pheromones](tutorials/concepts/game-systems/g09-pheromones.md), [Cellular Automata](tutorials/concepts/algorithms/a11-cellular-automata.md) |
| [Tic-Tac-Toe](src/games/tic-tac-toe/) | Unbeatable minimax AI | [Tutorial (5 steps)](tutorials/04-tic-tac-toe/README.md) | [Minimax](tutorials/concepts/algorithms/a02-minimax.md) |
| [Connect Four](src/games/connect-four/) | Drop discs, connect 4 vs AI | [Tutorial (5 steps)](tutorials/28-connect-four/README.md) | [Minimax](tutorials/concepts/algorithms/a02-minimax.md), [Transparency](tutorials/concepts/canvas/c07-transparency-and-compositing.md) |
| [Chess](src/games/chess/) | Full rules, castling, en passant, promotion UI | — | [Minimax](tutorials/concepts/algorithms/a02-minimax.md), [State Machines](tutorials/concepts/algorithms/a12-state-machines.md) |
| [Checkers](src/games/checkers/) | Forced captures, multi-jump chains, king promotion | — | [Minimax](tutorials/concepts/algorithms/a02-minimax.md), [Stack (Undo)](tutorials/concepts/algorithms/a15-stack-queue.md) |

### Chill (6)

| Game | Description | Tutorial | Key Concepts |
|------|-------------|----------|--------------|
| [Fishing](src/games/fishing/) | Cast, hook timing, reel tension | [Tutorial (5 steps)](tutorials/48-fishing/README.md) | [Weighted Random](tutorials/concepts/algorithms/a14-weighted-random.md), [Sine Wave](tutorials/concepts/math/m12-sine-wave.md) |
| [Idle Clicker](src/games/idle-clicker/) | Click + buy upgrades, persistent | [Tutorial (5 steps)](tutorials/49-idle-clicker/README.md) | [Exponential Growth](tutorials/concepts/math/m11-exponential.md), [localStorage](tutorials/concepts/engineering/e03-localstorage.md) |
| [Particle Sand](src/games/particle-sand/) | Sand/water/fire cellular automata | [Tutorial (5 steps)](tutorials/40-particle-sand/README.md) | [Cellular Automata](tutorials/concepts/algorithms/a11-cellular-automata.md), [Image Data](tutorials/concepts/canvas/c10-image-data.md) |
| [Brick Builder](src/games/brick-builder/) | LEGO-like creative stacking | [Tutorial (4 steps)](tutorials/50-brick-builder/README.md) | [Responsive Canvas](tutorials/concepts/canvas/c15-responsive-canvas.md) |
| [Pixel Art](src/games/pixel-art/) | Draw pixel art with palette | [Tutorial (4 steps)](tutorials/39-pixel-art/README.md) | [Flood Fill](tutorials/concepts/algorithms/a01-flood-fill.md), [Coordinate Systems](tutorials/concepts/canvas/c13-coordinate-systems.md) |

## Concept Reference (76 pages)

Learn the foundations behind every game. Each page has plain-English explanation, formulas, TypeScript code, and links to games where it's used.

| Category | Pages | Topics |
|----------|-------|--------|
| [Canvas API](tutorials/concepts/canvas/) | 15 | [Setup](tutorials/concepts/canvas/c01-canvas-setup.md), [Shapes](tutorials/concepts/canvas/c02-shapes-and-paths.md), [Arcs](tutorials/concepts/canvas/c03-circles-and-arcs.md), [Colors](tutorials/concepts/canvas/c04-colors-and-gradients.md), [Text](tutorials/concepts/canvas/c05-text-rendering.md), [Transforms](tutorials/concepts/canvas/c06-transforms.md), [Transparency](tutorials/concepts/canvas/c07-transparency-and-compositing.md), [Glow](tutorials/concepts/canvas/c08-shadows-and-glow.md), [Clipping](tutorials/concepts/canvas/c09-clipping.md), [Pixels](tutorials/concepts/canvas/c10-image-data.md), [Rounded Rects](tutorials/concepts/canvas/c11-rounded-rectangles.md), [Animation](tutorials/concepts/canvas/c12-animation-loop.md), [Coords](tutorials/concepts/canvas/c13-coordinate-systems.md), [Layers](tutorials/concepts/canvas/c14-layered-rendering.md), [Responsive](tutorials/concepts/canvas/c15-responsive-canvas.md) |
| [Mathematics](tutorials/concepts/math/) | 12 | [Trig](tutorials/concepts/math/m01-trigonometry.md), [Vectors](tutorials/concepts/math/m02-vectors.md), [Distance](tutorials/concepts/math/m03-distance.md), [Lerp](tutorials/concepts/math/m04-lerp.md), [Parametric](tutorials/concepts/math/m05-parametric.md), [Reflection](tutorials/concepts/math/m06-reflection.md), [Modular](tutorials/concepts/math/m07-modular.md), [Quadratic](tutorials/concepts/math/m08-quadratic.md), [Probability](tutorials/concepts/math/m09-probability.md), [Matrix Rotation](tutorials/concepts/math/m10-matrix-rotation.md), [Exponential](tutorials/concepts/math/m11-exponential.md), [Sine Wave](tutorials/concepts/math/m12-sine-wave.md) |
| [Algorithms](tutorials/concepts/algorithms/) | 15 | [Flood Fill](tutorials/concepts/algorithms/a01-flood-fill.md), [Minimax](tutorials/concepts/algorithms/a02-minimax.md), [Backtracking](tutorials/concepts/algorithms/a03-backtracking.md), [Maze Gen](tutorials/concepts/algorithms/a04-maze-generation.md), [Shuffle](tutorials/concepts/algorithms/a05-shuffle.md), [AABB](tutorials/concepts/algorithms/a06-aabb-collision.md), [Circle-Rect](tutorials/concepts/algorithms/a07-circle-rect.md), [Circle-Circle](tutorials/concepts/algorithms/a08-circle-circle.md), [Line-Segment](tutorials/concepts/algorithms/a09-line-intersection.md), [Pathfinding](tutorials/concepts/algorithms/a10-pathfinding.md), [Cellular Automata](tutorials/concepts/algorithms/a11-cellular-automata.md), [State Machines](tutorials/concepts/algorithms/a12-state-machines.md), [Delta Time](tutorials/concepts/algorithms/a13-delta-time.md), [Weighted Random](tutorials/concepts/algorithms/a14-weighted-random.md), [Stack/Queue](tutorials/concepts/algorithms/a15-stack-queue.md) |
| [Design Patterns](tutorials/concepts/design-patterns/) | 9 | [SOLID](tutorials/concepts/design-patterns/d01-solid.md), [Adapter](tutorials/concepts/design-patterns/d02-adapter.md), [Observer](tutorials/concepts/design-patterns/d03-observer.md), [State](tutorials/concepts/design-patterns/d04-state-pattern.md), [Factory](tutorials/concepts/design-patterns/d05-factory.md), [Strategy](tutorials/concepts/design-patterns/d06-strategy.md), [ECS](tutorials/concepts/design-patterns/d07-ecs.md), [Registry](tutorials/concepts/design-patterns/d08-registry.md), [Template Method](tutorials/concepts/design-patterns/d09-template-method.md) |
| [Physics](tutorials/concepts/physics/) | 9 | [Gravity](tutorials/concepts/physics/p01-gravity.md), [Velocity](tutorials/concepts/physics/p02-velocity.md), [Friction](tutorials/concepts/physics/p03-friction.md), [Momentum](tutorials/concepts/physics/p04-momentum.md), [Bounce](tutorials/concepts/physics/p05-bounce.md), [Terminal Velocity](tutorials/concepts/physics/p06-terminal-velocity.md), [Screen Wrap](tutorials/concepts/physics/p07-screen-wrap.md), [One-Way Platforms](tutorials/concepts/physics/p08-one-way-platforms.md), [Projectile Motion](tutorials/concepts/physics/p09-projectile-motion.md) |
| [Game Systems](tutorials/concepts/game-systems/) | 10 | [Waves](tutorials/concepts/game-systems/g01-wave-system.md), [Economy](tutorials/concepts/game-systems/g02-economy.md), [Combos](tutorials/concepts/game-systems/g03-combo.md), [Levels](tutorials/concepts/game-systems/g04-level-progression.md), [Camera](tutorials/concepts/game-systems/g05-camera.md), [Particles](tutorials/concepts/game-systems/g06-particles.md), [Day/Night](tutorials/concepts/game-systems/g07-day-night.md), [Fog of War](tutorials/concepts/game-systems/g08-fog-of-war.md), [Pheromones](tutorials/concepts/game-systems/g09-pheromones.md), [DAS](tutorials/concepts/game-systems/g10-das.md) |
| [Engineering](tutorials/concepts/engineering/) | 6 | [Event Lifecycle](tutorials/concepts/engineering/e01-event-lifecycle.md), [RAF Loop](tutorials/concepts/engineering/e02-raf-loop.md), [localStorage](tutorials/concepts/engineering/e03-localstorage.md), [Path Aliases](tutorials/concepts/engineering/e04-path-aliases.md), [Vite](tutorials/concepts/engineering/e05-vite.md), [Canvas API](tutorials/concepts/engineering/e06-canvas-api.md) |

[Browse all 76 concept pages](tutorials/concepts/README.md)

## Project Structure

```
src/
├── main.ts                     # Platform entry point
├── platform/
│   ├── GameRegistry.ts         # Record<GameCategory, GameDefinition[]>
│   ├── GameLauncher.ts         # Create/destroy game instances
│   └── PlatformMenu.ts        # Game selector with category tabs
├── shared/
│   ├── GameInterface.ts        # GameDefinition + GameInstance + GameHelp
│   ├── HelpOverlay.ts          # Shared in-game help renderer
│   ├── Updatable.ts            # System interface
│   ├── Renderable.ts           # Renderer interface
│   └── InputHandler.ts         # Input handler interface
└── games/
    └── <game-name>/            # Each game is self-contained
        ├── index.ts            # GameDefinition export
        ├── types.ts            # Game-specific types + constants
        ├── <Game>Engine.ts     # Game loop orchestrator
        ├── adapters/
        │   └── PlatformAdapter.ts
        ├── systems/            # Game logic (Updatable)
        ├── renderers/          # Drawing (Renderable)
        └── data/               # Static data (levels, words, etc.)
```

## Adding a New Game

### 1. Create the game folder

```bash
mkdir -p src/games/my-game/{systems,renderers,adapters,data}
```

### 2. Define types

```typescript
// src/games/my-game/types.ts
export interface MyGameState {
  score: number;
  // ... your game state
}
```

### 3. Create systems

Each system implements `Updatable<MyGameState>`:

```typescript
// src/games/my-game/systems/PhysicsSystem.ts
import type { Updatable } from '@shared/Updatable';
import type { MyGameState } from '../types';

export class PhysicsSystem implements Updatable<MyGameState> {
  update(state: MyGameState, dt: number): void {
    // game logic here
  }
}
```

### 4. Create renderers

Each renderer implements `Renderable<MyGameState>`:

```typescript
// src/games/my-game/renderers/GameRenderer.ts
import type { Renderable } from '@shared/Renderable';
import type { MyGameState } from '../types';

export class GameRenderer implements Renderable<MyGameState> {
  render(ctx: CanvasRenderingContext2D, state: MyGameState): void {
    // draw here
  }
}
```

### 5. Create input handler

```typescript
// src/games/my-game/systems/InputSystem.ts
import type { InputHandler } from '@shared/InputHandler';

export class InputSystem implements InputHandler {
  attach(): void { /* add event listeners */ }
  detach(): void { /* remove event listeners */ }
}
```

### 6. Create the engine

Wire systems + renderers in a `requestAnimationFrame` loop.

### 7. Create the adapter

```typescript
// src/games/my-game/adapters/PlatformAdapter.ts
import type { GameInstance } from '@shared/GameInterface';
import { MyGameEngine } from '../MyGameEngine';

export class PlatformAdapter implements GameInstance {
  private engine: MyGameEngine;
  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new MyGameEngine(canvas, onExit);
  }
  start(): void { this.engine.start(); }
  destroy(): void { this.engine.destroy(); }
}
```

### 8. Export the GameDefinition

```typescript
// src/games/my-game/index.ts
import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const MyGame: GameDefinition = {
  id: 'my-game',
  name: 'My Game',
  description: 'Short description',
  icon: '🎮',
  color: '#ff5722',
  category: 'arcade',  // arcade | action | puzzle | strategy | chill
  help: {
    goal: 'What the player needs to do.',
    controls: [
      { key: 'Arrow Keys', action: 'Move' },
      { key: 'Space', action: 'Action' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: [
      'Helpful tip for new players',
    ],
  },
  create(canvas, onExit) {
    const inst = new PlatformAdapter(canvas, onExit);
    inst.start();
    return inst;
  },
};
```

### 9. Register in the GameRegistry

```typescript
// src/platform/GameRegistry.ts
import { MyGame } from '@games/my-game';

// Add to the appropriate category array:
export const GAME_REGISTRY: Record<GameCategory, GameDefinition[]> = {
  arcade: [
    // ...existing games
    MyGame,
  ],
};
```

### Checklist

- [ ] All event listeners removed in `destroy()` / `detach()`
- [ ] Uses `@shared/...` path aliases (not relative `../../shared/`)
- [ ] No constructor parameter properties (`erasableSyntaxOnly`)
- [ ] `help` field with goal, controls, and tips
- [ ] `category` field set
- [ ] `ESC` key exits to platform menu
- [ ] `npx tsc --noEmit` passes with zero errors

## Path Aliases

| Alias | Maps to |
|-------|---------|
| `@shared/*` | `src/shared/*` |
| `@platform/*` | `src/platform/*` |
| `@games/*` | `src/games/*` |

## Architecture (SOLID)

| Principle | Application |
|-----------|-------------|
| **Single Responsibility** | Each system/renderer does one thing |
| **Open/Closed** | New mechanics = new system files |
| **Liskov Substitution** | All games implement `GameInstance` |
| **Interface Segregation** | `Updatable`, `Renderable`, `InputHandler` |
| **Dependency Inversion** | Systems depend on state interfaces, not engine |

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-new-game`
3. Add your game following the steps above
4. Ensure `npx tsc --noEmit` and `pnpm build` pass
5. Commit with descriptive message: `feat: add My Game (#N) — short description`
6. Open a pull request

### Guidelines

- **One game per PR** for clean review
- **SOLID architecture** — separate systems, renderers, adapters
- **Clean up listeners** — all event handlers must be removed on `destroy()`
- **Help data required** — every game needs `goal`, `controls`, and `tips`
- **No external dependencies** — pure TypeScript + Canvas API only
- **Test locally** — run `pnpm dev`, verify the game launches, plays, and exits cleanly

## Tech Stack

- **TypeScript** — strict mode, zero errors
- **Vite** — dev server + production build
- **HTML5 Canvas** — all rendering
- **No frameworks** — pure vanilla TS

## License

MIT
