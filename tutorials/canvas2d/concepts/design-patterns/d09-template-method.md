# Template Method Pattern

## What Is It?
The Template Method pattern defines the skeleton of an algorithm in a base method, letting subclasses (or variants) override specific steps without changing the overall structure. Think of a recipe template: "1. Prep ingredients. 2. Cook. 3. Plate." Every dish follows this sequence, but *what* you prep, *how* you cook, and *how* you plate varies by dish. The template (the sequence) stays the same.

In this codebase, every game engine follows the same high-level loop: `loop() -> update(dt) -> render()`. The `update()` step calls systems in a fixed order. The `render()` step calls renderers in layer order. Each game fills in *different* systems and renderers, but the skeleton is identical.

## The Pattern
```
  Engine (template)
  +loop(timestamp)
  |  dt = timestamp - lastTime
  |  if (playing):
  |    update(dt)        <-- step 1: run systems
  |  render()            <-- step 2: draw frame
  |  requestAnimationFrame(loop)
  |
  +update(dt)            <-- varies per game
  |  system1.update(state, dt)
  |  system2.update(state, dt)
  |  system3.update(state, dt)
  |
  +render()              <-- varies per game
  |  renderer1.render(ctx, state)
  |  renderer2.render(ctx, state)
  |  renderer3.render(ctx, state)

  Snake fills in:  Movement -> Collision -> Food -> Score
  Platformer:      Input -> Physics -> Collision -> Enemy -> Coin -> Goal -> Camera
  Tower Defense:   Wave -> Enemy -> Tower -> Combat -> Particles
```

## Code Example
```typescript
// The TEMPLATE: identical structure across all engines
// (shown here as a generalized pattern; each engine implements it)

class GameEngine<TState> {
  protected state: TState;
  protected systems: Updatable<TState>[] = [];
  protected renderers: Renderable<TState>[] = [];
  private lastTime = 0;
  private running = false;
  private rafId = 0;

  // The template method: FIXED sequence, NEVER overridden
  private loop(timestamp: number): void {
    if (!this.running) return;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    if (this.shouldUpdate()) {
      this.update(dt);         // step 1: game logic
    }
    this.render();             // step 2: draw
    this.rafId = requestAnimationFrame(t => this.loop(t));
  }

  // Varying step: each game defines its own system order
  protected update(dt: number): void {
    for (const system of this.systems) {
      system.update(this.state, dt);
    }
  }

  // Varying step: each game defines its own render layers
  protected render(): void {
    for (const renderer of this.renderers) {
      renderer.render(this.ctx, this.state);
    }
  }

  // Hook: each game decides when updates run
  protected shouldUpdate(): boolean {
    return true; // overridden by subclasses
  }
}

// SNAKE: fills in snake-specific systems and renderers
class SnakeEngine {
  // Systems in snake-specific order
  private tick(): void {
    this.movementSystem.update(this.state, dt);  // 1. move
    this.collisionSystem.update(this.state, dt); // 2. check death
    if (!this.state.gameOver) {
      this.foodSystem.update(this.state, dt);    // 3. check eating
      this.scoreSystem.update(this.state, dt);   // 4. update score
    }
  }

  // Renderers in snake-specific layer order
  private render(): void {
    this.boardRenderer.render(this.ctx, this.state); // 1. board + snake
    this.hudRenderer.render(this.ctx, this.state);   // 2. score overlay
  }
}

// TOWER DEFENSE: fills in tower-defense-specific systems
class TowerDefenseEngine {
  private update(dt: number): void {
    WaveSystem.update(state);                 // 1. spawn enemies
    EnemySystem.update(state, dt, this.grid); // 2. move enemies
    TowerSystem.update(state, this.grid);     // 3. aim towers
    CombatSystem.update(state, dt);           // 4. fire projectiles
    this.particleRenderer.update(state, dt);  // 5. animate particles
  }

  private render(): void {
    this.gridRenderer.render(ctx, state, grid);       // 1. terrain
    this.towerRenderer.render(ctx, state, grid);      // 2. towers
    this.enemyRenderer.render(ctx, state, cellSize);  // 3. enemies
    this.projectileRenderer.render(ctx, state);       // 4. projectiles
    this.particleRenderer.render(ctx, state);         // 5. particles
    this.hudRenderer.render(ctx, state, W);           // 6. HUD
    this.uiRenderer.render(ctx, state, W, H, ...);   // 7. UI panels
  }
}
```

## When to Use It
- Multiple classes share the same high-level algorithm but differ in specific steps.
- You want to enforce a fixed execution order (input before physics before collision) while allowing each game to define *what* runs at each step.
- You want to avoid copy-pasting the same loop/update/render skeleton into every engine.
- The invariant parts of the algorithm (dt calculation, early exit on game over, requestAnimationFrame scheduling) should be written once.

## Used In These Games
- **All engines**: Every game engine in the codebase follows the same template:
  1. `loop(timestamp)` computes delta time and calls `update()` then `render()`
  2. `update(dt)` calls systems in a game-specific fixed order
  3. `render()` calls renderers in a game-specific layer order
- **Snake**: `loop() -> tick() -> render()`. Tick order: Movement, Collision, Food, Score.
- **Platformer**: `loop() -> update() -> render()`. Update iterates `systems[]` array. Render iterates `renderers[]` array.
- **City Builder**: `loop() -> update() -> render()`. Update calls `economySystem.update()`. Render calls grid, panel, and HUD renderers.
- **Tower Defense**: `loop() -> update() -> render()`. Update calls Wave, Enemy, Tower, Combat systems. Render calls 8 renderers in layer order.

## Anti-Patterns
- **Overriding the template itself**: If a subclass replaces the entire `loop()` method, the template is gone. The whole point is that `loop()` is fixed and only the steps inside vary.
- **Unclear step order**: If systems can run in any order and produce the same result, you do not need a template -- you need a set. Templates matter when order matters (input must happen before physics, collision must happen before scoring).
- **Too many hooks**: A template with 20 overridable steps is just as confusing as no template at all. Keep the skeleton simple: update, then render. Let each step compose its own sub-steps internally.
- **Hidden coupling between steps**: If `GoalSystem` only works correctly because `CoinSystem` ran first and set `state.score`, that dependency is invisible. Document the required order or make dependencies explicit in the state.
