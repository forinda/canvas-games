# Step 5: Shot Clock, Streaks & Polish

**Goal:** Add a 30-second shot clock, +5s per basket, streak bonus scoring, hoop repositioning, localStorage high scores, score particles, start/game-over screens.

**Time:** ~15 minutes

---

## What You'll Build

- **Shot clock**: 30-second countdown. When it hits zero, game over.
- **Time bonus**: Each basket adds 5 seconds (capped at 30s)
- **Streak scoring**: Base 2 points + up to 5 bonus for consecutive baskets
- **Hoop repositioning**: After each shot resolves, the hoop moves to a new random location
- **High score persistence**: Best score saved in localStorage
- **Score particles**: Burst of confetti-like particles on a basket
- **Swish text**: Floating text ("SWISH!", "NICE SHOT!", "ON FIRE!") that fades upward
- **Start screen**: Title, instructions, blinking prompt
- **Game over screen**: Final score, best score, restart prompt
- **ESC/Enter key handling**: Navigate between phases

---

## Concepts

- **State machine**: Four phases (`start`, `playing`, `paused`, `gameover`) control which systems run and which overlays render
- **Particle system**: Short-lived sprites with position, velocity, gravity, and fading alpha
- **localStorage**: Persist the high score across sessions with try/catch for safety

---

## Code

### 1. Update the Input System

**File:** `src/games/basketball/systems/InputSystem.ts`

Add phase transitions (start, game over) and a reset callback.

```typescript
import type { BasketballState } from '../types';
import { BALL_RADIUS, POWER_SCALE, MAX_POWER } from '../types';

export class InputSystem {
  private state: BasketballState;
  private canvas: HTMLCanvasElement;
  private onExit: () => void;
  private onReset: () => void;
  private onShoot: (vx: number, vy: number) => void;

  private mouseDownHandler: (e: MouseEvent) => void;
  private mouseMoveHandler: (e: MouseEvent) => void;
  private mouseUpHandler: (e: MouseEvent) => void;
  private touchStartHandler: (e: TouchEvent) => void;
  private touchMoveHandler: (e: TouchEvent) => void;
  private touchEndHandler: (e: TouchEvent) => void;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(
    state: BasketballState,
    canvas: HTMLCanvasElement,
    onExit: () => void,
    onReset: () => void,
    onShoot: (vx: number, vy: number) => void,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.onExit = onExit;
    this.onReset = onReset;
    this.onShoot = onShoot;

    this.mouseDownHandler = (e) => this.handleDown(this.canvasX(e.clientX), this.canvasY(e.clientY));
    this.mouseMoveHandler = (e) => this.handleMove(this.canvasX(e.clientX), this.canvasY(e.clientY));
    this.mouseUpHandler = () => this.handleUp();
    this.touchStartHandler = (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        this.handleDown(this.canvasX(e.touches[0].clientX), this.canvasY(e.touches[0].clientY));
      }
    };
    this.touchMoveHandler = (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        this.handleMove(this.canvasX(e.touches[0].clientX), this.canvasY(e.touches[0].clientY));
      }
    };
    this.touchEndHandler = (e) => {
      e.preventDefault();
      this.handleUp();
    };
    this.keyHandler = (e) => this.handleKey(e);
  }

  attach(): void {
    this.canvas.addEventListener('mousedown', this.mouseDownHandler);
    this.canvas.addEventListener('mousemove', this.mouseMoveHandler);
    this.canvas.addEventListener('mouseup', this.mouseUpHandler);
    this.canvas.addEventListener('touchstart', this.touchStartHandler, { passive: false });
    this.canvas.addEventListener('touchmove', this.touchMoveHandler, { passive: false });
    this.canvas.addEventListener('touchend', this.touchEndHandler, { passive: false });
    window.addEventListener('keydown', this.keyHandler);
  }

  detach(): void {
    this.canvas.removeEventListener('mousedown', this.mouseDownHandler);
    this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
    this.canvas.removeEventListener('mouseup', this.mouseUpHandler);
    this.canvas.removeEventListener('touchstart', this.touchStartHandler);
    this.canvas.removeEventListener('touchmove', this.touchMoveHandler);
    this.canvas.removeEventListener('touchend', this.touchEndHandler);
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

  private handleDown(x: number, y: number): void {
    const s = this.state;

    // Phase transitions on click
    if (s.phase === 'start') {
      s.phase = 'playing';
      return;
    }
    if (s.phase === 'gameover') {
      this.onReset();
      return;
    }

    if (s.phase !== 'playing') return;
    if (s.ball.inFlight) return;

    const dx = x - s.ball.x;
    const dy = y - s.ball.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < BALL_RADIUS * 4) {
      s.aim.dragging = true;
      s.aim.startX = x;
      s.aim.startY = y;
      s.aim.currentX = x;
      s.aim.currentY = y;
    }
  }

  private handleMove(x: number, y: number): void {
    if (!this.state.aim.dragging) return;
    this.state.aim.currentX = x;
    this.state.aim.currentY = y;
  }

  private handleUp(): void {
    const s = this.state;
    if (!s.aim.dragging) return;
    s.aim.dragging = false;

    if (s.phase !== 'playing' || s.ball.inFlight) return;

    const dx = s.aim.startX - s.aim.currentX;
    const dy = s.aim.startY - s.aim.currentY;
    const power = Math.sqrt(dx * dx + dy * dy);

    if (power < 10) return;

    let vx = dx * POWER_SCALE;
    let vy = dy * POWER_SCALE;

    const mag = Math.sqrt(vx * vx + vy * vy);
    if (mag > MAX_POWER) {
      const scale = MAX_POWER / mag;
      vx *= scale;
      vy *= scale;
    }

    this.onShoot(vx, vy);
  }

  private handleKey(e: KeyboardEvent): void {
    const s = this.state;

    if (e.key === 'Escape') {
      this.onExit();
      return;
    }

    if (e.key === ' ' || e.key === 'Enter') {
      if (s.phase === 'start') {
        s.phase = 'playing';
        return;
      }
      if (s.phase === 'gameover') {
        this.onReset();
        return;
      }
    }
  }
}
```

---

### 2. Update the Score System

**File:** `src/games/basketball/systems/ScoreSystem.ts`

Add shot clock countdown, time bonus on score, particle spawning, swish text, and hoop repositioning.

```typescript
import type { BasketballState } from '../types';
import { BALL_RADIUS, NET_HEIGHT } from '../types';

export class ScoreSystem {
  update(state: BasketballState, dt: number): void {
    if (state.phase !== 'playing') return;

    // Countdown the shot clock
    state.shotClock -= dt;
    if (state.shotClock <= 0) {
      state.shotClock = 0;
      state.phase = 'gameover';
      return;
    }

    this.detectScore(state);
    this.checkBallReset(state);

    // Fade swish text after 1 second
    if (state.showSwish && performance.now() - state.lastScoredTime > 1000) {
      state.showSwish = false;
    }
  }

  private detectScore(state: BasketballState): void {
    const ball = state.ball;
    const hoop = state.hoop;

    if (!ball.inFlight) return;
    if (state.madeShot) return;

    const rimLeft = hoop.x - hoop.rimWidth / 2 + BALL_RADIUS;
    const rimRight = hoop.x + hoop.rimWidth / 2 - BALL_RADIUS;
    const netTop = hoop.y;
    const netBottom = hoop.y + NET_HEIGHT;

    if (ball.x < rimLeft || ball.x > rimRight) {
      if (ball.y > netBottom && ball.vy > 0) {
        state.ballPassedRim = true;
      }
      return;
    }

    if (ball.y > netTop && ball.y < netBottom && ball.vy > 0) {
      if (!state.ballPassedRim) {
        state.madeShot = true;
        state.ballPassedRim = true;

        // Streak and scoring
        state.streak += 1;
        const streakBonus = Math.min(state.streak - 1, 5);
        const points = 2 + streakBonus;
        state.score += points;

        // Update best score
        if (state.score > state.bestScore) {
          state.bestScore = state.score;
        }

        // Time bonus: +5 seconds, capped at max
        state.shotClock = Math.min(state.shotClock + 5, state.shotClockMax);

        // Swish text
        state.showSwish = true;
        state.lastScoredTime = performance.now();

        // Confetti particles
        this.createParticles(state);
      }
    }

    if (ball.y > netBottom && ball.vy > 0 && !state.madeShot) {
      state.ballPassedRim = true;
    }
  }

  private createParticles(state: BasketballState): void {
    const hoop = state.hoop;
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15;
      const speed = 80 + Math.random() * 120;
      state.particles.push({
        x: hoop.x,
        y: hoop.y + NET_HEIGHT / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: 1.0,
        maxLife: 1.0,
        color: Math.random() > 0.5 ? '#ff7043' : '#ffab91',
        size: 3 + Math.random() * 4,
      });
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

    // Reposition ball at a random bottom-center location
    ball.x = state.canvasW * 0.3 + Math.random() * state.canvasW * 0.4;
    ball.y = state.canvasH - BALL_RADIUS - 40;
    ball.vx = 0;
    ball.vy = 0;
    ball.rotation = 0;
    ball.inFlight = false;

    // Move hoop to a new random position
    const minX = state.canvasW * 0.25;
    const maxX = state.canvasW * 0.75;
    const minY = state.canvasH * 0.15;
    const maxY = state.canvasH * 0.45;

    state.hoop.x = minX + Math.random() * (maxX - minX);
    state.hoop.y = minY + Math.random() * (maxY - minY);

    state.madeShot = false;
    state.ballPassedRim = false;
  }
}
```

**Particle burst:** 15 particles evenly spaced around a full circle, spawned at the net center. Each has random speed (80-200 px/s) and an upward bias (`-50` on vy). Orange/light-orange colors. They live for 1 second then disappear.

---

### 3. Update the GameRenderer

**File:** `src/games/basketball/renderers/GameRenderer.ts`

Add particle rendering and swish text. The complete file:

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
    this.drawParticles(ctx, state);
    this.drawSwishText(ctx, state);
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

    // Backboard
    const bbLeft = rimRight;
    const bbTop = hoop.y - hoop.backboardHeight / 2;
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(bbLeft, bbTop, hoop.backboardWidth, hoop.backboardHeight);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    ctx.strokeRect(bbLeft, bbTop, hoop.backboardWidth, hoop.backboardHeight);

    // Red target rectangle
    const innerMargin = 12;
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      bbLeft + 1,
      hoop.y - innerMargin,
      hoop.backboardWidth - 2,
      innerMargin * 2,
    );

    // Rim
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = RIM_THICKNESS;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rimLeft, hoop.y);
    ctx.lineTo(rimRight, hoop.y);
    ctx.stroke();

    // Rim endpoints
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(rimLeft, hoop.y, RIM_THICKNESS / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rimRight, hoop.y, RIM_THICKNESS / 2, 0, Math.PI * 2);
    ctx.fill();

    // Net — vertical wavy lines
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    const netSegments = 6;
    const netWidth = hoop.rimWidth * 0.8;
    const netBottomWidth = hoop.rimWidth * 0.3;

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

    // Net — horizontal cross-lines
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

    // Support rod
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

  private drawParticles(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    for (const p of state.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawSwishText(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    if (!state.showSwish) return;

    const elapsed = (performance.now() - state.lastScoredTime) / 1000;
    const alpha = Math.max(0, 1 - elapsed);
    const yOff = elapsed * 30; // float upward

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = '#ff7043';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Choose text based on streak
    let text = 'SWISH!';
    if (state.streak >= 5) text = 'ON FIRE!';
    else if (state.streak >= 3) text = 'STREAK x' + state.streak + '!';
    else if (state.streak >= 2) text = 'NICE SHOT!';

    ctx.fillText(text, state.hoop.x, state.hoop.y - 50 - yOff);

    // Points indicator
    const streakBonus = Math.min(state.streak - 1, 5);
    const points = 2 + streakBonus;
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#ffab91';
    ctx.fillText('+' + points, state.hoop.x, state.hoop.y - 20 - yOff);

    ctx.restore();
  }
}
```

---

### 4. Update the HUD Renderer

**File:** `src/games/basketball/renderers/HUDRenderer.ts`

Add shot clock, streak display, best score, start overlay, and game over overlay.

```typescript
import type { BasketballState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    this.drawExitButton(ctx);
    this.drawScore(ctx, state);
    this.drawShotClock(ctx, state);
    this.drawStreak(ctx, state);
    this.drawBestScore(ctx, state);

    if (state.phase === 'start') {
      this.drawStartOverlay(ctx, state);
    }

    if (state.phase === 'gameover') {
      this.drawGameOverOverlay(ctx, state);
    }
  }

  private drawExitButton(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.roundRect(10, 10, 60, 28, 6);
    ctx.fill();

    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#ccc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ESC', 40, 24);
  }

  private drawScore(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    const cx = state.canvasW / 2;

    ctx.font = 'bold 40px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(String(state.score), cx, 15);
  }

  private drawShotClock(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    if (state.phase !== 'playing') return;

    const x = state.canvasW - 80;
    const y = 20;
    const remaining = Math.ceil(state.shotClock);

    // Background pill
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(x - 5, y - 5, 70, 50, 8);
    ctx.fill();

    // Label
    ctx.font = '10px monospace';
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('SHOT CLOCK', x + 30, y);

    // Number — turns red under 5 seconds
    const isLow = state.shotClock <= 5;
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = isLow ? '#e74c3c' : '#fff';
    ctx.fillText(String(remaining), x + 30, y + 14);

    // Progress bar
    const barW = 60;
    const barH = 4;
    const barX = x;
    const barY = y + 42;
    const fill = state.shotClock / state.shotClockMax;

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(barX, barY, barW, barH);

    ctx.fillStyle = isLow ? '#e74c3c' : '#ff7043';
    ctx.fillRect(barX, barY, barW * fill, barH);
  }

  private drawStreak(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    if (state.streak < 2) return;

    const x = 20;
    const y = 55;

    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#ff7043';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let streakText = 'STREAK x' + state.streak;
    if (state.streak >= 5) {
      streakText = 'ON FIRE x' + state.streak;
      ctx.fillStyle = '#ff5722';
    }

    ctx.fillText(streakText, x, y);

    // Bonus info
    const bonus = Math.min(state.streak - 1, 5);
    ctx.font = '11px monospace';
    ctx.fillStyle = '#ffab91';
    ctx.fillText('+' + bonus + ' bonus per shot', x, y + 20);
  }

  private drawBestScore(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    const x = state.canvasW - 80;
    const y = 80;

    ctx.font = '11px monospace';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('BEST', x + 30, y);

    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText(String(state.bestScore), x + 30, y + 14);
  }

  private drawStartOverlay(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    const W = state.canvasW;
    const H = state.canvasH;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;

    // Title
    ctx.font = 'bold 48px monospace';
    ctx.fillStyle = '#ff7043';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BASKETBALL', cx, cy - 60);

    // Instructions
    ctx.font = '16px monospace';
    ctx.fillStyle = '#ccc';
    ctx.fillText('Click + drag from ball to aim', cx, cy + 10);
    ctx.fillText('Release to shoot', cx, cy + 35);

    // Blinking start prompt
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#ff7043';
    const blink = Math.sin(performance.now() / 400) > 0;
    if (blink) {
      ctx.fillText('Click or press ENTER to start', cx, cy + 80);
    }
  }

  private drawGameOverOverlay(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    const W = state.canvasW;
    const H = state.canvasH;

    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;

    // Title
    ctx.font = 'bold 42px monospace';
    ctx.fillStyle = '#e74c3c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TIME UP!', cx, cy - 70);

    // Score
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('Score: ' + state.score, cx, cy - 20);

    // Best
    if (state.score >= state.bestScore) {
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = '#ff7043';
      ctx.fillText('NEW BEST!', cx, cy + 15);
    } else {
      ctx.font = '16px monospace';
      ctx.fillStyle = '#aaa';
      ctx.fillText('Best: ' + state.bestScore, cx, cy + 15);
    }

    // Blinking restart prompt
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#ff7043';
    const blink = Math.sin(performance.now() / 400) > 0;
    if (blink) {
      ctx.fillText('Click or press ENTER to restart', cx, cy + 60);
    }
  }
}
```

---

### 5. Final Engine with All Systems

**File:** `src/games/basketball/BasketballEngine.ts`

The complete engine with localStorage, particles, resize handling, and all systems wired together.

```typescript
import type { BasketballState } from './types';
import {
  BALL_RADIUS,
  RIM_WIDTH,
  BACKBOARD_HEIGHT,
  BACKBOARD_WIDTH,
  NET_HEIGHT,
  SHOT_CLOCK_DURATION,
  HS_KEY,
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
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;

    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const W = canvas.width;
    const H = canvas.height;

    // Load best score from localStorage
    let bestScore = 0;
    try {
      bestScore = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
    } catch {
      /* localStorage may be blocked */
    }

    this.state = {
      phase: 'start',
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
      bestScore,
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

    // Systems
    this.physicsSystem = new PhysicsSystem();
    this.scoreSystem = new ScoreSystem();
    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      onExit,
      () => this.reset(),
      (vx: number, vy: number) => this.shoot(vx, vy),
    );

    // Renderers
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    // Resize handler
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasW = canvas.width;
      this.state.canvasH = canvas.height;
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
      this.scoreSystem.update(this.state, dt);
      this.updateParticles(dt);

      // Persist best score
      if (this.state.score > this.state.bestScore) {
        this.state.bestScore = this.state.score;
        try {
          localStorage.setItem(HS_KEY, String(this.state.bestScore));
        } catch {
          /* noop */
        }
      }
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

  private updateParticles(dt: number): void {
    const particles = this.state.particles;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt; // particle gravity
      p.life -= dt;

      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  private reset(): void {
    const s = this.state;
    s.score = 0;
    s.streak = 0;
    s.shotClock = SHOT_CLOCK_DURATION;
    s.particles = [];
    s.showSwish = false;
    s.madeShot = false;
    s.ballPassedRim = false;
    s.phase = 'playing';

    this.scoreSystem.resetBallAndHoop(s);
  }
}
```

---

### 6. Final Entry Point

**File:** `src/games/basketball/index.ts`

```typescript
import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const BasketballGame: GameDefinition = {
  id: 'basketball',
  category: 'action' as const,
  name: 'Basketball',
  description: 'Shoot hoops with click-and-drag aiming!',
  icon: '\uD83C\uDFC0',
  color: '#ff7043',
  help: {
    goal: 'Score as many baskets as possible before the 30-second shot clock expires.',
    controls: [
      { key: 'Click+Drag', action: 'Aim shot (drag direction and length set trajectory)' },
      { key: 'Release', action: 'Shoot the ball' },
      { key: 'H', action: 'Toggle help overlay' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: [
      'Drag away from the hoop — the ball launches in the opposite direction',
      'Longer drag = more power, aim high for a better arc',
      'Consecutive baskets give streak bonus points (+1 per streak, max +5)',
      'Each basket adds 5 seconds to the shot clock',
      'The hoop moves to a new position after each shot',
    ],
  },
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Basketball"
3. **Observe:**
   - **Start screen**: "BASKETBALL" title with instructions, blinking prompt
   - Click or press Enter to start — 30-second shot clock begins
   - **Shot clock** counts down in the top-right, turns red at 5 seconds
   - **Score** a basket: clock gains 5 seconds, score increases, particles burst
   - **Streak**: 2+ baskets in a row shows "STREAK x2" with bonus info
   - **5+ streak**: Text changes to "ON FIRE!" in deeper orange
   - **Miss**: Streak resets to 0
   - **Hoop moves** after each shot (ball reset + new random hoop position)
   - **Clock hits zero**: "TIME UP!" overlay with final score
   - **Best score** persists — reload the page and it is still there
   - Click or Enter to restart from game over

---

## Challenges

**Easy:**
- Change the shot clock to 60 seconds for a more relaxed game
- Increase the time bonus from 5 to 10 seconds per basket
- Change particle colors to match your school team

**Medium:**
- Add a "3-pointer" zone: baskets scored from beyond a certain distance give 3 points instead of 2
- Make the shot clock bar pulse red when under 5 seconds
- Add a combo counter that shows how many baskets in a row

**Hard:**
- Add difficulty scaling: hoop rim gets narrower every 10 points
- Make the hoop slowly drift left/right during the playing phase
- Add a replay system: record each shot's initial velocity and re-simulate on game over
- Add wind that applies a random horizontal force, shown as an arrow on screen

---

## What You Learned

- State machine pattern: `start`, `playing`, `gameover` phases controlling game flow
- Shot clock as a countdown timer that drives game tension
- Streak-based scoring with bonuses capped at a maximum
- Particle system: spawn, update with gravity, fade, and remove dead particles
- localStorage for persisting high scores with error handling
- Floating text animations using elapsed time for alpha and position offset
- Start/game-over overlays with blinking prompts
- Hoop repositioning for variety between shots

---

## Complete Architecture

```
BasketballEngine
  +-- InputSystem        (mouse/touch/keyboard -> aim state, shoot callback)
  +-- PhysicsSystem      (gravity, wall/floor/rim/backboard collision)
  +-- ScoreSystem        (shot clock, score detection, streak, ball reset)
  +-- GameRenderer       (court, hoop, ball, trajectory, particles, swish text)
  +-- HUDRenderer        (score, shot clock, streak, start/gameover overlays)
```

Each system reads and writes to the shared `BasketballState` object. The engine runs the game loop, delegates to systems for update logic, and delegates to renderers for drawing. This separation keeps each file focused on a single responsibility.

**Congratulations!** You have built a complete basketball shooting game from scratch.
