# Step 4: Levels & Progression

**Goal:** Add multiple level layouts with different brick patterns, multi-hit bricks, and increasing ball speed.

**Time:** ~15 minutes

---

## What You'll Build

Level progression:
- **5 unique level layouts**: Classic rows, checkerboard, diamond, fortress, and full grid
- **Multi-hit bricks**: Some bricks take 2 or 3 hits, with HP displayed and color dimming
- **Speed multiplier**: Each level makes the ball faster
- **Level advancement**: Clearing all bricks loads the next level
- **Win condition**: Clearing all 5 levels triggers a victory screen

---

## Concepts

- **Level Data Structure**: A 2D array of HP values defines the layout (0 = empty cell)
- **Speed Scaling**: Multiply the base ball speed by a per-level factor
- **Level Transition**: Check `bricks.every(b => !b.alive)` each frame; if true, advance
- **HP-Based Rendering**: Vary brick opacity based on remaining / max HP

---

## Code

### 1. Update Types

**File:** `src/games/breakout/types.ts`

Add `hp`, `maxHp`, `baseW` to support multi-hit bricks, paddle width reset, and level tracking:

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
  baseW: number; // Original width (for resetting after powerups later)
}

export interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;    // Current hit points
  maxHp: number; // Starting hit points (for rendering dimming)
  color: string;
  alive: boolean;
}

export interface BreakoutState {
  phase: GamePhase;
  balls: Ball[];
  paddle: Paddle;
  bricks: Brick[];
  score: number;
  level: number;
  canvasW: number;
  canvasH: number;
  mouseX: number;
  baseBallSpeed: number; // Current ball speed (increases per level)
}

// Constants
export const PADDLE_H = 14;
export const PADDLE_BASE_W = 100;
export const BALL_R = 6;
export const BALL_BASE_SPEED = 300;

export const BRICK_ROWS = 6;
export const BRICK_COLS = 10;
export const BRICK_H = 22;
export const BRICK_GAP = 3;
export const BRICK_TOP_OFFSET = 60;

export const MAX_LEVEL = 5;
```

**What's happening:**
- `hp` / `maxHp` on bricks allow multi-hit behavior. A brick with `hp: 3` needs three ball contacts to die.
- `baseBallSpeed` is the speed used when creating or reflecting balls. It grows each level.
- `score` tracks points. `level` tracks which level we are on (1-based).
- `baseW` on the paddle stores the original width for later powerup resets.

---

### 2. Rewrite Level Data

**File:** `src/games/breakout/data/levels.ts`

Replace the simple grid builder with a full level definition system:

```typescript
import type { Brick } from '../types';
import { BRICK_H, BRICK_GAP, BRICK_TOP_OFFSET } from '../types';

export interface LevelDef {
  /** 2D grid: rows x cols, value = brick HP (0 = empty) */
  layout: number[][];
  /** Row colors from top to bottom */
  colors: string[];
  /** Ball speed multiplier for this level */
  speedMult: number;
}

export const LEVELS: LevelDef[] = [
  // Level 1: Classic solid rows (all 1-hp)
  {
    layout: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    colors: ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db'],
    speedMult: 1.0,
  },
  // Level 2: Checkerboard with some 2-hp bricks
  {
    layout: [
      [2, 0, 2, 0, 2, 0, 2, 0, 2, 0],
      [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [2, 0, 2, 0, 2, 0, 2, 0, 2, 0],
      [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [2, 0, 2, 0, 2, 0, 2, 0, 2, 0],
      [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    ],
    colors: ['#9b59b6', '#8e44ad', '#e74c3c', '#c0392b', '#e67e22', '#d35400'],
    speedMult: 1.1,
  },
  // Level 3: Diamond shape, mixed HP
  {
    layout: [
      [0, 0, 0, 0, 2, 2, 0, 0, 0, 0],
      [0, 0, 0, 2, 1, 1, 2, 0, 0, 0],
      [0, 0, 2, 1, 3, 3, 1, 2, 0, 0],
      [0, 2, 1, 3, 3, 3, 3, 1, 2, 0],
      [0, 0, 2, 1, 3, 3, 1, 2, 0, 0],
      [0, 0, 0, 2, 1, 1, 2, 0, 0, 0],
      [0, 0, 0, 0, 2, 2, 0, 0, 0, 0],
    ],
    colors: ['#1abc9c', '#16a085', '#2ecc71', '#27ae60', '#2ecc71', '#16a085', '#1abc9c'],
    speedMult: 1.2,
  },
  // Level 4: Fortress with tough walls
  {
    layout: [
      [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
      [3, 0, 0, 0, 0, 0, 0, 0, 0, 3],
      [3, 0, 2, 2, 2, 2, 2, 2, 0, 3],
      [3, 0, 2, 0, 0, 0, 0, 2, 0, 3],
      [3, 0, 2, 2, 2, 2, 2, 2, 0, 3],
      [3, 0, 0, 0, 0, 0, 0, 0, 0, 3],
      [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    ],
    colors: ['#e74c3c', '#c0392b', '#e67e22', '#d35400', '#e67e22', '#c0392b', '#e74c3c'],
    speedMult: 1.3,
  },
  // Level 5: Full grid, all tough
  {
    layout: [
      [3, 2, 3, 2, 3, 2, 3, 2, 3, 2],
      [2, 3, 2, 3, 2, 3, 2, 3, 2, 3],
      [3, 2, 3, 2, 3, 2, 3, 2, 3, 2],
      [2, 3, 2, 3, 2, 3, 2, 3, 2, 3],
      [3, 2, 3, 2, 3, 2, 3, 2, 3, 2],
      [2, 3, 2, 3, 2, 3, 2, 3, 2, 3],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    colors: ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#1abc9c', '#16a085'],
    speedMult: 1.5,
  },
];

/** Build the Brick array for a given level and canvas width */
export function loadBricksForLevel(levelIndex: number, canvasW: number): Brick[] {
  const def = LEVELS[Math.min(levelIndex, LEVELS.length - 1)];
  const rows = def.layout.length;
  const cols = def.layout[0].length;
  const brickW = (canvasW - BRICK_GAP * (cols + 1)) / cols;

  const bricks: Brick[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const hp = def.layout[r][c];
      if (hp <= 0) continue;
      bricks.push({
        x: BRICK_GAP + c * (brickW + BRICK_GAP),
        y: BRICK_TOP_OFFSET + r * (BRICK_H + BRICK_GAP),
        w: brickW,
        h: BRICK_H,
        hp,
        maxHp: hp,
        color: def.colors[r % def.colors.length],
        alive: true,
      });
    }
  }
  return bricks;
}
```

**What's happening:**
- Each level definition has a `layout` (2D array of HP values), `colors` (per-row), and `speedMult`.
- `0` in the layout means no brick at that position, creating interesting shapes.
- Level 1 is gentle: all 1-hp bricks, normal speed.
- Level 5 is brutal: 8 rows of 2-hp and 3-hp bricks at 1.5x speed.
- `loadBricksForLevel` handles the grid math identically to our Step 3 builder, but reads HP from the layout.

---

### 3. Create the Level System

**File:** `src/games/breakout/systems/LevelSystem.ts`

Monitor brick status and advance levels:

```typescript
import type { BreakoutState } from '../types';
import { BALL_BASE_SPEED, MAX_LEVEL } from '../types';
import { LEVELS, loadBricksForLevel } from '../data/levels';

export class LevelSystem {
  update(state: BreakoutState, _dt: number): void {
    // Check if all bricks are cleared
    const allCleared = state.bricks.every((b) => !b.alive);
    if (!allCleared) return;

    // All levels complete?
    if (state.level >= MAX_LEVEL) {
      state.phase = 'win';
      return;
    }

    // Advance to next level
    state.level++;
    this.loadLevel(state);
  }

  /** Set up bricks, ball, and speed for the current level */
  loadLevel(state: BreakoutState): void {
    const levelIdx = state.level - 1; // 0-based index
    const def = LEVELS[Math.min(levelIdx, LEVELS.length - 1)];

    // Load bricks
    state.bricks = loadBricksForLevel(levelIdx, state.canvasW);

    // Apply speed multiplier
    state.baseBallSpeed = BALL_BASE_SPEED * def.speedMult;

    // Reset ball on paddle
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    state.balls = [
      {
        x: state.paddle.x + state.paddle.w / 2,
        y: state.paddle.y - 8,
        vx: Math.cos(angle) * state.baseBallSpeed,
        vy: Math.sin(angle) * state.baseBallSpeed,
        r: 6,
      },
    ];
  }
}
```

**What's happening:**
- Every frame, check if all bricks are dead. If not, return immediately (cheap check).
- If the player has cleared all 5 levels, set the phase to `win`.
- Otherwise, increment `level`, load the new brick grid, update ball speed, and spawn a fresh ball.
- The ball immediately launches at the new speed. In a more polished version, you might pause and let the player click to launch again.

---

### 4. Update the Collision System

**File:** `src/games/breakout/systems/CollisionSystem.ts`

Update `resolveBrickHit` to damage bricks instead of instantly destroying them, and add scoring:

```typescript
import type { BreakoutState, Ball, Brick } from '../types';

export class CollisionSystem {
  update(state: BreakoutState, _dt: number): void {
    this.ballPaddleCollision(state);
    this.ballBrickCollision(state);
  }

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

  private ballBrickCollision(state: BreakoutState): void {
    for (const ball of state.balls) {
      for (const brick of state.bricks) {
        if (!brick.alive) continue;

        if (this.circleRectCollision(ball, brick)) {
          this.resolveBrickHit(ball, brick, state);
        }
      }
    }
  }

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

  private resolveBrickHit(ball: Ball, brick: Brick, state: BreakoutState): void {
    // Determine which side was hit
    const overlapLeft = ball.x + ball.r - brick.x;
    const overlapRight = brick.x + brick.w - (ball.x - ball.r);
    const overlapTop = ball.y + ball.r - brick.y;
    const overlapBottom = brick.y + brick.h - (ball.y - ball.r);

    const minOverlapX = Math.min(overlapLeft, overlapRight);
    const minOverlapY = Math.min(overlapTop, overlapBottom);

    if (minOverlapX < minOverlapY) {
      ball.vx = -ball.vx;
    } else {
      ball.vy = -ball.vy;
    }

    // Damage the brick
    brick.hp--;
    if (brick.hp <= 0) {
      brick.alive = false;
      // More points for tougher bricks
      state.score += brick.maxHp * 10;
    } else {
      // Partial hit gives fewer points
      state.score += 5;
    }
  }
}
```

**What's happening:**
- Instead of immediately killing the brick, we decrement `hp`. Only when `hp` reaches 0 does the brick die.
- Scoring: destroying a brick awards `maxHp * 10` points (a 3-hp brick is worth 30). Each non-lethal hit awards 5 points, rewarding the player for every contact.

---

### 5. Update Board Renderer

**File:** `src/games/breakout/renderers/BoardRenderer.ts`

Update brick rendering to show HP dimming and HP numbers:

```typescript
import type { BreakoutState } from '../types';

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: BreakoutState): void {
    const W = state.canvasW;
    const H = state.canvasH;

    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(0, 0, W, H);

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
    brick: { x: number; y: number; w: number; h: number; hp: number; maxHp: number; color: string },
  ): void {
    // Dim the brick as it takes damage
    const hpRatio = brick.hp / brick.maxHp;
    ctx.fillStyle = brick.color;
    ctx.globalAlpha = 0.4 + 0.6 * hpRatio;
    ctx.shadowColor = brick.color;
    ctx.shadowBlur = 4;

    // Rounded rectangle
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

    // HP number for multi-hit bricks
    if (brick.maxHp > 1) {
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        String(brick.hp),
        brick.x + brick.w / 2,
        brick.y + brick.h / 2,
      );
    }

    ctx.globalAlpha = 1;
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
- `globalAlpha = 0.4 + 0.6 * hpRatio` makes damaged bricks appear faded. A brick at full HP is fully opaque. A brick at 1/3 HP is about 60% opacity.
- Multi-hit bricks display their remaining HP as a small white number in the center.
- The `globalAlpha` reset to 1 after each brick is important; otherwise subsequent draws would be transparent.

---

### 6. Update HUD Renderer

**File:** `src/games/breakout/renderers/HUDRenderer.ts`

Add score, level, and win screen:

```typescript
import type { BreakoutState } from '../types';
import { MAX_LEVEL } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: BreakoutState): void {
    const W = state.canvasW;
    const H = state.canvasH;

    // Top bar background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, 40);

    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'middle';

    // Score (left-center)
    ctx.fillStyle = '#e74c3c';
    ctx.textAlign = 'center';
    ctx.fillText(`Score: ${state.score}`, W / 2 - 80, 20);

    // Level (right-center)
    ctx.fillStyle = '#3498db';
    ctx.fillText(`Level: ${state.level}/${MAX_LEVEL}`, W / 2 + 80, 20);

    // Overlays
    switch (state.phase) {
      case 'start':
        this.drawOverlay(ctx, W, H, 'BREAKOUT', 'Click or press SPACE to launch\nMove mouse to aim', '#e74c3c');
        break;
      case 'paused':
        this.drawOverlay(ctx, W, H, 'PAUSED', 'Press P to resume', '#f39c12');
        break;
      case 'win':
        this.drawOverlay(ctx, W, H, 'YOU WIN!', `Final Score: ${state.score}\nClick or press SPACE to play again`, '#2ecc71');
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

**What's happening:**
- The top bar is a semi-transparent strip with score on the left and level on the right.
- The win overlay displays the final score and invites the player to restart.
- `MAX_LEVEL` is shown so the player knows their progress (e.g., "Level 3/5").

---

### 7. Update Physics System

**File:** `src/games/breakout/systems/PhysicsSystem.ts`

Use `state.baseBallSpeed` instead of the hardcoded constant:

```typescript
import type { BreakoutState, Ball } from '../types';

export class PhysicsSystem {
  update(state: BreakoutState, dt: number): void {
    const { paddle, canvasW } = state;

    paddle.x = Math.max(
      0,
      Math.min(canvasW - paddle.w, state.mouseX - paddle.w / 2),
    );

    if (state.phase === 'start') {
      for (const ball of state.balls) {
        ball.x = paddle.x + paddle.w / 2;
        ball.y = paddle.y - ball.r;
        ball.vx = 0;
        ball.vy = 0;
      }
      return;
    }

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

    for (let i = state.balls.length - 1; i >= 0; i--) {
      if (state.balls[i].y - state.balls[i].r > state.canvasH) {
        state.balls.splice(i, 1);
      }
    }

    if (state.balls.length === 0) {
      state.balls.push(this.createBall(state));
    }
  }

  createBall(state: BreakoutState): Ball {
    const { paddle, baseBallSpeed } = state;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    return {
      x: paddle.x + paddle.w / 2,
      y: paddle.y - 8,
      vx: Math.cos(angle) * baseBallSpeed,
      vy: Math.sin(angle) * baseBallSpeed,
      r: 6,
    };
  }
}
```

---

### 8. Update Input System

**File:** `src/games/breakout/systems/InputSystem.ts`

Add restart support for the win screen:

```typescript
import type { BreakoutState } from '../types';

export class InputSystem {
  private state: BreakoutState;
  private canvas: HTMLCanvasElement;
  private onReset: () => void;

  private mouseMoveHandler: (e: MouseEvent) => void;
  private keyHandler: (e: KeyboardEvent) => void;
  private clickHandler: (e: MouseEvent) => void;

  constructor(state: BreakoutState, canvas: HTMLCanvasElement, onReset: () => void) {
    this.state = state;
    this.canvas = canvas;
    this.onReset = onReset;

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
      if (s.phase === 'win') {
        this.onReset();
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

    if (s.phase === 'win') {
      this.onReset();
      return;
    }
  }

  private launchBall(): void {
    const s = this.state;
    s.phase = 'playing';

    for (const ball of s.balls) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
      ball.vx = Math.cos(angle) * s.baseBallSpeed;
      ball.vy = Math.sin(angle) * s.baseBallSpeed;
    }
  }
}
```

---

### 9. Update the Engine

**File:** `src/games/breakout/BreakoutEngine.ts`

Integrate the LevelSystem and reset logic:

```typescript
import type { BreakoutState } from './types';
import { PADDLE_BASE_W, PADDLE_H, BALL_R, BALL_BASE_SPEED } from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { LevelSystem } from './systems/LevelSystem';
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
  private levelSystem: LevelSystem;
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
        x: W / 2 - PADDLE_BASE_W / 2,
        y: paddleY,
        w: PADDLE_BASE_W,
        h: PADDLE_H,
        baseW: PADDLE_BASE_W,
      },
      bricks: [],
      score: 0,
      level: 1,
      canvasW: W,
      canvasH: H,
      mouseX: W / 2,
      baseBallSpeed: BALL_BASE_SPEED,
    };

    this.physicsSystem = new PhysicsSystem();
    this.collisionSystem = new CollisionSystem();
    this.levelSystem = new LevelSystem();
    this.inputSystem = new InputSystem(this.state, canvas, () => this.reset());

    this.boardRenderer = new BoardRenderer();
    this.hudRenderer = new HUDRenderer();

    // Load the first level
    this.levelSystem.loadLevel(this.state);

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
      this.levelSystem.update(this.state, dt);
    } else if (this.state.phase === 'start') {
      this.physicsSystem.update(this.state, dt);
    }

    this.boardRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private reset(): void {
    const s = this.state;
    s.score = 0;
    s.level = 1;
    s.paddle.w = PADDLE_BASE_W;
    s.paddle.x = s.canvasW / 2 - PADDLE_BASE_W / 2;
    s.phase = 'playing';
    this.levelSystem.loadLevel(s);
  }
}
```

---

### 10. Update Entry Point

**File:** `src/games/breakout/index.ts`

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
   - Level 1: Five clean rows of 1-hp bricks. Each brick dies in one hit.
   - Score increases as you break bricks (10 points per 1-hp brick).
   - Clear all bricks and the game instantly loads Level 2 with a checkerboard pattern.
   - Level 2 bricks marked "2" take two hits. They fade after the first hit.
   - Ball is noticeably faster on Level 2 (1.1x) and increasingly so on later levels.
   - Clear all 5 levels to see the green "YOU WIN!" screen.
   - Click or press Space on the win screen to restart from Level 1.

**Watch the multi-hit bricks:** On Level 3, the center bricks require 3 hits. Notice how they dim with each hit and show the remaining HP number.

---

## Try It

- Play through all 5 levels and note how the speed ramp feels.
- On Level 4 (Fortress), try to break through the outer wall to reach the inner bricks.
- Keep track of your final score across multiple attempts.

---

## Challenges

**Easy:**
- Add a sixth level with your own custom layout.
- Change the speed multiplier on Level 1 to 1.3 and see how it feels.

**Medium:**
- Add a brief "LEVEL 2!" flash overlay when transitioning between levels (display for 1.5 seconds).
- Instead of launching the ball automatically on level change, go to `start` phase and let the player click to launch.

**Hard:**
- Generate random level layouts procedurally: fill cells with random HP values (0-3) based on the level number.
- Add a "boss brick" in the center of Level 5 that takes 10 hits and is worth 200 points.

---

## What You Learned

- Level data structure with 2D layout arrays, per-row colors, and speed multipliers
- Multi-hit bricks with HP tracking, damage dimming, and HP display
- Level advancement by checking `bricks.every(b => !b.alive)`
- Speed scaling via `baseBallSpeed * speedMult`
- Win condition and game reset flow
- Score tracking with variable point values based on brick difficulty

**Next:** Powerup drops from bricks -- wide paddle, multi-ball, and slow ball!
