# Step 1: Course & Ball

**Goal:** Draw a green mini-golf course with a ball and shadow in a top-down view.

**Time:** ~15 minutes

---

## What You'll Build

Foundation elements:
- **Dark background** with centered course area
- **Green course** with grass texture lines
- **Golf ball** with radial gradient and drop shadow
- **Hole** with dark circle, rim, flag pole, and red flag
- **Canvas coordinate system** for course offset centering

---

## Concepts

- **Course Layout**: A fixed-size rectangle centered on the canvas
- **Offset Translation**: `ctx.translate(offsetX, offsetY)` so course coordinates start at (0, 0)
- **Radial Gradient**: Gives the ball a 3D look with a highlight spot
- **Ellipse Shadow**: Flattened ellipse below the ball for depth

---

## Code

### 1. Create Types

**File:** `src/games/golf/types.ts`

Define the core data structures and constants:

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
```

We keep this minimal for now. Later steps add velocity constants, obstacles, and scoring fields.

---

### 2. Create Course Data

**File:** `src/games/golf/data/courses.ts`

Define a single hole to start with. The first four walls form the outer boundary:

```typescript
import type { CourseData } from '../types';
import { HOLE_RADIUS } from '../types';

export const COURSES: CourseData[] = [
  {
    par: 2,
    ballStart: { x: 200, y: 520 },
    hole: { pos: { x: 200, y: 80 }, radius: HOLE_RADIUS },
    walls: [
      { x1: 50, y1: 30, x2: 350, y2: 30 },   // top
      { x1: 50, y1: 570, x2: 350, y2: 570 },  // bottom
      { x1: 50, y1: 30, x2: 50, y2: 570 },    // left
      { x1: 350, y1: 30, x2: 350, y2: 570 },  // right
    ],
  },
];
```

The ball starts near the bottom, the hole sits near the top. All coordinates are relative to the course origin (0, 0), which we translate into place on the canvas.

---

### 3. Create Game Renderer

**File:** `src/games/golf/renderers/GameRenderer.ts`

Draw the course green, hole with flag, and ball with shadow:

```typescript
import type { GolfState } from '../types';
import { COURSES } from '../data/courses';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: GolfState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Dark background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    // Translate so course coordinates start at (0, 0)
    ctx.save();
    ctx.translate(state.courseOffsetX, state.courseOffsetY);

    const course = COURSES[state.currentHole];

    this.drawGreen(ctx, course.walls);
    this.drawHole(ctx, state);
    this.drawBall(ctx, state);

    ctx.restore();
  }

  private drawGreen(
    ctx: CanvasRenderingContext2D,
    walls: { x1: number; y1: number; x2: number; y2: number }[]
  ): void {
    // Find bounding box from outer walls (first 4)
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

    // Course green
    ctx.fillStyle = '#2d7a3a';
    ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

    // Border
    ctx.strokeStyle = '#1e5c2a';
    ctx.lineWidth = 3;
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

    // Grass texture (subtle horizontal lines)
    ctx.strokeStyle = 'rgba(50, 140, 60, 0.3)';
    ctx.lineWidth = 1;
    for (let y = minY; y < maxY; y += 12) {
      ctx.beginPath();
      ctx.moveTo(minX, y);
      ctx.lineTo(maxX, y);
      ctx.stroke();
    }
  }

  private drawHole(ctx: CanvasRenderingContext2D, state: GolfState): void {
    const course = COURSES[state.currentHole];
    const hole = course.hole;

    // Dark circle
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(hole.pos.x, hole.pos.y, hole.radius, 0, Math.PI * 2);
    ctx.fill();

    // Rim
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hole.pos.x, hole.pos.y, hole.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Flag pole
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hole.pos.x, hole.pos.y);
    ctx.lineTo(hole.pos.x, hole.pos.y - 40);
    ctx.stroke();

    // Red flag
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

    // Shadow (flattened ellipse, offset down-right)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(
      ball.pos.x + 2,
      ball.pos.y + 3,
      ball.radius,
      ball.radius * 0.6,
      0, 0, Math.PI * 2
    );
    ctx.fill();

    // Ball with radial gradient
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

    // Thin outline
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(ball.pos.x, ball.pos.y, ball.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}
```

**Visual details:**
- The green uses horizontal lines to simulate mowed grass
- The ball gradient has its bright spot offset up-left, matching the shadow offset down-right
- The flag is a simple triangle anchored to the pole top

---

### 4. Create Game Engine

**File:** `src/games/golf/GolfEngine.ts`

Initialize state, center the course, and run the render loop:

```typescript
import type { GolfState } from './types';
import { BALL_RADIUS, COURSE_WIDTH, COURSE_HEIGHT } from './types';
import { COURSES } from './data/courses';
import { GameRenderer } from './renderers/GameRenderer';

export class GolfEngine {
  private ctx: CanvasRenderingContext2D;
  private state: GolfState;
  private running: boolean;
  private rafId: number;

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
      ballMoving: false,
      holeSunk: false,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      courseOffsetX: offsetX,
      courseOffsetY: offsetY,
      courseWidth: COURSE_WIDTH,
      courseHeight: COURSE_HEIGHT,
    };

    this.gameRenderer = new GameRenderer();
  }

  start(): void {
    this.running = true;
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private loop(): void {
    if (!this.running) return;

    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    this.gameRenderer.render(this.ctx, this.state);
  }
}
```

No physics or input yet. The loop just renders so you can see the course.

---

### 5. Create Platform Adapter

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

---

### 6. Create Game Export

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
   - Dark background with green rectangle centered on screen
   - Horizontal grass-texture lines across the green
   - Dark hole circle with grey rim near the top
   - Flag pole with red triangle flag
   - White ball near the bottom with gradient highlight and offset shadow
   - Everything stays centered if you resize the window

---

## Challenges

**Easy:**
- Change the green color to a lighter shade
- Make the ball larger (10px radius)
- Move the hole to the center of the course

**Medium:**
- Add a second flag color that alternates per hole
- Draw a subtle grid pattern instead of horizontal lines
- Add a pulsing glow around the hole

**Hard:**
- Animate the flag waving with a sine wave
- Add a minimap in the corner showing ball and hole positions
- Draw the ball shadow size based on distance from hole (closer = smaller, as if ball is "lower")

---

## What You Learned

- Centering a fixed-size play area with offset translation
- Drawing grass texture with repeated horizontal strokes
- Using radial gradients for a 3D ball appearance
- Creating depth with ellipse shadows
- Building a flag from simple line and triangle primitives

**Next:** Drag-to-putt aiming input!
