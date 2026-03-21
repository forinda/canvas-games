# Step 5: Powerups

**Goal:** Add powerup drops from destroyed bricks with timed effects: wide paddle, multi-ball, and slow ball.

**Time:** ~15 minutes

---

## What You'll Build

Powerup system:
- **Random drops**: 25% chance a destroyed brick spawns a falling powerup capsule
- **Three powerup types**: Wide paddle (W), Multi-ball (M), Slow ball (S)
- **Catch to activate**: Powerup activates when it touches the paddle
- **Timed effects**: Each effect lasts 8 seconds with a visible countdown
- **Visual indicators**: Colored circles with letter icons, paddle changes color when wide

---

## Concepts

- **Probability Gates**: `Math.random() > 0.25` to control drop chance
- **Effect Timers**: Track `remaining` milliseconds, decrement by `dt * 1000` each frame
- **State-Driven Rendering**: Paddle color changes based on active effects
- **Speed Normalization**: Scale ball velocity to match a target speed without changing direction

---

## Code

### 1. Update Types

**File:** `src/contexts/canvas2d/games/breakout/types.ts`

Add powerup types, the `Powerup` and `ActiveEffect` interfaces, and powerup constants:

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
  vy: number;       // Fall speed
  type: PowerupType;
  alive: boolean;
}

export interface ActiveEffect {
  type: PowerupType;
  remaining: number; // Milliseconds left
}

export interface BreakoutState {
  phase: GamePhase;
  balls: Ball[];
  paddle: Paddle;
  bricks: Brick[];
  powerups: Powerup[];
  effects: ActiveEffect[];
  score: number;
  level: number;
  canvasW: number;
  canvasH: number;
  mouseX: number;
  baseBallSpeed: number;
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

// Powerup constants
export const POWERUP_SIZE = 20;
export const POWERUP_SPEED = 150;     // Fall speed in px/s
export const POWERUP_DURATION = 8000; // Effect duration in ms
export const POWERUP_DROP_CHANCE = 0.25;
```

**What's happening:**
- `Powerup` is a falling rectangle with a type and alive flag. It moves downward at `POWERUP_SPEED`.
- `ActiveEffect` tracks a collected powerup: which type it is and how many milliseconds remain.
- `powerups` holds currently falling capsules; `effects` holds currently active effects.

---

### 2. Create the Powerup System

**File:** `src/contexts/canvas2d/games/breakout/systems/PowerupSystem.ts`

Tick effect timers and apply active effects each frame:

```typescript
import type { BreakoutState } from '../types';
import { PADDLE_BASE_W } from '../types';

export class PowerupSystem {
  update(state: BreakoutState, dt: number): void {
    const dtMs = dt * 1000;

    // Tick down effect timers
    for (const effect of state.effects) {
      effect.remaining -= dtMs;
    }

    // Apply active effects
    this.applyEffects(state);

    // Remove expired effects
    state.effects = state.effects.filter((e) => e.remaining > 0);

    // Re-apply after cleanup (to revert expired ones)
    this.applyEffects(state);
  }

  private applyEffects(state: BreakoutState): void {
    // Start from defaults
    let paddleW = PADDLE_BASE_W;
    let speedMult = 1.0;
    let hasMultiball = false;

    for (const effect of state.effects) {
      if (effect.remaining <= 0) continue;

      switch (effect.type) {
        case 'wide':
          // 60% wider paddle
          paddleW = PADDLE_BASE_W * 1.6;
          break;

        case 'slow':
          // 35% slower ball
          speedMult = 0.65;
          break;

        case 'multiball':
          if (!hasMultiball) {
            hasMultiball = true;
            // Spawn two extra balls if we only have one
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
            // Expire immediately so we only add balls once
            effect.remaining = 1;
          }
          break;
      }
    }

    // Apply paddle width (keep centered)
    const oldCenterX = state.paddle.x + state.paddle.w / 2;
    state.paddle.w = paddleW;
    state.paddle.x = Math.max(
      0,
      Math.min(state.canvasW - paddleW, oldCenterX - paddleW / 2),
    );

    // Apply speed to all balls
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

**What's happening:**

**Wide paddle:**
- Sets `paddleW` to 160% of the base width.
- Re-centers the paddle around its old center so it expands symmetrically.
- When the effect expires, the next `applyEffects` call resets to `PADDLE_BASE_W`.

**Slow ball:**
- Sets `speedMult` to 0.65, making the ball 35% slower.
- We compute `targetSpeed = baseBallSpeed * 0.65` and scale each ball's velocity to match.
- The direction is preserved because we multiply both `vx` and `vy` by the same factor.

**Multi-ball:**
- If the player only has one ball, spawn two clones at +/- 0.4 radians from the original's direction.
- We immediately set `remaining = 1` so the effect expires on the next frame, preventing duplicate spawns.
- This is a one-shot effect, not a duration effect.

**Speed normalization:**
- `scale = targetSpeed / currentSpeed` is the ratio we need to multiply by.
- We skip the scaling if the speed is already close (`Math.abs(diff) > 1`) to avoid floating-point jitter.

---

### 3. Update Collision System

**File:** `src/contexts/canvas2d/games/breakout/systems/CollisionSystem.ts`

Add powerup spawning on brick death and powerup-paddle collision:

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

  /** 25% chance to drop a random powerup from a destroyed brick */
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

  /** Check if any falling powerup touches the paddle */
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
        // Add the effect with full duration
        state.effects.push({ type: p.type, remaining: 8000 });
      }
    }
  }
}
```

**What's happening:**
- `maybeSpawnPowerup` rolls a 25% chance (`Math.random() > 0.25` means 75% of the time we return early). On success, it picks a random type and spawns a powerup capsule at the brick's position.
- `powerupPaddleCollision` uses simple AABB (axis-aligned bounding box) overlap to detect when a falling powerup touches the paddle.
- On contact, the powerup is killed and an `ActiveEffect` is pushed onto `state.effects` with 8000 ms remaining.

---

### 4. Update Physics System

**File:** `src/contexts/canvas2d/games/breakout/systems/PhysicsSystem.ts`

Add powerup movement and cleanup:

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

    // Remove balls that fell off screen
    for (let i = state.balls.length - 1; i >= 0; i--) {
      if (state.balls[i].y - state.balls[i].r > state.canvasH) {
        state.balls.splice(i, 1);
      }
    }

    // If all balls lost, respawn
    if (state.balls.length === 0) {
      state.balls.push(this.createBall(state));
    }

    // Move powerups downward
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
- Powerups fall at `POWERUP_SPEED` (150 px/s). If they pass the bottom of the canvas, they are marked dead.
- Dead powerups are filtered out at the end of each frame to keep the array clean.

---

### 5. Update Board Renderer

**File:** `src/contexts/canvas2d/games/breakout/renderers/BoardRenderer.ts`

Add powerup capsule drawing and paddle color based on active effects:

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

    // Powerups
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

    // Paddle turns gold when wide effect is active
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

    // Colored circle
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w / 2, 0, Math.PI * 2);
    ctx.fill();

    // Letter icon
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icons[p.type] ?? '?', p.x + p.w / 2, p.y + p.h / 2);
  }
}
```

**What's happening:**
- Powerups are drawn as glowing colored circles with a single-letter icon: **W** (wide/gold), **M** (multiball/green), **S** (slow/purple).
- The paddle checks `state.effects` for an active `wide` effect and turns gold (`#f39c12`) when active.
- All other rendering is unchanged from Step 4.

---

### 6. Update HUD Renderer

**File:** `src/contexts/canvas2d/games/breakout/renderers/HUDRenderer.ts`

Add active-effect timers below the top bar:

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

    // Score
    ctx.fillStyle = '#e74c3c';
    ctx.textAlign = 'center';
    ctx.fillText(`Score: ${state.score}`, W / 2 - 80, 20);

    // Level
    ctx.fillStyle = '#3498db';
    ctx.fillText(`Level: ${state.level}/${MAX_LEVEL}`, W / 2 + 80, 20);

    // Active effects
    this.drawEffects(ctx, state);

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

  private drawEffects(ctx: CanvasRenderingContext2D, state: BreakoutState): void {
    // Show active timed effects (skip multiball since it is instant)
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
      // Gentle pulse to draw attention
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
- Active duration-based effects (wide, slow) display below the top bar as pulsing colored text with a countdown.
- Multi-ball is excluded from the display since it is an instant effect.
- The pulse uses `Math.sin(performance.now() * 0.005)` to oscillate alpha between 0.6 and 1.0, creating a gentle breathing animation.

---

### 7. Update Level System

**File:** `src/contexts/canvas2d/games/breakout/systems/LevelSystem.ts`

Clear powerups and effects on level transition:

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

    // Clear powerups and effects between levels
    state.powerups = [];
    state.effects = [];

    // Reset paddle width
    state.paddle.w = state.paddle.baseW;

    // Fresh ball
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

### 8. Update the Engine

**File:** `src/contexts/canvas2d/games/breakout/BreakoutEngine.ts`

Add the PowerupSystem:

```typescript
import type { BreakoutState } from './types';
import { PADDLE_BASE_W, PADDLE_H, BALL_R, BALL_BASE_SPEED } from './types';
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
      powerups: [],
      effects: [],
      score: 0,
      level: 1,
      canvasW: W,
      canvasH: H,
      mouseX: W / 2,
      baseBallSpeed: BALL_BASE_SPEED,
    };

    this.physicsSystem = new PhysicsSystem();
    this.collisionSystem = new CollisionSystem();
    this.powerupSystem = new PowerupSystem();
    this.levelSystem = new LevelSystem();
    this.inputSystem = new InputSystem(this.state, canvas, () => this.reset());

    this.boardRenderer = new BoardRenderer();
    this.hudRenderer = new HUDRenderer();

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
      this.powerupSystem.update(this.state, dt);
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
    s.effects = [];
    s.powerups = [];
    s.paddle.w = PADDLE_BASE_W;
    s.paddle.x = s.canvasW / 2 - PADDLE_BASE_W / 2;
    s.phase = 'playing';
    this.levelSystem.loadLevel(s);
  }
}
```

---

### 9. Update Entry Point

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
   - Break bricks and watch for falling colored capsules
   - Catch a **W** (gold): paddle grows 60% wider and turns gold for 8 seconds
   - Catch an **M** (green): two extra balls spawn at slightly different angles
   - Catch an **S** (purple): all balls slow down to 65% speed for 8 seconds
   - Active effects show as pulsing text below the top bar with a countdown
   - When a timed effect expires, the paddle/speed returns to normal
   - Multi-ball means losing one ball is not fatal if others survive
   - Powerups and effects clear between levels

**Try stacking effects:** Catch a Wide powerup, then catch another Wide before the first expires. The timer resets.

---

## Try It

- Play through Level 1 without catching any powerups. Then replay and catch everything. Feel the difference.
- Get a multi-ball and try to keep all three balls alive as long as possible.
- Catch a Slow powerup on Level 5 to make the 1.5x speed more manageable.

---

## Challenges

**Easy:**
- Increase `POWERUP_DROP_CHANCE` to `0.5` for more powerups.
- Change the Slow effect to make the ball 50% slower instead of 35%.
- Add a fourth powerup type icon "F" that makes the ball faster (speed multiplier 1.5).

**Medium:**
- Add a "laser" powerup: instead of bouncing, the paddle shoots a projectile upward that destroys one brick.
- Make multi-ball spawn 4 extra balls instead of 2.

**Hard:**
- Add a "shrink" negative powerup (red) that makes the paddle 50% narrower.
- Implement effect stacking: two Wide pickups make the paddle even wider (220% of base).
- Add a visual trail behind falling powerups so they are easier to spot.

---

## What You Learned

- Probability-based spawning with `Math.random()` gates
- Timed effect system with millisecond countdowns and per-frame decrement
- Speed normalization: scaling velocity vectors to a target speed without changing direction
- State-driven visual changes (paddle color reacts to active effects)
- One-shot vs. duration effects (multi-ball is instant, wide/slow are timed)
- Cleanup on level transitions to prevent stale state

**Next:** Lives, score tracking, localStorage high score, and full game polish!
