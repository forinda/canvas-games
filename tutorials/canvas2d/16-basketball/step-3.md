# Step 3: Hoop & Scoring

**Goal:** Draw a hoop with backboard, rim, and net. Detect when the ball passes through the hoop and track the score.

**Time:** ~15 minutes

---

## What You'll Build

- **Backboard**: White rectangle with a red target box
- **Rim**: Thick red horizontal line with rounded endpoints
- **Net**: Wavy vertical lines converging at the bottom, with horizontal cross-lines
- **Score detection**: Ball passing downward through the rim zone counts as a basket
- **Score display**: Large centered score number
- **Ball reset**: After the ball settles, it returns to the ground for the next shot

---

## Concepts

- **Score zone**: The ball scores when it is inside the rim horizontally AND moving downward through the net zone. We track `ballPassedRim` to avoid double-counting.
- **Net drawing**: Parametric lines from rim to a narrower bottom width, bent with `quadraticCurveTo` for a wavy look.
- **Ball reset**: When velocity drops near zero and the ball is on the floor, reset it to a new ground position.

---

## Code

### 1. Add Hoop Drawing to GameRenderer

**File:** `src/contexts/canvas2d/games/basketball/renderers/GameRenderer.ts`

Add the `drawHoop` method and call it from `render`. The full file:

```typescript
import type { BasketballState } from '../types';
import {
  BALL_RADIUS,
  RIM_THICKNESS,
  NET_HEIGHT,
  GRAVITY,
} from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    this.drawCourt(ctx, state);
    this.drawHoop(ctx, state);

    if (state.aim.dragging && !state.ball.inFlight) {
      this.drawTrajectoryPreview(ctx, state);
      this.drawPowerLine(ctx, state);
    }

    this.drawBall(ctx, state);
  }

  private drawCourt(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    const W = state.canvasW;
    const H = state.canvasH;

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(0.6, '#16213e');
    grad.addColorStop(1, '#0f3460');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const floorY = H - 50;
    const floorGrad = ctx.createLinearGradient(0, floorY, 0, H);
    floorGrad.addColorStop(0, '#c17f3a');
    floorGrad.addColorStop(1, '#a06830');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorY, W, H - floorY);

    ctx.strokeStyle = '#dda15e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(W, floorY);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, floorY);
    ctx.lineTo(W / 2, H);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(W / 2, floorY + 25, 30, 0, Math.PI);
    ctx.stroke();
  }

  private drawHoop(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    const hoop = state.hoop;
    const rimLeft = hoop.x - hoop.rimWidth / 2;
    const rimRight = hoop.x + hoop.rimWidth / 2;

    // --- Backboard ---
    const bbLeft = rimRight;
    const bbTop = hoop.y - hoop.backboardHeight / 2;
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(bbLeft, bbTop, hoop.backboardWidth, hoop.backboardHeight);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    ctx.strokeRect(bbLeft, bbTop, hoop.backboardWidth, hoop.backboardHeight);

    // Red target rectangle on the backboard
    const innerMargin = 12;
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      bbLeft + 1,
      hoop.y - innerMargin,
      hoop.backboardWidth - 2,
      innerMargin * 2,
    );

    // --- Rim ---
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = RIM_THICKNESS;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rimLeft, hoop.y);
    ctx.lineTo(rimRight, hoop.y);
    ctx.stroke();

    // Rim endpoint circles (make the rim look solid)
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(rimLeft, hoop.y, RIM_THICKNESS / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rimRight, hoop.y, RIM_THICKNESS / 2, 0, Math.PI * 2);
    ctx.fill();

    // --- Net ---
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    const netSegments = 6;
    const netWidth = hoop.rimWidth * 0.8;
    const netBottomWidth = hoop.rimWidth * 0.3;

    // Vertical net lines (wavy)
    for (let i = 0; i <= netSegments; i++) {
      const t = i / netSegments;
      const topX = rimLeft + (hoop.rimWidth - netWidth) / 2 + netWidth * t;
      const bottomX = hoop.x - netBottomWidth / 2 + netBottomWidth * t;

      ctx.beginPath();
      ctx.moveTo(topX, hoop.y);

      const midY = hoop.y + NET_HEIGHT * 0.5;
      const midX = topX + (bottomX - topX) * 0.5 + Math.sin(t * Math.PI * 3) * 3;
      ctx.quadraticCurveTo(midX, midY, bottomX, hoop.y + NET_HEIGHT);
      ctx.stroke();
    }

    // Horizontal net lines
    for (let row = 1; row < 4; row++) {
      const rowT = row / 4;
      const rowY = hoop.y + NET_HEIGHT * rowT;
      const rowWidth = netWidth - (netWidth - netBottomWidth) * rowT;
      const rowX = hoop.x - rowWidth / 2;

      ctx.beginPath();
      ctx.moveTo(rowX, rowY);
      ctx.lineTo(rowX + rowWidth, rowY);
      ctx.stroke();
    }

    // Support rod connecting backboard to wall
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bbLeft + hoop.backboardWidth, hoop.y);
    ctx.lineTo(bbLeft + hoop.backboardWidth + 15, hoop.y);
    ctx.stroke();
  }

  private drawBall(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    const ball = state.ball;

    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.rotation);

    const gradient = ctx.createRadialGradient(-3, -3, 2, 0, 0, BALL_RADIUS);
    gradient.addColorStop(0, '#ff8a50');
    gradient.addColorStop(0.6, '#e65100');
    gradient.addColorStop(1, '#bf360c');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(0, -BALL_RADIUS);
    ctx.lineTo(0, BALL_RADIUS);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-BALL_RADIUS, 0);
    ctx.lineTo(BALL_RADIUS, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, BALL_RADIUS * 0.6, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, BALL_RADIUS * 0.6, Math.PI * 0.5, -Math.PI * 0.5);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private drawPowerLine(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    const aim = state.aim;

    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(aim.startX, aim.startY);
    ctx.lineTo(aim.currentX, aim.currentY);
    ctx.stroke();
    ctx.setLineDash([]);

    const dx = aim.startX - aim.currentX;
    const dy = aim.startY - aim.currentY;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len > 10) {
      const nx = dx / len;
      const ny = dy / len;
      const arrowLen = Math.min(len * 0.3, 30);

      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.moveTo(
        state.ball.x + nx * (BALL_RADIUS + 5),
        state.ball.y + ny * (BALL_RADIUS + 5),
      );
      ctx.lineTo(
        state.ball.x + nx * (BALL_RADIUS + 5 + arrowLen) - ny * 5,
        state.ball.y + ny * (BALL_RADIUS + 5 + arrowLen) + nx * 5,
      );
      ctx.lineTo(
        state.ball.x + nx * (BALL_RADIUS + 5 + arrowLen) + ny * 5,
        state.ball.y + ny * (BALL_RADIUS + 5 + arrowLen) - nx * 5,
      );
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawTrajectoryPreview(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    const aim = state.aim;
    const ball = state.ball;

    const dx = aim.startX - aim.currentX;
    const dy = aim.startY - aim.currentY;
    const power = Math.sqrt(dx * dx + dy * dy);
    if (power < 10) return;

    let vx = dx * 3.5;
    let vy = dy * 3.5;

    const mag = Math.sqrt(vx * vx + vy * vy);
    if (mag > 800) {
      const scale = 800 / mag;
      vx *= scale;
      vy *= scale;
    }

    let px = ball.x;
    let py = ball.y;
    let pvx = vx;
    let pvy = vy;
    const simDt = 0.03;
    const steps = 30;

    ctx.fillStyle = 'rgba(255,255,255,0.4)';

    for (let i = 0; i < steps; i++) {
      pvy += GRAVITY * simDt;
      px += pvx * simDt;
      py += pvy * simDt;

      if (py > state.canvasH) break;
      if (px < 0 || px > state.canvasW) break;

      if (i % 2 === 0) {
        const alpha = 1 - i / steps;
        ctx.globalAlpha = alpha * 0.5;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
```

**Hoop anatomy:**
- **Backboard** sits at `rimRight` (right edge of the rim). It is `backboardWidth` (10px) thick and `backboardHeight` (100px) tall, centered on `hoop.y`.
- **Rim** is a thick red line from `rimLeft` to `rimRight` at `hoop.y`. The `lineCap: 'round'` gives rounded ends, and we draw filled circles at each endpoint for solidity.
- **Net** has 7 vertical lines that converge from `netWidth` (80% of rim) at the top to `netBottomWidth` (30% of rim) at the bottom. `quadraticCurveTo` bends them slightly for a wavy look. Three horizontal lines provide the mesh crossbars.

---

### 2. Create the Score System

**File:** `src/contexts/canvas2d/games/basketball/systems/ScoreSystem.ts`

Detect baskets and reset the ball after it comes to rest.

```typescript
import type { BasketballState } from '../types';
import { BALL_RADIUS, NET_HEIGHT } from '../types';

export class ScoreSystem {
  update(state: BasketballState, dt: number): void {
    if (state.phase !== 'playing') return;

    this.detectScore(state);
    this.checkBallReset(state);
  }

  private detectScore(state: BasketballState): void {
    const ball = state.ball;
    const hoop = state.hoop;

    if (!ball.inFlight) return;
    if (state.madeShot) return; // already scored on this shot

    // The scoring zone: horizontally between the rim edges (inset by ball radius)
    const rimLeft = hoop.x - hoop.rimWidth / 2 + BALL_RADIUS;
    const rimRight = hoop.x + hoop.rimWidth / 2 - BALL_RADIUS;
    const netTop = hoop.y;
    const netBottom = hoop.y + NET_HEIGHT;

    // Ball outside rim horizontally?
    if (ball.x < rimLeft || ball.x > rimRight) {
      // Track if ball passed below the rim without being inside it
      if (ball.y > netBottom && ball.vy > 0) {
        state.ballPassedRim = true;
      }
      return;
    }

    // Ball is inside the rim horizontally AND moving downward through the net zone
    if (ball.y > netTop && ball.y < netBottom && ball.vy > 0) {
      if (!state.ballPassedRim) {
        // Ball entered from above — it is a basket
        state.madeShot = true;
        state.ballPassedRim = true;

        state.streak += 1;
        const streakBonus = Math.min(state.streak - 1, 5);
        const points = 2 + streakBonus;
        state.score += points;
      }
    }

    // Track if ball went below without scoring
    if (ball.y > netBottom && ball.vy > 0 && !state.madeShot) {
      state.ballPassedRim = true;
    }
  }

  private checkBallReset(state: BasketballState): void {
    const ball = state.ball;
    if (!ball.inFlight) return;

    const isResting =
      Math.abs(ball.vx) < 5 &&
      Math.abs(ball.vy) < 5 &&
      ball.y + BALL_RADIUS >= state.canvasH - 2;

    const fellOffScreen = ball.y > state.canvasH + 100;

    if (isResting || fellOffScreen) {
      if (!state.madeShot) {
        state.streak = 0;
      }
      this.resetBallAndHoop(state);
    }
  }

  resetBallAndHoop(state: BasketballState): void {
    const ball = state.ball;

    ball.x = state.canvasW * 0.3 + Math.random() * state.canvasW * 0.4;
    ball.y = state.canvasH - BALL_RADIUS - 40;
    ball.vx = 0;
    ball.vy = 0;
    ball.rotation = 0;
    ball.inFlight = false;

    state.madeShot = false;
    state.ballPassedRim = false;
  }
}
```

**Scoring logic walkthrough:**

1. The ball must be inside the rim horizontally (between `rimLeft` and `rimRight`, inset by `BALL_RADIUS` so the ball center is fully inside).
2. The ball must be between `netTop` (rim y) and `netBottom` (rim y + 40) vertically.
3. The ball must be moving downward (`vy > 0`).
4. `ballPassedRim` must be false — meaning the ball entered from above, not from below or the side. If the ball goes below the net zone while outside the rim, we set `ballPassedRim = true` so it cannot score on the way back up.
5. On a successful basket: increment `streak`, calculate points (2 base + up to 5 streak bonus), add to `score`.
6. When the ball comes to rest (velocity near zero, on the floor) or falls off screen, reset it. If it did not score, reset the streak to 0.

---

### 3. Create the HUD Renderer

**File:** `src/contexts/canvas2d/games/basketball/renderers/HUDRenderer.ts`

Show the score at the top center.

```typescript
import type { BasketballState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    this.drawScore(ctx, state);
  }

  private drawScore(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    const cx = state.canvasW / 2;

    ctx.font = 'bold 40px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(String(state.score), cx, 15);
  }
}
```

---

### 4. Update the Engine

**File:** `src/contexts/canvas2d/games/basketball/BasketballEngine.ts`

Add the ScoreSystem and HUDRenderer. Add a `reset` callback for the input system (needed in step 5, but adding the plumbing now).

```typescript
import type { BasketballState } from './types';
import {
  BALL_RADIUS,
  RIM_WIDTH,
  BACKBOARD_HEIGHT,
  BACKBOARD_WIDTH,
  NET_HEIGHT,
  SHOT_CLOCK_DURATION,
} from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { ScoreSystem } from './systems/ScoreSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class BasketballEngine {
  private ctx: CanvasRenderingContext2D;
  private state: BasketballState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;

  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
  private scoreSystem: ScoreSystem;
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;

    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const W = canvas.width;
    const H = canvas.height;

    this.state = {
      phase: 'playing',
      ball: {
        x: W * 0.5,
        y: H - BALL_RADIUS - 40,
        vx: 0,
        vy: 0,
        rotation: 0,
        inFlight: false,
      },
      hoop: {
        x: W * 0.6,
        y: H * 0.3,
        rimWidth: RIM_WIDTH,
        backboardHeight: BACKBOARD_HEIGHT,
        backboardWidth: BACKBOARD_WIDTH,
        netHeight: NET_HEIGHT,
      },
      aim: {
        dragging: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
      },
      particles: [],
      score: 0,
      bestScore: 0,
      streak: 0,
      shotClock: SHOT_CLOCK_DURATION,
      shotClockMax: SHOT_CLOCK_DURATION,
      canvasW: W,
      canvasH: H,
      lastScoredTime: 0,
      showSwish: false,
      madeShot: false,
      ballPassedRim: false,
    };

    this.physicsSystem = new PhysicsSystem();
    this.scoreSystem = new ScoreSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();
    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      onExit,
      (vx: number, vy: number) => this.shoot(vx, vy),
    );

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
      this.scoreSystem.update(this.state, dt);
    }

    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);
    this.gameRenderer.render(ctx, this.state);
    this.hudRenderer.render(ctx, this.state);
  }

  private shoot(vx: number, vy: number): void {
    const ball = this.state.ball;
    ball.vx = vx;
    ball.vy = vy;
    ball.inFlight = true;
    this.state.madeShot = false;
    this.state.ballPassedRim = false;
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Basketball"
3. **Observe:**
   - Hoop with white backboard, red rim, and white net is visible
   - Drag and shoot the ball toward the hoop
   - When the ball passes through the rim going down, the score increases
   - Score shows at top center
   - Consecutive baskets increase the streak bonus
   - Missing resets the streak to 0
   - After the ball stops, it reappears at the bottom for the next shot

---

## Challenges

**Easy:**
- Change base points from 2 to 3
- Make the net a different color (yellow, blue)
- Move the hoop to the left side of the screen

**Medium:**
- Draw the score with a bounce animation when it changes
- Add a "Miss!" text that floats up when a shot misses
- Make the net sway slightly using `Math.sin(performance.now())` in the net drawing

**Hard:**
- Detect "swish" (ball passes through without touching the rim) vs. "bank shot" (ball hits backboard first)
- Add a trail behind the ball during flight
- Draw the ball behind the net when it passes through the scoring zone

---

## What You Learned

- Drawing a basketball hoop: backboard, rim, and parametric net
- Score detection using a zone check with directional constraint (must enter from above)
- Using `ballPassedRim` as a state flag to prevent false positives
- Ball reset logic based on velocity thresholds
- Streak tracking for bonus points

**Next:** Rim and backboard collision physics!
