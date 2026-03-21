# Step 1: Paddle & Ball Setup

**Goal:** Set up the Breakout canvas with a mouse-controlled paddle and a bouncing ball.

**Time:** ~15 minutes

---

## What You'll Build

Foundation elements:
- **Dark game background**: Deep-blue arena with a subtle grid pattern
- **Mouse-controlled paddle**: Follows your cursor horizontally along the bottom
- **Moving ball**: Small white circle with a pulsing glow
- **Wall bouncing**: Ball reflects off left, right, and top walls
- **Delta-time physics**: Frame-rate independent movement

---

## Concepts

- **Mouse Tracking**: Listen for `mousemove`, convert client coordinates to canvas coordinates
- **Paddle Clamping**: Keep the paddle within canvas bounds using `Math.max` / `Math.min`
- **Wall Reflection**: Reverse the velocity component perpendicular to the wall
- **Delta-Time Movement**: `position += velocity * dt` for consistent speed on any monitor

---

## Code

### 1. Create Types

**File:** `src/contexts/canvas2d/games/breakout/types.ts`

Define the game constants, interfaces, and state shape. Even though we only need the paddle and ball right now, we will set up the full state type so we can grow into it over the next steps.

```typescript
export type GamePhase = 'start' | 'playing' | 'paused' | 'gameover' | 'win';

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export interface Paddle {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BreakoutState {
  phase: GamePhase;
  balls: Ball[];
  paddle: Paddle;
  canvasW: number;
  canvasH: number;
  mouseX: number;
}

// Constants
export const PADDLE_H = 14;
export const PADDLE_W = 100;
export const BALL_R = 6;
export const BALL_SPEED = 300; // px per second
```

**What's happening:**
- `Ball` stores position (`x`, `y`), velocity (`vx`, `vy`), and radius (`r`).
- `Paddle` is a simple rectangle described by its top-left corner and dimensions.
- `mouseX` tracks the latest mouse X so the paddle can follow it every frame.
- We store an array of `balls` even though we start with one. This makes multi-ball easy later.

---

### 2. Create the Board Renderer

**File:** `src/contexts/canvas2d/games/breakout/renderers/BoardRenderer.ts`

Draw the background, paddle, and ball:

```typescript
import type { BreakoutState } from '../types';

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: BreakoutState): void {
    const W = state.canvasW;
    const H = state.canvasH;

    // Dark background
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(0, 0, W, H);

    // Subtle grid lines for depth
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Paddle
    this.drawPaddle(ctx, state);

    // Balls
    for (const ball of state.balls) {
      this.drawBall(ctx, ball);
    }
  }

  private drawPaddle(ctx: CanvasRenderingContext2D, state: BreakoutState): void {
    const p = state.paddle;
    const color = '#3498db';

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;

    // Rounded paddle using arcs on each end
    const r = p.h / 2;
    ctx.beginPath();
    ctx.moveTo(p.x + r, p.y);
    ctx.lineTo(p.x + p.w - r, p.y);
    ctx.arc(p.x + p.w - r, p.y + r, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(p.x + r, p.y + p.h);
    ctx.arc(p.x + r, p.y + r, r, Math.PI / 2, (3 * Math.PI) / 2);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  private drawBall(
    ctx: CanvasRenderingContext2D,
    ball: { x: number; y: number; r: number },
  ): void {
    // Gentle pulsing glow
    const pulse = 0.85 + 0.15 * Math.sin(performance.now() * 0.008);
    ctx.fillStyle = '#ecf0f1';
    ctx.shadowColor = '#ecf0f1';
    ctx.shadowBlur = 12 * pulse;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
```

**What's happening:**
- The background grid is barely visible (`alpha 0.02`) but adds depth.
- The paddle is drawn as a rounded rectangle by combining straight lines with two semicircle arcs.
- `shadowBlur` creates the neon-glow effect around the paddle and ball.
- The ball pulses by oscillating `shadowBlur` with `Math.sin(performance.now())`.

---

### 3. Create the Physics System

**File:** `src/contexts/canvas2d/games/breakout/systems/PhysicsSystem.ts`

Move the paddle to follow the mouse and move the ball with wall bouncing:

```typescript
import type { BreakoutState } from '../types';

export class PhysicsSystem {
  update(state: BreakoutState, dt: number): void {
    const { paddle, canvasW } = state;

    // --- Paddle follows mouse ---
    paddle.x = Math.max(
      0,
      Math.min(canvasW - paddle.w, state.mouseX - paddle.w / 2),
    );

    // --- Move each ball ---
    for (const ball of state.balls) {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      // Bounce off left wall
      if (ball.x - ball.r <= 0) {
        ball.x = ball.r;
        ball.vx = Math.abs(ball.vx);
      }
      // Bounce off right wall
      else if (ball.x + ball.r >= canvasW) {
        ball.x = canvasW - ball.r;
        ball.vx = -Math.abs(ball.vx);
      }

      // Bounce off top wall
      if (ball.y - ball.r <= 0) {
        ball.y = ball.r;
        ball.vy = Math.abs(ball.vy);
      }
    }

    // --- Remove balls that fell below the screen ---
    for (let i = state.balls.length - 1; i >= 0; i--) {
      if (state.balls[i].y - state.balls[i].r > state.canvasH) {
        state.balls.splice(i, 1);
      }
    }

    // --- If no balls remain, respawn one on the paddle ---
    if (state.balls.length === 0) {
      state.balls.push(this.createBall(state));
    }
  }

  createBall(state: BreakoutState): Ball {
    const { paddle } = state;
    // Aim mostly upward with slight random angle
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    return {
      x: paddle.x + paddle.w / 2,
      y: paddle.y - 8,
      vx: Math.cos(angle) * 300,
      vy: Math.sin(angle) * 300,
      r: 6,
    };
  }
}

// Import the Ball type at the top so createBall can use it
import type { Ball } from '../types';
```

**What's happening:**
- The paddle's `x` is clamped so it never pokes outside the canvas on either side.
- We subtract `paddle.w / 2` from `mouseX` so the paddle centers under the cursor.
- Wall bouncing uses the same pattern from Pong: clamp position, then force the velocity component to the correct sign.
- When a ball falls off the bottom, it is removed. If zero balls remain, a new one spawns above the paddle. In later steps, we will lose a life instead.

---

### 4. Create the Input System

**File:** `src/contexts/canvas2d/games/breakout/systems/InputSystem.ts`

Track mouse movement and handle keyboard shortcuts:

```typescript
import type { BreakoutState } from '../types';

export class InputSystem {
  private state: BreakoutState;
  private canvas: HTMLCanvasElement;

  private mouseMoveHandler: (e: MouseEvent) => void;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(state: BreakoutState, canvas: HTMLCanvasElement) {
    this.state = state;
    this.canvas = canvas;

    this.mouseMoveHandler = (e: MouseEvent) => this.handleMouseMove(e);
    this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
  }

  attach(): void {
    this.canvas.addEventListener('mousemove', this.mouseMoveHandler);
    window.addEventListener('keydown', this.keyHandler);
  }

  detach(): void {
    this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
    window.removeEventListener('keydown', this.keyHandler);
  }

  /** Convert clientX to canvas-space X, accounting for CSS scaling */
  private canvasX(clientX: number): number {
    const rect = this.canvas.getBoundingClientRect();
    return (clientX - rect.left) * (this.canvas.width / rect.width);
  }

  private handleMouseMove(e: MouseEvent): void {
    this.state.mouseX = this.canvasX(e.clientX);
  }

  private handleKey(e: KeyboardEvent): void {
    if (e.key === 'p' || e.key === 'P') {
      if (this.state.phase === 'playing') this.state.phase = 'paused';
      else if (this.state.phase === 'paused') this.state.phase = 'playing';
    }
  }
}
```

**What's happening:**
- `canvasX` converts the browser's `clientX` to the canvas coordinate system. If the canvas is CSS-scaled (e.g., on a HiDPI display), the ratio `canvas.width / rect.width` corrects for the difference.
- We store bound handler references so `detach()` can properly remove them later.
- The `P` key toggles pause. We will add more keys in later steps.

---

### 5. Create the Engine

**File:** `src/contexts/canvas2d/games/breakout/BreakoutEngine.ts`

Wire everything together with the game loop:

```typescript
import type { BreakoutState } from './types';
import { PADDLE_W, PADDLE_H, BALL_R, BALL_SPEED } from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { BoardRenderer } from './renderers/BoardRenderer';

export class BreakoutEngine {
  private ctx: CanvasRenderingContext2D;
  private state: BreakoutState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
  private boardRenderer: BoardRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const W = canvas.width;
    const H = canvas.height;
    const paddleY = H - 50;

    // Initial ball aimed upward
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;

    this.state = {
      phase: 'playing',
      balls: [
        {
          x: W / 2,
          y: paddleY - 8,
          vx: Math.cos(angle) * BALL_SPEED,
          vy: Math.sin(angle) * BALL_SPEED,
          r: BALL_R,
        },
      ],
      paddle: {
        x: W / 2 - PADDLE_W / 2,
        y: paddleY,
        w: PADDLE_W,
        h: PADDLE_H,
      },
      canvasW: W,
      canvasH: H,
      mouseX: W / 2,
    };

    // Systems
    this.physicsSystem = new PhysicsSystem();
    this.inputSystem = new InputSystem(this.state, canvas);

    // Renderer
    this.boardRenderer = new BoardRenderer();

    this.inputSystem.attach();
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    const dt = Math.min(rawDt, 0.05); // Clamp to prevent explosion on tab-switch
    this.lastTime = now;

    if (this.state.phase === 'playing') {
      this.physicsSystem.update(this.state, dt);
    }

    this.boardRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

**What's happening:**
- `canvas.width = window.innerWidth` sizes the canvas to fill the viewport.
- The ball starts just above the paddle and launches at a nearly-upward angle with a small random offset so every game feels slightly different.
- We clamp `dt` to 50 ms maximum. If the user switches tabs and comes back, the browser may report a huge delta; clamping prevents the ball from teleporting through walls.
- The game loop is: **update** (move things) then **render** (draw things), every animation frame.

---

### 6. Create the Entry Point

**File:** `src/contexts/canvas2d/games/breakout/index.ts`

Export the game so the menu can launch it:

```typescript
import { BreakoutEngine } from './BreakoutEngine';

export function createBreakout(canvas: HTMLCanvasElement): { destroy: () => void } {
  const engine = new BreakoutEngine(canvas);
  engine.start();
  return { destroy: () => engine.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Breakout game
3. **Observe:**
   - Dark background with faint grid lines
   - Blue rounded paddle at the bottom following your mouse
   - White glowing ball bouncing off the top, left, and right walls
   - Ball falls off the bottom and immediately respawns above the paddle
   - Smooth 60fps movement regardless of monitor refresh rate

**Try moving your mouse quickly from edge to edge.** The paddle should track instantly and never extend past the canvas boundary.

---

## Try It

- Change `BALL_SPEED` to `500` and watch the ball zip around.
- Change `PADDLE_W` to `200` for a comically wide paddle.
- Add `console.log(dt)` inside the loop to see how delta-time varies frame to frame.

---

## Challenges

**Easy:**
- Change the paddle color from blue to green.
- Make the ball larger (radius 10).
- Add a faint trail behind the ball (hint: store last N positions, draw circles with decreasing alpha).

**Medium:**
- Add keyboard controls (Left/Right arrow keys) as an alternative to the mouse.
- Draw a dashed "floor line" at the paddle's Y position so players can see the danger zone.

**Hard:**
- Make the ball speed up by 10% every time it bounces off a wall.
- Implement a "gravity" effect by adding a small positive value to `ball.vy` each frame.

---

## What You Learned

- Mouse tracking with `mousemove` and canvas coordinate conversion
- Paddle clamping with `Math.max` / `Math.min`
- Delta-time ball movement with wall reflection
- requestAnimationFrame game loop with dt clamping
- Canvas rounded-rectangle drawing with arcs
- Glow effects using `shadowBlur`

**Next:** Ball-paddle collision with angle-based reflection and click-to-launch!
