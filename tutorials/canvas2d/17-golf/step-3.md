# Step 3: Ball Physics

**Goal:** Make the ball move after a putt. Apply friction so it decelerates and eventually stops.

**Time:** ~15 minutes

---

## What You'll Build

Physics system:
- **Ball movement** using velocity applied each frame
- **Friction** that multiplies velocity by a constant < 1 each frame
- **Minimum velocity threshold** below which the ball snaps to zero
- **ballMoving flag** that gates input (cannot putt while ball is rolling)

---

## Concepts

- **Friction as Multiplier**: Each frame, `vel *= FRICTION` where `FRICTION = 0.985`. After many frames, velocity approaches zero exponentially.
- **Speed Check**: `Math.sqrt(vx*vx + vy*vy)`. When below `MIN_VELOCITY`, snap to zero and mark the ball as stopped.
- **No Delta-Time (Simplified)**: We pass a fixed `dt = 16` to the physics system. This keeps friction behavior consistent. For a production game you would scale by actual delta, but fixed-step keeps this tutorial simple.

---

## Code

### 1. Update Types

**File:** `src/contexts/canvas2d/games/golf/types.ts`

Add friction and velocity constants:

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
  strokes: number;
  aiming: boolean;
  aimStart: Vec2 | null;
  aimEnd: Vec2 | null;
  ballMoving: boolean;
  holeSunk: boolean;
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
```

`FRICTION = 0.985` means the ball retains 98.5% of its speed each frame. At 60fps, speed halves roughly every 46 frames (~0.77 seconds).

`MIN_VELOCITY = 0.05` is the cutoff. Below this the ball is considered stopped.

---

### 2. Create Physics System

**File:** `src/contexts/canvas2d/games/golf/systems/PhysicsSystem.ts`

Apply friction, move the ball, and stop it when slow enough:

```typescript
import type { GolfState } from '../types';
import { FRICTION, MIN_VELOCITY } from '../types';

export class PhysicsSystem {
  update(state: GolfState, _dt: number): void {
    const ball = state.ball;
    if (!state.ballMoving) return;

    // Apply friction
    ball.vel.x *= FRICTION;
    ball.vel.y *= FRICTION;

    // Move ball
    ball.pos.x += ball.vel.x;
    ball.pos.y += ball.vel.y;

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
}
```

That is the entire physics system for now. Three operations per frame: friction, position update, stop check.

Notice the ball can roll off the course edges right now. There are no wall collisions yet -- the ball will disappear. That is expected; walls come in step 4.

---

### 3. Update Game Engine

**File:** `src/contexts/canvas2d/games/golf/GolfEngine.ts`

Add physics update to the tick and call it from the loop:

```typescript
import type { GolfState } from './types';
import {
  BALL_RADIUS,
  COURSE_WIDTH,
  COURSE_HEIGHT,
  POWER_SCALE,
  MAX_POWER,
} from './types';
import { COURSES } from './data/courses';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class GolfEngine {
  private ctx: CanvasRenderingContext2D;
  private state: GolfState;
  private running: boolean;
  private rafId: number;

  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
  private gameRenderer: GameRenderer;

  constructor(canvas: HTMLCanvasElement, _onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const offsetX = Math.floor((canvas.width - COURSE_WIDTH) / 2);
    const offsetY = Math.floor((canvas.height - COURSE_HEIGHT) / 2);

    const course = COURSES[0];

    this.state = {
      ball: {
        pos: { x: course.ballStart.x, y: course.ballStart.y },
        vel: { x: 0, y: 0 },
        radius: BALL_RADIUS,
      },
      currentHole: 0,
      strokes: 0,
      aiming: false,
      aimStart: null,
      aimEnd: null,
      ballMoving: false,
      holeSunk: false,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      courseOffsetX: offsetX,
      courseOffsetY: offsetY,
      courseWidth: COURSE_WIDTH,
      courseHeight: COURSE_HEIGHT,
    };

    this.physicsSystem = new PhysicsSystem();
    this.gameRenderer = new GameRenderer();

    this.inputSystem = new InputSystem(
      canvas,
      this.state,
      (power: number, angle: number) => this.putt(power, angle)
    );
  }

  private putt(power: number, angle: number): void {
    const s = this.state;
    if (s.ballMoving || s.holeSunk) return;

    const scaledPower = Math.min(power * POWER_SCALE, MAX_POWER);
    s.ball.vel.x = Math.cos(angle) * scaledPower;
    s.ball.vel.y = Math.sin(angle) * scaledPower;
    s.ballMoving = true;
    s.strokes++;
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
    if (this.state.ballMoving) {
      this.physicsSystem.update(this.state, 16);
    }
  }

  private render(): void {
    this.gameRenderer.render(this.ctx, this.state);
  }
}
```

The `tick` method only calls physics when the ball is moving. When the ball stops, the physics system sets `ballMoving = false`, which re-enables aiming input.

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Golf"
3. **Observe:**
   - Drag to aim and release -- the ball now rolls across the green
   - The ball decelerates smoothly (friction)
   - It eventually stops completely
   - Once stopped, you can aim and putt again
   - A gentle putt stops quickly; a full-power putt rolls much further
   - The ball rolls off the course edges (no walls yet -- this is expected)
   - If the ball goes off-screen, refresh to reset

---

## Challenges

**Easy:**
- Change `FRICTION` to 0.97 and observe faster deceleration
- Change `MIN_VELOCITY` to 0.5 and watch the ball stop sooner
- Log the speed each frame with `console.log` to see the exponential decay

**Medium:**
- Add a trail of fading dots behind the ball as it moves
- Implement delta-time physics: scale friction by `dt / 16` so it works at any frame rate
- Add a "ghost ball" that shows where the ball was when you last putted

**Hard:**
- Implement variable friction zones (a sand trap with `FRICTION = 0.95`)
- Add ball spin: lateral velocity component that curves the path
- Implement a replay system that records and replays the ball path

---

## What You Learned

- Exponential friction: `velocity *= constant` each frame
- Speed magnitude from velocity components: `sqrt(vx^2 + vy^2)`
- Minimum velocity threshold to snap to zero (avoids infinite creep)
- Gating input with a `ballMoving` flag

**Next:** Walls and bouncing!
