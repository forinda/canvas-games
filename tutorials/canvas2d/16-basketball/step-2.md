# Step 2: Drag-to-Aim & Shoot

**Goal:** Click and drag from the ball to set launch power and angle. Show a dotted trajectory preview. Release to shoot.

**Time:** ~15 minutes

---

## What You'll Build

- **Drag-to-aim input**: Click near the ball, drag away to set direction and power
- **Power line**: Dashed line from ball to cursor showing the drag vector
- **Direction arrow**: Triangle pointing in the launch direction
- **Trajectory preview**: Dotted parabolic arc simulated with the same gravity constant
- **Launch on release**: Ball fires in the opposite direction of the drag

---

## Concepts

- **Slingshot mechanic**: Drag *away* from the target. The launch vector is the inverse of the drag vector. This feels natural — pull back to fling forward.
- **Power from distance**: `power = distance * POWER_SCALE`, clamped to `MAX_POWER`
- **Trajectory simulation**: Run the same gravity math in a tight loop at small time steps to plot where the ball *will* go

---

## Code

### 1. Create the Input System

**File:** `src/contexts/canvas2d/games/basketball/systems/InputSystem.ts`

Handles mouse and touch events. On mouse-down near the ball, start dragging. On move, update the aim. On release, compute the launch velocity and fire.

```typescript
import type { BasketballState } from '../types';
import { BALL_RADIUS, POWER_SCALE, MAX_POWER } from '../types';

export class InputSystem {
  private state: BasketballState;
  private canvas: HTMLCanvasElement;
  private onExit: () => void;
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
    onShoot: (vx: number, vy: number) => void,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.onExit = onExit;
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
    if (s.phase !== 'playing') return;
    if (s.ball.inFlight) return;

    // Must click within 4x ball radius
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

    // Drag vector: start - current (slingshot: opposite of drag direction)
    const dx = s.aim.startX - s.aim.currentX;
    const dy = s.aim.startY - s.aim.currentY;
    const power = Math.sqrt(dx * dx + dy * dy);

    if (power < 10) return; // ignore tiny drags

    let vx = dx * POWER_SCALE;
    let vy = dy * POWER_SCALE;

    // Clamp to max power
    const mag = Math.sqrt(vx * vx + vy * vy);
    if (mag > MAX_POWER) {
      const scale = MAX_POWER / mag;
      vx *= scale;
      vy *= scale;
    }

    this.onShoot(vx, vy);
  }

  private handleKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.onExit();
    }
  }
}
```

**Key details:**
- `canvasX`/`canvasY` convert client coordinates to canvas coordinates, handling CSS scaling.
- The "slingshot" vector is `start - current`. If you drag down-right, the ball launches up-left.
- We ignore drags shorter than 10 pixels to prevent accidental taps from shooting.
- `POWER_SCALE` (3.5) converts drag pixels to velocity. A 100 px drag = 350 px/s launch speed. `MAX_POWER` (800) caps it so you cannot blast the ball off screen instantly.

---

### 2. Add Trajectory Preview & Power Line to the Renderer

**File:** `src/contexts/canvas2d/games/basketball/renderers/GameRenderer.ts`

Add three new methods and call them from `render`:

```typescript
import type { BasketballState } from '../types';
import { BALL_RADIUS, GRAVITY } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    this.drawCourt(ctx, state);

    // Draw aim guides only while dragging and ball is grounded
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

    // Dashed line from drag start to current cursor position
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(aim.startX, aim.startY);
    ctx.lineTo(aim.currentX, aim.currentY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrow pointing in the launch direction
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

    // Compute launch velocity (same math as InputSystem)
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

    // Step through the trajectory at small time intervals
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

      // Draw every other step for a dotted look
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

**Trajectory preview math:**
The preview runs a mini physics simulation. Starting from the ball's position, it applies the same `GRAVITY` and velocity for 30 steps at 0.03s intervals. That covers about 0.9 seconds of flight. Each dot is a future ball position. The dots fade out (`alpha = 1 - i/steps`) so the far end of the arc is dimmer, hinting at uncertainty.

---

### 3. Update the Engine

**File:** `src/contexts/canvas2d/games/basketball/BasketballEngine.ts`

Remove the hard-coded launch. Wire up the InputSystem. The ball now starts grounded and waits for the player to drag and shoot.

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
import { GameRenderer } from './renderers/GameRenderer';

export class BasketballEngine {
  private ctx: CanvasRenderingContext2D;
  private state: BasketballState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;

  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
  private gameRenderer: GameRenderer;

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
        inFlight: false,   // grounded — waits for player input
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
    this.gameRenderer = new GameRenderer();
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
    }

    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);
    this.gameRenderer.render(ctx, this.state);
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

Changes from step 1:
- Ball starts with `inFlight: false` — it sits on the ground until you shoot
- `InputSystem` is created and attached, with a `shoot` callback
- On destroy, we detach input listeners to prevent memory leaks

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Basketball"
3. **Observe:**
   - Ball sits near the bottom of the screen
   - Click near the ball and drag — a dashed line and arrow appear
   - Dotted trajectory arc curves down under gravity
   - Release — ball launches in the opposite direction of the drag
   - Longer drag = more power = higher/farther arc
   - Ball bounces on floor and walls, eventually settling
   - After the ball stops, click it again to shoot again

---

## Challenges

**Easy:**
- Change `POWER_SCALE` to 5 and feel the difference
- Make the trajectory dots square instead of circular
- Change the power line color to orange

**Medium:**
- Show a numeric power readout (e.g. "Power: 420") while dragging
- Color the trajectory dots green when aimed at the upper half of the screen, red when aimed at the floor
- Add a "whoosh" sound on release (use `AudioContext`)

**Hard:**
- Predict and highlight where the ball will first hit the floor (show an X marker)
- Add a second trajectory preview in a different color showing the bounce
- Implement a "charge and release" mechanic instead of drag distance

---

## What You Learned

- Slingshot input: drag away, launch opposite
- Converting drag distance to velocity with a scale factor
- Trajectory prediction by running the same physics in a mini simulation loop
- Canvas dashed lines (`setLineDash`) and semi-transparent overlays
- Touch event handling alongside mouse events

**Next:** Drawing the hoop and detecting baskets!
