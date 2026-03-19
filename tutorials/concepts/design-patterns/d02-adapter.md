# Adapter Pattern

## What Is It?
The Adapter pattern translates one interface into another that a client expects. Think of a travel power adapter: your laptop has a US plug, but the wall socket in Europe is different. The adapter sits in between, making incompatible shapes fit together without modifying either side.

In this codebase, each game engine has its own API (different constructor signatures, different method names, different internal wiring). The platform launcher expects a single uniform `GameInstance` interface. `PlatformAdapter` bridges the gap.

## The Pattern
```
  GameLauncher
       |
       | calls start() / destroy()
       v
  <<interface>>
  GameInstance
  +start(): void
  +destroy(): void
       ^
       |  implements
       |
  PlatformAdapter
  - engine: CityEngine          <-- game-specific engine
  +start()  --> engine.start()
  +destroy()--> engine.destroy()
       |
       | delegates to
       v
  CityEngine
  +start(): void
  +destroy(): void
  - gridSystem, economySystem, ...
```

The adapter does NOT add logic. It only translates calls from one shape to another.

## Code Example
```typescript
// The platform expects this uniform interface:
export interface GameInstance {
  start(): void;
  destroy(): void;
}

// CityEngine has its own constructor and lifecycle.
// It does NOT implement GameInstance directly.
export class CityEngine {
  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    // Sets up grid, economy, stats, input, renderers...
  }
  start(): void { /* begins the game loop */ }
  destroy(): void { /* stops the loop, removes listeners */ }
}

// The adapter bridges the two:
export class PlatformAdapter implements GameInstance {
  private engine: CityEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new CityEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}

// Now the launcher can treat every game the same:
const game: GameInstance = new PlatformAdapter(canvas, onExit);
game.start();
// ...later...
game.destroy();
```

## When to Use It
- You have an existing class whose interface does not match what a consumer expects.
- You want to decouple a framework/platform layer from game-specific internals.
- You are integrating third-party code that you cannot modify.
- You want each game to control its own lifecycle while exposing a standard API to the launcher.

## Used In These Games
- **City Builder**: `src/games/city-builder/adapters/PlatformAdapter.ts` wraps `CityEngine`
- **Snake**: `src/games/snake/adapters/PlatformAdapter.ts` wraps `SnakeEngine`
- **Platformer**: `src/games/platformer/adapters/PlatformAdapter.ts` wraps `PlatformerEngine`
- **Physics Puzzle**: `src/games/physics-puzzle/adapters/PlatformAdapter.ts` wraps `PuzzleEngine`
- **Every game** in the codebase has a `PlatformAdapter` in its `adapters/` folder

## Anti-Patterns
- **Adapter with logic**: If your adapter is making game decisions (spawning enemies, computing scores), it has stopped being an adapter. Keep it as a thin translation layer.
- **Skipping the adapter**: Making the engine implement `GameInstance` directly. This works until the engine needs a different lifecycle (e.g., async initialization, multiple canvases). The adapter gives you a seam to handle mismatches later.
- **Adapter explosion**: Creating an adapter for every single method call between two classes that already share the same interface. If the shapes already match, you do not need an adapter.
