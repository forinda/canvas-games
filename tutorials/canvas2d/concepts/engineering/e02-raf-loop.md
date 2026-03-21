# requestAnimationFrame Loop

## What Is It?

`requestAnimationFrame` (rAF) is the browser's built-in way to run code on every screen refresh, typically 60 times per second. Think of it as the browser saying "I am about to paint the screen -- do you want to update anything first?" This is the heartbeat of every canvas game: update state, draw, repeat.

The alternative, `setInterval(fn, 16)`, runs on a fixed timer regardless of whether the browser is ready to paint. This causes tearing, wasted CPU when the tab is hidden, and poor timing accuracy. rAF synchronizes with the display's refresh rate, pauses when the tab is background, and provides a high-precision timestamp for calculating delta time.

## How It Works

```
Pattern:
  function gameLoop(timestamp) {
    const dt = (timestamp - lastTime) / 1000;  // seconds
    lastTime = timestamp;

    update(dt);   // physics, input, game logic
    render();     // draw everything

    requestAnimationFrame(gameLoop);  // schedule next frame
  }
  requestAnimationFrame(gameLoop);    // start the loop

Delta time (dt):
  Time elapsed since the last frame, in seconds.
  At 60 fps: dt ≈ 0.0167
  At 30 fps: dt ≈ 0.0333

Why dt matters:
  position += velocity * dt
  This makes movement frame-rate independent.
  At any fps, the object moves the same distance per second.

rAF vs setInterval:
  ┌──────────────┬─────────────────────┬──────────────────┐
  │              │ requestAnimationFrame│ setInterval(16)  │
  ├──────────────┼─────────────────────┼──────────────────┤
  │ Sync w/display│ Yes                │ No               │
  │ Tab hidden   │ Pauses (saves CPU)  │ Keeps running    │
  │ Timing       │ High precision      │ Can drift        │
  │ Timestamp    │ Provided by browser │ Must use Date.now│
  └──────────────┴─────────────────────┴──────────────────┘
```

## Code Example

```typescript
class GameLoop {
  private lastTime = 0;
  private rafId = 0;
  private running = false;
  private updateFn: (dt: number) => void;
  private renderFn: () => void;

  constructor(
    update: (dt: number) => void,
    render: () => void
  ) {
    this.updateFn = update;
    this.renderFn = render;
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private loop = (timestamp: number): void => {
    if (!this.running) return;

    // Calculate delta time in seconds
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this.updateFn(dt);
    this.renderFn();

    this.rafId = requestAnimationFrame(this.loop);
  };
}

// Usage
const loop = new GameLoop(
  (dt) => {
    // Update game state
    // player.x += player.vx * dt;
  },
  () => {
    // Draw everything
    // ctx.clearRect(0, 0, canvas.width, canvas.height);
    // drawPlayer(ctx);
  }
);

loop.start();
// later: loop.stop();
```

## Used In These Games

- **All games**: Every game engine in this project uses `requestAnimationFrame` as the main loop driver. The engine classes (e.g., `src/contexts/canvas2d/games/tower-defense/game-engine.ts`, `src/contexts/canvas2d/games/platformer/PlatformerEngine.ts`) call rAF to schedule updates and renders.
- **Tower Defense**: The game engine calculates dt from the rAF timestamp and passes it to all systems (wave, combat, economy, movement).
- **Snake**: Uses rAF but may throttle updates to a fixed tick rate (e.g., 10 moves per second) while still rendering at 60 fps for smooth animation.

## Common Pitfalls

- **Not capping dt**: If the user switches tabs for 10 seconds and returns, dt will be 10 seconds. Objects teleport across the screen. Cap dt to a maximum (e.g., `Math.min(dt, 0.1)`) to prevent physics explosions.
- **Using `setInterval` for the game loop**: setInterval does not sync with the display, wastes battery when the tab is hidden, and can cause visual tearing. Always use rAF for rendering.
- **Forgetting to cancel on stop**: If you call `requestAnimationFrame` without storing the ID and cancelling it when the game ends, the loop keeps running in the background, consuming CPU.
- **Putting game logic in the render function**: Separate `update(dt)` from `render()`. If you later want a fixed timestep for physics (update at 60 Hz) but render at the display's rate (144 Hz), this separation makes it possible.
