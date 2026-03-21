# Step 2: Drag-to-Putt

**Goal:** Click and drag away from the ball to aim. A power line shows direction and strength. Release to putt.

**Time:** ~15 minutes

---

## What You'll Build

Input and aiming system:
- **Click near ball** to start aiming
- **Drag away** from the ball to set direction and power
- **Power line** visualizes the shot (dotted line, color-coded)
- **Power indicator** ring and percentage label
- **Release** to apply velocity to the ball

---

## Concepts

- **Reverse Aim**: You drag *away* from the target, like pulling back a slingshot. The ball goes the *opposite* direction.
- **Power from Distance**: The further you drag, the harder the putt. Capped at a maximum.
- **Angle Calculation**: `Math.atan2(dy, dx)` gives the direction from drag end to drag start.
- **Screen vs Course Coordinates**: Aim input uses screen coordinates. Ball position is in course coordinates plus offset.

---

## Code

### 1. Update Types

**File:** `src/contexts/canvas2d/games/golf/types.ts`

Add aiming state and power constants:

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
```

New fields: `aiming`, `aimStart`, `aimEnd`. New constants: `MAX_POWER` (velocity cap), `POWER_SCALE` (converts drag pixels to velocity).

---

### 2. Create Input System

**File:** `src/contexts/canvas2d/games/golf/systems/InputSystem.ts`

Handle mouse down, move, and up to drive the aim-and-putt flow:

```typescript
import type { GolfState, Vec2 } from '../types';

export class InputSystem {
  private canvas: HTMLCanvasElement;
  private state: GolfState;

  private mouseDownHandler: (e: MouseEvent) => void;
  private mouseMoveHandler: (e: MouseEvent) => void;
  private mouseUpHandler: (e: MouseEvent) => void;

  constructor(
    canvas: HTMLCanvasElement,
    state: GolfState,
    onPutt: (power: number, angle: number) => void
  ) {
    this.canvas = canvas;
    this.state = state;

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
    if (s.ballMoving || s.holeSunk) return;

    // Ball position in screen coordinates
    const ballScreenX = s.ball.pos.x + s.courseOffsetX;
    const ballScreenY = s.ball.pos.y + s.courseOffsetY;

    const dx = pos.x - ballScreenX;
    const dy = pos.y - ballScreenY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Must click within 40px of the ball
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

    // Direction is from aimEnd back toward aimStart (opposite of drag)
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
  }

  detach(): void {
    this.canvas.removeEventListener('mousedown', this.mouseDownHandler);
    this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
    this.canvas.removeEventListener('mouseup', this.mouseUpHandler);
  }
}
```

**Key detail:** The putt direction vector is `aimStart - aimEnd`, which is the *opposite* of the drag direction. Drag down-left, ball goes up-right. This is the slingshot metaphor.

---

### 3. Add Aim Line to Renderer

**File:** `src/contexts/canvas2d/games/golf/renderers/GameRenderer.ts`

Add the `drawAimLine` method and call it after restoring the context (aim line uses screen coordinates):

```typescript
import type { GolfState } from '../types';
import { COURSES } from '../data/courses';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: GolfState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(state.courseOffsetX, state.courseOffsetY);

    const course = COURSES[state.currentHole];

    this.drawGreen(ctx, course.walls);
    this.drawHole(ctx, state);
    this.drawBall(ctx, state);

    ctx.restore();

    // Aim line drawn in screen coordinates (after ctx.restore)
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

    // Drag vector (from end back to start = putt direction)
    const dx = start.x - end.x;
    const dy = start.y - end.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const power = Math.min(dist, 200);
    const powerRatio = power / 200;

    // Ball position in screen space
    const ballScreenX = state.ball.pos.x + state.courseOffsetX;
    const ballScreenY = state.ball.pos.y + state.courseOffsetY;

    // Aim line extends from ball in the putt direction
    const angle = Math.atan2(dy, dx);
    const lineLen = 30 + powerRatio * 80;
    const endX = ballScreenX + Math.cos(angle) * lineLen;
    const endY = ballScreenY + Math.sin(angle) * lineLen;

    // Color: green (low power) -> yellow -> red (high power)
    const r = Math.floor(255 * powerRatio);
    const g = Math.floor(255 * (1 - powerRatio));
    const color = `rgb(${r}, ${g}, 50)`;

    // Dotted aim line
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ballScreenX, ballScreenY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Power ring around ball
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ballScreenX, ballScreenY, 15 + powerRatio * 15, 0, Math.PI * 2);
    ctx.stroke();

    // Power percentage label
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

### 4. Update Game Engine

**File:** `src/contexts/canvas2d/games/golf/GolfEngine.ts`

Wire the input system and the putt callback:

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
import { GameRenderer } from './renderers/GameRenderer';

export class GolfEngine {
  private ctx: CanvasRenderingContext2D;
  private state: GolfState;
  private running: boolean;
  private rafId: number;

  private inputSystem: InputSystem;
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

    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    this.gameRenderer.render(this.ctx, this.state);
  }
}
```

The `putt` method converts the raw drag distance into a scaled velocity vector. `POWER_SCALE = 0.08` and `MAX_POWER = 18` cap the speed so the ball cannot be launched unreasonably fast.

The ball does not move yet because there is no physics update. We set `ballMoving = true` and apply velocity, but nobody reads those values in the loop. That comes in step 3.

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Golf"
3. **Observe:**
   - Click near the ball (within 40px) and hold
   - Drag away from the ball in any direction
   - A dotted line extends from the ball in the *opposite* direction of your drag
   - The line and ring change from green to red as you drag further
   - A percentage label shows power
   - Release the mouse. The aim line disappears and stroke count increments
   - The ball does not move yet (physics are next step)

---

## Challenges

**Easy:**
- Change the maximum drag distance from 200 to 300
- Make the aim line solid instead of dotted
- Change the power ring to a square

**Medium:**
- Add a predicted trajectory arc (draw 5 dots along the shot path)
- Show the drag line from ball to mouse as well (faint, separate from aim line)
- Add haptic feedback (vibrate on mobile) when power exceeds 80%

**Hard:**
- Add touch input support alongside mouse (touchstart, touchmove, touchend)
- Implement a two-click aim system: first click sets direction, second sets power
- Draw a miniature power meter bar next to the ball instead of a ring

---

## What You Learned

- Reverse-aim slingshot input pattern
- Converting drag distance to power with scaling and capping
- Using `Math.atan2` for angle from a direction vector
- Drawing dotted lines with `ctx.setLineDash`
- Color interpolation for power feedback (green to red)

**Next:** Ball physics with friction!
