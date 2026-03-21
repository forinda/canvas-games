# Canvas Game Arcade

A multi-game arcade platform with **50+ playable games** built with TypeScript and HTML5 Canvas (Vite).

## Tutorial Series

Follow the **[Canvas 2D tutorial series](./tutorials/canvas2d/README.md)** to build games from scratch — ordered from beginner to advanced. Perfect for YouTube content creators and learners.

Browse the **[concept reference](./tutorials/canvas2d/concepts/README.md)** for standalone explainers on every math, algorithm, physics, and design pattern concept used.

## Quick Start

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # production build
```

## Games

### Arcade

| Game | Description | Tutorial | Key Concepts |
|------|-------------|----------|--------------|
| [Snake](src/contexts/canvas2d/games/snake/) | Eat food, grow longer, avoid yourself | [Tutorial (5 steps)](tutorials/canvas2d/10-snake/README.md) | [State Machines](tutorials/canvas2d/concepts/algorithms/a12-state-machines.md), [Delta Time](tutorials/canvas2d/concepts/algorithms/a13-delta-time.md) |
| [Breakout](src/contexts/canvas2d/games/breakout/) | Paddle + ball, break bricks, powerups | [Tutorial (6 steps)](tutorials/canvas2d/12-breakout/README.md) | [AABB Collision](tutorials/canvas2d/concepts/algorithms/a06-aabb-collision.md), [Angle Reflection](tutorials/canvas2d/concepts/math/m06-reflection.md) |
| [Asteroids](src/contexts/canvas2d/games/asteroids/) | Rotate, thrust, shoot splitting rocks | [Tutorial (6 steps)](tutorials/canvas2d/22-asteroids/README.md) | [Trigonometry](tutorials/canvas2d/concepts/math/m01-trigonometry.md), [Momentum](tutorials/canvas2d/concepts/physics/p04-momentum.md) |
| [Space Invaders](src/contexts/canvas2d/games/space-invaders/) | Shoot descending aliens, shield cover | [Tutorial (6 steps)](tutorials/canvas2d/21-space-invaders/README.md) | [Wave System](tutorials/canvas2d/concepts/game-systems/g01-wave-system.md) |
| [Flappy Bird](src/contexts/canvas2d/games/flappy-bird/) | Tap to fly through pipe gaps | [Tutorial (5 steps)](tutorials/canvas2d/13-flappy-bird/README.md) | [Gravity](tutorials/canvas2d/concepts/physics/p01-gravity.md), [Terminal Velocity](tutorials/canvas2d/concepts/physics/p06-terminal-velocity.md) |
| [Tetris](src/contexts/canvas2d/games/tetris/) | Stack blocks, clear lines | [Tutorial (7 steps)](tutorials/canvas2d/24-tetris/README.md) | [Matrix Rotation](tutorials/canvas2d/concepts/math/m10-matrix-rotation.md), [DAS](tutorials/canvas2d/concepts/game-systems/g10-das.md) |
| [Whack-a-Mole](src/contexts/canvas2d/games/whack-a-mole/) | Timed reflex clicking | [Tutorial (4 steps)](tutorials/canvas2d/08-whack-a-mole/README.md) | [Combo System](tutorials/canvas2d/concepts/game-systems/g03-combo.md) |
| [Helicopter](src/contexts/canvas2d/games/helicopter/) | One-button cave scroller | [Tutorial (4 steps)](tutorials/canvas2d/14-helicopter/README.md) | [Velocity](tutorials/canvas2d/concepts/physics/p02-velocity.md) |
| [Pong](src/contexts/canvas2d/games/pong/) | Paddle tennis vs AI or 2-player | [Tutorial (5 steps)](tutorials/canvas2d/11-pong/README.md) | [Bounce](tutorials/canvas2d/concepts/physics/p05-bounce.md), [Vectors](tutorials/canvas2d/concepts/math/m02-vectors.md) |
| [Pac-Man](src/contexts/canvas2d/games/pacman/) | Eat dots, avoid/eat ghosts | [Tutorial (7 steps)](tutorials/canvas2d/23-pacman/README.md) | [Pathfinding](tutorials/canvas2d/concepts/algorithms/a10-pathfinding.md), [Strategy Pattern](tutorials/canvas2d/concepts/design-patterns/d06-strategy.md) |
| [Doodle Jump](src/contexts/canvas2d/games/doodle-jump/) | Endless vertical platform jumping | [Tutorial (5 steps)](tutorials/canvas2d/15-doodle-jump/README.md) | [One-Way Platforms](tutorials/canvas2d/concepts/physics/p08-one-way-platforms.md), [Screen Wrap](tutorials/canvas2d/concepts/physics/p07-screen-wrap.md) |
| [Rhythm Tap](src/contexts/canvas2d/games/rhythm-tap/) | Tap shrinking circles in time | [Tutorial (5 steps)](tutorials/canvas2d/27-rhythm-tap/README.md) | [Sine Wave](tutorials/canvas2d/concepts/math/m12-sine-wave.md) |
| [Reaction Timer](src/contexts/canvas2d/games/reaction-timer/) | Test your reflexes | [Tutorial (3 steps)](tutorials/canvas2d/01-reaction-timer/README.md) | [Canvas Setup](tutorials/canvas2d/concepts/canvas/c01-canvas-setup.md), [localStorage](tutorials/canvas2d/concepts/engineering/e03-localstorage.md) |
| [Balloon Pop](src/contexts/canvas2d/games/balloon-pop/) | Click balloons before they escape | [Tutorial (4 steps)](tutorials/canvas2d/09-balloon-pop/README.md) | [Circle Collision](tutorials/canvas2d/concepts/algorithms/a08-circle-circle.md) |
| [Color Switch](src/contexts/canvas2d/games/color-switch/) | Pass through matching color gates | [Tutorial (5 steps)](tutorials/canvas2d/19-color-switch/README.md) | [Transforms](tutorials/canvas2d/concepts/canvas/c06-transforms.md) |
| [Frogger](src/contexts/canvas2d/games/frogger/) | Cross roads and rivers | [Tutorial (6 steps)](tutorials/canvas2d/20-frogger/README.md) | [Layered Rendering](tutorials/canvas2d/concepts/canvas/c14-layered-rendering.md) |
| [Typing Speed](src/contexts/canvas2d/games/typing-speed/) | Type falling words | [Tutorial (5 steps)](tutorials/canvas2d/26-typing-speed/README.md) | [Text Rendering](tutorials/canvas2d/concepts/canvas/c05-text-rendering.md) |

### Action

| Game | Description | Tutorial | Key Concepts |
|------|-------------|----------|--------------|
| [Tower Defense](src/contexts/canvas2d/games/tower-defense/) | Place towers, survive enemy waves | [Tutorial (8 steps)](tutorials/canvas2d/47-tower-defense/README.md) | [Economy](tutorials/canvas2d/concepts/game-systems/g02-economy.md), [Wave System](tutorials/canvas2d/concepts/game-systems/g01-wave-system.md) |
| [Platformer](src/contexts/canvas2d/games/platformer/) | Jump, collect coins, stomp enemies | [Tutorial (7 steps)](tutorials/canvas2d/41-platformer/README.md) | [Camera](tutorials/canvas2d/concepts/game-systems/g05-camera.md), [Gravity](tutorials/canvas2d/concepts/physics/p01-gravity.md) |
| [Top-Down Shooter](src/contexts/canvas2d/games/topdown-shooter/) | WASD + mouse aim, wave survival | [Tutorial (6 steps)](tutorials/canvas2d/42-topdown-shooter/README.md) | [Trigonometry](tutorials/canvas2d/concepts/math/m01-trigonometry.md), [Particles](tutorials/canvas2d/concepts/game-systems/g06-particles.md) |
| [Zombie Survival](src/contexts/canvas2d/games/zombie-survival/) | Day/night cycle, barricades, ammo | [Tutorial (7 steps)](tutorials/canvas2d/44-zombie-survival/README.md) | [Day/Night](tutorials/canvas2d/concepts/game-systems/g07-day-night.md), [Fog of War](tutorials/canvas2d/concepts/game-systems/g08-fog-of-war.md) |
| [Racing](src/contexts/canvas2d/games/racing/) | Top-down track with AI opponents | [Tutorial (7 steps)](tutorials/canvas2d/43-racing/README.md) | [Friction](tutorials/canvas2d/concepts/physics/p03-friction.md), [Momentum](tutorials/canvas2d/concepts/physics/p04-momentum.md) |
| [Fruit Ninja](src/contexts/canvas2d/games/fruit-ninja/) | Slice flying fruit, avoid bombs | [Tutorial (5 steps)](tutorials/canvas2d/25-fruit-ninja/README.md) | [Line Intersection](tutorials/canvas2d/concepts/algorithms/a09-line-intersection.md), [Quadratic](tutorials/canvas2d/concepts/math/m08-quadratic.md) |
| [Lava Floor](src/contexts/canvas2d/games/lava-floor/) | Platforms sink into lava | [Tutorial (5 steps)](tutorials/canvas2d/18-lava-floor/README.md) | [One-Way Platforms](tutorials/canvas2d/concepts/physics/p08-one-way-platforms.md) |
| [Basketball](src/contexts/canvas2d/games/basketball/) | Drag to aim, physics arc shooting | [Tutorial (5 steps)](tutorials/canvas2d/16-basketball/README.md) | [Projectile Motion](tutorials/canvas2d/concepts/physics/p09-projectile-motion.md), [Parametric Equations](tutorials/canvas2d/concepts/math/m05-parametric.md) |
| [Golf](src/contexts/canvas2d/games/golf/) | Top-down mini golf, 9 holes | [Tutorial (6 steps)](tutorials/canvas2d/17-golf/README.md) | [Friction](tutorials/canvas2d/concepts/physics/p03-friction.md), [Reflection](tutorials/canvas2d/concepts/math/m06-reflection.md) |

### Puzzle

| Game | Description | Tutorial | Key Concepts |
|------|-------------|----------|--------------|
| [Physics Puzzle](src/contexts/canvas2d/games/physics-puzzle/) | Place pieces, simulate gravity | [Tutorial (6 steps)](tutorials/canvas2d/37-physics-puzzle/README.md) | [AABB Collision](tutorials/canvas2d/concepts/algorithms/a06-aabb-collision.md), [Gravity](tutorials/canvas2d/concepts/physics/p01-gravity.md) |
| [Minesweeper](src/contexts/canvas2d/games/minesweeper/) | Reveal cells, flag mines | [Tutorial (5 steps)](tutorials/canvas2d/30-minesweeper/README.md) | [Flood Fill](tutorials/canvas2d/concepts/algorithms/a01-flood-fill.md), [Probability](tutorials/canvas2d/concepts/math/m09-probability.md) |
| [Match-3](src/contexts/canvas2d/games/match3/) | Swap gems, cascade combos | [Tutorial (6 steps)](tutorials/canvas2d/35-match3/README.md) | [Combo System](tutorials/canvas2d/concepts/game-systems/g03-combo.md), [Lerp](tutorials/canvas2d/concepts/math/m04-lerp.md) |
| [2048](src/contexts/canvas2d/games/game-2048/) | Slide + merge number tiles | [Tutorial (5 steps)](tutorials/canvas2d/06-2048/README.md) | [Colors & Gradients](tutorials/canvas2d/concepts/canvas/c04-colors-and-gradients.md) |
| [Sokoban](src/contexts/canvas2d/games/sokoban/) | Push boxes onto targets | [Tutorial (5 steps)](tutorials/canvas2d/29-sokoban/README.md) | [Stack (Undo)](tutorials/canvas2d/concepts/algorithms/a15-stack-queue.md) |
| [Maze Runner](src/contexts/canvas2d/games/maze-runner/) | Fog of war, timed procedural mazes | [Tutorial (5 steps)](tutorials/canvas2d/34-maze-runner/README.md) | [Maze Generation](tutorials/canvas2d/concepts/algorithms/a04-maze-generation.md), [Fog of War](tutorials/canvas2d/concepts/game-systems/g08-fog-of-war.md) |
| [Word Search](src/contexts/canvas2d/games/word-search/) | Find hidden words in letter grid | [Tutorial (5 steps)](tutorials/canvas2d/32-word-search/README.md) | [Coordinate Systems](tutorials/canvas2d/concepts/canvas/c13-coordinate-systems.md) |
| [Sudoku](src/contexts/canvas2d/games/sudoku/) | 9x9 number placement, 3 difficulties | [Tutorial (6 steps)](tutorials/canvas2d/31-sudoku/README.md) | [Backtracking](tutorials/canvas2d/concepts/algorithms/a03-backtracking.md), [Factory](tutorials/canvas2d/concepts/design-patterns/d05-factory.md) |
| [Pipe Connect](src/contexts/canvas2d/games/pipe-connect/) | Rotate pipes to connect water flow | [Tutorial (5 steps)](tutorials/canvas2d/33-pipe-connect/README.md) | [Flood Fill](tutorials/canvas2d/concepts/algorithms/a01-flood-fill.md) |
| [Lights Out](src/contexts/canvas2d/games/lights-out/) | Toggle adjacent lights off | [Tutorial (4 steps)](tutorials/canvas2d/02-lights-out/README.md) | [Shapes & Paths](tutorials/canvas2d/concepts/canvas/c02-shapes-and-paths.md), [Shadows](tutorials/canvas2d/concepts/canvas/c08-shadows-and-glow.md) |
| [Memory Match](src/contexts/canvas2d/games/memory-match/) | Flip cards to find pairs | [Tutorial (5 steps)](tutorials/canvas2d/03-memory-match/README.md) | [Shuffle](tutorials/canvas2d/concepts/algorithms/a05-shuffle.md), [Rounded Rects](tutorials/canvas2d/concepts/canvas/c11-rounded-rectangles.md) |
| [Simon Says](src/contexts/canvas2d/games/simon-says/) | Repeat growing color sequences | [Tutorial (4 steps)](tutorials/canvas2d/07-simon-says/README.md) | [Circles & Arcs](tutorials/canvas2d/concepts/canvas/c03-circles-and-arcs.md) |
| [Gravity Ball](src/contexts/canvas2d/games/gravity-ball/) | Toggle gravity direction | [Tutorial (5 steps)](tutorials/canvas2d/36-gravity-ball/README.md) | [Level Progression](tutorials/canvas2d/concepts/game-systems/g04-level-progression.md) |
| [Hangman](src/contexts/canvas2d/games/hangman/) | Guess the word letter by letter | [Tutorial (4 steps)](tutorials/canvas2d/05-hangman/README.md) | [Text Rendering](tutorials/canvas2d/concepts/canvas/c05-text-rendering.md) |

### Strategy

| Game | Description | Tutorial | Key Concepts |
|------|-------------|----------|--------------|
| [City Builder](src/contexts/canvas2d/games/city-builder/) | Manage population, food, power, happiness | [Tutorial (6 steps)](tutorials/canvas2d/45-city-builder/README.md) | [Economy](tutorials/canvas2d/concepts/game-systems/g02-economy.md), [Registry](tutorials/canvas2d/concepts/design-patterns/d08-registry.md) |
| [Card Battle](src/contexts/canvas2d/games/card-battle/) | Draw cards, defeat AI enemies | [Tutorial (6 steps)](tutorials/canvas2d/38-card-battle/README.md) | [State Pattern](tutorials/canvas2d/concepts/design-patterns/d04-state-pattern.md) |
| [Ant Colony](src/contexts/canvas2d/games/ant-colony/) | Emergent ant simulation | [Tutorial (6 steps)](tutorials/canvas2d/46-ant-colony/README.md) | [Pheromones](tutorials/canvas2d/concepts/game-systems/g09-pheromones.md), [Cellular Automata](tutorials/canvas2d/concepts/algorithms/a11-cellular-automata.md) |
| [Tic-Tac-Toe](src/contexts/canvas2d/games/tic-tac-toe/) | Unbeatable minimax AI | [Tutorial (5 steps)](tutorials/canvas2d/04-tic-tac-toe/README.md) | [Minimax](tutorials/canvas2d/concepts/algorithms/a02-minimax.md) |
| [Connect Four](src/contexts/canvas2d/games/connect-four/) | Drop discs, connect 4 vs AI | [Tutorial (5 steps)](tutorials/canvas2d/28-connect-four/README.md) | [Minimax](tutorials/canvas2d/concepts/algorithms/a02-minimax.md), [Transparency](tutorials/canvas2d/concepts/canvas/c07-transparency-and-compositing.md) |
| [Chess](src/contexts/canvas2d/games/chess/) | Full rules, castling, en passant, promotion UI | — | [Minimax](tutorials/canvas2d/concepts/algorithms/a02-minimax.md), [State Machines](tutorials/canvas2d/concepts/algorithms/a12-state-machines.md) |
| [Checkers](src/contexts/canvas2d/games/checkers/) | Forced captures, multi-jump chains, king promotion | — | [Minimax](tutorials/canvas2d/concepts/algorithms/a02-minimax.md), [Stack (Undo)](tutorials/canvas2d/concepts/algorithms/a15-stack-queue.md) |

### Chill

| Game | Description | Tutorial | Key Concepts |
|------|-------------|----------|--------------|
| [Fishing](src/contexts/canvas2d/games/fishing/) | Cast, hook timing, reel tension | [Tutorial (5 steps)](tutorials/canvas2d/48-fishing/README.md) | [Weighted Random](tutorials/canvas2d/concepts/algorithms/a14-weighted-random.md), [Sine Wave](tutorials/canvas2d/concepts/math/m12-sine-wave.md) |
| [Idle Clicker](src/contexts/canvas2d/games/idle-clicker/) | Click + buy upgrades, persistent | [Tutorial (5 steps)](tutorials/canvas2d/49-idle-clicker/README.md) | [Exponential Growth](tutorials/canvas2d/concepts/math/m11-exponential.md), [localStorage](tutorials/canvas2d/concepts/engineering/e03-localstorage.md) |
| [Particle Sand](src/contexts/canvas2d/games/particle-sand/) | Sand/water/fire cellular automata | [Tutorial (5 steps)](tutorials/canvas2d/40-particle-sand/README.md) | [Cellular Automata](tutorials/canvas2d/concepts/algorithms/a11-cellular-automata.md), [Image Data](tutorials/canvas2d/concepts/canvas/c10-image-data.md) |
| [Brick Builder](src/contexts/canvas2d/games/brick-builder/) | LEGO-like creative stacking | [Tutorial (4 steps)](tutorials/canvas2d/50-brick-builder/README.md) | [Responsive Canvas](tutorials/canvas2d/concepts/canvas/c15-responsive-canvas.md) |
| [Pixel Art](src/contexts/canvas2d/games/pixel-art/) | Draw pixel art with palette | [Tutorial (4 steps)](tutorials/canvas2d/39-pixel-art/README.md) | [Flood Fill](tutorials/canvas2d/concepts/algorithms/a01-flood-fill.md), [Coordinate Systems](tutorials/canvas2d/concepts/canvas/c13-coordinate-systems.md) |

### 3D (WebGL)

| Game | Description | Key Concepts |
|------|-------------|--------------|
| [Spinning Cube](src/contexts/webgl/games/spinning-cube/) | Interactive lit 3D cube, drag to orbit | Shaders, MVP matrices, vertex buffers |
| [Marble Roll](src/contexts/webgl/games/marble-roll/) | Tilt a platform to roll a marble to the goal | Diffuse + specular lighting, surface physics |
| [3D Pong](src/contexts/webgl/games/pong-3d/) | Classic Pong on a 3D table with AI | Perspective projection, emissive uniforms |
| [3D Maze](src/contexts/webgl/games/maze-3d/) | First-person maze with fog | FPS camera, pointer lock, wall collision, fog shader |
| [Tower Stacker](src/contexts/webgl/games/tower-stacker/) | Time drops to stack blocks, overhangs cut off | Dynamic geometry clipping, alpha blending, camera follow |

## Concept Reference (76 pages)

Learn the foundations behind every game. Each page has plain-English explanation, formulas, TypeScript code, and links to games where it's used.

| Category | Pages | Topics |
|----------|-------|--------|
| [Canvas API](tutorials/canvas2d/concepts/canvas/) | 15 | [Setup](tutorials/canvas2d/concepts/canvas/c01-canvas-setup.md), [Shapes](tutorials/canvas2d/concepts/canvas/c02-shapes-and-paths.md), [Arcs](tutorials/canvas2d/concepts/canvas/c03-circles-and-arcs.md), [Colors](tutorials/canvas2d/concepts/canvas/c04-colors-and-gradients.md), [Text](tutorials/canvas2d/concepts/canvas/c05-text-rendering.md), [Transforms](tutorials/canvas2d/concepts/canvas/c06-transforms.md), [Transparency](tutorials/canvas2d/concepts/canvas/c07-transparency-and-compositing.md), [Glow](tutorials/canvas2d/concepts/canvas/c08-shadows-and-glow.md), [Clipping](tutorials/canvas2d/concepts/canvas/c09-clipping.md), [Pixels](tutorials/canvas2d/concepts/canvas/c10-image-data.md), [Rounded Rects](tutorials/canvas2d/concepts/canvas/c11-rounded-rectangles.md), [Animation](tutorials/canvas2d/concepts/canvas/c12-animation-loop.md), [Coords](tutorials/canvas2d/concepts/canvas/c13-coordinate-systems.md), [Layers](tutorials/canvas2d/concepts/canvas/c14-layered-rendering.md), [Responsive](tutorials/canvas2d/concepts/canvas/c15-responsive-canvas.md) |
| [Mathematics](tutorials/canvas2d/concepts/math/) | 12 | [Trig](tutorials/canvas2d/concepts/math/m01-trigonometry.md), [Vectors](tutorials/canvas2d/concepts/math/m02-vectors.md), [Distance](tutorials/canvas2d/concepts/math/m03-distance.md), [Lerp](tutorials/canvas2d/concepts/math/m04-lerp.md), [Parametric](tutorials/canvas2d/concepts/math/m05-parametric.md), [Reflection](tutorials/canvas2d/concepts/math/m06-reflection.md), [Modular](tutorials/canvas2d/concepts/math/m07-modular.md), [Quadratic](tutorials/canvas2d/concepts/math/m08-quadratic.md), [Probability](tutorials/canvas2d/concepts/math/m09-probability.md), [Matrix Rotation](tutorials/canvas2d/concepts/math/m10-matrix-rotation.md), [Exponential](tutorials/canvas2d/concepts/math/m11-exponential.md), [Sine Wave](tutorials/canvas2d/concepts/math/m12-sine-wave.md) |
| [Algorithms](tutorials/canvas2d/concepts/algorithms/) | 15 | [Flood Fill](tutorials/canvas2d/concepts/algorithms/a01-flood-fill.md), [Minimax](tutorials/canvas2d/concepts/algorithms/a02-minimax.md), [Backtracking](tutorials/canvas2d/concepts/algorithms/a03-backtracking.md), [Maze Gen](tutorials/canvas2d/concepts/algorithms/a04-maze-generation.md), [Shuffle](tutorials/canvas2d/concepts/algorithms/a05-shuffle.md), [AABB](tutorials/canvas2d/concepts/algorithms/a06-aabb-collision.md), [Circle-Rect](tutorials/canvas2d/concepts/algorithms/a07-circle-rect.md), [Circle-Circle](tutorials/canvas2d/concepts/algorithms/a08-circle-circle.md), [Line-Segment](tutorials/canvas2d/concepts/algorithms/a09-line-intersection.md), [Pathfinding](tutorials/canvas2d/concepts/algorithms/a10-pathfinding.md), [Cellular Automata](tutorials/canvas2d/concepts/algorithms/a11-cellular-automata.md), [State Machines](tutorials/canvas2d/concepts/algorithms/a12-state-machines.md), [Delta Time](tutorials/canvas2d/concepts/algorithms/a13-delta-time.md), [Weighted Random](tutorials/canvas2d/concepts/algorithms/a14-weighted-random.md), [Stack/Queue](tutorials/canvas2d/concepts/algorithms/a15-stack-queue.md) |
| [Design Patterns](tutorials/canvas2d/concepts/design-patterns/) | 9 | [SOLID](tutorials/canvas2d/concepts/design-patterns/d01-solid.md), [Adapter](tutorials/canvas2d/concepts/design-patterns/d02-adapter.md), [Observer](tutorials/canvas2d/concepts/design-patterns/d03-observer.md), [State](tutorials/canvas2d/concepts/design-patterns/d04-state-pattern.md), [Factory](tutorials/canvas2d/concepts/design-patterns/d05-factory.md), [Strategy](tutorials/canvas2d/concepts/design-patterns/d06-strategy.md), [ECS](tutorials/canvas2d/concepts/design-patterns/d07-ecs.md), [Registry](tutorials/canvas2d/concepts/design-patterns/d08-registry.md), [Template Method](tutorials/canvas2d/concepts/design-patterns/d09-template-method.md) |
| [Physics](tutorials/canvas2d/concepts/physics/) | 9 | [Gravity](tutorials/canvas2d/concepts/physics/p01-gravity.md), [Velocity](tutorials/canvas2d/concepts/physics/p02-velocity.md), [Friction](tutorials/canvas2d/concepts/physics/p03-friction.md), [Momentum](tutorials/canvas2d/concepts/physics/p04-momentum.md), [Bounce](tutorials/canvas2d/concepts/physics/p05-bounce.md), [Terminal Velocity](tutorials/canvas2d/concepts/physics/p06-terminal-velocity.md), [Screen Wrap](tutorials/canvas2d/concepts/physics/p07-screen-wrap.md), [One-Way Platforms](tutorials/canvas2d/concepts/physics/p08-one-way-platforms.md), [Projectile Motion](tutorials/canvas2d/concepts/physics/p09-projectile-motion.md) |
| [Game Systems](tutorials/canvas2d/concepts/game-systems/) | 10 | [Waves](tutorials/canvas2d/concepts/game-systems/g01-wave-system.md), [Economy](tutorials/canvas2d/concepts/game-systems/g02-economy.md), [Combos](tutorials/canvas2d/concepts/game-systems/g03-combo.md), [Levels](tutorials/canvas2d/concepts/game-systems/g04-level-progression.md), [Camera](tutorials/canvas2d/concepts/game-systems/g05-camera.md), [Particles](tutorials/canvas2d/concepts/game-systems/g06-particles.md), [Day/Night](tutorials/canvas2d/concepts/game-systems/g07-day-night.md), [Fog of War](tutorials/canvas2d/concepts/game-systems/g08-fog-of-war.md), [Pheromones](tutorials/canvas2d/concepts/game-systems/g09-pheromones.md), [DAS](tutorials/canvas2d/concepts/game-systems/g10-das.md) |
| [Engineering](tutorials/canvas2d/concepts/engineering/) | 6 | [Event Lifecycle](tutorials/canvas2d/concepts/engineering/e01-event-lifecycle.md), [RAF Loop](tutorials/canvas2d/concepts/engineering/e02-raf-loop.md), [localStorage](tutorials/canvas2d/concepts/engineering/e03-localstorage.md), [Path Aliases](tutorials/canvas2d/concepts/engineering/e04-path-aliases.md), [Vite](tutorials/canvas2d/concepts/engineering/e05-vite.md), [Canvas API](tutorials/canvas2d/concepts/engineering/e06-canvas-api.md) |

[Browse all 76 concept pages](tutorials/canvas2d/concepts/README.md)

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
mkdir -p src/contexts/canvas2d/games/my-game/{systems,renderers,adapters,data}
```

### 2. Define types

```typescript
// src/contexts/canvas2d/games/my-game/types.ts
export interface MyGameState {
  score: number;
  // ... your game state
}
```

### 3. Create systems

Each system implements `Updatable<MyGameState>`:

```typescript
// src/contexts/canvas2d/games/my-game/systems/PhysicsSystem.ts
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
// src/contexts/canvas2d/games/my-game/renderers/GameRenderer.ts
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
// src/contexts/canvas2d/games/my-game/systems/InputSystem.ts
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
// src/contexts/canvas2d/games/my-game/adapters/PlatformAdapter.ts
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
// src/contexts/canvas2d/games/my-game/index.ts
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
| `@games/*` | `src/contexts/canvas2d/games/*` |

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
5. Commit following the **Commit Convention** below
6. Open a pull request

### Guidelines

- **One game per PR** for clean review
- **SOLID architecture** — separate systems, renderers, adapters
- **Clean up listeners** — all event handlers must be removed on `destroy()`
- **Help data required** — every game needs `goal`, `controls`, and `tips`
- **No external dependencies** — pure TypeScript + Canvas API only
- **Test locally** — run `pnpm dev`, verify the game launches, plays, and exits cleanly

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/). The release script auto-generates changelogs from these prefixes:

| Prefix | Category | When to use | Example |
|--------|----------|-------------|---------|
| `feat:` | New Games & Features | New game, new platform feature, new tutorial | `feat: add Chess game (#51) — full rules, minimax AI` |
| `fix:` | Bug Fixes | Bug fix, rule correction, UX fix | `fix: first-row game cards not clickable` |
| `perf:` | Performance | Optimization, code splitting, caching | `perf: code-split all 50+ games via dynamic import()` |
| `docs:` | Documentation | Tutorials, README, concept pages | `docs: write Tetris tutorial (Game 24) — 7 steps` |
| `refactor:` | Refactoring | Code restructure without behavior change | `refactor: use Record for game registry` |
| `chore:` | Other Changes | Config, tooling, CI, dependencies | `chore: setup eslint, prettier, husky` |

**Format:**

```
<prefix>: <short description> (under 72 chars)

Optional longer body explaining the "why" after a blank line.

Co-Authored-By: Name <email>
```

**Branch naming:**

```
feat/game-name        # new game
fix/bug-description   # bug fix
docs/tutorial-name    # documentation
perf/optimization     # performance
chore/config-change   # tooling
```

### Releases

See [RELEASE.md](./RELEASE.md) for the full release workflow. Quick reference:

```bash
pnpm release:patch   # 1.0.0 → 1.0.1 (bug fixes)
pnpm release:minor   # 1.0.0 → 1.1.0 (new games/features)
pnpm release:major   # 1.0.0 → 2.0.0 (breaking changes)
```

The release script auto-generates [CHANGELOG.md](./CHANGELOG.md) with clickable commit hashes and author attribution from your commit messages.

## Tech Stack

- **TypeScript** — strict mode, zero errors
- **Vite** — dev server + production build
- **HTML5 Canvas** — all rendering
- **No frameworks** — pure vanilla TS

## License

MIT
