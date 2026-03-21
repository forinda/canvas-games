# Step 1: Ball & Gravity

**Goal:** Draw a basketball with texture lines and apply gravity so it arcs and bounces on the floor.

**Time:** ~15 minutes

---

## What You'll Build

Foundation elements:
- **Gym background**: Dark gradient sky with wooden court floor
- **Basketball**: Orange circle with seam lines and radial shading
- **Gravity**: Constant downward acceleration producing parabolic arcs
- **Floor bounce**: Ball reflects off the ground with energy loss
- **Delta-time physics**: Frame-rate independent movement

---

## Concepts

- **Gravity as acceleration**: `vy += GRAVITY * dt` each frame, producing a parabolic path
- **Bounce damping**: Multiply velocity by a factor < 1 on impact so the ball loses energy
- **Rotation from velocity**: Spin the ball texture proportional to horizontal speed

---

## Code

### 1. Create Types

**File:** `src/contexts/canvas2d/games/basketball/types.ts`

Define all constants and the state shape up front. We will use everything by step 5, but declaring it now avoids refactors later.

```typescript
export type GamePhase = 'start' | 'playing' | 'paused' | 'gameover';

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  inFlight: boolean;
}

export interface Hoop {
  x: number;
  y: number;
  rimWidth: number;
  backboardHeight: number;
  backboardWidth: number;
  netHeight: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface AimState {
  dragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface BasketballState {
  phase: GamePhase;
  ball: Ball;
  hoop: Hoop;
  aim: AimState;
  particles: Particle[];
  score: number;
  bestScore: number;
  streak: number;
  shotClock: number;
  shotClockMax: number;
  canvasW: number;
  canvasH: number;
  lastScoredTime: number;
  showSwish: boolean;
  madeShot: boolean;
  ballPassedRim: boolean;
}

// Constants
export const GRAVITY = 980;
export const BALL_RADIUS = 18;
export const RIM_WIDTH = 70;
export const RIM_THICKNESS = 5;
export const BACKBOARD_HEIGHT = 100;
export const BACKBOARD_WIDTH = 10;
export const NET_HEIGHT = 40;
export const SHOT_CLOCK_DURATION = 30;
export const POWER_SCALE = 3.5;
export const MAX_POWER = 800;
export const BOUNCE_DAMPING = 0.55;
export const ROTATION_SPEED = 0.08;
export const HS_KEY = 'basketball_highscore';
```

`GRAVITY` at 980 px/s^2 feels natural on a full-screen canvas (roughly 1 px = 1 cm). `BOUNCE_DAMPING` at 0.55 means the ball keeps about half its speed on each bounce, so it settles quickly.

---

### 2. Create the Game Renderer

**File:** `src/contexts/canvas2d/games/basketball/renderers/GameRenderer.ts`

Draw the court and ball. The ball uses a radial gradient for a 3D look and four seam lines that rotate with the ball.

```typescript
import type { BasketballState } from '../types';
import { BALL_RADIUS } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    this.drawCourt(ctx, state);
    this.drawBall(ctx, state);
  }

  private drawCourt(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    const W = state.canvasW;
    const H = state.canvasH;

    // Sky / gym background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(0.6, '#16213e');
    grad.addColorStop(1, '#0f3460');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Court floor
    const floorY = H - 50;
    const floorGrad = ctx.createLinearGradient(0, floorY, 0, H);
    floorGrad.addColorStop(0, '#c17f3a');
    floorGrad.addColorStop(1, '#a06830');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorY, W, H - floorY);

    // Floor line
    ctx.strokeStyle = '#dda15e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(W, floorY);
    ctx.stroke();

    // Court markings
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, floorY);
    ctx.lineTo(W / 2, H);
    ctx.stroke();

    // Center circle hint
    ctx.beginPath();
    ctx.arc(W / 2, floorY + 25, 30, 0, Math.PI);
    ctx.stroke();
  }

  private drawBall(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    const ball = state.ball;

    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.rotation);

    // Ball body — radial gradient for 3D shading
    const gradient = ctx.createRadialGradient(-3, -3, 2, 0, 0, BALL_RADIUS);
    gradient.addColorStop(0, '#ff8a50');
    gradient.addColorStop(0.6, '#e65100');
    gradient.addColorStop(1, '#bf360c');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Seam lines
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1.5;

    // Vertical seam
    ctx.beginPath();
    ctx.moveTo(0, -BALL_RADIUS);
    ctx.lineTo(0, BALL_RADIUS);
    ctx.stroke();

    // Horizontal seam
    ctx.beginPath();
    ctx.moveTo(-BALL_RADIUS, 0);
    ctx.lineTo(BALL_RADIUS, 0);
    ctx.stroke();

    // Curved seams (right and left halves)
    ctx.beginPath();
    ctx.arc(0, 0, BALL_RADIUS * 0.6, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, BALL_RADIUS * 0.6, Math.PI * 0.5, -Math.PI * 0.5);
    ctx.stroke();

    // Outline
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}
```

**Visual details:**
- The radial gradient origin is offset (-3, -3) so the highlight sits upper-left, mimicking a light source.
- Four seam lines: one vertical, one horizontal, two curved arcs. Because we `ctx.rotate(ball.rotation)` before drawing, the seams spin as the ball moves.
- We restore the transform after drawing so nothing else is affected.

---

### 3. Create the Physics System

**File:** `src/contexts/canvas2d/games/basketball/systems/PhysicsSystem.ts`

Gravity pulls the ball down. The floor reflects the ball with damping. Walls and ceiling also bounce.

```typescript
import type { BasketballState } from '../types';
import {
  GRAVITY,
  BALL_RADIUS,
  BOUNCE_DAMPING,
  ROTATION_SPEED,
} from '../types';

export class PhysicsSystem {
  update(state: BasketballState, dt: number): void {
    const ball = state.ball;
    if (!ball.inFlight) return;

    // Gravity: accelerate downward
    ball.vy += GRAVITY * dt;

    // Integrate position
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Spin proportional to horizontal speed
    ball.rotation += ball.vx * ROTATION_SPEED * dt;

    // Left wall
    if (ball.x - BALL_RADIUS < 0) {
      ball.x = BALL_RADIUS;
      ball.vx = Math.abs(ball.vx) * BOUNCE_DAMPING;
    }
    // Right wall
    if (ball.x + BALL_RADIUS > state.canvasW) {
      ball.x = state.canvasW - BALL_RADIUS;
      ball.vx = -Math.abs(ball.vx) * BOUNCE_DAMPING;
    }

    // Ceiling
    if (ball.y - BALL_RADIUS < 0) {
      ball.y = BALL_RADIUS;
      ball.vy = Math.abs(ball.vy) * BOUNCE_DAMPING;
    }

    // Floor bounce
    if (ball.y + BALL_RADIUS > state.canvasH) {
      ball.y = state.canvasH - BALL_RADIUS;
      ball.vy = -Math.abs(ball.vy) * BOUNCE_DAMPING;
      ball.vx *= 0.85; // floor friction

      // Stop micro-bounces
      if (Math.abs(ball.vy) < 30) {
        ball.vy = 0;
        ball.vx *= 0.9;
      }

      // Full stop
      if (Math.abs(ball.vx) < 5 && Math.abs(ball.vy) < 5) {
        ball.vx = 0;
        ball.vy = 0;
      }
    }
  }
}
```

**Physics patterns:**
- `ball.vy += GRAVITY * dt` is Euler integration. Each frame, velocity increases by 980 * dt pixels/second. Over time this creates the classic parabolic arc.
- On floor collision we first correct the position (`ball.y = canvasH - BALL_RADIUS`) to prevent the ball sinking through, then reverse and damp the vertical velocity.
- The `0.85` multiplier on `vx` during floor contact simulates friction — the ball slows horizontally each time it hits the ground.
- When both velocity components drop below 5 px/s we zero them out so the ball truly stops rather than creeping forever.

---

### 4. Create the Game Engine

**File:** `src/contexts/canvas2d/games/basketball/BasketballEngine.ts`

Wire state, physics, and rendering into a 60 fps loop. For this step we launch the ball with a hard-coded velocity so you can see gravity in action.

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
import { PhysicsSystem } from './systems/PhysicsSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class BasketballEngine {
  private ctx: CanvasRenderingContext2D;
  private state: BasketballState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;

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
        x: W * 0.2,
        y: H - BALL_RADIUS - 40,
        vx: 300,          // hard-coded launch for testing
        vy: -600,          // upward
        rotation: 0,
        inFlight: true,    // start in flight so gravity applies
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
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    const dt = Math.min(rawDt, 0.05); // cap to avoid spiral of death
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
}
```

The ball launches immediately with `vx: 300, vy: -600`. Gravity pulls it into a parabolic arc, then it bounces on the floor and walls until it settles. The `Math.min(rawDt, 0.05)` cap prevents physics explosions if the tab loses focus and `dt` spikes.

---

### 5. Create Platform Adapter & Entry Point

**File:** `src/contexts/canvas2d/games/basketball/adapters/PlatformAdapter.ts`

```typescript
import type { GameInstance } from '@core/GameInterface';
import { BasketballEngine } from '../BasketballEngine';

export class PlatformAdapter implements GameInstance {
  private engine: BasketballEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new BasketballEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

**File:** `src/contexts/canvas2d/games/basketball/index.ts`

```typescript
import type { GameDefinition } from '@core/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const BasketballGame: GameDefinition = {
  id: 'basketball',
  category: 'action' as const,
  name: 'Basketball',
  description: 'Shoot hoops with click-and-drag aiming!',
  icon: '\uD83C\uDFC0',
  color: '#ff7043',
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
   - Dark gym background with wooden floor
   - Orange basketball launches from the lower-left
   - Ball follows a parabolic arc upward then curves back down
   - Ball bounces off the floor, losing height each bounce
   - Ball bounces off walls and ceiling
   - Seam lines rotate as the ball moves
   - Ball eventually settles on the floor and stops

---

## Challenges

**Easy:**
- Change `GRAVITY` to 500 and see how floaty the ball feels
- Increase `BOUNCE_DAMPING` to 0.8 — the ball bounces many more times
- Change the gradient colors to make a tennis ball (green/yellow)

**Medium:**
- Add a shadow below the ball on the floor (an ellipse that scales with height)
- Track the last 20 positions and draw a fading trail behind the ball
- Make the ball squash slightly on floor impact (scale x/y based on vy)

**Hard:**
- Replace Euler integration with Verlet for more stable bounces
- Add air resistance: `vx *= 0.999` each frame
- Simulate Magnus effect: spin influences vertical trajectory

---

## What You Learned

- Gravity as constant acceleration applied each frame
- Euler integration: velocity changes position, acceleration changes velocity
- Floor bounce with damping to dissipate energy
- Radial gradients and rotated seam lines for a 3D basketball look
- Delta-time capping to prevent physics explosions

**Next:** Drag-to-aim controls and trajectory preview!
