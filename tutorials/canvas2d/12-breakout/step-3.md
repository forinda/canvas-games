# Step 3: Brick Grid & Collision

**Goal:** Create a grid of colored bricks and destroy them when the ball hits them.

**Time:** ~15 minutes

---

## What You'll Build

Brick-breaking mechanics:
- **Brick grid**: Rows of colored bricks across the top of the screen
- **Circle-rectangle collision**: Accurate detection between ball and bricks
- **Edge detection**: Ball reflects off the correct side (top/bottom vs. left/right)
- **Brick removal**: Bricks disappear when hit
- **Rounded bricks**: Smooth visual appearance with per-row color coding

---

## Concepts

- **Grid Layout Math**: Calculate brick width from canvas width, columns, and gaps
- **Circle-Rect Collision**: Find the closest point on the rectangle to the circle center, then check distance
- **Overlap Resolution**: Compare horizontal vs. vertical overlap to determine which velocity component to flip
- **Alive Flag**: Mark bricks as dead rather than removing them from the array (avoids index shifting during iteration)

---

## Code

### 1. Update Types

**File:** `src/contexts/canvas2d/games/breakout/types.ts`

Add the `Brick` interface and brick-grid constants:

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

export interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  alive: boolean;
}

export interface BreakoutState {
  phase: GamePhase;
  balls: Ball[];
  paddle: Paddle;
  bricks: Brick[];
  canvasW: number;
  canvasH: number;
  mouseX: number;
}

// Constants
export const PADDLE_H = 14;
export const PADDLE_W = 100;
export const BALL_R = 6;
export const BALL_SPEED = 300;

// Brick grid constants
export const BRICK_ROWS = 5;
export const BRICK_COLS = 10;
export const BRICK_H = 22;
export const BRICK_GAP = 3;
export const BRICK_TOP_OFFSET = 60; // Space above the first row
```

**What's happening:**
- Each `Brick` has a position, size, color, and an `alive` flag.
- `BRICK_TOP_OFFSET` leaves room for a HUD bar above the bricks.
- `BRICK_GAP` is the spacing between bricks and the wall edges.
- We do not hardcode a brick width; we will compute it from `canvasW`, `BRICK_COLS`, and `BRICK_GAP` so the grid stretches to fill the screen.

---

### 2. Create the Brick Builder

**File:** `src/contexts/canvas2d/games/breakout/data/levels.ts`

Build the initial brick grid:

```typescript
import type { Brick } from '../types';
import { BRICK_ROWS, BRICK_COLS, BRICK_H, BRICK_GAP, BRICK_TOP_OFFSET } from '../types';

/** Row colors from top to bottom */
const ROW_COLORS = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db'];

/** Create the initial grid of bricks for a given canvas width */
export function createBrickGrid(canvasW: number): Brick[] {
  const brickW = (canvasW - BRICK_GAP * (BRICK_COLS + 1)) / BRICK_COLS;
  const bricks: Brick[] = [];

  for (let r = 0; r < BRICK_ROWS; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      bricks.push({
        x: BRICK_GAP + c * (brickW + BRICK_GAP),
        y: BRICK_TOP_OFFSET + r * (BRICK_H + BRICK_GAP),
        w: brickW,
        h: BRICK_H,
        color: ROW_COLORS[r % ROW_COLORS.length],
        alive: true,
      });
    }
  }

  return bricks;
}
```

**What's happening:**
- The brick width formula: subtract the total gap space (`BRICK_GAP * (cols + 1)` for gaps on both sides and between columns), then divide the remaining width equally among columns.
- Each brick's `x` position is `BRICK_GAP + col * (brickW + BRICK_GAP)`. The outer `BRICK_GAP` gives a left margin.
- Colors cycle per row. Row 0 (top) is red, row 1 is orange, etc.

---

### 3. Update the Collision System

**File:** `src/contexts/canvas2d/games/breakout/systems/CollisionSystem.ts`

Add ball-brick collision detection with edge resolution:

```typescript
import type { BreakoutState, Ball, Brick } from '../types';

export class CollisionSystem {
  update(state: BreakoutState, _dt: number): void {
    this.ballPaddleCollision(state);
    this.ballBrickCollision(state);
  }

  // --- Paddle collision (unchanged from Step 2) ---

  private ballPaddleCollision(state: BreakoutState): void {
    const { paddle } = state;

    for (const ball of state.balls) {
      if (ball.vy <= 0) continue;

      if (
        ball.y + ball.r >= paddle.y &&
        ball.y + ball.r <= paddle.y + paddle.h + 4 &&
        ball.x >= paddle.x &&
        ball.x <= paddle.x + paddle.w
      ) {
        const hitPos = (ball.x - paddle.x) / paddle.w;
        const angle = -Math.PI / 2 + (hitPos - 0.5) * (Math.PI * 0.7);
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        ball.vx = Math.cos(angle) * speed;
        ball.vy = Math.sin(angle) * speed;
        ball.y = paddle.y - ball.r;
      }
    }
  }

  // --- Brick collision ---

  private ballBrickCollision(state: BreakoutState): void {
    for (const ball of state.balls) {
      for (const brick of state.bricks) {
        if (!brick.alive) continue;

        if (this.circleRectCollision(ball, brick)) {
          this.resolveBrickHit(ball, brick);
        }
      }
    }
  }

  /**
   * Test whether a circle (ball) overlaps a rectangle (brick).
   * Find the closest point on the rect to the circle center,
   * then check if the distance is less than the radius.
   */
  private circleRectCollision(
    ball: Ball,
    rect: { x: number; y: number; w: number; h: number },
  ): boolean {
    const closestX = Math.max(rect.x, Math.min(ball.x, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(ball.y, rect.y + rect.h));
    const dx = ball.x - closestX;
    const dy = ball.y - closestY;
    return dx * dx + dy * dy < ball.r * ball.r;
  }

  /**
   * Determine which side was hit and reflect the ball,
   * then mark the brick as dead.
   */
  private resolveBrickHit(ball: Ball, brick: Brick): void {
    // Calculate overlap on each side
    const overlapLeft = ball.x + ball.r - brick.x;
    const overlapRight = brick.x + brick.w - (ball.x - ball.r);
    const overlapTop = ball.y + ball.r - brick.y;
    const overlapBottom = brick.y + brick.h - (ball.y - ball.r);

    // The smallest overlaps tell us which side the ball entered from
    const minOverlapX = Math.min(overlapLeft, overlapRight);
    const minOverlapY = Math.min(overlapTop, overlapBottom);

    if (minOverlapX < minOverlapY) {
      // Hit from left or right side -> flip horizontal velocity
      ball.vx = -ball.vx;
    } else {
      // Hit from top or bottom -> flip vertical velocity
      ball.vy = -ball.vy;
    }

    // Destroy the brick
    brick.alive = false;
  }
}
```

**What's happening:**

**Circle-Rect Collision** (`circleRectCollision`):
1. Clamp the ball's center to the rectangle's bounds. This gives the "closest point" on the rect to the ball.
2. Measure the distance from the ball center to that closest point.
3. If the distance is less than the ball's radius, they overlap.

This is the standard algorithm for circle-vs-AABB collision. It handles corners correctly: if the ball is diagonally outside the rect, the closest point is the corner, and the distance check naturally handles it.

**Edge Detection** (`resolveBrickHit`):
1. Compute how far the ball penetrates from each of the four sides.
2. The side with the smallest overlap is the one the ball just crossed.
3. If the smallest overlap is horizontal (left or right), flip `vx`. If vertical (top or bottom), flip `vy`.

This is an approximation. At very high speeds, the ball can clip through bricks entirely. For our 300 px/s ball and 22 px-tall bricks, this is not a problem.

---

### 4. Update the Board Renderer

**File:** `src/contexts/canvas2d/games/breakout/renderers/BoardRenderer.ts`

Add brick rendering:

```typescript
import type { BreakoutState } from '../types';

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: BreakoutState): void {
    const W = state.canvasW;
    const H = state.canvasH;

    // Dark background
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(0, 0, W, H);

    // Subtle grid lines
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

    // Bricks
    for (const brick of state.bricks) {
      if (!brick.alive) continue;
      this.drawBrick(ctx, brick);
    }

    // Paddle
    this.drawPaddle(ctx, state);

    // Balls
    for (const ball of state.balls) {
      this.drawBall(ctx, ball);
    }
  }

  private drawBrick(
    ctx: CanvasRenderingContext2D,
    brick: { x: number; y: number; w: number; h: number; color: string },
  ): void {
    ctx.fillStyle = brick.color;
    ctx.shadowColor = brick.color;
    ctx.shadowBlur = 4;

    // Rounded rectangle with 3px corner radius
    const r = 3;
    ctx.beginPath();
    ctx.moveTo(brick.x + r, brick.y);
    ctx.lineTo(brick.x + brick.w - r, brick.y);
    ctx.quadraticCurveTo(brick.x + brick.w, brick.y, brick.x + brick.w, brick.y + r);
    ctx.lineTo(brick.x + brick.w, brick.y + brick.h - r);
    ctx.quadraticCurveTo(brick.x + brick.w, brick.y + brick.h, brick.x + brick.w - r, brick.y + brick.h);
    ctx.lineTo(brick.x + r, brick.y + brick.h);
    ctx.quadraticCurveTo(brick.x, brick.y + brick.h, brick.x, brick.y + brick.h - r);
    ctx.lineTo(brick.x, brick.y + r);
    ctx.quadraticCurveTo(brick.x, brick.y, brick.x + r, brick.y);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
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

**What's happening:**
- Bricks are drawn before the paddle and ball so the ball renders on top of everything.
- Each brick is a rounded rectangle drawn with `quadraticCurveTo` for smooth corners.
- `shadowBlur` gives each brick a subtle colored glow that matches its fill color.
- Dead bricks are simply skipped.

---

### 5. Update Physics System

**File:** `src/contexts/canvas2d/games/breakout/systems/PhysicsSystem.ts`

No changes from Step 2. The full file is the same:

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
      return;
    }

    // --- Move each ball ---
    for (const ball of state.balls) {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x - ball.r <= 0) {
        ball.x = ball.r;
        ball.vx = Math.abs(ball.vx);
      } else if (ball.x + ball.r >= canvasW) {
        ball.x = canvasW - ball.r;
        ball.vx = -Math.abs(ball.vx);
      }

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

---

### 6. Update the Engine

**File:** `src/contexts/canvas2d/games/breakout/BreakoutEngine.ts`

Add brick creation at startup:

```typescript
import type { BreakoutState } from './types';
import { PADDLE_W, PADDLE_H, BALL_R } from './types';
import { createBrickGrid } from './data/levels';
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
      phase: 'start',
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
      bricks: createBrickGrid(W),
      canvasW: W,
      canvasH: H,
      mouseX: W / 2,
    };

    this.physicsSystem = new PhysicsSystem();
    this.collisionSystem = new CollisionSystem();
    this.inputSystem = new InputSystem(this.state, canvas);

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
      this.physicsSystem.update(this.state, dt);
    }

    this.boardRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

---

### 7. Update HUD and Input

**File:** `src/contexts/canvas2d/games/breakout/renderers/HUDRenderer.ts`

No changes from Step 2:

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
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.min(64, W * 0.08)}px monospace`;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillText(title, W / 2, H * 0.35);
    ctx.shadowBlur = 0;

    const lines = sub.split('\n');
    ctx.font = `${Math.min(18, W * 0.025)}px monospace`;
    ctx.fillStyle = '#aaa';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], W / 2, H * 0.48 + i * 24);
    }
  }
}
```

**File:** `src/contexts/canvas2d/games/breakout/systems/InputSystem.ts`

No changes from Step 2:

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
    if (this.state.phase === 'start') {
      this.launchBall();
    }
  }

  private launchBall(): void {
    const s = this.state;
    s.phase = 'playing';

    for (const ball of s.balls) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
      ball.vx = Math.cos(angle) * BALL_SPEED;
      ball.vy = Math.sin(angle) * BALL_SPEED;
    }
  }
}
```

---

### 8. Update Entry Point

**File:** `src/contexts/canvas2d/games/breakout/index.ts`

No changes:

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
   - Five rows of colored bricks fill the top of the screen (red, orange, yellow, green, blue)
   - Click to launch the ball
   - Ball bounces off bricks and they disappear
   - Ball correctly bounces left/right when hitting the side of a brick, and up/down when hitting the top/bottom
   - After clearing all bricks, the ball just bounces around the empty arena
   - Ball still bounces off the paddle with angle-based reflection

**Watch the edge detection:** Launch the ball at a steep angle so it hits the side of a brick column. It should bounce horizontally, not vertically.

---

## Try It

- Count how many bricks you can clear in one life (before the ball falls off screen).
- Try to clear the entire grid. Right now there is no win condition, but the satisfaction is real.
- Watch what happens when the ball enters a narrow gap between two bricks -- it may hit multiple bricks in sequence.

---

## Challenges

**Easy:**
- Change the row colors to a different palette (e.g., all shades of purple).
- Add a seventh row of bricks.
- Make the gap between bricks larger (`BRICK_GAP = 6`).

**Medium:**
- Add a "hit flash" effect: when a brick is hit, briefly show a white flash before it disappears.
- Add a particle burst when a brick is destroyed (spawn 5-10 small circles that fade out).

**Hard:**
- Implement multi-hit bricks: some bricks take 2 or 3 hits to destroy. Display the remaining HP as a number on the brick and darken the color as HP decreases.
- Prevent the ball from clipping through bricks at high speed by subdividing the movement into smaller steps.

---

## What You Learned

- Grid layout math: computing brick width from canvas width, column count, and gap size
- Circle-rectangle collision detection using closest-point algorithm
- Edge detection via overlap comparison to determine reflection axis
- Alive/dead flagging for efficient object management during iteration
- Rounded rectangle drawing with `quadraticCurveTo`

**Next:** Multiple levels with different brick patterns and increasing ball speed!
