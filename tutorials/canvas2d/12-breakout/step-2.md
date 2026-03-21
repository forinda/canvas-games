# Step 2: Paddle Collision & Launch

**Goal:** Add ball-paddle collision with angle-based reflection and a click-to-launch mechanic.

**Time:** ~15 minutes

---

## What You'll Build

Paddle interaction:
- **Ball sticks to paddle**: Before launch, the ball sits on top of the paddle and follows it
- **Click to launch**: The ball fires upward when you click
- **Angle-based reflection**: Where the ball hits the paddle determines its bounce angle
- **Start screen overlay**: A prompt tells the player to click to begin

---

## Concepts

- **Hit Position Mapping**: Convert the contact point on the paddle (0..1) to an angle (-63deg..+63deg)
- **Speed Preservation**: After reflection, the ball keeps the same speed but changes direction
- **State Phases**: Use a `phase` field to distinguish "waiting to launch" from "playing"
- **Overlay Rendering**: Draw a semi-transparent overlay with text on top of the game

---

## Code

### 1. Update Types

**File:** `src/contexts/canvas2d/games/breakout/types.ts`

No structural changes from Step 1, but here is the full file for reference:

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
export const BALL_SPEED = 300;
```

---

### 2. Create the Collision System

**File:** `src/contexts/canvas2d/games/breakout/systems/CollisionSystem.ts`

Handle ball-paddle bouncing with angle-based reflection:

```typescript
import type { BreakoutState } from '../types';

export class CollisionSystem {
  update(state: BreakoutState, _dt: number): void {
    this.ballPaddleCollision(state);
  }

  private ballPaddleCollision(state: BreakoutState): void {
    const { paddle } = state;

    for (const ball of state.balls) {
      // Only check when ball is moving downward
      if (ball.vy <= 0) continue;

      // Check if ball overlaps the paddle
      if (
        ball.y + ball.r >= paddle.y &&
        ball.y + ball.r <= paddle.y + paddle.h + 4 &&
        ball.x >= paddle.x &&
        ball.x <= paddle.x + paddle.w
      ) {
        // Where on the paddle did the ball land? 0 = left edge, 1 = right edge
        const hitPos = (ball.x - paddle.x) / paddle.w;

        // Map hit position to an angle:
        //   Center (0.5) -> straight up (-90deg)
        //   Left edge (0) -> angled left (-153deg)
        //   Right edge (1) -> angled right (-27deg)
        const angle = -Math.PI / 2 + (hitPos - 0.5) * (Math.PI * 0.7);

        // Preserve the ball's current speed
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

        // Apply new direction at the same speed
        ball.vx = Math.cos(angle) * speed;
        ball.vy = Math.sin(angle) * speed;

        // Push ball above paddle to prevent re-triggering
        ball.y = paddle.y - ball.r;
      }
    }
  }
}
```

**What's happening:**
- We only test collision when `ball.vy > 0` (ball is falling). This prevents the ball from sticking to the paddle if it clips through from below.
- `hitPos` is a 0-to-1 value representing where on the paddle the ball landed. Dead center is `0.5`.
- The angle formula `(-PI/2) + (hitPos - 0.5) * (PI * 0.7)` produces a range from about -153 degrees (sharp left) to -27 degrees (sharp right), with straight up (-90 degrees) at the center.
- `Math.sqrt(vx^2 + vy^2)` gives the current speed. We decompose the new angle into `vx` and `vy` at that same speed, so hitting the paddle never changes how fast the ball moves.

---

### 3. Update Physics System

**File:** `src/contexts/canvas2d/games/breakout/systems/PhysicsSystem.ts`

Add a "ball sticks to paddle before launch" behavior. When the phase is `start`, the ball sits on top of the paddle and follows it:

```typescript
import type { BreakoutState, Ball } from '../types';
import { BALL_SPEED } from '../types';

export class PhysicsSystem {
  update(state: BreakoutState, dt: number): void {
    const { paddle, canvasW } = state;

    // --- Paddle follows mouse ---
    paddle.x = Math.max(
      0,
      Math.min(canvasW - paddle.w, state.mouseX - paddle.w / 2),
    );

    // --- In 'start' phase, ball sits on paddle ---
    if (state.phase === 'start') {
      for (const ball of state.balls) {
        ball.x = paddle.x + paddle.w / 2;
        ball.y = paddle.y - ball.r;
        ball.vx = 0;
        ball.vy = 0;
      }
      return; // Nothing else moves yet
    }

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
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    return {
      x: paddle.x + paddle.w / 2,
      y: paddle.y - 8,
      vx: Math.cos(angle) * BALL_SPEED,
      vy: Math.sin(angle) * BALL_SPEED,
      r: 6,
    };
  }
}
```

**What's happening:**
- During the `start` phase, the ball's position is locked to the paddle center with zero velocity. The player can move the paddle around to aim before clicking.
- Once the phase switches to `playing` (via a click), the ball has velocity and the normal physics take over.

---

### 4. Update Input System

**File:** `src/contexts/canvas2d/games/breakout/systems/InputSystem.ts`

Add click-to-launch and the start-screen transition:

```typescript
import type { BreakoutState } from '../types';
import { BALL_SPEED } from '../types';

export class InputSystem {
  private state: BreakoutState;
  private canvas: HTMLCanvasElement;

  private mouseMoveHandler: (e: MouseEvent) => void;
  private keyHandler: (e: KeyboardEvent) => void;
  private clickHandler: (e: MouseEvent) => void;

  constructor(state: BreakoutState, canvas: HTMLCanvasElement) {
    this.state = state;
    this.canvas = canvas;

    this.mouseMoveHandler = (e: MouseEvent) => this.handleMouseMove(e);
    this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
    this.clickHandler = () => this.handleClick();
  }

  attach(): void {
    this.canvas.addEventListener('mousemove', this.mouseMoveHandler);
    this.canvas.addEventListener('click', this.clickHandler);
    window.addEventListener('keydown', this.keyHandler);
  }

  detach(): void {
    this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
    this.canvas.removeEventListener('click', this.clickHandler);
    window.removeEventListener('keydown', this.keyHandler);
  }

  private canvasX(clientX: number): number {
    const rect = this.canvas.getBoundingClientRect();
    return (clientX - rect.left) * (this.canvas.width / rect.width);
  }

  private handleMouseMove(e: MouseEvent): void {
    this.state.mouseX = this.canvasX(e.clientX);
  }

  private handleKey(e: KeyboardEvent): void {
    const s = this.state;

    if (e.key === 'p' || e.key === 'P') {
      if (s.phase === 'playing') s.phase = 'paused';
      else if (s.phase === 'paused') s.phase = 'playing';
      return;
    }

    if (e.key === ' ' || e.key === 'Enter') {
      if (s.phase === 'start') {
        this.launchBall();
        return;
      }
    }
  }

  private handleClick(): void {
    const s = this.state;

    if (s.phase === 'start') {
      this.launchBall();
      return;
    }
  }

  private launchBall(): void {
    const s = this.state;
    s.phase = 'playing';

    // Give the ball an upward velocity with slight random angle
    for (const ball of s.balls) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
      ball.vx = Math.cos(angle) * BALL_SPEED;
      ball.vy = Math.sin(angle) * BALL_SPEED;
    }
  }
}
```

**What's happening:**
- Clicking or pressing Space/Enter during the `start` phase calls `launchBall()`.
- `launchBall` sets the phase to `playing` and gives the ball an upward velocity. The slight random angle means the ball does not always go straight up.
- The `P` key toggles pause, which freezes the physics (the engine skips updates when paused).

---

### 5. Create the HUD Renderer

**File:** `src/contexts/canvas2d/games/breakout/renderers/HUDRenderer.ts`

Draw the start-screen overlay and pause indicator:

```typescript
import type { BreakoutState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: BreakoutState): void {
    const W = state.canvasW;
    const H = state.canvasH;

    switch (state.phase) {
      case 'start':
        this.drawOverlay(ctx, W, H, 'BREAKOUT', 'Click or press SPACE to launch\nMove mouse to aim', '#e74c3c');
        break;
      case 'paused':
        this.drawOverlay(ctx, W, H, 'PAUSED', 'Press P to resume', '#f39c12');
        break;
    }
  }

  private drawOverlay(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    title: string,
    sub: string,
    color: string,
  ): void {
    // Semi-transparent backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.min(64, W * 0.08)}px monospace`;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillText(title, W / 2, H * 0.35);
    ctx.shadowBlur = 0;

    // Subtitle (supports multiple lines)
    const lines = sub.split('\n');
    ctx.font = `${Math.min(18, W * 0.025)}px monospace`;
    ctx.fillStyle = '#aaa';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], W / 2, H * 0.48 + i * 24);
    }
  }
}
```

**What's happening:**
- The overlay fills the entire canvas with a dark transparent layer, then draws centered text on top.
- Font size scales with canvas width (`W * 0.08`) but caps at 64 px so it does not become absurdly large on ultra-wide monitors.
- The title has a colored glow (`shadowBlur`) matching its text color.

---

### 6. Update the Board Renderer

**File:** `src/contexts/canvas2d/games/breakout/renderers/BoardRenderer.ts`

No changes from Step 1. The full file is identical:

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

---

### 7. Update the Engine

**File:** `src/contexts/canvas2d/games/breakout/BreakoutEngine.ts`

Add the CollisionSystem and HUDRenderer, and start in `start` phase:

```typescript
import type { BreakoutState } from './types';
import { PADDLE_W, PADDLE_H, BALL_R } from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { BoardRenderer } from './renderers/BoardRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class BreakoutEngine {
  private ctx: CanvasRenderingContext2D;
  private state: BreakoutState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
  private collisionSystem: CollisionSystem;
  private boardRenderer: BoardRenderer;
  private hudRenderer: HUDRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const W = canvas.width;
    const H = canvas.height;
    const paddleY = H - 50;

    this.state = {
      phase: 'start', // Ball sits on paddle until player clicks
      balls: [
        {
          x: W / 2,
          y: paddleY - BALL_R - 2,
          vx: 0,
          vy: 0,
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
    this.collisionSystem = new CollisionSystem();
    this.inputSystem = new InputSystem(this.state, canvas);

    // Renderers
    this.boardRenderer = new BoardRenderer();
    this.hudRenderer = new HUDRenderer();

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
    const dt = Math.min(rawDt, 0.05);
    this.lastTime = now;

    if (this.state.phase === 'playing') {
      this.physicsSystem.update(this.state, dt);
      this.collisionSystem.update(this.state, dt);
    } else if (this.state.phase === 'start') {
      // Still update paddle position so player can aim
      this.physicsSystem.update(this.state, dt);
    }

    this.boardRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

**What's happening:**
- The game now starts in `start` phase. The ball has zero velocity and sits on the paddle.
- During the `start` phase, we still run the physics system so the paddle (and ball on top of it) follow the mouse.
- Once the player clicks, the input system sets the phase to `playing` and gives the ball velocity.
- Collision detection runs only during `playing` to prevent phantom collisions before launch.

---

### 8. Update the Entry Point

**File:** `src/contexts/canvas2d/games/breakout/index.ts`

Same as Step 1:

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
   - "BREAKOUT" title overlay with "Click or press SPACE to launch"
   - Ball sitting on top of the paddle, following your mouse
   - Click to launch the ball upward
   - Ball bounces off walls and returns
   - Ball bounces off the paddle at different angles depending on where it hits
   - Hit the left edge of the paddle: ball bounces left. Hit the right edge: bounces right
   - Press P to pause and resume

**Try aiming:** Move the paddle far to the left, then click to launch. The ball goes slightly right of center. Move to the right side and the ball goes slightly left. This is because the launch angle is random, but the paddle-bounce angle is deterministic based on hit position.

---

## Try It

- Hit the ball with the very edge of the paddle. Notice the steep angle.
- Hit it dead center. The ball goes nearly straight up.
- Press P while the ball is mid-flight to freeze everything.

---

## Challenges

**Easy:**
- Change the paddle color when the ball is sitting on it (before launch).
- Add a small visual indicator (like an arrow) showing the launch direction.

**Medium:**
- Add touch support: listen for `touchmove` to track finger position, and `touchstart` to launch.
- Make the launch angle follow the mouse position (aim where you point) instead of random.

**Hard:**
- Add a "spin" effect: if the paddle is moving when the ball hits it, apply extra horizontal velocity.
- Implement a "sticky paddle" powerup: the ball sticks to the paddle on contact and waits for another click.

---

## What You Learned

- Angle-based paddle reflection using hit-position mapping
- Speed preservation during direction changes with `Math.sqrt(vx^2 + vy^2)`
- Game phase management (start vs. playing vs. paused)
- Click-to-launch mechanic with ball-on-paddle tracking
- Overlay rendering with semi-transparent backdrop and scaled text

**Next:** Building the brick grid and destroying bricks on collision!
