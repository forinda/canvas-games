# Animation Loop

## What Is It?

A game is not a static image -- it is a continuous stream of frames drawn as fast as the display allows, typically 60 frames per second. The animation loop is the heartbeat of every game: it clears the canvas, updates game state, redraws everything, and schedules the next frame. In the browser, `requestAnimationFrame` is the mechanism that drives this loop, calling your render function in sync with the display's refresh rate.

The critical concept is **delta time**: the elapsed milliseconds between the current frame and the previous frame. Without delta time, game speed depends on frame rate -- the game runs faster on a 144Hz monitor than a 60Hz monitor, and it stutters when the browser drops frames. By multiplying all movement and physics by delta time, you make the game frame-rate-independent: a ball moves the same distance per second whether the game runs at 30fps or 120fps.

Every single game in the arcade uses this pattern. It is the skeleton that all game logic hangs on. The loop runs from the moment the game starts until the player quits, pausing only when the tab is hidden (the browser automatically pauses `requestAnimationFrame` for background tabs).

## How It Works

```
The frame cycle:
  ┌─────────────┐
  │  Clear      │ ← erase everything from last frame
  │  canvas     │
  └──────┬──────┘
         │
  ┌──────▼──────┐
  │  Update     │ ← move objects, check collisions, advance state
  │  game state │    (use delta time for frame-rate independence)
  └──────┬──────┘
         │
  ┌──────▼──────┐
  │  Draw       │ ← render everything in the new state
  │  everything │
  └──────┬──────┘
         │
  ┌──────▼──────────────┐
  │  requestAnimationFrame │ ← schedule next frame
  └─────────────────────┘

requestAnimationFrame(callback):
  - Calls callback before the next screen repaint (~16.67ms at 60Hz)
  - Passes a high-resolution timestamp (DOMHighResTimeStamp)
  - Automatically pauses when the tab is not visible
  - Returns an ID for cancellation via cancelAnimationFrame(id)

Delta time:
  currentTime:  1000.0ms   1016.7ms   1033.3ms
  deltaTime:      —         16.7ms     16.7ms

  movement = speed * deltaTime / 1000
  (speed in pixels-per-second, deltaTime in ms)
```

## Code Example

```typescript
// animation-loop.ts — Complete game loop with delta time

interface GameState {
  ball: { x: number; y: number; vx: number; vy: number; radius: number };
  paddle: { x: number; width: number; height: number };
  score: number;
  running: boolean;
}

function createGameLoop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const state: GameState = {
    ball: { x: width / 2, y: height / 2, vx: 200, vy: -250, radius: 8 },
    paddle: { x: width / 2 - 50, width: 100, height: 12 },
    score: 0,
    running: true,
  };

  let lastTime = 0;
  let animationId: number;

  function update(dt: number): void {
    const { ball } = state;
    const seconds = dt / 1000; // convert ms to seconds

    // Move ball (frame-rate independent)
    ball.x += ball.vx * seconds;
    ball.y += ball.vy * seconds;

    // Wall bouncing
    if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= width) {
      ball.vx *= -1;
      ball.x = Math.max(ball.radius, Math.min(width - ball.radius, ball.x));
    }
    if (ball.y - ball.radius <= 0) {
      ball.vy *= -1;
      ball.y = ball.radius;
    }

    // Paddle collision
    const paddleTop = height - 40;
    if (
      ball.vy > 0 &&
      ball.y + ball.radius >= paddleTop &&
      ball.x >= state.paddle.x &&
      ball.x <= state.paddle.x + state.paddle.width
    ) {
      ball.vy *= -1;
      ball.y = paddleTop - ball.radius;
      state.score += 10;
    }

    // Ball out of bounds (bottom)
    if (ball.y > height + ball.radius) {
      ball.x = width / 2;
      ball.y = height / 2;
      ball.vy = -250;
    }
  }

  function draw(): void {
    // 1. Clear the entire canvas
    ctx.clearRect(0, 0, width, height);

    // 2. Background
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, width, height);

    // 3. Ball
    ctx.fillStyle = "#00ccff";
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // 4. Paddle
    ctx.fillStyle = "#00ff88";
    ctx.fillRect(state.paddle.x, height - 40, state.paddle.width, state.paddle.height);

    // 5. Score HUD
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`Score: ${state.score}`, 16, 16);

    // 6. FPS counter (for debugging)
    ctx.fillStyle = "#666666";
    ctx.font = "12px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(1000 / Math.max(1, performance.now() - lastTime))} FPS`, width - 16, 16);
  }

  function gameLoop(currentTime: number): void {
    if (!state.running) return;

    // Calculate delta time, capped at 100ms to prevent huge jumps
    const dt = lastTime === 0 ? 16.67 : Math.min(currentTime - lastTime, 100);
    lastTime = currentTime;

    update(dt);
    draw();

    animationId = requestAnimationFrame(gameLoop);
  }

  // Start the loop
  animationId = requestAnimationFrame(gameLoop);

  // Cleanup function
  window.addEventListener("beforeunload", () => {
    state.running = false;
    cancelAnimationFrame(animationId);
  });
}
```

## Visual Result

The canvas shows a dark background with a cyan ball bouncing around, rebounding off the left, right, and top walls. A green paddle sits near the bottom. When the ball hits the paddle, it bounces upward and the score increments. The ball moves at a consistent speed regardless of the monitor's refresh rate: on a 60Hz screen, it moves about 3.3 pixels per frame; on a 144Hz screen, it moves about 1.4 pixels per frame, but covers the same distance per second. A small FPS counter in the top-right corner shows the current frame rate. The canvas is fully cleared and redrawn every frame, so there are no ghost trails or artifacts.

## Used In These Games

- **Every single game**: All 50 games use `requestAnimationFrame` as their core loop. The clear-update-draw cycle is universal.
- **Pong**: Ball physics and paddle movement use delta time for smooth, consistent speed.
- **Breakout**: Ball trajectory, brick collision checks, and power-up animation all run inside the game loop.
- **Asteroids**: Ship momentum, asteroid drift, and bullet travel all multiply velocity by delta time.
- **Tetris**: The drop timer uses accumulated delta time to determine when to advance the piece down one row.
- **Particle Sand**: The simulation step and full-canvas render happen each frame inside the loop.

## Common Pitfalls

- **Using `setInterval` instead of `requestAnimationFrame`**: `setInterval(fn, 16)` does not sync with the display refresh, causing tearing and wasted CPU when the tab is hidden. Fix: always use `requestAnimationFrame`.
- **Not capping delta time**: If the user switches tabs for 10 seconds and comes back, the delta time is 10000ms. Physics runs one giant step, and the ball teleports through walls. Fix: cap delta time to a maximum (e.g., 100ms): `Math.min(dt, 100)`.
- **Forgetting to clear the canvas**: Without `clearRect`, each frame draws on top of the last. Moving objects leave trails (sometimes desired, but usually a bug). Fix: call `ctx.clearRect(0, 0, width, height)` at the start of each frame.
- **Frame-rate-dependent logic**: Using `ball.x += 5` instead of `ball.x += speed * dt` makes the game run at different speeds on different hardware. Fix: always multiply movement by delta time.
- **Accumulating floating-point errors**: Over thousands of frames, multiplying by small delta values can accumulate precision errors. Fix: for critical values (like grid-aligned positions in Tetris), snap to integer positions after movement.

## API Reference

- `requestAnimationFrame(callback)` — Schedules a function to run before the next screen repaint. Returns an ID.
- `cancelAnimationFrame(id)` — Cancels a previously scheduled animation frame.
- `ctx.clearRect(x, y, width, height)` — Erases a rectangular area to fully transparent pixels.
- `performance.now()` — Returns a high-resolution timestamp in milliseconds (useful for manual timing).
- `DOMHighResTimeStamp` — The timestamp type passed to the `requestAnimationFrame` callback.
