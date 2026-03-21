# Step 5: Hole Detection & Scoring

**Goal:** Detect when the ball sinks into the hole. Count strokes, display par, and show a "Hole In!" overlay.

**Time:** ~15 minutes

---

## What You'll Build

Scoring system:
- **Hole sink detection** based on distance *and* speed thresholds
- **Ball snaps** to hole center when sunk
- **Stroke counter** in a top HUD bar
- **Par display** for the current hole
- **"Hole In!" overlay** with par label (Birdie, Par, Bogey, etc.)
- **Timed transition** after sinking before advancing

---

## Concepts

- **Dual Threshold**: The ball must be close to the hole *and* moving slowly. A fast ball rolls over the hole. This mimics real mini-golf where speed matters.
- **Par Labels**: The difference between strokes and par determines the label. -1 = Birdie, 0 = Par, +1 = Bogey, and so on.
- **Sunk Timer**: After sinking, show the overlay for 1.5 seconds before moving to the next hole.

---

## Code

### 1. Update Types

**File:** `src/contexts/canvas2d/games/golf/types.ts`

Add sink thresholds, sunk timer, and scoring fields:

```typescript
export interface Vec2 {
  x: number;
  y: number;
}

export interface Ball {
  pos: Vec2;
  vel: Vec2;
  radius: number;
}

export interface Hole {
  pos: Vec2;
  radius: number;
}

export interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface CourseData {
  par: number;
  ballStart: Vec2;
  hole: Hole;
  walls: Wall[];
}

export interface GolfState {
  ball: Ball;
  currentHole: number;
  totalHoles: number;
  strokes: number;
  strokesPerHole: number[];
  parPerHole: number[];
  totalScore: number;
  aiming: boolean;
  aimStart: Vec2 | null;
  aimEnd: Vec2 | null;
  ballMoving: boolean;
  holeSunk: boolean;
  sunkTimer: number;
  gameComplete: boolean;
  canvasWidth: number;
  canvasHeight: number;
  courseOffsetX: number;
  courseOffsetY: number;
  courseWidth: number;
  courseHeight: number;
}

export const BALL_RADIUS = 6;
export const HOLE_RADIUS = 10;
export const COURSE_WIDTH = 400;
export const COURSE_HEIGHT = 600;
export const MAX_POWER = 18;
export const POWER_SCALE = 0.08;
export const FRICTION = 0.985;
export const MIN_VELOCITY = 0.05;
export const SINK_SPEED_THRESHOLD = 3.5;
export const SINK_DISTANCE_THRESHOLD = 8;
export const SUNK_DISPLAY_TIME = 1500;
```

`SINK_SPEED_THRESHOLD = 3.5` -- the ball must be going slower than this to drop in.
`SINK_DISTANCE_THRESHOLD = 8` -- the ball center must be within 8px of the hole center.
`SUNK_DISPLAY_TIME = 1500` -- show the overlay for 1.5 seconds.

---

### 2. Add Hole Detection to Physics

**File:** `src/contexts/canvas2d/games/golf/systems/PhysicsSystem.ts`

Add `checkHoleSink` and call it after wall collisions:

```typescript
import type { GolfState, Wall } from '../types';
import {
  FRICTION,
  MIN_VELOCITY,
  SINK_SPEED_THRESHOLD,
  SINK_DISTANCE_THRESHOLD,
} from '../types';
import { COURSES } from '../data/courses';

export class PhysicsSystem {
  update(state: GolfState, _dt: number): void {
    const ball = state.ball;
    if (!state.ballMoving) return;

    const course = COURSES[state.currentHole];

    // Apply friction
    ball.vel.x *= FRICTION;
    ball.vel.y *= FRICTION;

    // Move ball
    ball.pos.x += ball.vel.x;
    ball.pos.y += ball.vel.y;

    // Wall collisions
    this.handleWallCollisions(state, course.walls);

    // Hole detection
    this.checkHoleSink(state, course);

    // Stop ball if moving very slowly
    const speed = Math.sqrt(
      ball.vel.x * ball.vel.x + ball.vel.y * ball.vel.y
    );
    if (speed < MIN_VELOCITY) {
      ball.vel.x = 0;
      ball.vel.y = 0;
      state.ballMoving = false;
    }
  }

  private handleWallCollisions(state: GolfState, walls: Wall[]): void {
    const ball = state.ball;
    const r = ball.radius;

    for (let i = 0; i < walls.length; i++) {
      const wall = walls[i];

      const wx = wall.x2 - wall.x1;
      const wy = wall.y2 - wall.y1;
      const len = Math.sqrt(wx * wx + wy * wy);
      if (len === 0) continue;

      const nx = wx / len;
      const ny = wy / len;

      const dx = ball.pos.x - wall.x1;
      const dy = ball.pos.y - wall.y1;

      const proj = dx * nx + dy * ny;
      const clampedProj = Math.max(0, Math.min(len, proj));

      const closestX = wall.x1 + nx * clampedProj;
      const closestY = wall.y1 + ny * clampedProj;

      const distX = ball.pos.x - closestX;
      const distY = ball.pos.y - closestY;
      const dist = Math.sqrt(distX * distX + distY * distY);

      if (dist < r && dist > 0) {
        const normX = distX / dist;
        const normY = distY / dist;

        ball.pos.x = closestX + normX * r;
        ball.pos.y = closestY + normY * r;

        const dot = ball.vel.x * normX + ball.vel.y * normY;
        ball.vel.x -= 2 * dot * normX;
        ball.vel.y -= 2 * dot * normY;

        ball.vel.x *= 0.8;
        ball.vel.y *= 0.8;
      }
    }
  }

  private checkHoleSink(
    state: GolfState,
    course: { hole: { pos: { x: number; y: number }; radius: number } }
  ): void {
    const ball = state.ball;
    const hole = course.hole;

    const dx = ball.pos.x - hole.pos.x;
    const dy = ball.pos.y - hole.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = Math.sqrt(
      ball.vel.x * ball.vel.x + ball.vel.y * ball.vel.y
    );

    if (dist < SINK_DISTANCE_THRESHOLD && speed < SINK_SPEED_THRESHOLD) {
      // Snap ball to hole center
      ball.pos.x = hole.pos.x;
      ball.pos.y = hole.pos.y;
      ball.vel.x = 0;
      ball.vel.y = 0;
      state.ballMoving = false;
      state.holeSunk = true;
      state.sunkTimer = performance.now();
    }
  }
}
```

The check happens every frame while the ball is moving. Both conditions must be true simultaneously.

---

### 3. Create Course System

**File:** `src/contexts/canvas2d/games/golf/systems/CourseSystem.ts`

Manage hole loading, stroke recording, and par labels:

```typescript
import type { GolfState } from '../types';
import { BALL_RADIUS } from '../types';
import { COURSES } from '../data/courses';

export class CourseSystem {
  loadHole(state: GolfState): void {
    const course = COURSES[state.currentHole];
    state.ball.pos.x = course.ballStart.x;
    state.ball.pos.y = course.ballStart.y;
    state.ball.vel.x = 0;
    state.ball.vel.y = 0;
    state.ball.radius = BALL_RADIUS;
    state.strokes = 0;
    state.ballMoving = false;
    state.holeSunk = false;
    state.aiming = false;
    state.aimStart = null;
    state.aimEnd = null;
  }

  advanceHole(state: GolfState): void {
    // Record scores for the completed hole
    state.strokesPerHole[state.currentHole] = state.strokes;
    state.parPerHole[state.currentHole] = COURSES[state.currentHole].par;

    // Calculate running total (strokes vs par)
    let totalStrokes = 0;
    let totalPar = 0;
    for (let i = 0; i <= state.currentHole; i++) {
      totalStrokes += state.strokesPerHole[i];
      totalPar += COURSES[i].par;
    }
    state.totalScore = totalStrokes - totalPar;

    if (state.currentHole < state.totalHoles - 1) {
      state.currentHole++;
      this.loadHole(state);
    } else {
      state.gameComplete = true;
    }
  }

  recordStroke(state: GolfState): void {
    state.strokes++;
  }

  getParLabel(strokes: number, par: number): string {
    const diff = strokes - par;
    if (diff <= -3) return 'Albatross!';
    if (diff === -2) return 'Eagle!';
    if (diff === -1) return 'Birdie!';
    if (diff === 0) return 'Par';
    if (diff === 1) return 'Bogey';
    if (diff === 2) return 'Double Bogey';
    return `+${diff}`;
  }
}
```

---

### 4. Create HUD Renderer

**File:** `src/contexts/canvas2d/games/golf/renderers/HUDRenderer.ts`

Draw the top bar and sunk overlay:

```typescript
import type { GolfState } from '../types';
import { SUNK_DISPLAY_TIME } from '../types';
import { COURSES } from '../data/courses';
import { CourseSystem } from '../systems/CourseSystem';

export class HUDRenderer {
  private courseSystem: CourseSystem;

  constructor() {
    this.courseSystem = new CourseSystem();
  }

  render(ctx: CanvasRenderingContext2D, state: GolfState): void {
    const W = ctx.canvas.width;

    this.drawTopBar(ctx, state, W);

    if (state.holeSunk) {
      this.drawSunkOverlay(ctx, state);
    }
  }

  private drawTopBar(
    ctx: CanvasRenderingContext2D,
    state: GolfState,
    W: number
  ): void {
    // Semi-transparent bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, W, 44);

    const course = COURSES[state.currentHole];

    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    // Hole number
    ctx.fillStyle = '#4caf50';
    ctx.fillText(`Hole ${state.currentHole + 1}/${state.totalHoles}`, 12, 22);

    // Par
    ctx.fillStyle = '#aaa';
    ctx.font = '13px monospace';
    ctx.fillText(`Par ${course.par}`, 170, 22);

    // Strokes
    ctx.fillStyle = '#fff';
    ctx.fillText(`Strokes: ${state.strokes}`, 260, 22);

    // Total score (relative to par)
    ctx.textAlign = 'right';
    const scoreLabel = state.totalScore === 0 ? 'E' :
      state.totalScore > 0 ? `+${state.totalScore}` : `${state.totalScore}`;
    ctx.fillStyle = state.totalScore < 0 ? '#4caf50' :
      state.totalScore === 0 ? '#fff' : '#e53935';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`Total: ${scoreLabel}`, W - 12, 22);
  }

  private drawSunkOverlay(
    ctx: CanvasRenderingContext2D,
    state: GolfState
  ): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const elapsed = performance.now() - state.sunkTimer;

    if (elapsed > SUNK_DISPLAY_TIME) return;

    // Fade in, then fade out near the end
    const alpha = Math.min(1, elapsed / 300) *
      (1 - Math.max(0, (elapsed - SUNK_DISPLAY_TIME + 400) / 400));

    const course = COURSES[state.currentHole];
    const label = this.courseSystem.getParLabel(state.strokes, course.par);

    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);

    // Dark band across middle
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, H * 0.35, W, H * 0.3);

    // "Hole In!" text
    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Hole In!', W / 2, H * 0.45);

    // Stroke count and par label
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(
      `${state.strokes} stroke${state.strokes !== 1 ? 's' : ''} - ${label}`,
      W / 2,
      H * 0.55
    );

    ctx.restore();
  }
}
```

The overlay uses `globalAlpha` with a fade-in/fade-out curve. It shows for `SUNK_DISPLAY_TIME` ms, then the engine advances to the next hole.

---

### 5. Update Game Engine

**File:** `src/contexts/canvas2d/games/golf/GolfEngine.ts`

Integrate the course system, HUD renderer, and sunk transition:

```typescript
import type { GolfState } from './types';
import {
  BALL_RADIUS,
  COURSE_WIDTH,
  COURSE_HEIGHT,
  SUNK_DISPLAY_TIME,
  POWER_SCALE,
  MAX_POWER,
} from './types';
import { COURSES } from './data/courses';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { CourseSystem } from './systems/CourseSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class GolfEngine {
  private ctx: CanvasRenderingContext2D;
  private state: GolfState;
  private running: boolean;
  private rafId: number;

  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
  private courseSystem: CourseSystem;
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;

  constructor(canvas: HTMLCanvasElement, _onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const offsetX = Math.floor((canvas.width - COURSE_WIDTH) / 2);
    const offsetY = Math.floor((canvas.height - COURSE_HEIGHT) / 2);

    this.state = {
      ball: {
        pos: { x: 0, y: 0 },
        vel: { x: 0, y: 0 },
        radius: BALL_RADIUS,
      },
      currentHole: 0,
      totalHoles: COURSES.length,
      strokes: 0,
      strokesPerHole: new Array(COURSES.length).fill(0),
      parPerHole: new Array(COURSES.length).fill(0),
      totalScore: 0,
      aiming: false,
      aimStart: null,
      aimEnd: null,
      ballMoving: false,
      holeSunk: false,
      sunkTimer: 0,
      gameComplete: false,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      courseOffsetX: offsetX,
      courseOffsetY: offsetY,
      courseWidth: COURSE_WIDTH,
      courseHeight: COURSE_HEIGHT,
    };

    this.physicsSystem = new PhysicsSystem();
    this.courseSystem = new CourseSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    this.inputSystem = new InputSystem(
      canvas,
      this.state,
      (power: number, angle: number) => this.putt(power, angle)
    );

    // Load first hole
    this.courseSystem.loadHole(this.state);
  }

  private putt(power: number, angle: number): void {
    const s = this.state;
    if (s.ballMoving || s.holeSunk || s.gameComplete) return;

    const scaledPower = Math.min(power * POWER_SCALE, MAX_POWER);
    s.ball.vel.x = Math.cos(angle) * scaledPower;
    s.ball.vel.y = Math.sin(angle) * scaledPower;
    s.ballMoving = true;

    this.courseSystem.recordStroke(s);
  }

  start(): void {
    this.running = true;
    this.inputSystem.attach();
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
  }

  private loop(): void {
    if (!this.running) return;

    this.tick();
    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private tick(): void {
    const s = this.state;

    if (s.gameComplete) return;

    // Physics update
    if (s.ballMoving) {
      this.physicsSystem.update(s, 16);
    }

    // Handle sunk transition
    if (s.holeSunk) {
      const elapsed = performance.now() - s.sunkTimer;
      if (elapsed > SUNK_DISPLAY_TIME) {
        this.courseSystem.advanceHole(s);
      }
    }
  }

  private render(): void {
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }
}
```

The tick now checks if the hole was sunk and waits for the display timer before advancing.

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Golf"
3. **Observe:**
   - Top bar shows "Hole 1/1", "Par 2", "Strokes: 0", and "Total: E"
   - Putt the ball. Stroke count increments
   - Roll the ball near the hole at low speed -- it snaps to center
   - "Hole In!" overlay appears with gold text
   - Par label shows (e.g., "2 strokes - Par" or "3 strokes - Bogey")
   - The overlay fades in and out over 1.5 seconds
   - After the overlay, the game advances (currently only 1 hole, so it marks complete)
   - A fast ball rolls right over the hole without sinking

---

## Challenges

**Easy:**
- Change `SUNK_DISPLAY_TIME` to 3000ms for a longer celebration
- Change the "Hole In!" text color from gold to green
- Lower `SINK_SPEED_THRESHOLD` to 2.0 to make sinking harder

**Medium:**
- Add a particle burst when the ball sinks (confetti circles)
- Play different sounds for Birdie, Par, and Bogey
- Animate the ball shrinking into the hole (scale down over 300ms)

**Hard:**
- Add a "hole-in-one" special animation with screen flash
- Implement an undo button that reverts the last stroke
- Show a projected par label that updates live as strokes increase ("Currently: Bogey")

---

## What You Learned

- Dual-threshold detection (distance AND speed)
- Par scoring labels from stroke-par difference
- Timed overlay transitions with `performance.now()`
- Alpha fade-in/fade-out curves
- HUD bar rendering with multiple aligned text elements

**Next:** 9 holes and final scorecard!
