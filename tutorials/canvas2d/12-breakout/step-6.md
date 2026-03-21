# Step 6: Lives, Score & Polish

**Goal:** Add 3 lives, persistent high score via localStorage, a full HUD with hearts, and game-over/win overlays.

**Time:** ~15 minutes

---

## What You'll Build

Final polish:
- **3 lives**: Lose a life when all balls fall off screen, game over at zero
- **High score**: Saved to localStorage and displayed in the HUD
- **Heart display**: Red hearts in the top-right corner show remaining lives
- **Game-over overlay**: Shows final score with restart prompt
- **Exit button**: Top-left "< EXIT" link to leave the game
- **Touch support**: `touchmove` for mobile paddle control
- **Window resize**: Canvas adapts to viewport changes

---

## Concepts

- **Lives System**: Decrement a counter instead of immediately respawning the ball
- **localStorage Persistence**: Read/write a high score that survives page reloads
- **HUD Layout**: Multiple aligned text elements across a fixed-height top bar
- **Graceful Degradation**: `try/catch` around localStorage for incognito/restricted environments

---

## Code

### 1. Final Types

**File:** `src/contexts/canvas2d/games/breakout/types.ts`

Add `lives`, `highScore`, and the localStorage key constant:

```typescript
export type PowerupType = 'wide' | 'multiball' | 'slow';

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
  baseW: number;
}

export interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  color: string;
  alive: boolean;
}

export interface Powerup {
  x: number;
  y: number;
  w: number;
  h: number;
  vy: number;
  type: PowerupType;
  alive: boolean;
}

export interface ActiveEffect {
  type: PowerupType;
  remaining: number;
}

export interface BreakoutState {
  phase: GamePhase;
  balls: Ball[];
  paddle: Paddle;
  bricks: Brick[];
  powerups: Powerup[];
  effects: ActiveEffect[];
  score: number;
  highScore: number;
  lives: number;
  level: number;
  canvasW: number;
  canvasH: number;
  baseBallSpeed: number;
  mouseX: number;
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
export const POWERUP_SIZE = 20;
export const POWERUP_SPEED = 150;
export const POWERUP_DURATION = 8000;
export const POWERUP_DROP_CHANCE = 0.25;
export const MAX_LIVES = 3;
export const MAX_LEVEL = 5;
export const HS_KEY = 'breakout_highscore';
```

---

### 2. Final Level Data

**File:** `src/contexts/canvas2d/games/breakout/data/levels.ts`

No changes from Step 5:

```typescript
import type { Brick } from '../types';
import { BRICK_H, BRICK_GAP, BRICK_TOP_OFFSET } from '../types';

export interface LevelDef {
  layout: number[][];
  colors: string[];
  speedMult: number;
}

export const LEVELS: LevelDef[] = [
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

---

### 3. Final Physics System

**File:** `src/contexts/canvas2d/games/breakout/systems/PhysicsSystem.ts`

Add the lives system: losing all balls decrements lives and triggers game over at zero:

```typescript
import type { BreakoutState, Ball } from '../types';

export class PhysicsSystem {
  update(state: BreakoutState, dt: number): void {
    const { paddle, canvasW } = state;

    // Paddle follows mouse
    paddle.x = Math.max(
      0,
      Math.min(canvasW - paddle.w, state.mouseX - paddle.w / 2),
    );

    // Start phase: ball sits on paddle
    if (state.phase === 'start') {
      for (const ball of state.balls) {
        ball.x = paddle.x + paddle.w / 2;
        ball.y = paddle.y - ball.r;
        ball.vx = 0;
        ball.vy = 0;
      }
      return;
    }

    // Move balls
    for (const ball of state.balls) {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      // Wall bounce: left/right
      if (ball.x - ball.r <= 0) {
        ball.x = ball.r;
        ball.vx = Math.abs(ball.vx);
      } else if (ball.x + ball.r >= canvasW) {
        ball.x = canvasW - ball.r;
        ball.vx = -Math.abs(ball.vx);
      }

      // Wall bounce: top
      if (ball.y - ball.r <= 0) {
        ball.y = ball.r;
        ball.vy = Math.abs(ball.vy);
      }
    }

    // Remove balls that fell below screen
    for (let i = state.balls.length - 1; i >= 0; i--) {
      if (state.balls[i].y - state.balls[i].r > state.canvasH) {
        state.balls.splice(i, 1);
      }
    }

    // If all balls lost, lose a life
    if (state.balls.length === 0) {
      state.lives--;
      if (state.lives <= 0) {
        state.phase = 'gameover';
      } else {
        // Respawn a ball on the paddle
        state.balls.push(this.createBall(state));
      }
    }

    // Move powerups
    for (const p of state.powerups) {
      if (p.alive) {
        p.y += p.vy * dt;
        if (p.y > state.canvasH) {
          p.alive = false;
        }
      }
    }

    // Clean dead powerups
    state.powerups = state.powerups.filter((p) => p.alive);
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

**What's happening:**
- When `state.balls.length === 0`, we decrement `state.lives`.
- If lives hit zero, the phase switches to `gameover` and the game loop stops updating physics.
- If lives remain, a fresh ball spawns above the paddle and immediately launches. The player keeps their current brick progress.

---

### 4. Final Collision System

**File:** `src/contexts/canvas2d/games/breakout/systems/CollisionSystem.ts`

No changes from Step 5:

```typescript
import type { BreakoutState, Ball, Brick, PowerupType } from '../types';
import { POWERUP_DROP_CHANCE, POWERUP_SIZE, POWERUP_SPEED } from '../types';

export class CollisionSystem {
  update(state: BreakoutState, _dt: number): void {
    this.ballPaddleCollision(state);
    this.ballBrickCollision(state);
    this.powerupPaddleCollision(state);
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

    brick.hp--;
    if (brick.hp <= 0) {
      brick.alive = false;
      state.score += brick.maxHp * 10;
      this.maybeSpawnPowerup(brick, state);
    } else {
      state.score += 5;
    }
  }

  private maybeSpawnPowerup(brick: Brick, state: BreakoutState): void {
    if (Math.random() > POWERUP_DROP_CHANCE) return;

    const types: PowerupType[] = ['wide', 'multiball', 'slow'];
    const type = types[Math.floor(Math.random() * types.length)];

    state.powerups.push({
      x: brick.x + brick.w / 2 - POWERUP_SIZE / 2,
      y: brick.y + brick.h,
      w: POWERUP_SIZE,
      h: POWERUP_SIZE,
      vy: POWERUP_SPEED,
      type,
      alive: true,
    });
  }

  private powerupPaddleCollision(state: BreakoutState): void {
    const { paddle } = state;

    for (const p of state.powerups) {
      if (!p.alive) continue;

      if (
        p.x + p.w >= paddle.x &&
        p.x <= paddle.x + paddle.w &&
        p.y + p.h >= paddle.y &&
        p.y <= paddle.y + paddle.h
      ) {
        p.alive = false;
        state.effects.push({ type: p.type, remaining: 8000 });
      }
    }
  }
}
```

---

### 5. Final Powerup System

**File:** `src/contexts/canvas2d/games/breakout/systems/PowerupSystem.ts`

No changes from Step 5:

```typescript
import type { BreakoutState } from '../types';
import { PADDLE_BASE_W } from '../types';

export class PowerupSystem {
  update(state: BreakoutState, dt: number): void {
    const dtMs = dt * 1000;

    for (const effect of state.effects) {
      effect.remaining -= dtMs;
    }

    this.applyEffects(state);
    state.effects = state.effects.filter((e) => e.remaining > 0);
    this.applyEffects(state);
  }

  private applyEffects(state: BreakoutState): void {
    let paddleW = PADDLE_BASE_W;
    let speedMult = 1.0;
    let hasMultiball = false;

    for (const effect of state.effects) {
      if (effect.remaining <= 0) continue;

      switch (effect.type) {
        case 'wide':
          paddleW = PADDLE_BASE_W * 1.6;
          break;
        case 'slow':
          speedMult = 0.65;
          break;
        case 'multiball':
          if (!hasMultiball) {
            hasMultiball = true;
            if (state.balls.length === 1) {
              const b = state.balls[0];
              const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
              for (let i = 0; i < 2; i++) {
                const angle = Math.atan2(b.vy, b.vx) + (i === 0 ? 0.4 : -0.4);
                state.balls.push({
                  x: b.x,
                  y: b.y,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  r: b.r,
                });
              }
            }
            effect.remaining = 1;
          }
          break;
      }
    }

    const oldCenterX = state.paddle.x + state.paddle.w / 2;
    state.paddle.w = paddleW;
    state.paddle.x = Math.max(
      0,
      Math.min(state.canvasW - paddleW, oldCenterX - paddleW / 2),
    );

    const targetSpeed = state.baseBallSpeed * speedMult;
    for (const ball of state.balls) {
      const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      if (currentSpeed > 0 && Math.abs(currentSpeed - targetSpeed) > 1) {
        const scale = targetSpeed / currentSpeed;
        ball.vx *= scale;
        ball.vy *= scale;
      }
    }
  }
}
```

---

### 6. Final Level System

**File:** `src/contexts/canvas2d/games/breakout/systems/LevelSystem.ts`

No changes from Step 5:

```typescript
import type { BreakoutState } from '../types';
import { BALL_BASE_SPEED, MAX_LEVEL } from '../types';
import { LEVELS, loadBricksForLevel } from '../data/levels';

export class LevelSystem {
  update(state: BreakoutState, _dt: number): void {
    const allCleared = state.bricks.every((b) => !b.alive);
    if (!allCleared) return;

    if (state.level >= MAX_LEVEL) {
      state.phase = 'win';
      return;
    }

    state.level++;
    this.loadLevel(state);
  }

  loadLevel(state: BreakoutState): void {
    const levelIdx = state.level - 1;
    const def = LEVELS[Math.min(levelIdx, LEVELS.length - 1)];

    state.bricks = loadBricksForLevel(levelIdx, state.canvasW);
    state.baseBallSpeed = BALL_BASE_SPEED * def.speedMult;
    state.powerups = [];
    state.effects = [];
    state.paddle.w = state.paddle.baseW;

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

---

### 7. Final Input System

**File:** `src/contexts/canvas2d/games/breakout/systems/InputSystem.ts`

Add touch support, exit button, and game-over/win restart:

```typescript
import type { BreakoutState } from '../types';

export class InputSystem {
  private state: BreakoutState;
  private canvas: HTMLCanvasElement;
  private onExit: () => void;
  private onReset: () => void;

  private mouseMoveHandler: (e: MouseEvent) => void;
  private touchMoveHandler: (e: TouchEvent) => void;
  private keyHandler: (e: KeyboardEvent) => void;
  private clickHandler: (e: MouseEvent) => void;

  constructor(
    state: BreakoutState,
    canvas: HTMLCanvasElement,
    onExit: () => void,
    onReset: () => void,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.onExit = onExit;
    this.onReset = onReset;

    this.mouseMoveHandler = (e: MouseEvent) => this.handleMouseMove(e);
    this.touchMoveHandler = (e: TouchEvent) => this.handleTouchMove(e);
    this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
    this.clickHandler = (e: MouseEvent) => this.handleClick(e);
  }

  attach(): void {
    this.canvas.addEventListener('mousemove', this.mouseMoveHandler);
    this.canvas.addEventListener('touchmove', this.touchMoveHandler, { passive: false });
    this.canvas.addEventListener('click', this.clickHandler);
    window.addEventListener('keydown', this.keyHandler);
  }

  detach(): void {
    this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
    this.canvas.removeEventListener('touchmove', this.touchMoveHandler);
    this.canvas.removeEventListener('click', this.clickHandler);
    window.removeEventListener('keydown', this.keyHandler);
  }

  private canvasX(clientX: number): number {
    const rect = this.canvas.getBoundingClientRect();
    return (clientX - rect.left) * (this.canvas.width / rect.width);
  }

  private canvasY(clientY: number): number {
    const rect = this.canvas.getBoundingClientRect();
    return (clientY - rect.top) * (this.canvas.height / rect.height);
  }

  private handleMouseMove(e: MouseEvent): void {
    this.state.mouseX = this.canvasX(e.clientX);
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault(); // Prevent scroll on mobile
    if (e.touches.length > 0) {
      this.state.mouseX = this.canvasX(e.touches[0].clientX);
    }
  }

  private handleKey(e: KeyboardEvent): void {
    const s = this.state;

    if (e.key === 'Escape') {
      this.onExit();
      return;
    }

    if (e.key === 'p' || e.key === 'P') {
      if (s.phase === 'playing') s.phase = 'paused';
      else if (s.phase === 'paused') s.phase = 'playing';
      return;
    }

    if (e.key === ' ' || e.key === 'Enter') {
      if (s.phase === 'start') {
        s.phase = 'playing';
        return;
      }
      if (s.phase === 'gameover' || s.phase === 'win') {
        this.onReset();
        return;
      }
    }
  }

  private handleClick(e: MouseEvent): void {
    const s = this.state;
    const x = this.canvasX(e.clientX);
    const y = this.canvasY(e.clientY);

    // Exit button (top-left corner)
    if (x < 80 && y < 40) {
      this.onExit();
      return;
    }

    if (s.phase === 'start') {
      s.phase = 'playing';
      return;
    }

    if (s.phase === 'gameover' || s.phase === 'win') {
      this.onReset();
      return;
    }
  }
}
```

**What's happening:**
- `touchmove` with `{ passive: false }` allows us to call `preventDefault()` to stop the browser from scrolling when the player drags their finger.
- `canvasY` is added so we can detect clicks in the exit-button region (top-left 80x40 area).
- Escape exits the game entirely (calls `onExit`). Space/Enter on the start/gameover/win screens transitions or resets.
- The exit button is a clickable region, not a DOM element. We just check if the click coordinates are in the top-left zone.

---

### 8. Final Board Renderer

**File:** `src/contexts/canvas2d/games/breakout/renderers/BoardRenderer.ts`

No changes from Step 5:

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

    for (const brick of state.bricks) {
      if (!brick.alive) continue;
      this.drawBrick(ctx, brick);
    }

    this.drawPaddle(ctx, state);

    for (const ball of state.balls) {
      this.drawBall(ctx, ball);
    }

    for (const p of state.powerups) {
      if (!p.alive) continue;
      this.drawPowerup(ctx, p);
    }
  }

  private drawBrick(
    ctx: CanvasRenderingContext2D,
    brick: { x: number; y: number; w: number; h: number; hp: number; maxHp: number; color: string },
  ): void {
    const hpRatio = brick.hp / brick.maxHp;
    ctx.fillStyle = brick.color;
    ctx.globalAlpha = 0.4 + 0.6 * hpRatio;
    ctx.shadowColor = brick.color;
    ctx.shadowBlur = 4;

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

    if (brick.maxHp > 1) {
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(brick.hp), brick.x + brick.w / 2, brick.y + brick.h / 2);
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  private drawPaddle(ctx: CanvasRenderingContext2D, state: BreakoutState): void {
    const p = state.paddle;
    const isWide = state.effects.some((e) => e.type === 'wide' && e.remaining > 0);
    const color = isWide ? '#f39c12' : '#3498db';

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

  private drawPowerup(
    ctx: CanvasRenderingContext2D,
    p: { x: number; y: number; w: number; h: number; type: string },
  ): void {
    const colors: Record<string, string> = {
      wide: '#f39c12',
      multiball: '#2ecc71',
      slow: '#9b59b6',
    };
    const icons: Record<string, string> = {
      wide: 'W',
      multiball: 'M',
      slow: 'S',
    };

    const color = colors[p.type] ?? '#fff';

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icons[p.type] ?? '?', p.x + p.w / 2, p.y + p.h / 2);
  }
}
```

---

### 9. Final HUD Renderer

**File:** `src/contexts/canvas2d/games/breakout/renderers/HUDRenderer.ts`

Add lives (hearts), high score, exit button, and game-over overlay:

```typescript
import type { BreakoutState } from '../types';
import { MAX_LEVEL } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: BreakoutState): void {
    const W = state.canvasW;
    const H = state.canvasH;

    // Top bar
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, 40);

    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'middle';

    // Exit button (top-left)
    ctx.fillStyle = '#666';
    ctx.textAlign = 'left';
    ctx.fillText('< EXIT', 12, 20);

    // Score
    ctx.fillStyle = '#e74c3c';
    ctx.textAlign = 'center';
    ctx.fillText(`Score: ${state.score}`, W / 2 - 80, 20);

    // Level
    ctx.fillStyle = '#3498db';
    ctx.fillText(`Level: ${state.level}/${MAX_LEVEL}`, W / 2 + 80, 20);

    // Lives (hearts, right side)
    ctx.fillStyle = '#e74c3c';
    ctx.textAlign = 'right';
    const heartsStr = '\u2764'.repeat(state.lives);
    ctx.fillText(heartsStr, W - 60, 20);

    // High score (far right)
    if (state.highScore > 0) {
      ctx.fillStyle = '#666';
      ctx.fillText(`Best: ${state.highScore}`, W - 12, 20);
    }

    // Active effects
    this.drawEffects(ctx, state);

    // Phase overlays
    switch (state.phase) {
      case 'start':
        this.drawOverlay(ctx, W, H, 'BREAKOUT', 'Click or press SPACE to start\nMove mouse to control paddle', '#e74c3c');
        break;
      case 'paused':
        this.drawOverlay(ctx, W, H, 'PAUSED', 'Press P to resume', '#f39c12');
        break;
      case 'gameover':
        this.drawOverlay(ctx, W, H, 'GAME OVER', `Final Score: ${state.score}\nClick or press SPACE to restart`, '#ef4444');
        break;
      case 'win':
        this.drawOverlay(ctx, W, H, 'YOU WIN!', `Final Score: ${state.score}\nClick or press SPACE to play again`, '#2ecc71');
        break;
    }
  }

  private drawEffects(ctx: CanvasRenderingContext2D, state: BreakoutState): void {
    const activeEffects = state.effects.filter((e) => e.remaining > 0 && e.type !== 'multiball');
    if (activeEffects.length === 0) return;

    const colors: Record<string, string> = {
      wide: '#f39c12',
      slow: '#9b59b6',
    };
    const labels: Record<string, string> = {
      wide: 'WIDE',
      slow: 'SLOW',
    };

    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    let offsetX = 12;
    const y = 50;

    for (const effect of activeEffects) {
      const color = colors[effect.type] ?? '#fff';
      const label = labels[effect.type] ?? effect.type.toUpperCase();
      const secs = Math.ceil(effect.remaining / 1000);

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(performance.now() * 0.005);
      ctx.fillText(`${label} ${secs}s`, offsetX, y);
      ctx.globalAlpha = 1;
      offsetX += 80;
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
- The top bar now contains: exit button (left), score (center-left), level (center-right), hearts (right), and high score (far right).
- Hearts are rendered using the Unicode heart character repeated `lives` times.
- The high score only shows if it is greater than zero, keeping the HUD clean on first play.
- The game-over overlay uses a red color (`#ef4444`) and shows the final score.
- The win overlay uses green (`#2ecc71`) to convey success.

---

### 10. Final Engine

**File:** `src/contexts/canvas2d/games/breakout/BreakoutEngine.ts`

Add localStorage high score tracking, window resize handling, and the complete system pipeline:

```typescript
import type { BreakoutState } from './types';
import {
  PADDLE_BASE_W,
  PADDLE_H,
  BALL_BASE_SPEED,
  MAX_LIVES,
  HS_KEY,
} from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { PowerupSystem } from './systems/PowerupSystem';
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
  private powerupSystem: PowerupSystem;
  private levelSystem: LevelSystem;
  private boardRenderer: BoardRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Load high score from localStorage
    let hs = 0;
    try {
      hs = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
    } catch {
      /* localStorage may be blocked in incognito */
    }

    const paddleY = canvas.height - 50;

    this.state = {
      phase: 'start',
      balls: [],
      paddle: {
        x: canvas.width / 2 - PADDLE_BASE_W / 2,
        y: paddleY,
        w: PADDLE_BASE_W,
        h: PADDLE_H,
        baseW: PADDLE_BASE_W,
      },
      bricks: [],
      powerups: [],
      effects: [],
      score: 0,
      highScore: hs,
      lives: MAX_LIVES,
      level: 1,
      canvasW: canvas.width,
      canvasH: canvas.height,
      baseBallSpeed: BALL_BASE_SPEED,
      mouseX: canvas.width / 2,
    };

    // Systems
    this.physicsSystem = new PhysicsSystem();
    this.collisionSystem = new CollisionSystem();
    this.powerupSystem = new PowerupSystem();
    this.levelSystem = new LevelSystem();
    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      onExit,
      () => this.reset(),
    );

    // Renderers
    this.boardRenderer = new BoardRenderer();
    this.hudRenderer = new HUDRenderer();

    // Load first level
    this.levelSystem.loadLevel(this.state);

    // Handle window resize
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasW = canvas.width;
      this.state.canvasH = canvas.height;
      this.state.paddle.y = canvas.height - 50;
    };

    this.inputSystem.attach();
    window.addEventListener('resize', this.resizeHandler);
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
    window.removeEventListener('resize', this.resizeHandler);
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
      this.powerupSystem.update(this.state, dt);
      this.levelSystem.update(this.state, dt);

      // Update high score in real time
      if (this.state.score > this.state.highScore) {
        this.state.highScore = this.state.score;
        try {
          localStorage.setItem(HS_KEY, String(this.state.highScore));
        } catch {
          /* noop */
        }
      }
    } else if (this.state.phase === 'start') {
      this.physicsSystem.update(this.state, dt);
    }

    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    this.boardRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }

  private reset(): void {
    const s = this.state;
    s.score = 0;
    s.lives = MAX_LIVES;
    s.level = 1;
    s.effects = [];
    s.powerups = [];
    s.paddle.w = PADDLE_BASE_W;
    s.paddle.x = s.canvasW / 2 - PADDLE_BASE_W / 2;
    s.phase = 'playing';
    this.levelSystem.loadLevel(s);
  }
}
```

**What's happening:**

**High score persistence:**
- On construction, we read the stored high score from `localStorage` using `HS_KEY`.
- Every frame during gameplay, if the current score exceeds the high score, we update both the in-memory value and the stored value.
- Both read and write are wrapped in `try/catch` because `localStorage` throws in some environments (incognito mode, storage full, etc.).

**Window resize:**
- When the window resizes, we update `canvas.width`, `canvas.height`, and the related state fields.
- The paddle's Y position is recalculated to stay 50px from the new bottom edge.
- We do not rebuild the brick grid on resize; the bricks stay at their original positions. This is acceptable for a game that is played in one session.

**System pipeline order:**
1. `PhysicsSystem` -- moves paddle, balls, and powerups
2. `CollisionSystem` -- checks ball-paddle, ball-brick, and powerup-paddle contacts
3. `PowerupSystem` -- ticks effect timers and applies active effects
4. `LevelSystem` -- checks if all bricks are cleared and advances levels

This order matters. Physics must move objects before collision checks, and powerups must apply after collisions (so a just-collected powerup takes effect this frame).

**Reset:**
- Resets score, lives, level, effects, powerups, and paddle width to their initial values.
- Calls `loadLevel` to rebuild the brick grid and spawn a ball.
- Sets phase to `playing` so the game starts immediately.

---

### 11. Final Entry Point

**File:** `src/contexts/canvas2d/games/breakout/index.ts`

Export using the platform adapter pattern:

```typescript
import type { GameDefinition } from '@core/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const BreakoutGame: GameDefinition = {
  id: 'breakout',
  category: 'arcade' as const,
  name: 'Breakout',
  description: 'Break all the bricks with your ball!',
  icon: '\uD83E\uDDF1',
  color: '#e74c3c',
  help: {
    goal: 'Break all the bricks by bouncing the ball off your paddle.',
    controls: [
      { key: 'Mouse', action: 'Move paddle left/right' },
      { key: 'Click', action: 'Launch ball / restart' },
      { key: 'P', action: 'Pause / resume' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: [
      'Catch powerups for wider paddle, multi-ball, or slow ball',
      'Aim for the corners to clear bricks faster',
      'Ball speed increases each level',
    ],
  },
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
```

**File:** `src/contexts/canvas2d/games/breakout/adapters/PlatformAdapter.ts`

```typescript
import type { GameInstance } from '@core/GameInterface';
import { BreakoutEngine } from '../BreakoutEngine';

export class PlatformAdapter implements GameInstance {
  private engine: BreakoutEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new BreakoutEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Breakout game
3. **Observe:**
   - Start screen: "BREAKOUT" with instructions
   - Top bar: "< EXIT" on the left, score, level, hearts, and high score
   - 3 red hearts in the top-right corner
   - Click to launch. Miss the ball: one heart disappears
   - Lose all 3 lives: "GAME OVER" screen with final score
   - Click or press SPACE to restart from Level 1
   - Beat all 5 levels: "YOU WIN!" screen with final score in green
   - Close the tab, reopen: your high score persists
   - Press ESC or click "< EXIT" to leave the game
   - On mobile: drag finger to move the paddle

**Full playthrough test:** Play from Level 1 to Level 5. Verify that:
- Score accumulates across levels
- Lives carry over between levels
- High score updates in real time
- Powerups work on every level
- Ball speed visibly increases each level
- The win screen shows your total score

---

## Try It

- Intentionally lose all 3 lives on Level 1 to see the game-over screen.
- Beat the game, then reload the page. Your high score should still display.
- Open developer tools, go to Application > Local Storage, and find the `breakout_highscore` key.
- Resize the browser window while playing to see the canvas adapt.

---

## Challenges

**Easy:**
- Change `MAX_LIVES` to 5 for a more forgiving game.
- Display the player's current score on the game-over overlay in addition to "Final Score".
- Add a "NEW BEST!" flash when the player beats their high score mid-game.

**Medium:**
- Add a combo system: breaking bricks in quick succession (within 2 seconds) multiplies the score by 2x, 3x, etc.
- Save the highest level reached alongside the high score.
- Add a screen shake effect when the player loses a life.

**Hard:**
- Add a replay system: record all mouse positions and ball launches, then play them back.
- Implement an online leaderboard using a simple API endpoint.
- Add a level editor where the player can design custom brick layouts and export them as JSON.

---

## What You Learned

- Lives system: decrement on ball loss, game over at zero
- localStorage for persistent high scores with graceful error handling
- HUD layout with multiple aligned elements across a top bar
- Touch input support with `touchmove` and `preventDefault`
- Window resize handling for responsive canvas games
- Complete game flow: start -> playing -> paused -> gameover/win -> restart
- Platform adapter pattern for clean game instantiation
- System pipeline ordering for correct per-frame behavior

---

## Complete Game Summary

Over 6 steps, you built a fully featured Breakout game:

1. **Step 1** -- Paddle and ball with mouse tracking and wall bouncing
2. **Step 2** -- Angle-based paddle reflection and click-to-launch
3. **Step 3** -- Brick grid with circle-rectangle collision detection
4. **Step 4** -- Five unique levels with multi-hit bricks and speed scaling
5. **Step 5** -- Three powerup types with timed effects
6. **Step 6** -- Lives, persistent high score, full HUD, and polish

**Key techniques you now own:**
- Circle-rect collision with edge detection
- Angle-based reflection using hit-position mapping
- Level data as 2D arrays with per-row colors and speed multipliers
- Powerup drop probability, timed effects, and speed normalization
- Game state machine (start/playing/paused/gameover/win)
- localStorage persistence with error handling
- Touch and mouse input in the same game

**Next Game:** Continue to [Flappy Bird](../13-flappy-bird/README.md) where you will learn gravity physics, scrolling obstacles, and procedural gap generation.
