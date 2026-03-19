# Step 6: 9 Holes & Polish

**Goal:** Add 9 unique course layouts with increasing difficulty. Show a full scorecard at the end. Add keyboard controls and resize handling.

**Time:** ~15 minutes

---

## What You'll Build

Complete game:
- **9 course layouts** with walls, obstacles, and slopes
- **Obstacle types**: rectangles and circles
- **Slope zones** that push the ball with directional arrows
- **Hole progression** from easy to challenging
- **End-game scorecard** with per-hole breakdown
- **Keyboard controls**: H for help, R for restart, ESC to exit
- **Window resize** handling

---

## Concepts

- **Obstacle Collision**: Same reflection math as walls, but applied to rectangle and circle shapes.
- **Slopes**: Each frame, if the ball is inside a slope zone, add a force vector to its velocity. This simulates gravity on a tilted surface.
- **Scorecard**: After hole 9, display a table with each hole's par, strokes, and par label. Show the total relative to par.

---

## Code

### 1. Final Types

**File:** `src/games/golf/types.ts`

Add obstacle and slope types:

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

export type ObstacleShape = 'rect' | 'circle';

export interface Obstacle {
  shape: ObstacleShape;
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
}

export interface Slope {
  x: number;
  y: number;
  width: number;
  height: number;
  dirX: number;
  dirY: number;
  strength: number;
}

export interface CourseData {
  par: number;
  ballStart: Vec2;
  hole: Hole;
  walls: Wall[];
  obstacles: Obstacle[];
  slopes: Slope[];
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
  paused: boolean;
  canvasWidth: number;
  canvasHeight: number;
  courseOffsetX: number;
  courseOffsetY: number;
  courseWidth: number;
  courseHeight: number;
  showHelp: boolean;
}

export const FRICTION = 0.985;
export const MAX_POWER = 18;
export const BALL_RADIUS = 6;
export const HOLE_RADIUS = 10;
export const SINK_SPEED_THRESHOLD = 3.5;
export const SINK_DISTANCE_THRESHOLD = 8;
export const SUNK_DISPLAY_TIME = 1500;
export const POWER_SCALE = 0.08;
export const COURSE_WIDTH = 400;
export const COURSE_HEIGHT = 600;
export const COURSE_PADDING = 30;
export const MIN_VELOCITY = 0.05;
```

---

### 2. Full Course Data (9 Holes)

**File:** `src/games/golf/data/courses.ts`

Each hole introduces new challenges:

```typescript
import type { CourseData } from '../types';
import { HOLE_RADIUS } from '../types';

export const COURSES: CourseData[] = [
  // Hole 1: Straight shot, easy intro
  {
    par: 2,
    ballStart: { x: 200, y: 520 },
    hole: { pos: { x: 200, y: 80 }, radius: HOLE_RADIUS },
    walls: [
      { x1: 50, y1: 30, x2: 350, y2: 30 },
      { x1: 50, y1: 570, x2: 350, y2: 570 },
      { x1: 50, y1: 30, x2: 50, y2: 570 },
      { x1: 350, y1: 30, x2: 350, y2: 570 },
    ],
    obstacles: [],
    slopes: [],
  },

  // Hole 2: Center obstacle
  {
    par: 3,
    ballStart: { x: 200, y: 520 },
    hole: { pos: { x: 200, y: 80 }, radius: HOLE_RADIUS },
    walls: [
      { x1: 50, y1: 30, x2: 350, y2: 30 },
      { x1: 50, y1: 570, x2: 350, y2: 570 },
      { x1: 50, y1: 30, x2: 50, y2: 570 },
      { x1: 350, y1: 30, x2: 350, y2: 570 },
    ],
    obstacles: [
      { shape: 'rect', x: 130, y: 270, width: 140, height: 20 },
    ],
    slopes: [],
  },

  // Hole 3: Dogleg right
  {
    par: 3,
    ballStart: { x: 100, y: 520 },
    hole: { pos: { x: 300, y: 80 }, radius: HOLE_RADIUS },
    walls: [
      { x1: 50, y1: 30, x2: 350, y2: 30 },
      { x1: 50, y1: 570, x2: 200, y2: 570 },
      { x1: 50, y1: 30, x2: 50, y2: 570 },
      { x1: 350, y1: 30, x2: 350, y2: 570 },
      { x1: 200, y1: 300, x2: 200, y2: 570 },
      { x1: 200, y1: 300, x2: 350, y2: 300 },
    ],
    obstacles: [],
    slopes: [],
  },

  // Hole 4: Narrow corridor with bumper
  {
    par: 3,
    ballStart: { x: 200, y: 520 },
    hole: { pos: { x: 200, y: 80 }, radius: HOLE_RADIUS },
    walls: [
      { x1: 50, y1: 30, x2: 350, y2: 30 },
      { x1: 50, y1: 570, x2: 350, y2: 570 },
      { x1: 50, y1: 30, x2: 50, y2: 570 },
      { x1: 350, y1: 30, x2: 350, y2: 570 },
      { x1: 140, y1: 150, x2: 140, y2: 450 },
      { x1: 260, y1: 150, x2: 260, y2: 450 },
    ],
    obstacles: [
      { shape: 'circle', x: 200, y: 300, width: 20, height: 20, radius: 10 },
    ],
    slopes: [],
  },

  // Hole 5: Slope push
  {
    par: 3,
    ballStart: { x: 200, y: 520 },
    hole: { pos: { x: 200, y: 80 }, radius: HOLE_RADIUS },
    walls: [
      { x1: 50, y1: 30, x2: 350, y2: 30 },
      { x1: 50, y1: 570, x2: 350, y2: 570 },
      { x1: 50, y1: 30, x2: 50, y2: 570 },
      { x1: 350, y1: 30, x2: 350, y2: 570 },
    ],
    obstacles: [],
    slopes: [
      { x: 100, y: 200, width: 200, height: 150, dirX: 1, dirY: 0, strength: 0.6 },
    ],
  },

  // Hole 6: Zigzag walls
  {
    par: 4,
    ballStart: { x: 100, y: 520 },
    hole: { pos: { x: 300, y: 80 }, radius: HOLE_RADIUS },
    walls: [
      { x1: 50, y1: 30, x2: 350, y2: 30 },
      { x1: 50, y1: 570, x2: 350, y2: 570 },
      { x1: 50, y1: 30, x2: 50, y2: 570 },
      { x1: 350, y1: 30, x2: 350, y2: 570 },
      { x1: 50, y1: 430, x2: 260, y2: 430 },
      { x1: 140, y1: 300, x2: 350, y2: 300 },
      { x1: 50, y1: 170, x2: 260, y2: 170 },
    ],
    obstacles: [],
    slopes: [],
  },

  // Hole 7: Obstacle maze
  {
    par: 4,
    ballStart: { x: 200, y: 520 },
    hole: { pos: { x: 200, y: 80 }, radius: HOLE_RADIUS },
    walls: [
      { x1: 50, y1: 30, x2: 350, y2: 30 },
      { x1: 50, y1: 570, x2: 350, y2: 570 },
      { x1: 50, y1: 30, x2: 50, y2: 570 },
      { x1: 350, y1: 30, x2: 350, y2: 570 },
    ],
    obstacles: [
      { shape: 'rect', x: 100, y: 200, width: 80, height: 20 },
      { shape: 'rect', x: 220, y: 200, width: 80, height: 20 },
      { shape: 'rect', x: 150, y: 340, width: 100, height: 20 },
      { shape: 'circle', x: 120, y: 440, width: 24, height: 24, radius: 12 },
      { shape: 'circle', x: 280, y: 440, width: 24, height: 24, radius: 12 },
    ],
    slopes: [],
  },

  // Hole 8: Slopes and obstacles combined
  {
    par: 4,
    ballStart: { x: 100, y: 520 },
    hole: { pos: { x: 300, y: 80 }, radius: HOLE_RADIUS },
    walls: [
      { x1: 50, y1: 30, x2: 350, y2: 30 },
      { x1: 50, y1: 570, x2: 350, y2: 570 },
      { x1: 50, y1: 30, x2: 50, y2: 570 },
      { x1: 350, y1: 30, x2: 350, y2: 570 },
    ],
    obstacles: [
      { shape: 'rect', x: 160, y: 250, width: 80, height: 20 },
      { shape: 'rect', x: 160, y: 380, width: 80, height: 20 },
    ],
    slopes: [
      { x: 50, y: 150, width: 300, height: 80, dirX: 0, dirY: -1, strength: 0.5 },
      { x: 50, y: 400, width: 300, height: 80, dirX: -1, dirY: 0, strength: 0.4 },
    ],
  },

  // Hole 9: Grand finale - tight with everything
  {
    par: 5,
    ballStart: { x: 100, y: 540 },
    hole: { pos: { x: 300, y: 60 }, radius: HOLE_RADIUS },
    walls: [
      { x1: 50, y1: 30, x2: 350, y2: 30 },
      { x1: 50, y1: 570, x2: 350, y2: 570 },
      { x1: 50, y1: 30, x2: 50, y2: 570 },
      { x1: 350, y1: 30, x2: 350, y2: 570 },
      { x1: 50, y1: 460, x2: 220, y2: 460 },
      { x1: 180, y1: 320, x2: 350, y2: 320 },
      { x1: 50, y1: 180, x2: 220, y2: 180 },
    ],
    obstacles: [
      { shape: 'circle', x: 280, y: 400, width: 20, height: 20, radius: 10 },
      { shape: 'circle', x: 120, y: 260, width: 20, height: 20, radius: 10 },
      { shape: 'rect', x: 250, y: 120, width: 50, height: 15 },
    ],
    slopes: [
      { x: 230, y: 340, width: 120, height: 120, dirX: 1, dirY: 1, strength: 0.5 },
      { x: 50, y: 50, width: 150, height: 120, dirX: 0, dirY: 1, strength: 0.4 },
    ],
  },
];
```

**Hole design progression:**
1. Open straight shot (par 2)
2. Rectangle blocker in the middle (par 3)
3. L-shaped dogleg with internal walls (par 3)
4. Narrow corridor with a circular bumper (par 3)
5. Sideways slope that pushes the ball right (par 3)
6. Three horizontal walls creating a zigzag path (par 4)
7. Multiple rectangle and circle obstacles (par 4)
8. Two slopes plus two blockers (par 4)
9. Zigzag walls, bumpers, obstacles, and slopes combined (par 5)

---

### 3. Final Physics System

**File:** `src/games/golf/systems/PhysicsSystem.ts`

Add slope forces and obstacle collisions:

```typescript
import type { GolfState, Wall, Obstacle, Slope } from '../types';
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

    // Apply slopes
    this.applySlopes(state, course.slopes);

    // Apply friction
    ball.vel.x *= FRICTION;
    ball.vel.y *= FRICTION;

    // Move ball
    ball.pos.x += ball.vel.x;
    ball.pos.y += ball.vel.y;

    // Wall collisions
    this.handleWallCollisions(state, course.walls);

    // Obstacle collisions
    this.handleObstacleCollisions(state, course.obstacles);

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

  private applySlopes(state: GolfState, slopes: Slope[]): void {
    const ball = state.ball;
    for (let i = 0; i < slopes.length; i++) {
      const slope = slopes[i];
      if (
        ball.pos.x >= slope.x &&
        ball.pos.x <= slope.x + slope.width &&
        ball.pos.y >= slope.y &&
        ball.pos.y <= slope.y + slope.height
      ) {
        ball.vel.x += slope.dirX * slope.strength;
        ball.vel.y += slope.dirY * slope.strength;
      }
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

  private handleObstacleCollisions(
    state: GolfState,
    obstacles: Obstacle[]
  ): void {
    const ball = state.ball;
    const r = ball.radius;

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];

      if (obs.shape === 'circle' && obs.radius) {
        // Circle obstacle: distance between centers
        const dx = ball.pos.x - obs.x;
        const dy = ball.pos.y - obs.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = r + obs.radius;

        if (dist < minDist && dist > 0) {
          const normX = dx / dist;
          const normY = dy / dist;

          // Push ball out
          ball.pos.x = obs.x + normX * minDist;
          ball.pos.y = obs.y + normY * minDist;

          // Reflect
          const dot = ball.vel.x * normX + ball.vel.y * normY;
          ball.vel.x -= 2 * dot * normX;
          ball.vel.y -= 2 * dot * normY;

          // Dampen
          ball.vel.x *= 0.85;
          ball.vel.y *= 0.85;
        }
      } else {
        // Rectangle obstacle: closest point on rect to ball
        const closestX = Math.max(
          obs.x,
          Math.min(ball.pos.x, obs.x + obs.width)
        );
        const closestY = Math.max(
          obs.y,
          Math.min(ball.pos.y, obs.y + obs.height)
        );

        const dx = ball.pos.x - closestX;
        const dy = ball.pos.y - closestY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < r && dist > 0) {
          const normX = dx / dist;
          const normY = dy / dist;

          ball.pos.x = closestX + normX * r;
          ball.pos.y = closestY + normY * r;

          const dot = ball.vel.x * normX + ball.vel.y * normY;
          ball.vel.x -= 2 * dot * normX;
          ball.vel.y -= 2 * dot * normY;

          ball.vel.x *= 0.85;
          ball.vel.y *= 0.85;
        }
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

**Circle obstacle collision** is the simplest: check if the distance between centers is less than the sum of radii. The normal points from the obstacle center toward the ball.

**Rectangle obstacle collision** uses the closest-point-on-AABB technique: clamp the ball center to the rectangle bounds, then measure the distance from that closest point to the ball center. Same reflection math after that.

Both obstacle types use 0.85 damping (slightly less energy loss than wall bounces at 0.8).

---

### 4. Final Input System

**File:** `src/games/golf/systems/InputSystem.ts`

Add keyboard handling, touch support, and guard checks:

```typescript
import type { GolfState, Vec2 } from '../types';

export class InputSystem {
  private canvas: HTMLCanvasElement;
  private state: GolfState;
  private onExit: () => void;
  private onReset: () => void;

  private mouseDownHandler: (e: MouseEvent) => void;
  private mouseMoveHandler: (e: MouseEvent) => void;
  private mouseUpHandler: (e: MouseEvent) => void;
  private keyHandler: (e: KeyboardEvent) => void;
  private touchStartHandler: (e: TouchEvent) => void;
  private touchMoveHandler: (e: TouchEvent) => void;
  private touchEndHandler: (e: TouchEvent) => void;

  constructor(
    canvas: HTMLCanvasElement,
    state: GolfState,
    onExit: () => void,
    onReset: () => void,
    onPutt: (power: number, angle: number) => void
  ) {
    this.canvas = canvas;
    this.state = state;
    this.onExit = onExit;
    this.onReset = onReset;

    this.mouseDownHandler = (e: MouseEvent) => {
      const pos = this.getCanvasPos(e.clientX, e.clientY);
      this.handlePointerDown(pos);
    };

    this.mouseMoveHandler = (e: MouseEvent) => {
      const pos = this.getCanvasPos(e.clientX, e.clientY);
      this.handlePointerMove(pos);
    };

    this.mouseUpHandler = (e: MouseEvent) => {
      const pos = this.getCanvasPos(e.clientX, e.clientY);
      this.handlePointerUp(pos, onPutt);
    };

    this.touchStartHandler = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const pos = this.getCanvasPos(touch.clientX, touch.clientY);
      this.handlePointerDown(pos);
    };

    this.touchMoveHandler = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const pos = this.getCanvasPos(touch.clientX, touch.clientY);
      this.handlePointerMove(pos);
    };

    this.touchEndHandler = (e: TouchEvent) => {
      e.preventDefault();
      if (this.state.aimStart) {
        const aimEnd = this.state.aimEnd ?? this.state.aimStart;
        this.handlePointerUp(aimEnd, onPutt);
      }
    };

    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.onExit();
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        this.state.showHelp = !this.state.showHelp;
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        this.onReset();
        return;
      }
    };
  }

  private getCanvasPos(clientX: number, clientY: number): Vec2 {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  private handlePointerDown(pos: Vec2): void {
    const s = this.state;
    if (s.ballMoving || s.holeSunk || s.gameComplete || s.showHelp) return;

    const ballScreenX = s.ball.pos.x + s.courseOffsetX;
    const ballScreenY = s.ball.pos.y + s.courseOffsetY;
    const dx = pos.x - ballScreenX;
    const dy = pos.y - ballScreenY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 40) {
      s.aiming = true;
      s.aimStart = { x: pos.x, y: pos.y };
      s.aimEnd = { x: pos.x, y: pos.y };
    }
  }

  private handlePointerMove(pos: Vec2): void {
    if (this.state.aiming) {
      this.state.aimEnd = { x: pos.x, y: pos.y };
    }
  }

  private handlePointerUp(
    _pos: Vec2,
    onPutt: (power: number, angle: number) => void
  ): void {
    const s = this.state;
    if (!s.aiming || !s.aimStart || !s.aimEnd) return;

    const dx = s.aimStart.x - s.aimEnd.x;
    const dy = s.aimStart.y - s.aimEnd.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      const angle = Math.atan2(dy, dx);
      const power = Math.min(dist, 200);
      onPutt(power, angle);
    }

    s.aiming = false;
    s.aimStart = null;
    s.aimEnd = null;
  }

  attach(): void {
    this.canvas.addEventListener('mousedown', this.mouseDownHandler);
    this.canvas.addEventListener('mousemove', this.mouseMoveHandler);
    this.canvas.addEventListener('mouseup', this.mouseUpHandler);
    this.canvas.addEventListener('touchstart', this.touchStartHandler, {
      passive: false,
    });
    this.canvas.addEventListener('touchmove', this.touchMoveHandler, {
      passive: false,
    });
    this.canvas.addEventListener('touchend', this.touchEndHandler, {
      passive: false,
    });
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
}
```

---

### 5. Final Game Renderer

**File:** `src/games/golf/renderers/GameRenderer.ts`

Add slope arrows and obstacle drawing:

```typescript
import type { GolfState } from '../types';
import { COURSES } from '../data/courses';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: GolfState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(state.courseOffsetX, state.courseOffsetY);

    const course = COURSES[state.currentHole];

    this.drawGreen(ctx, course.walls);
    this.drawSlopes(ctx, state);
    this.drawWalls(ctx, state);
    this.drawObstacles(ctx, state);
    this.drawHole(ctx, state);
    this.drawBall(ctx, state);

    ctx.restore();

    // Aim line in screen coordinates
    if (state.aiming && state.aimStart && state.aimEnd) {
      this.drawAimLine(ctx, state);
    }
  }

  private drawGreen(
    ctx: CanvasRenderingContext2D,
    walls: { x1: number; y1: number; x2: number; y2: number }[]
  ): void {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const outerCount = Math.min(4, walls.length);
    for (let i = 0; i < outerCount; i++) {
      const w = walls[i];
      minX = Math.min(minX, w.x1, w.x2);
      minY = Math.min(minY, w.y1, w.y2);
      maxX = Math.max(maxX, w.x1, w.x2);
      maxY = Math.max(maxY, w.y1, w.y2);
    }

    ctx.fillStyle = '#2d7a3a';
    ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

    ctx.strokeStyle = '#1e5c2a';
    ctx.lineWidth = 3;
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

    ctx.strokeStyle = 'rgba(50, 140, 60, 0.3)';
    ctx.lineWidth = 1;
    for (let y = minY; y < maxY; y += 12) {
      ctx.beginPath();
      ctx.moveTo(minX, y);
      ctx.lineTo(maxX, y);
      ctx.stroke();
    }
  }

  private drawSlopes(ctx: CanvasRenderingContext2D, state: GolfState): void {
    const course = COURSES[state.currentHole];

    for (let i = 0; i < course.slopes.length; i++) {
      const slope = course.slopes[i];

      // Tinted zone
      ctx.fillStyle = 'rgba(100, 180, 100, 0.4)';
      ctx.fillRect(slope.x, slope.y, slope.width, slope.height);

      // Direction arrows
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1.5;

      const arrowSpacing = 30;
      const arrowSize = 8;

      for (
        let ax = slope.x + arrowSpacing;
        ax < slope.x + slope.width;
        ax += arrowSpacing
      ) {
        for (
          let ay = slope.y + arrowSpacing;
          ay < slope.y + slope.height;
          ay += arrowSpacing
        ) {
          // Arrow shaft
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(
            ax + slope.dirX * arrowSize,
            ay + slope.dirY * arrowSize
          );
          ctx.stroke();

          // Arrowhead
          const angle = Math.atan2(slope.dirY, slope.dirX);
          ctx.beginPath();
          ctx.moveTo(
            ax + slope.dirX * arrowSize,
            ay + slope.dirY * arrowSize
          );
          ctx.lineTo(
            ax + slope.dirX * arrowSize - Math.cos(angle - 0.5) * 4,
            ay + slope.dirY * arrowSize - Math.sin(angle - 0.5) * 4
          );
          ctx.moveTo(
            ax + slope.dirX * arrowSize,
            ay + slope.dirY * arrowSize
          );
          ctx.lineTo(
            ax + slope.dirX * arrowSize - Math.cos(angle + 0.5) * 4,
            ay + slope.dirY * arrowSize - Math.sin(angle + 0.5) * 4
          );
          ctx.stroke();
        }
      }
    }
  }

  private drawWalls(ctx: CanvasRenderingContext2D, state: GolfState): void {
    const course = COURSES[state.currentHole];

    ctx.strokeStyle = '#5c3a1e';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    for (let i = 0; i < course.walls.length; i++) {
      const wall = course.walls[i];
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();
    }
  }

  private drawObstacles(
    ctx: CanvasRenderingContext2D,
    state: GolfState
  ): void {
    const course = COURSES[state.currentHole];

    for (let i = 0; i < course.obstacles.length; i++) {
      const obs = course.obstacles[i];

      if (obs.shape === 'circle' && obs.radius) {
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#6B3410';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        ctx.strokeStyle = '#6B3410';
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
      }
    }
  }

  private drawHole(ctx: CanvasRenderingContext2D, state: GolfState): void {
    const course = COURSES[state.currentHole];
    const hole = course.hole;

    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(hole.pos.x, hole.pos.y, hole.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hole.pos.x, hole.pos.y, hole.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hole.pos.x, hole.pos.y);
    ctx.lineTo(hole.pos.x, hole.pos.y - 40);
    ctx.stroke();

    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.moveTo(hole.pos.x, hole.pos.y - 40);
    ctx.lineTo(hole.pos.x + 18, hole.pos.y - 33);
    ctx.lineTo(hole.pos.x, hole.pos.y - 26);
    ctx.closePath();
    ctx.fill();
  }

  private drawBall(ctx: CanvasRenderingContext2D, state: GolfState): void {
    const ball = state.ball;

    if (state.holeSunk) return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(
      ball.pos.x + 2, ball.pos.y + 3,
      ball.radius, ball.radius * 0.6,
      0, 0, Math.PI * 2
    );
    ctx.fill();

    const grad = ctx.createRadialGradient(
      ball.pos.x - 2, ball.pos.y - 2, 1,
      ball.pos.x, ball.pos.y, ball.radius
    );
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#ddd');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ball.pos.x, ball.pos.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(ball.pos.x, ball.pos.y, ball.radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawAimLine(ctx: CanvasRenderingContext2D, state: GolfState): void {
    const start = state.aimStart!;
    const end = state.aimEnd!;

    const dx = start.x - end.x;
    const dy = start.y - end.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const power = Math.min(dist, 200);
    const powerRatio = power / 200;

    const ballScreenX = state.ball.pos.x + state.courseOffsetX;
    const ballScreenY = state.ball.pos.y + state.courseOffsetY;

    const angle = Math.atan2(dy, dx);
    const lineLen = 30 + powerRatio * 80;
    const endX = ballScreenX + Math.cos(angle) * lineLen;
    const endY = ballScreenY + Math.sin(angle) * lineLen;

    const r = Math.floor(255 * powerRatio);
    const g = Math.floor(255 * (1 - powerRatio));
    const color = `rgb(${r}, ${g}, 50)`;

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ballScreenX, ballScreenY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ballScreenX, ballScreenY, 15 + powerRatio * 15, 0, Math.PI * 2);
    ctx.stroke();

    const powerPercent = Math.round(powerRatio * 100);
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${powerPercent}%`, ballScreenX, ballScreenY - 25);
  }
}
```

---

### 6. Final HUD Renderer

**File:** `src/games/golf/renderers/HUDRenderer.ts`

Add the game-complete scorecard overlay:

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

    if (state.gameComplete) {
      this.drawCompleteOverlay(ctx, state);
    }

    // Controls hint
    if (!state.showHelp && !state.gameComplete) {
      ctx.font = '11px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(
        '[H] Help  [R] Restart  [ESC] Exit',
        W - 12,
        ctx.canvas.height - 8
      );
    }
  }

  private drawTopBar(
    ctx: CanvasRenderingContext2D,
    state: GolfState,
    W: number
  ): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, W, 44);

    const course = COURSES[state.currentHole];

    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    ctx.fillStyle = '#4caf50';
    ctx.fillText(
      `Hole ${state.currentHole + 1}/${state.totalHoles}`,
      12,
      22
    );

    ctx.fillStyle = '#aaa';
    ctx.font = '13px monospace';
    ctx.fillText(`Par ${course.par}`, 170, 22);

    ctx.fillStyle = '#fff';
    ctx.fillText(`Strokes: ${state.strokes}`, 260, 22);

    ctx.textAlign = 'right';
    const scoreLabel =
      state.totalScore === 0
        ? 'E'
        : state.totalScore > 0
          ? `+${state.totalScore}`
          : `${state.totalScore}`;
    ctx.fillStyle =
      state.totalScore < 0
        ? '#4caf50'
        : state.totalScore === 0
          ? '#fff'
          : '#e53935';
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

    const alpha =
      Math.min(1, elapsed / 300) *
      (1 - Math.max(0, (elapsed - SUNK_DISPLAY_TIME + 400) / 400));
    const course = COURSES[state.currentHole];
    const label = this.courseSystem.getParLabel(state.strokes, course.par);

    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, H * 0.35, W, H * 0.3);

    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Hole In!', W / 2, H * 0.45);

    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(
      `${state.strokes} stroke${state.strokes !== 1 ? 's' : ''} - ${label}`,
      W / 2,
      H * 0.55
    );

    ctx.restore();
  }

  private drawCompleteOverlay(
    ctx: CanvasRenderingContext2D,
    state: GolfState
  ): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Dark backdrop
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, W, H);

    // Scorecard panel
    const panelW = Math.min(400, W * 0.8);
    const panelH = Math.min(500, H * 0.8);
    const px = (W - panelW) / 2;
    const py = (H - panelH) / 2;

    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 12);
    ctx.fill();

    ctx.strokeStyle = '#388e3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 12);
    ctx.stroke();

    let y = py + 30;

    // Title
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Game Complete!', W / 2, y);
    y += 45;

    // Column headers
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';

    const colHole = px + 20;
    const colPar = px + 80;
    const colStrokes = px + 150;
    const colResult = px + 240;

    ctx.fillStyle = '#388e3c';
    ctx.fillText('Hole', colHole, y);
    ctx.fillText('Par', colPar, y);
    ctx.fillText('Strokes', colStrokes, y);
    ctx.fillText('Result', colResult, y);
    y += 22;

    // Divider line
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 15, y);
    ctx.lineTo(px + panelW - 15, y);
    ctx.stroke();
    y += 10;

    // Per-hole rows
    let totalStrokes = 0;
    let totalPar = 0;

    for (let i = 0; i < state.totalHoles; i++) {
      const strokes = state.strokesPerHole[i];
      const par = COURSES[i].par;
      const diff = strokes - par;
      totalStrokes += strokes;
      totalPar += par;

      ctx.fillStyle = '#ccc';
      ctx.fillText(`${i + 1}`, colHole, y);
      ctx.fillText(`${par}`, colPar, y);
      ctx.fillText(`${strokes}`, colStrokes, y);

      // Color-coded result
      ctx.fillStyle =
        diff < 0 ? '#4caf50' : diff === 0 ? '#fff' : '#e53935';
      ctx.fillText(
        this.courseSystem.getParLabel(strokes, par),
        colResult,
        y
      );
      y += 20;
    }

    // Total row
    y += 5;
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.moveTo(px + 15, y);
    ctx.lineTo(px + panelW - 15, y);
    ctx.stroke();
    y += 15;

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('Total', colHole, y);
    ctx.fillText(`${totalPar}`, colPar, y);
    ctx.fillText(`${totalStrokes}`, colStrokes, y);

    const finalDiff = totalStrokes - totalPar;
    const finalLabel =
      finalDiff === 0
        ? 'Even'
        : finalDiff > 0
          ? `+${finalDiff}`
          : `${finalDiff}`;
    ctx.fillStyle =
      finalDiff < 0 ? '#4caf50' : finalDiff === 0 ? '#fff' : '#e53935';
    ctx.fillText(finalLabel, colResult, y);

    // Instructions
    y += 40;
    ctx.font = '13px monospace';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText('Press [R] to play again  [ESC] to exit', W / 2, y);
  }
}
```

---

### 7. Final Game Engine

**File:** `src/games/golf/GolfEngine.ts`

Full engine with all systems, resize handler, and keyboard controls:

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
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
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
      paused: false,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      courseOffsetX: offsetX,
      courseOffsetY: offsetY,
      courseWidth: COURSE_WIDTH,
      courseHeight: COURSE_HEIGHT,
      showHelp: false,
    };

    this.physicsSystem = new PhysicsSystem();
    this.courseSystem = new CourseSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    this.inputSystem = new InputSystem(
      canvas,
      this.state,
      onExit,
      () => this.reset(),
      (power: number, angle: number) => this.putt(power, angle)
    );

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasWidth = canvas.width;
      this.state.canvasHeight = canvas.height;
      this.state.courseOffsetX = Math.floor(
        (canvas.width - COURSE_WIDTH) / 2
      );
      this.state.courseOffsetY = Math.floor(
        (canvas.height - COURSE_HEIGHT) / 2
      );
    };

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

  private reset(): void {
    this.state.currentHole = 0;
    this.state.totalScore = 0;
    this.state.strokesPerHole = new Array(COURSES.length).fill(0);
    this.state.parPerHole = new Array(COURSES.length).fill(0);
    this.state.gameComplete = false;
    this.state.holeSunk = false;
    this.state.showHelp = false;
    this.courseSystem.loadHole(this.state);
  }

  start(): void {
    this.running = true;
    this.inputSystem.attach();
    window.addEventListener('resize', this.resizeHandler);
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

    this.tick();
    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private tick(): void {
    const s = this.state;

    if (s.showHelp || s.gameComplete) return;

    if (s.ballMoving) {
      this.physicsSystem.update(s, 16);
    }

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

---

### 8. Platform Adapter and Export

**File:** `src/games/golf/adapters/PlatformAdapter.ts`

```typescript
import type { GameInstance } from '@shared/GameInterface';
import { GolfEngine } from '../GolfEngine';

export class PlatformAdapter implements GameInstance {
  private engine: GolfEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new GolfEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

**File:** `src/games/golf/index.ts`

```typescript
import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const GolfGame: GameDefinition = {
  id: 'golf',
  name: 'Golf',
  description: 'Mini golf with 9 unique holes!',
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
2. **Navigate:** Select "Golf"
3. **Observe:**
   - Hole 1: Straight shot, aim up and putt in 2 strokes
   - Hole 2: Rectangle obstacle blocks the center path
   - Hole 3: L-shaped course, must bank or aim around the corner
   - Hole 4: Narrow corridor with a bumper in the middle
   - Hole 5: Slope zone pushes the ball right (green arrows show direction)
   - Hole 6: Zigzag walls force a serpentine path
   - Hole 7: Scattered rectangle and circle obstacles
   - Hole 8: Slopes and obstacles combined
   - Hole 9: Everything at once -- walls, bumpers, obstacles, and slopes
   - After hole 9, scorecard shows all 9 holes with par labels
   - Total score relative to par (green for under, red for over, white for even)
   - Press R to restart, ESC to exit
   - Resize the window -- course stays centered

---

## Challenges

**Easy:**
- Add a 10th hole with your own layout
- Change the obstacle color from brown to grey
- Make slope arrows larger and more visible

**Medium:**
- Add water hazard zones that reset the ball to its last position with a +1 penalty
- Implement a "best score" system using localStorage
- Add background music that changes tempo on later holes

**Hard:**
- Build a course editor: click to place walls, obstacles, and slopes
- Add multiplayer: two players alternate putts with separate ball colors
- Implement procedural course generation with random walls and obstacles

---

## What You Learned

- Designing 9 progressively harder levels with varied mechanics
- Circle and rectangle obstacle collision with reflection
- Slope zones that apply directional force to the ball
- End-game scorecard rendering with column-aligned text
- Par label system (Albatross through Double Bogey)
- Window resize handling for centered layouts
- Touch input support for mobile play

**The Golf game is complete!** You built a full 9-hole mini-golf game with drag-to-putt input, friction physics, wall and obstacle collisions, slope forces, hole detection, stroke counting, par scoring, and a final scorecard.
