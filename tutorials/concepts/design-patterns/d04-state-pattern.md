# State Pattern

## What Is It?
The State pattern lets an object change its behavior when its internal state changes. It looks as if the object changed its class. Think of a traffic light: the light itself does not change, but its behavior (which color is on, how long it stays, what happens next) is entirely determined by its current state -- red, yellow, or green.

A classic game example is Pac-Man ghost behavior. In "chase" mode, ghosts hunt the player. In "scatter" mode, they retreat to corners. In "frightened" mode (after the player eats a power pellet), they run away and can be eaten. The ghost object is the same -- its state determines everything.

## The Pattern
```
  Ghost
  - currentMode: GhostMode
  +update(dt)
       |
       | delegates behavior based on mode
       v
  +-----------+    +-----------+    +-------------+
  |   CHASE   |    |  SCATTER  |    |  FRIGHTENED  |
  |-----------|    |-----------|    |-------------|
  | target:   |    | target:   |    | target:     |
  |  player   |    |  corner   |    |  away from  |
  |           |    |           |    |  player     |
  | speed: 1x |    | speed: 1x |    | speed: 0.5x |
  | color: red |   | color: red|    | color: blue |
  | edible: no|    | edible: no|    | edible: yes |
  +-----------+    +-----------+    +-------------+

  Transitions:
  CHASE  --timer--> SCATTER --timer--> CHASE  (cycles)
  ANY    --power pellet--> FRIGHTENED --timer--> previous mode
```

## Code Example
```typescript
type GhostMode = 'chase' | 'scatter' | 'frightened';

interface GhostState {
  mode: GhostMode;
  modeTimer: number;
  x: number;
  y: number;
  speed: number;
  targetX: number;
  targetY: number;
  edible: boolean;
}

function updateGhost(ghost: GhostState, player: Player, dt: number): void {
  ghost.modeTimer -= dt;

  // State transitions
  if (ghost.modeTimer <= 0 && ghost.mode !== 'frightened') {
    ghost.mode = ghost.mode === 'chase' ? 'scatter' : 'chase';
    ghost.modeTimer = ghost.mode === 'chase' ? 20 : 7;
  }

  // Behavior depends entirely on current mode
  switch (ghost.mode) {
    case 'chase':
      ghost.targetX = player.x;
      ghost.targetY = player.y;
      ghost.speed = 100;
      ghost.edible = false;
      break;

    case 'scatter':
      ghost.targetX = ghost.cornerX;  // fixed corner
      ghost.targetY = ghost.cornerY;
      ghost.speed = 100;
      ghost.edible = false;
      break;

    case 'frightened':
      ghost.targetX = ghost.x + (Math.random() - 0.5) * 200;
      ghost.targetY = ghost.y + (Math.random() - 0.5) * 200;
      ghost.speed = 50;
      ghost.edible = true;
      if (ghost.modeTimer <= 0) {
        ghost.mode = 'chase';
        ghost.modeTimer = 20;
      }
      break;
  }

  // Movement toward target is the SAME regardless of mode
  moveToward(ghost, ghost.targetX, ghost.targetY, ghost.speed * dt);
}

function onPowerPelletEaten(ghosts: GhostState[]): void {
  for (const ghost of ghosts) {
    ghost.mode = 'frightened';
    ghost.modeTimer = 8;  // 8 seconds of vulnerability
  }
}
```

## When to Use It
- An entity has clearly distinct behavioral modes (idle, patrol, attack, flee).
- The same inputs produce different outputs depending on which mode is active.
- You want to avoid deeply nested `if/else` chains that check the current state everywhere.
- State transitions are well-defined and finite (a state machine).

## Used In These Games
- **Tower Defense**: `GameStateData.screen` controls behavior -- `'menu'`, `'playing'`, `'paused'`, `'gameover'`, `'win'`. The entire update loop is skipped when `screen !== 'playing'`. Rendering switches between `MenuRenderer` and the game renderers.
- **Snake**: `SnakeState` has `started`, `paused`, `gameOver` flags. The tick loop only runs when `started && !paused && !gameOver`. Input handling changes per state (arrow keys move in playing, Enter restarts in gameOver).
- **Platformer**: `PlatState` has `started`, `gameOver`, `won`. Click behavior changes: before start it starts the game, after game over it resets, after winning it advances the level.
- **Pac-Man**: Ghost modes (chase/scatter/frightened) are the textbook example of the State pattern in games.

## Anti-Patterns
- **Boolean soup**: Using `isChasing`, `isScattering`, `isFrightened` as separate booleans. Multiple can be true at once, leading to undefined behavior. Use a single `mode` field with a union type instead.
- **State checks scattered everywhere**: If 15 different methods all start with `if (this.mode === 'chase')`, you are duplicating the state logic. Centralize it -- either in a switch or by delegating to state-specific handler objects.
- **No explicit transitions**: Mutating the mode from anywhere in the code without a clear transition function. This makes it impossible to trace state changes or add transition side effects (like playing a sound when entering frightened mode).
