# Entity-Component-System (ECS-Like Separation)

## What Is It?
Entity-Component-System is an architectural pattern that separates data from behavior. Instead of objects that *own* their logic (like a `Player` class with `move()`, `render()`, `takeDamage()`), ECS splits things into three parts:

- **Entities**: just IDs or plain data bags (the "nouns")
- **Components**: data attached to entities (position, health, sprite)
- **Systems**: functions that process entities with specific components (the "verbs")

Think of a spreadsheet: each row is an entity, each column is a component, and formulas that process columns are systems. The formula does not live inside the cell -- it operates *across* cells.

This codebase uses an ECS-*like* approach. The state object is the entity (a plain data bag). Systems read and mutate it. Renderers read it and draw. No system "owns" the state -- they all share it.

## The Pattern
```
  GameState (Entity + Components)
  +player: { x, y, vx, vy }     <-- position component
  +platforms: Platform[]          <-- world component
  +coins: Coin[]                  <-- collectible component
  +score: number                  <-- score component
  +gameOver: boolean              <-- lifecycle component

       |  passed to           |  passed to
       v                      v
  Systems (Update)       Renderers (Draw)
  +------------------+   +------------------+
  | InputSystem      |   | WorldRenderer    |
  | PhysicsSystem    |   | EntityRenderer   |
  | CollisionSystem  |   | HUDRenderer      |
  | EnemySystem      |   +------------------+
  | CoinSystem       |
  | GoalSystem       |
  | CameraSystem     |
  +------------------+

  Systems MUTATE state.  Renderers READ state.  Neither owns it.
```

## Code Example
```typescript
// The "entity": a plain data object, no methods
export interface PlatState {
  px: number; py: number;           // position
  vx: number; vy: number;           // velocity
  onGround: boolean;                // physics flag
  platforms: Platform[];             // world data
  coins: Coin[];                     // collectibles
  enemies: Enemy[];                  // hazards
  score: number; lives: number;      // scoring
  camX: number; camY: number;        // camera
  gameOver: boolean; won: boolean;   // lifecycle
}

// Systems: stateless processors that update ONE concern
export interface Updatable<TState> {
  update(state: TState, dt: number): void;
}

export interface Renderable<TState> {
  render(ctx: CanvasRenderingContext2D, state: TState): void;
}

// Engine: wires systems and renderers, runs them in order
export class PlatformerEngine {
  private state: PlatState;
  private systems: Updatable<PlatState>[];
  private renderers: Renderable<PlatState>[];

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.state = buildLevel(1);

    // Systems update in fixed order
    this.systems = [
      new InputSystem(onExit),      // reads keys -> sets velocity
      new PhysicsSystem(),           // applies gravity, moves player
      new CollisionSystem(),         // resolves platform collisions
      new EnemySystem(),             // moves enemies, checks hits
      new CoinSystem(),              // checks coin collection
      new GoalSystem(),              // checks level completion
      new CameraSystem(canvas),      // follows player
    ];

    // Renderers draw in layer order
    this.renderers = [
      new WorldRenderer(canvas),     // sky, platforms, goal
      new EntityRenderer(),          // player, enemies, coins
      new HUDRenderer(canvas),       // score, lives, level
    ];
  }

  private update(dt: number): void {
    for (const system of this.systems) {
      system.update(this.state, dt);
      if (this.state.gameOver) return;  // early exit
    }
  }

  private render(): void {
    for (const renderer of this.renderers) {
      renderer.render(this.ctx, this.state);
    }
  }
}
```

## When to Use It
- Your game has many interacting subsystems (physics, AI, scoring, rendering).
- You want systems to be testable in isolation (pass in a mock state, call `update()`, check the result).
- You want to add/remove systems without modifying the engine loop (Open/Closed).
- State needs to be serializable (plain objects are easy to snapshot or save).

## Used In These Games
- **Platformer**: Cleanest example. `systems: Updatable<PlatState>[]` and `renderers: Renderable<PlatState>[]` are iterated in fixed order. State is a plain `PlatState` interface.
- **Snake**: `SnakeEngine.tick()` calls `movementSystem.update()`, `collisionSystem.update()`, `foodSystem.update()`, `scoreSystem.update()` in sequence. `render()` calls `boardRenderer.render()` and `hudRenderer.render()`.
- **City Builder**: `CityEngine.update()` calls `economySystem.update()`. `render()` calls `gridRenderer`, `panelRenderer`, `hudRenderer` in layer order.
- **Tower Defense**: `GameEngine.update()` calls `WaveSystem.update()`, `EnemySystem.update()`, `TowerSystem.update()`, `CombatSystem.update()` in sequence. Eight renderers draw layers from grid to HUD.

## Anti-Patterns
- **Systems storing state**: If `PhysicsSystem` has a `private velocity` field instead of reading `state.vy`, it is hiding data that other systems need. State should live in the shared state object.
- **Systems calling other systems**: If `CollisionSystem` calls `ScoreSystem.addPoints()`, you have coupling between systems. Instead, `CollisionSystem` sets `state.coins[i].collected = true`, and `ScoreSystem` reads that flag on its next update.
- **Renderer modifying state**: Renderers should be pure readers. If `HUDRenderer` is modifying `state.score` to format it, something is wrong. Renderers read, systems write.
- **God state**: A single state object with 200 fields becomes hard to reason about. Consider grouping related fields into sub-objects (e.g., `state.player`, `state.camera`, `state.scoring`).
