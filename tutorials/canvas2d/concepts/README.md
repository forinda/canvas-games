# Game Development Concepts Reference

A standalone reference for every concept used across the 50-game tutorial series. Each concept has its own page with explanation, visual examples, code snippets, and links to the games where it's applied.

**Use this as:** a companion to the tutorials, a revision guide, or standalone learning material for your YouTube series.

---

## Canvas API

| # | Concept | File | First Used In |
|---|---------|------|---------------|
| C1 | [Canvas Setup & Sizing](./canvas/c01-canvas-setup.md) | Element, context, DPR, resize | Game 1: Reaction Timer |
| C2 | [Shapes & Paths](./canvas/c02-shapes-and-paths.md) | Rectangles, lines, custom polygons | Game 1: Reaction Timer |
| C3 | [Circles & Arcs](./canvas/c03-circles-and-arcs.md) | Full circles, partial arcs, pie slices | Game 11: Pong |
| C4 | [Colors & Gradients](./canvas/c04-colors-and-gradients.md) | Solid, hex, rgba, linear/radial gradients | Game 1: Reaction Timer |
| C5 | [Text Rendering](./canvas/c05-text-rendering.md) | Fonts, alignment, measurement | Game 1: Reaction Timer |
| C6 | [Transforms](./canvas/c06-transforms.md) | translate, rotate, scale, save/restore | Game 22: Asteroids |
| C7 | [Transparency & Compositing](./canvas/c07-transparency-and-compositing.md) | globalAlpha, composite operations | Game 23: Pac-Man |
| C8 | [Shadows & Glow](./canvas/c08-shadows-and-glow.md) | shadowColor, shadowBlur | Game 2: Lights Out |
| C9 | [Clipping](./canvas/c09-clipping.md) | clip() with paths | Game 8: Whack-a-Mole |
| C10 | [Image Data (Pixels)](./canvas/c10-image-data.md) | createImageData, putImageData | Game 39: Particle Sand |
| C11 | [Rounded Rectangles](./canvas/c11-rounded-rectangles.md) | roundRect() method | Game 3: Memory Match |
| C12 | [Animation Loop](./canvas/c12-animation-loop.md) | requestAnimationFrame, delta time | Every game |
| C13 | [Coordinate Systems](./canvas/c13-coordinate-systems.md) | Mouse-to-canvas mapping, grid cells | Game 2: Lights Out |
| C14 | [Layered Rendering](./canvas/c14-layered-rendering.md) | Painter's algorithm, draw order | Game 47: Tower Defense |
| C15 | [Responsive Canvas](./canvas/c15-responsive-canvas.md) | Resize, aspect ratio, scaling | Every game |

## Mathematics

| # | Concept | File | First Used In |
|---|---------|------|---------------|
| M1 | [Trigonometry (sin, cos, atan2)](./math/m01-trigonometry.md) | Angles, rotation, direction vectors | Game 22: Asteroids |
| M2 | [Vector Math](./math/m02-vectors.md) | Add, subtract, normalize, dot product, magnitude | Game 11: Pong |
| M3 | [Distance & Pythagorean Theorem](./math/m03-distance.md) | Circle collision, range checking | Game 9: Balloon Pop |
| M4 | [Linear Interpolation (Lerp)](./math/m04-lerp.md) | Smooth animation, camera follow, easing | Game 3: Memory Match |
| M5 | [Parametric Equations](./math/m05-parametric.md) | Trajectory preview, arc simulation | Game 16: Basketball |
| M6 | [Angle Reflection](./math/m06-reflection.md) | Ball bounce off surfaces | Game 11: Pong |
| M7 | [Modular Arithmetic](./math/m07-modular.md) | Rotation states, wrapping values | Game 24: Tetris |
| M8 | [Quadratic Formula](./math/m08-quadratic.md) | Line-circle intersection | Game 25: Fruit Ninja |
| M9 | [Probability & Weighted Random](./math/m09-probability.md) | Rarity systems, spawn weights | Game 48: Fishing |
| M10 | [Matrix Rotation](./math/m10-matrix-rotation.md) | Piece rotation with offset tables | Game 24: Tetris |
| M11 | [Exponential Growth](./math/m11-exponential.md) | Cost scaling, difficulty curves | Game 49: Idle Clicker |
| M12 | [Sine Wave Oscillation](./math/m12-sine-wave.md) | Bobbing, pulsing, wave surfaces | Game 13: Flappy Bird |

## Algorithms

| # | Concept | File | First Used In |
|---|---------|------|---------------|
| A1 | [Flood Fill (BFS/DFS)](./algorithms/a01-flood-fill.md) | Reveal areas, fill tool, flow | Game 30: Minesweeper |
| A2 | [Minimax with Alpha-Beta Pruning](./algorithms/a02-minimax.md) | Unbeatable game AI | Game 4: Tic-Tac-Toe |
| A3 | [Backtracking](./algorithms/a03-backtracking.md) | Puzzle generation, constraint solving | Game 31: Sudoku |
| A4 | [Maze Generation (Recursive Backtracker)](./algorithms/a04-maze-generation.md) | Perfect maze creation | Game 34: Maze Runner |
| A5 | [Fisher-Yates Shuffle](./algorithms/a05-shuffle.md) | Fair randomization | Game 3: Memory Match |
| A6 | [AABB Collision Detection](./algorithms/a06-aabb-collision.md) | Rectangle overlap testing | Game 12: Breakout |
| A7 | [Circle-Rectangle Collision](./algorithms/a07-circle-rect.md) | Ball vs brick, ball vs rim | Game 12: Breakout |
| A8 | [Circle-Circle Collision](./algorithms/a08-circle-circle.md) | Ship vs asteroid, click vs balloon | Game 22: Asteroids |
| A9 | [Line-Segment Intersection](./algorithms/a09-line-intersection.md) | Slice detection, wall collision | Game 25: Fruit Ninja |
| A10 | [Greedy Pathfinding](./algorithms/a10-pathfinding.md) | Ghost AI at intersections | Game 23: Pac-Man |
| A11 | [Cellular Automata](./algorithms/a11-cellular-automata.md) | Sand/water/fire simulation | Game 39: Particle Sand |
| A12 | [State Machines](./algorithms/a12-state-machines.md) | Game phases, entity behavior | Every game |
| A13 | [Delta-Time Game Loop](./algorithms/a13-delta-time.md) | Frame-rate independent physics | Every game |
| A14 | [Weighted Random Selection](./algorithms/a14-weighted-random.md) | Rarity systems, type distribution | Game 48: Fishing |
| A15 | [Stack & Queue Data Structures](./algorithms/a15-stack-queue.md) | Undo system, spawn scheduling | Game 29: Sokoban |

## Design Patterns

| # | Concept | File | First Used In |
|---|---------|------|---------------|
| D1 | [SOLID Principles Overview](./design-patterns/d01-solid.md) | Code organization | All games |
| D2 | [Adapter Pattern](./design-patterns/d02-adapter.md) | Platform bridge | All games |
| D3 | [Observer / Callback Pattern](./design-patterns/d03-observer.md) | Event-driven input | All games |
| D4 | [State Pattern](./design-patterns/d04-state-pattern.md) | Phase-based behavior | Game 23: Pac-Man |
| D5 | [Factory Pattern](./design-patterns/d05-factory.md) | State creation, level building | Game 31: Sudoku |
| D6 | [Strategy Pattern](./design-patterns/d06-strategy.md) | Interchangeable AI behaviors | Game 23: Pac-Man |
| D7 | [Component / ECS Pattern](./design-patterns/d07-ecs.md) | Systems + Renderers separation | All games |
| D8 | [Registry Pattern](./design-patterns/d08-registry.md) | Central game collection | Platform |
| D9 | [Template Method Pattern](./design-patterns/d09-template-method.md) | Fixed loop, varying systems | All engines |

## Physics

| # | Concept | File | First Used In |
|---|---------|------|---------------|
| P1 | [Gravity (Constant Acceleration)](./physics/p01-gravity.md) | Objects fall | Game 13: Flappy Bird |
| P2 | [Velocity & Acceleration](./physics/p02-velocity.md) | Movement basics | Game 10: Snake |
| P3 | [Friction & Drag](./physics/p03-friction.md) | Deceleration | Game 17: Golf |
| P4 | [Momentum & Inertia](./physics/p04-momentum.md) | Objects keep moving | Game 22: Asteroids |
| P5 | [Elastic Collision (Bounce)](./physics/p05-bounce.md) | Velocity reflection | Game 11: Pong |
| P6 | [Terminal Velocity](./physics/p06-terminal-velocity.md) | Max fall speed | Game 13: Flappy Bird |
| P7 | [Screen Wrapping](./physics/p07-screen-wrap.md) | Teleport to opposite edge | Game 22: Asteroids |
| P8 | [One-Way Platforms](./physics/p08-one-way-platforms.md) | Collide only when falling | Game 15: Doodle Jump |
| P9 | [Projectile Motion](./physics/p09-projectile-motion.md) | Parabolic arc | Game 16: Basketball |

## Game Systems

| # | Concept | File | First Used In |
|---|---------|------|---------------|
| G1 | [Wave / Spawn System](./game-systems/g01-wave-system.md) | Timed enemy spawning | Game 47: Tower Defense |
| G2 | [Economy System](./game-systems/g02-economy.md) | Earn/spend currency | Game 47: Tower Defense |
| G3 | [Combo System](./game-systems/g03-combo.md) | Consecutive hit multiplier | Game 8: Whack-a-Mole |
| G4 | [Level Progression](./game-systems/g04-level-progression.md) | Advance to harder content | Game 12: Breakout |
| G5 | [Camera System](./game-systems/g05-camera.md) | Viewport follows player | Game 41: Platformer |
| G6 | [Particle System](./game-systems/g06-particles.md) | Visual effects | Game 22: Asteroids |
| G7 | [Day/Night Cycle](./game-systems/g07-day-night.md) | Time-based phases | Game 44: Zombie Survival |
| G8 | [Fog of War](./game-systems/g08-fog-of-war.md) | Limited visibility | Game 34: Maze Runner |
| G9 | [Pheromone / Trail System](./game-systems/g09-pheromones.md) | Emergent pathfinding | Game 46: Ant Colony |
| G10 | [DAS (Delayed Auto Shift)](./game-systems/g10-das.md) | Held-key repeat input | Game 24: Tetris |

## Engineering

| # | Concept | File | First Used In |
|---|---------|------|---------------|
| E1 | [Event Listener Lifecycle](./engineering/e01-event-lifecycle.md) | Attach/detach, prevent leaks | Every game |
| E2 | [requestAnimationFrame Loop](./engineering/e02-raf-loop.md) | 60fps rendering | Every game |
| E3 | [localStorage Persistence](./engineering/e03-localstorage.md) | Save data across sessions | Game 1: Reaction Timer |
| E4 | [Path Aliases (TypeScript)](./engineering/e04-path-aliases.md) | Clean imports | Project-wide |
| E5 | [Module Bundling (Vite)](./engineering/e05-vite.md) | Dev server, production build | Project setup |
| E6 | [Canvas API Essentials](./engineering/e06-canvas-api.md) | Drawing, transforms, text | Game 1: Reaction Timer |

---

## How to Use This Reference

1. **Before a tutorial** — Read the concept pages listed in that game's "Concepts" section
2. **During a tutorial** — Click concept links when you need a deeper explanation
3. **For revision** — Browse by category to refresh your knowledge
4. **For YouTube** — Each concept page can be a standalone explainer episode

## Concept Page Format

Each concept file follows this structure:

```
# Concept Name

## What Is It?
Plain-English explanation with real-world analogy.

## The Math / The Algorithm / The Pattern
Formal definition with formulas or pseudocode.

## Visual Example
ASCII diagram or step-by-step walkthrough.

## Code Example
Minimal TypeScript snippet demonstrating the concept.

## Used In These Games
Links to tutorials where this concept appears.

## Common Pitfalls
Mistakes beginners make and how to avoid them.

## Further Reading
Optional links to deeper resources.
```
