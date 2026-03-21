# Step 3: Ball-Paddle Collision & Deflection

**Goal:** Implement realistic paddle hits with angle-based deflection and speed progression.

**Time:** ~25 minutes

---

## What You'll Build

Collision mechanics:
- **AABB collision detection**: Rectangle-circle intersection
- **Angle-based deflection**: Hit position determines bounce angle
- **Speed progression**: Ball accelerates with each paddle hit
- **Rally tracking**: Count consecutive hits
- **Push-out logic**: Prevent double collisions

---

## Concepts

- **Normalized Hit Position**: Map collision point to [-1, 1] range
- **Angle Calculation**: `angle = hitPosition × maxAngle`
- **Velocity from Angle**: `vx = cos(angle) × speed`, `vy = sin(angle) × speed`
- **Speed Ramping**: Incremental difficulty increase

---

## Code

### 1. Update Physics System with Collision

**File:** `src/contexts/canvas2d/games/pong/systems/PhysicsSystem.ts`

Add paddle collision detection:

```typescript
import type { PongState, Paddle, Ball } from '../types';
import {
  BALL_SPEED_INCREMENT,
  BALL_MAX_SPEED,
  MAX_BOUNCE_ANGLE,
} from '../types';

export class PhysicsSystem {
  update(state: PongState, dt: number): void {
    if (state.phase !== 'playing') return;

    const dtSec = dt / 1000;

    this.updatePaddles(state, dtSec);
    this.updateBall(state, dtSec);
    this.checkPaddleCollisions(state);
    this.updateBallTrail(state.ball, dt);
  }

  private updatePaddles(state: PongState, dtSec: number): void {
    this.movePaddle(state.leftPaddle, state.canvasH, dtSec);
    this.movePaddle(state.rightPaddle, state.canvasH, dtSec);
  }

  private movePaddle(paddle: Paddle, canvasH: number, dtSec: number): void {
    paddle.y += paddle.dy * dtSec;
    paddle.y = Math.max(0, Math.min(canvasH - paddle.h, paddle.y));
  }

  private updateBall(state: PongState, dtSec: number): void {
    const { ball, canvasH } = state;

    // Move ball
    ball.x += ball.vx * dtSec;
    ball.y += ball.vy * dtSec;

    // Wall collision (top/bottom)
    if (ball.y - ball.radius <= 0) {
      ball.y = ball.radius;
      ball.vy = Math.abs(ball.vy);
    } else if (ball.y + ball.radius >= canvasH) {
      ball.y = canvasH - ball.radius;
      ball.vy = -Math.abs(ball.vy);
    }

    // Side exits (will add scoring in next step)
    if (ball.x < 0 || ball.x > state.canvasW) {
      this.resetBall(state);
    }
  }

  private checkPaddleCollisions(state: PongState): void {
    const { ball, leftPaddle, rightPaddle } = state;

    // Left paddle collision
    if (
      ball.vx < 0 &&
      ball.x - ball.radius <= leftPaddle.x + leftPaddle.w &&
      ball.x >= leftPaddle.x &&
      ball.y >= leftPaddle.y &&
      ball.y <= leftPaddle.y + leftPaddle.h
    ) {
      this.deflectBall(state, leftPaddle, 1);
    }

    // Right paddle collision
    if (
      ball.vx > 0 &&
      ball.x + ball.radius >= rightPaddle.x &&
      ball.x <= rightPaddle.x + rightPaddle.w &&
      ball.y >= rightPaddle.y &&
      ball.y <= rightPaddle.y + rightPaddle.h
    ) {
      this.deflectBall(state, rightPaddle, -1);
    }
  }

  private deflectBall(state: PongState, paddle: Paddle, directionX: number): void {
    const { ball } = state;

    // Calculate hit position (normalized -1 to 1)
    const paddleCenterY = paddle.y + paddle.h / 2;
    const hitOffset = ball.y - paddleCenterY;
    const normalizedHit = hitOffset / (paddle.h / 2); // Range: [-1, 1]

    // Clamp to valid range
    const clampedHit = Math.max(-1, Math.min(1, normalizedHit));

    // Calculate bounce angle (max ±60°)
    const angle = clampedHit * MAX_BOUNCE_ANGLE;

    // Increase speed
    ball.speed = Math.min(ball.speed + BALL_SPEED_INCREMENT, BALL_MAX_SPEED);

    // Apply new velocity
    ball.vx = directionX * Math.cos(angle) * ball.speed;
    ball.vy = Math.sin(angle) * ball.speed;

    // Push ball outside paddle to prevent double-hit
    if (directionX > 0) {
      // Hit right paddle, push left
      ball.x = paddle.x - ball.radius - 1;
    } else {
      // Hit left paddle, push right
      ball.x = paddle.x + paddle.w + ball.radius + 1;
    }

    // Track rally
    state.rallyHits += 1;
  }

  private updateBallTrail(ball: Ball, dt: number): void {
    ball.trail.push({
      x: ball.x,
      y: ball.y,
      alpha: 0.6,
    });

    for (const t of ball.trail) {
      t.alpha -= 0.06;
    }

    ball.trail = ball.trail.filter(t => t.alpha > 0);

    if (ball.trail.length > 20) {
      ball.trail.shift();
    }
  }

  private resetBall(state: PongState): void {
    const { ball, canvasW, canvasH } = state;

    ball.x = canvasW / 2;
    ball.y = canvasH / 2;

    const angle = (Math.random() - 0.5) * (Math.PI / 3);
    const direction = Math.random() < 0.5 ? -1 : 1;

    ball.speed = 360;
    ball.vx = direction * Math.cos(angle) * ball.speed;
    ball.vy = Math.sin(angle) * ball.speed;

    ball.trail = [];
    state.rallyHits = 0; // Reset rally counter
  }
}
```

**Collision logic breakdown:**

1. **AABB Check**: Ball rectangle overlaps paddle rectangle
2. **Direction Check**: Only collide when ball is moving toward paddle (`vx < 0` for left, `vx > 0` for right)
3. **Hit Position**: Calculate where ball hits paddle vertically
4. **Normalize**: Map hit position to [-1, 1] range (top = -1, center = 0, bottom = +1)
5. **Angle**: Multiply by max angle (60°) to get bounce angle
6. **Velocity**: Use trig to convert angle + speed → vx/vy components
7. **Speed Up**: Add 20 px/s per hit (capped at 800)
8. **Push Out**: Move ball outside paddle bounds to prevent re-collision

---

### 2. Visual Feedback for Rally

**File:** `src/contexts/canvas2d/games/pong/renderers/GameRenderer.ts`

Add rally counter display:

```typescript
import type { PongState, Paddle, Ball } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: PongState): void {
    const { canvasW, canvasH } = state;

    // Dark background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Center line (dashed)
    this.drawCenterLine(ctx, canvasW, canvasH);

    // Paddles
    this.drawPaddle(ctx, state.leftPaddle);
    this.drawPaddle(ctx, state.rightPaddle);

    // Ball trail
    this.drawBallTrail(ctx, state.ball);

    // Ball
    this.drawBall(ctx, state.ball);

    // Rally counter (when active)
    if (state.rallyHits > 2) {
      this.drawRallyCounter(ctx, state);
    }
  }

  private drawCenterLine(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);

    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  private drawPaddle(ctx: CanvasRenderingContext2D, paddle: Paddle): void {
    ctx.shadowColor = '#26c6da';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#26c6da';

    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 4);
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  private drawBallTrail(ctx: CanvasRenderingContext2D, ball: Ball): void {
    for (const t of ball.trail) {
      ctx.globalAlpha = t.alpha;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(t.x, t.y, ball.radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawBall(ctx: CanvasRenderingContext2D, ball: Ball): void {
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#fff';

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  private drawRallyCounter(ctx: CanvasRenderingContext2D, state: PongState): void {
    const { canvasW, rallyHits } = state;

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.fillText(`${rallyHits} HIT RALLY!`, canvasW / 2, 20);
  }
}
```

**Rally feedback:** Shows golden text when rally exceeds 2 hits (good volleys)

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Pong"
3. **Paddle Hits:**
   - Move left paddle (W/S) to intercept ball
   - Ball bounces off paddle
   - Hit near top/bottom edges → sharp angle
   - Hit near center → shallow angle
4. **Speed Progression:**
   - Each hit makes ball slightly faster
   - Long rallies create challenging speeds
5. **Rally Counter:**
   - After 2+ consecutive hits, golden text appears at top
   - Shows current rally length
6. **Physics:**
   - Ball's direction reverses on paddle hit
   - Angle varies based on where paddle connects
   - Try hitting with moving paddle vs stationary

---

## Diagrams

### Hit Position to Angle Mapping

```
Paddle:
┌─────┐
│ -1  │  ← Top: steep upward angle (-60°)
│     │
│  0  │  ← Center: shallow angle (0° - straight)
│     │
│ +1  │  ← Bottom: steep downward angle (+60°)
└─────┘

Formula:
hitPos = (ballY - paddleCenterY) / (paddleHeight / 2)
angle = hitPos × (π/3)  // ±60° max
```

### Velocity Components

```
       vy (upward)
          ↑
          │
          │  /
          │ / ← angle
─────────┤/──────────→ vx (horizontal)
          │
          │
          ↓
       vy (downward)

vx = cos(angle) × speed × direction
vy = sin(angle) × speed
```

---

## Challenges

**Easy:**
- Change max bounce angle to 45°
- Make ball speed increase by 30 px/s per hit
- Add sound effect on paddle hit

**Medium:**
- Add "sweet spot" (center 20% gives speed boost)
- Spin effect (moving paddle adds extra vy)
- Screen shake on paddle hit

**Hard:**
- Curved ball trajectory (magnus effect)
- Predictive AI (calculate where ball will be)
- Slow-motion replay on long rallies

---

## What You Learned

✅ AABB collision detection  
✅ Normalized hit position mapping  
✅ Angle-based deflection physics  
✅ Trigonometric velocity calculation  
✅ Speed progression mechanics  
✅ Push-out to prevent double-collisions  
✅ Rally tracking for feedback

**Next:** Scoring system and game states!
