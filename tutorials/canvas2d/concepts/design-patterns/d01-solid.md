# SOLID Principles

## What Is It?
SOLID is a set of five design principles that make software easier to understand, change, and extend. Think of them like building codes for a house -- you *can* ignore them and the house might stand up, but the moment you try to add a second floor or move a wall, everything collapses.

Each letter stands for one principle:
- **S** -- Single Responsibility
- **O** -- Open/Closed
- **L** -- Liskov Substitution
- **I** -- Interface Segregation
- **D** -- Dependency Inversion

---

## S -- Single Responsibility Principle

> A class should have only one reason to change.

### The Pattern
```
+-----------------+          +-----------------+
|  MovementSystem |          |  CollisionSystem|
|-----------------|          |-----------------|
| update(state)   |          | update(state)   |
+-----------------+          +-----------------+
     moves snake               checks wall/body hits

NOT:
+--------------------------+
|  SnakeEverythingManager  |
|--------------------------|
| moveSnake()              |
| checkCollisions()        |
| spawnFood()              |
| renderBoard()            |
| updateScore()            |
+--------------------------+
```

### Code Example
```typescript
// Each system owns exactly ONE concern.
// MovementSystem only moves the snake -- nothing else.
export class MovementSystem implements Updatable<SnakeState> {
  update(state: SnakeState, dt: number): void {
    state.dir = state.nextDir;
    const head = state.snake[0];
    const moves: Record<Direction, Point> = {
      up:    { x: head.x, y: head.y - 1 },
      down:  { x: head.x, y: head.y + 1 },
      left:  { x: head.x - 1, y: head.y },
      right: { x: head.x + 1, y: head.y },
    };
    state.snake.unshift(moves[state.dir]);
    state.snake.pop();
  }
}

// CollisionSystem only detects collisions -- it doesn't move anything.
export class CollisionSystem implements Updatable<SnakeState> {
  update(state: SnakeState, dt: number): void {
    const head = state.snake[0];
    if (head.x < 0 || head.x >= state.gridW ||
        head.y < 0 || head.y >= state.gridH) {
      state.gameOver = true;
    }
  }
}
```

### When to Use It
Every class you write. If you find yourself describing a class with "and" ("it moves the player *and* checks collisions *and* renders"), split it up.

### Used In These Games
- **Snake**: Separate MovementSystem, CollisionSystem, FoodSystem, ScoreSystem
- **Platformer**: PhysicsSystem, CollisionSystem, EnemySystem, CoinSystem, GoalSystem, CameraSystem
- **Tower Defense**: WaveSystem, EnemySystem, TowerSystem, CombatSystem -- each owns one slice of logic

### Anti-Patterns
- **God class**: One `GameManager` that handles input, physics, rendering, scoring, and sound. Any change to scoring risks breaking physics.
- **"Helper" classes**: `GameUtils` with 40 unrelated static methods. That is no responsibility -- it is a junk drawer.

---

## O -- Open/Closed Principle

> Software entities should be open for extension, closed for modification.

### The Pattern
```
  <<interface>>
  Updatable<TState>
  +update(state, dt): void
        ^
        |
  +-----|-------+-------+--------+
  |             |       |        |
Physics    Collision  Enemy   Camera
System      System   System   System
```

### Code Example
```typescript
// The engine iterates a list of Updatable systems.
// To add a new system, you EXTEND -- you never MODIFY the engine loop.
export class PlatformerEngine {
  private systems: Updatable<PlatState>[];

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.systems = [
      new InputSystem(onExit),
      new PhysicsSystem(),
      new CollisionSystem(),
      new EnemySystem(),
      new CoinSystem(),
      new GoalSystem(),
      new CameraSystem(canvas),
    ];
  }

  // Adding a PowerUpSystem? Push it into the array.
  // The update loop never changes:
  private update(dt: number): void {
    for (const system of this.systems) {
      system.update(this.state, dt);
    }
  }
}
```

### When to Use It
When you expect new behaviors to be added over time -- new enemy types, new systems, new renderers. Design the "slot" once, fill it many times.

### Used In These Games
- **Platformer**: `systems: Updatable<PlatState>[]` -- add new systems without touching the loop
- **All games**: Renderers follow the same pattern via `Renderable<TState>`

### Anti-Patterns
- Adding `if (type === 'new_thing')` branches inside existing methods every time you add a feature. That modifies existing code instead of extending.

---

## L -- Liskov Substitution Principle

> Subtypes must be substitutable for their base types without breaking the program.

### The Pattern
```
    <<interface>>
    GameInstance
    +start(): void
    +destroy(): void
         ^
         |
    PlatformAdapter
    +start(): void    <-- delegates to engine.start()
    +destroy(): void  <-- delegates to engine.destroy()
```

### Code Example
```typescript
// GameInstance is the contract the launcher depends on.
export interface GameInstance {
  start(): void;
  destroy(): void;
}

// PlatformAdapter implements GameInstance.
// The launcher can swap ANY game in without knowing the internals.
export class PlatformAdapter implements GameInstance {
  private engine: CityEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new CityEngine(canvas, onExit);
  }

  start(): void { this.engine.start(); }
  destroy(): void { this.engine.destroy(); }
}

// The launcher treats every game identically:
class GameLauncher {
  private currentGame: GameInstance | null = null;

  private launchGame(game: GameDefinition): void {
    // Any GameInstance works here -- Snake, Platformer, Tower Defense...
    this.currentGame = game.create(this.canvas, () => this.showMenu());
  }
}
```

### When to Use It
Whenever code accepts a base type or interface. Any implementation handed to that code must honor the contract -- same method signatures, same behavioral guarantees.

### Used In These Games
- **All games**: Every game exports a `PlatformAdapter` that implements `GameInstance`. The launcher calls `.start()` and `.destroy()` without caring which game it is.

### Anti-Patterns
- A subclass that throws "not implemented" for a method the base type promises. If `start()` is in the interface, every implementor must actually start.

---

## I -- Interface Segregation Principle

> Clients should not be forced to depend on interfaces they do not use.

### The Pattern
```
  Updatable<TState>              Renderable<TState>
  +update(state, dt): void       +render(ctx, state): void

       ^                               ^
       |                               |
  PhysicsSystem                  WorldRenderer

  NOT:
  GameComponent<TState>
  +update(state, dt): void
  +render(ctx, state): void    <-- PhysicsSystem forced to implement render?
  +handleInput(e): void        <-- WorldRenderer forced to handle input?
```

### Code Example
```typescript
// Three small, focused interfaces instead of one bloated one:

/** System that updates game logic each frame */
export interface Updatable<TState> {
  update(state: TState, dt: number): void;
}

/** Component that draws to the canvas */
export interface Renderable<TState> {
  render(ctx: CanvasRenderingContext2D, state: TState): void;
}

/** Input handler that can attach/detach event listeners cleanly */
export interface InputHandler {
  attach(): void;
  detach(): void;
}

// PhysicsSystem implements ONLY Updatable -- it never renders.
// WorldRenderer implements ONLY Renderable -- it never updates logic.
// InputSystem implements BOTH Updatable AND InputHandler -- its choice.
```

### When to Use It
When you notice a class implementing an interface but leaving methods as no-ops or throwing errors. That interface is too wide -- split it.

### Used In These Games
- **Entire codebase**: `Updatable`, `Renderable`, and `InputHandler` are three separate interfaces in `src/core/`. No class is forced to implement methods it does not need.

### Anti-Patterns
- One `Component` interface with `update()`, `render()`, `onInput()`, `onResize()`, `serialize()`. Most classes would stub half of these.

---

## D -- Dependency Inversion Principle

> High-level modules should not depend on low-level modules. Both should depend on abstractions.

### The Pattern
```
  GameLauncher (high-level)
       |
       v
  GameDefinition.create()  <-- abstraction (factory function)
       |
       v
  PlatformAdapter (low-level)

  GameLauncher never imports CityEngine, SnakeEngine, etc.
  It only knows GameDefinition and GameInstance.
```

### Code Example
```typescript
// High-level: GameLauncher depends on the GameDefinition abstraction
export interface GameDefinition {
  id: string;
  name: string;
  create(canvas: HTMLCanvasElement, onExit: () => void): GameInstance;
}

// Low-level: each game provides a concrete GameDefinition
export const SnakeGame: GameDefinition = {
  id: 'snake',
  name: 'Snake',
  create(canvas, onExit) {
    const adapter = new PlatformAdapter(canvas, onExit);
    adapter.start();
    return adapter;
  },
};

// The launcher never imports SnakeEngine directly.
// It calls game.create() and gets back a GameInstance.
class GameLauncher {
  private launchGame(game: GameDefinition): void {
    this.currentGame = game.create(this.canvas, () => this.showMenu());
  }
}
```

### When to Use It
When a high-level orchestrator (engine, launcher, framework) should not be coupled to specific implementations. Define the abstraction boundary, and let low-level modules plug in.

### Used In These Games
- **Platform layer**: `GameLauncher` depends on `GameDefinition` / `GameInstance` interfaces, never on concrete engine classes
- **All engines**: Depend on `Updatable<T>` and `Renderable<T>` interfaces, not on concrete system classes in their update/render loops (Platformer is the clearest example)

### Anti-Patterns
- `GameLauncher` importing `SnakeEngine`, `CityEngine`, `PlatformerEngine` directly and using a switch statement to pick one. Adding a new game means modifying the launcher.
