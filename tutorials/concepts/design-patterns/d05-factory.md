# Factory Pattern

## What Is It?
The Factory pattern centralizes object creation behind a function or method, so the caller does not need to know the details of *how* to construct the object. Think of ordering a car: you tell the dealership "I want a sedan in blue." You do not personally weld the chassis, install the engine, and paint it. The factory handles all of that and hands you a finished product.

In this codebase, factory functions like `createInitialState()`, `buildLevel()`, and `createMenuState()` construct complex game state objects. The caller says "give me level 3" and gets back a fully wired state with platforms, coins, enemies, and a goal.

## The Pattern
```
  Caller
    |
    | buildLevel(3)
    v
  Factory Function
  - creates platforms[]
  - creates coins[]
  - creates enemies[]
  - sets player spawn
  - computes goal position
    |
    | returns
    v
  PlatState  (fully initialized, ready to use)
```

Why not construct directly? Because the construction logic is:
1. Complex (dozens of fields, computed values, procedural generation)
2. Varied by input (level 1 vs level 5 have different counts)
3. Reused (called on start, on level advance, on restart)

## Code Example
```typescript
// Factory: centralizes ALL the complexity of building a level
export function buildLevel(level: number): PlatState {
  const platforms: Platform[] = [];
  const coins: Coin[] = [];
  const enemies: Enemy[] = [];

  // Ground
  platforms.push({ x: 0, y: 500, w: 2400, h: 40,
                   color: '#4a6741', type: 'solid' });

  // Procedural platforms scaled by level
  const count = 8 + level * 3;
  for (let i = 0; i < count; i++) {
    const px = 200 + i * 250 + Math.random() * 100;
    const py = 300 + Math.sin(i * 0.7) * 150 - level * 10;
    const w = 80 + Math.random() * 100;
    const type = i % 5 === 0 ? 'moving'
               : i % 7 === 0 ? 'crumble' : 'solid';
    platforms.push({ x: px, y: py, w, h: 16,
                     color: type === 'crumble' ? '#8b5e3c' : '#5a7a5a',
                     type });
    if (Math.random() > 0.3) {
      coins.push({ x: px + w / 2, y: py - 25, collected: false });
    }
  }

  // Enemies scaled by level
  for (let i = 0; i < 3 + level; i++) {
    const ex = 400 + i * 500;
    enemies.push({ x: ex, y: 474, w: 24, h: 24,
                   speed: 50 + level * 10, dir: 1,
                   minX: ex - 100, maxX: ex + 100 });
  }

  const goalX = 200 + count * 250;
  return {
    px: 60, py: 460, vx: 0, vy: 0,
    pw: PLAYER_W, ph: PLAYER_H,
    onGround: false, jumping: false, facing: 1,
    platforms, coins, enemies,
    camX: 0, camY: 0,
    score: 0, lives: 3, level,
    gameOver: false, won: false, started: false,
    goalX, goalY: 460,
  };
}

// Callers are simple:
this.state = buildLevel(1);                     // start
this.state = buildLevel(s.won ? s.level + 1 : 1);  // advance or restart
```

## When to Use It
- Construction is complex: many fields, computed values, interdependencies.
- Construction varies by input: different game modes, difficulty levels, or configurations produce different objects.
- Construction is reused: the same setup happens on start, restart, and level advance.
- You want to test with mock states: a factory function can be called with test parameters.

## Used In These Games
- **Platformer**: `buildLevel(level)` generates a complete `PlatState` with procedural platforms, coins, enemies, and a goal position scaled by level number.
- **Tower Defense**: `createInitialState(mode)` builds a `GameStateData` using mode-specific config (lives, gold, wave count) and a freshly generated grid with path cells. `createMenuState()` builds the menu variant.
- **Snake**: The `reset()` method in `SnakeEngine` acts as an inline factory -- it reconstructs the initial snake position, direction, score, and respawns food.
- **City Builder**: The `CityEngine` constructor creates the initial `CityState` with an empty grid, starting resources, and default values.

## Anti-Patterns
- **Scattered construction**: Building `PlatState` field by field in the engine constructor, then again in the restart handler, then again in the level-advance handler. Any field added to the type must be set in three places.
- **Constructor doing too much**: If a class constructor is 100 lines of setup, extract it into a factory function. The constructor should wire things together; the factory should compute initial data.
- **Returning partial objects**: A factory that returns `Partial<PlatState>` and expects the caller to fill in the rest defeats the purpose. The factory should return a complete, valid object.
