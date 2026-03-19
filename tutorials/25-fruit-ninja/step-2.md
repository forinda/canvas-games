# Step 2: Mouse Trail & Slicing

**Goal:** Track mouse movement as a glowing blade trail. Detect the trail intersecting a fruit using line-circle intersection. Split sliced fruits into two falling halves.

**Time:** ~15 minutes

---

## What You'll Build

Building on Step 1:
- **Mouse input tracking**: Record mousedown, mousemove, mouseup to know when the player is swiping
- **Blade trail**: Store recent mouse positions with timestamps, draw them as a fading white line
- **Line-circle intersection**: Test whether the last trail segment crosses any fruit's bounding circle
- **Fruit halves**: When sliced, remove the whole fruit and spawn two half-circles that tumble away

---

## Concepts

- **Trail as Time-Stamped Points**: Each point stores `{ x, y, time }`. Points older than 150 ms are pruned, creating a natural fade.
- **Segment-Circle Intersection**: Parameterize the line segment as `P(t) = P1 + t * (P2 - P1)` where `t` is in `[0, 1]`. Solve the quadratic for where this line's distance from the circle center equals the radius.
- **Perpendicular Split Velocity**: When a fruit is sliced, each half flies away perpendicular to the blade direction. This uses `atan2` to find the blade angle and then offsets by 90 degrees.

---

## Code

### 1. Expand the Types

**File:** `src/games/fruit-ninja/types.ts`

Add types for halves, trail points, and mouse state:

```typescript
/** Fruit Ninja — shared types and constants */

export interface FruitType {
  name: string;
  color: string;
  innerColor: string;
  icon: string;
  radius: number;
  points: number;
}

export interface Fruit {
  type: FruitType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  sliced: boolean;
  isBomb: boolean;
  /** Unique id for tracking */
  id: number;
}

export interface FruitHalf {
  type: FruitType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  isBomb: boolean;
  /** Which half: -1 = left, 1 = right */
  side: -1 | 1;
  alpha: number;
}

export interface SlicePoint {
  x: number;
  y: number;
  time: number;
}

export interface SliceTrail {
  points: SlicePoint[];
}

export interface FruitNinjaState {
  fruits: Fruit[];
  halves: FruitHalf[];
  trail: SliceTrail;
  score: number;
  gameOver: boolean;
  started: boolean;
  /** Next fruit id counter */
  nextId: number;
  /** Timer until next fruit launch wave */
  launchTimer: number;
  /** Current difficulty wave */
  wave: number;
  /** Canvas dimensions cached */
  width: number;
  height: number;
  /** Mouse state for input */
  mouseDown: boolean;
  mouseX: number;
  mouseY: number;
}

// ——— Constants ———

export const GRAVITY = 980;
export const FRUIT_RADIUS = 30;
export const TRAIL_LIFETIME = 150; // ms a trail point lives
export const LAUNCH_INTERVAL_MIN = 0.8;
export const LAUNCH_INTERVAL_MAX = 2.0;
```

**What changed:**
- `FruitHalf` stores a `side` (-1 or 1) to know which half-circle to draw and an `alpha` that fades over time.
- `SlicePoint` timestamps every mouse position. `SliceTrail` wraps the array.
- `mouseDown`, `mouseX`, `mouseY` let systems know the current input state.

---

### 2. Create the Input System

**File:** `src/games/fruit-ninja/systems/InputSystem.ts`

Track mouse/touch input and manage the trail:

```typescript
import type { FruitNinjaState, SlicePoint } from '../types';
import { TRAIL_LIFETIME } from '../types';

export class InputSystem {
  private state: FruitNinjaState;
  private canvas: HTMLCanvasElement;

  private boundMouseDown = this.handleMouseDown.bind(this);
  private boundMouseMove = this.handleMouseMove.bind(this);
  private boundMouseUp = this.handleMouseUp.bind(this);
  private boundKeyDown = this.handleKeyDown.bind(this);

  constructor(state: FruitNinjaState, canvas: HTMLCanvasElement) {
    this.state = state;
    this.canvas = canvas;
  }

  attach(): void {
    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    this.canvas.addEventListener('mouseup', this.boundMouseUp);
    window.addEventListener('keydown', this.boundKeyDown);
  }

  detach(): void {
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('mouseup', this.boundMouseUp);
    window.removeEventListener('keydown', this.boundKeyDown);
  }

  /** Prune old trail points — call every frame */
  pruneTrail(): void {
    const now = performance.now();
    this.state.trail.points = this.state.trail.points.filter(
      (p) => now - p.time < TRAIL_LIFETIME,
    );
  }

  /** Convert clientX/Y to canvas-space, accounting for CSS scaling */
  private getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * this.canvas.width,
      y: ((clientY - rect.top) / rect.height) * this.canvas.height,
    };
  }

  private addTrailPoint(x: number, y: number): void {
    const point: SlicePoint = { x, y, time: performance.now() };
    this.state.trail.points.push(point);
  }

  private handleMouseDown(e: MouseEvent): void {
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.state.mouseDown = true;
    this.state.mouseX = pos.x;
    this.state.mouseY = pos.y;
    this.state.trail.points = [];
    this.addTrailPoint(pos.x, pos.y);

    if (!this.state.started) {
      this.state.started = true;
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.state.mouseX = pos.x;
    this.state.mouseY = pos.y;
    if (this.state.mouseDown) {
      this.addTrailPoint(pos.x, pos.y);
    }
  }

  private handleMouseUp(_e: MouseEvent): void {
    this.state.mouseDown = false;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'p' || e.key === 'P') {
      // We will add pause support in Step 5
    }
  }
}
```

**What's happening:**
- On `mousedown`, we clear the old trail and start a fresh one. This ensures each swipe is independent.
- On `mousemove` (while mouse is held), we append a new timestamped point.
- `pruneTrail()` is called every frame (from the engine) to remove points older than 150 ms. This makes the trail visually fade as old segments disappear.
- `getCanvasPos()` divides by the bounding rect dimensions and multiplies by canvas dimensions. This handles CSS scaling and HiDPI displays correctly.

---

### 3. Create the Slice System

**File:** `src/games/fruit-ninja/systems/SliceSystem.ts`

Check for trail-fruit intersections and spawn halves:

```typescript
import type { FruitNinjaState, FruitHalf } from '../types';

export class SliceSystem {
  update(state: FruitNinjaState, dt: number): void {
    const dtSec = dt;

    // Update halves physics
    for (const half of state.halves) {
      half.x += half.vx * dtSec;
      half.vy += 980 * dtSec;
      half.y += half.vy * dtSec;
      half.rotation += half.rotationSpeed * dtSec;
      half.alpha -= dtSec * 0.5;
    }

    // Remove faded or off-screen halves
    state.halves = state.halves.filter((h) => h.alpha > 0 && h.y < state.height + 200);

    // Check slicing only when mouse is down and we have trail points
    if (!state.mouseDown) return;
    const trail = state.trail.points;
    if (trail.length < 2) return;

    // Use last two trail points as the slice segment
    const p1 = trail[trail.length - 2];
    const p2 = trail[trail.length - 1];

    for (const fruit of state.fruits) {
      if (fruit.sliced) continue;

      const r = fruit.type.radius;
      if (this.segmentIntersectsCircle(p1.x, p1.y, p2.x, p2.y, fruit.x, fruit.y, r)) {
        fruit.sliced = true;

        // Score
        state.score += fruit.type.points;

        // Spawn halves
        const sliceAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const perpX = Math.cos(sliceAngle + Math.PI / 2) * 60;
        const perpY = Math.sin(sliceAngle + Math.PI / 2) * 60;

        const halfBase = {
          type: fruit.type,
          x: fruit.x,
          y: fruit.y,
          rotation: fruit.rotation,
          rotationSpeed: fruit.rotationSpeed,
          isBomb: false,
          alpha: 1,
        };

        const leftHalf: FruitHalf = {
          ...halfBase,
          vx: fruit.vx - perpX,
          vy: fruit.vy - Math.abs(perpY),
          rotationSpeed: -4 - Math.random() * 3,
          side: -1,
        };
        const rightHalf: FruitHalf = {
          ...halfBase,
          vx: fruit.vx + perpX,
          vy: fruit.vy - Math.abs(perpY),
          rotationSpeed: 4 + Math.random() * 3,
          side: 1,
        };

        state.halves.push(leftHalf, rightHalf);
      }
    }
  }

  /**
   * Test if line segment (x1,y1)-(x2,y2) intersects circle at (cx,cy) with radius r.
   *
   * Parameterize the segment as P(t) = P1 + t*(P2-P1), where t is in [0,1].
   * Substitute into the circle equation |P(t) - C|^2 = r^2 and solve the quadratic.
   */
  private segmentIntersectsCircle(
    x1: number, y1: number,
    x2: number, y2: number,
    cx: number, cy: number,
    r: number,
  ): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const fx = x1 - cx;
    const fy = y1 - cy;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;

    let discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return false;

    discriminant = Math.sqrt(discriminant);
    const t1 = (-b - discriminant) / (2 * a);
    const t2 = (-b + discriminant) / (2 * a);

    // Intersection if either root is in [0,1] or if the segment is fully inside the circle
    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
  }
}
```

**What's happening:**
- We only test the **last two** trail points — the freshest segment. This prevents a single fruit from being sliced multiple times by older parts of the trail.
- `segmentIntersectsCircle` is the mathematical heart of slicing. It builds a quadratic `at^2 + bt + c = 0` from the segment and circle, then checks if any solution `t` falls in `[0, 1]`. The final `t1 < 0 && t2 > 1` case catches when the segment is entirely inside the circle.
- The slice angle comes from `atan2(dy, dx)` between the two trail points. We offset 90 degrees (`+ PI/2`) to get the perpendicular direction, then push each half away along that perpendicular.
- `Math.abs(perpY)` ensures both halves get a slight upward boost, making the split feel punchy rather than limp.
- Halves fade by reducing `alpha` by 0.5 per second. At that rate they last 2 seconds before disappearing.

---

### 4. Update the Game Renderer

**File:** `src/games/fruit-ninja/renderers/GameRenderer.ts`

Add trail drawing and half-fruit rendering:

```typescript
import type { FruitNinjaState } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: FruitNinjaState): void {
    const W = state.width;
    const H = state.height;

    // Wooden background
    this.drawBackground(ctx, W, H);

    // Fruit halves (behind active fruits)
    this.drawHalves(ctx, state);

    // Active fruits
    this.drawFruits(ctx, state);

    // Slice trail
    this.drawTrail(ctx, state);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#5d3a1a');
    grad.addColorStop(0.5, '#7a4a25');
    grad.addColorStop(1, '#4a2c10');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      const y = (i / 30) * H + Math.sin(i * 0.7) * 10;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < W; x += 20) {
        ctx.lineTo(x, y + Math.sin(x * 0.01 + i) * 5);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawFruits(ctx: CanvasRenderingContext2D, state: FruitNinjaState): void {
    for (const fruit of state.fruits) {
      if (fruit.sliced) continue;

      ctx.save();
      ctx.translate(fruit.x, fruit.y);
      ctx.rotate(fruit.rotation);

      const r = fruit.type.radius;

      // Fruit outer skin
      ctx.fillStyle = fruit.type.color;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Inner highlight
      ctx.fillStyle = fruit.type.innerColor;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(-r * 0.15, -r * 0.15, r * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Shine spot
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(-r * 0.25, -r * 0.3, r * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Leaf
      ctx.fillStyle = '#2e7d32';
      ctx.beginPath();
      ctx.ellipse(0, -r + 2, 5, 10, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // Stem
      ctx.strokeStyle = '#5d3a1a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -r + 2);
      ctx.lineTo(0, -r - 4);
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawHalves(ctx: CanvasRenderingContext2D, state: FruitNinjaState): void {
    for (const half of state.halves) {
      ctx.save();
      ctx.translate(half.x, half.y);
      ctx.rotate(half.rotation);
      ctx.globalAlpha = Math.max(0, half.alpha);

      const r = half.type.radius;

      // Draw half circle — left side or right side
      ctx.beginPath();
      if (half.side === -1) {
        ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
      } else {
        ctx.arc(0, 0, r, Math.PI / 2, -Math.PI / 2);
      }
      ctx.closePath();

      // Outer color (skin)
      ctx.fillStyle = half.type.color;
      ctx.fill();

      // Inner flesh
      ctx.beginPath();
      if (half.side === -1) {
        ctx.arc(0, 0, r * 0.75, -Math.PI / 2, Math.PI / 2);
      } else {
        ctx.arc(0, 0, r * 0.75, Math.PI / 2, -Math.PI / 2);
      }
      ctx.closePath();
      ctx.fillStyle = half.type.innerColor;
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  private drawTrail(ctx: CanvasRenderingContext2D, state: FruitNinjaState): void {
    const points = state.trail.points;
    if (points.length < 2) return;

    const now = performance.now();

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const age = now - p1.time;
      const alpha = Math.max(0, 1 - age / 150);

      if (alpha <= 0) continue;

      ctx.globalAlpha = alpha;

      // Outer glow
      ctx.strokeStyle = 'rgba(200,220,255,0.5)';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();

      // Inner bright line
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
```

**What's happening:**
- Halves are drawn **behind** active fruits so they don't obscure incoming targets.
- Each half is a semicircle. `side === -1` draws the arc from -90 to +90 degrees (left half), and `side === 1` draws from +90 to -90 degrees (right half). `closePath()` adds the flat diameter edge.
- Inside the half, a smaller semicircle in `innerColor` shows the flesh — watermelon halves show red inside green.
- The trail draws each segment individually with an alpha based on age. The two-pass approach (wide translucent blue, then thin bright white) creates a glowing blade effect.
- `lineCap = 'round'` prevents ugly square ends on short segments.

---

### 5. Update the Engine

**File:** `src/games/fruit-ninja/FruitNinjaEngine.ts`

Wire in the InputSystem and SliceSystem:

```typescript
import type { FruitNinjaState } from './types';
import { LAUNCH_INTERVAL_MAX } from './types';
import { InputSystem } from './systems/InputSystem';
import { FruitSystem } from './systems/FruitSystem';
import { SliceSystem } from './systems/SliceSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class FruitNinjaEngine {
  private ctx: CanvasRenderingContext2D;
  private state: FruitNinjaState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private fruitSystem: FruitSystem;
  private sliceSystem: SliceSystem;
  private gameRenderer: GameRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = {
      fruits: [],
      halves: [],
      trail: { points: [] },
      score: 0,
      gameOver: false,
      started: true,
      nextId: 0,
      launchTimer: LAUNCH_INTERVAL_MAX,
      wave: 0,
      width: canvas.width,
      height: canvas.height,
      mouseDown: false,
      mouseX: 0,
      mouseY: 0,
    };

    this.fruitSystem = new FruitSystem();
    this.sliceSystem = new SliceSystem();
    this.gameRenderer = new GameRenderer();
    this.inputSystem = new InputSystem(this.state, canvas);

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

    if (!this.state.gameOver) {
      this.fruitSystem.update(this.state, dt);
      this.sliceSystem.update(this.state, dt);
    }

    this.inputSystem.pruneTrail();
    this.gameRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

**What changed from Step 1:**
- State now includes `halves`, `trail`, and mouse fields.
- `InputSystem` is created, attached, and detached on destroy.
- `SliceSystem` is updated each frame after `FruitSystem`.
- `pruneTrail()` runs every frame (even when paused) so the visual trail always fades properly.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Fruit Ninja game
3. **Observe:**
   - Click and drag across the screen — a glowing white blade trail follows your mouse
   - When the trail crosses a fruit, it splits into two colored halves
   - Halves tumble apart in opposite directions and fade out
   - The flat side of each half shows the inner flesh color
   - Score increases in the top-left corner
   - Release the mouse and the trail fades away

**Swipe through multiple fruits in a row.** Each one should split independently with its own pair of halves flying in different directions.

---

## Try It

- Change `TRAIL_LIFETIME` to `500` for a long, dramatic trail.
- Set the perpendicular force to `200` (change the `60` in SliceSystem) for explosive splits.
- Add `console.log('HIT', fruit.type.name)` in the intersection check to see which fruits you are slicing.

---

## Challenges

**Easy:**
- Change the trail color from white to red.
- Make the halves last longer by changing the alpha decay rate from `0.5` to `0.2`.
- Draw a score popup (`+1`) at the fruit's position when sliced (hint: add a temporary text object).

**Medium:**
- Add a "whoosh" sound effect by creating an `AudioContext` oscillator on each slice.
- Make the trail thicker when the mouse moves faster (calculate speed from last two points).

**Hard:**
- Instead of two halves, split into 3 or 4 pieces for watermelons (use smaller arc slices).
- Implement touch input alongside mouse input so the game works on mobile (listen for `touchstart`, `touchmove`, `touchend`).

---

## What You Learned

- Mouse event tracking with `mousedown` / `mousemove` / `mouseup`
- Canvas-space coordinate conversion for CSS-scaled canvases
- Time-stamped trail points with automatic pruning
- Line-segment-to-circle intersection using the quadratic formula
- Perpendicular velocity calculation with `atan2` for directional splits
- Half-circle rendering with `arc()` start/end angles and `closePath()`
- Two-pass trail rendering (wide glow + thin core) for a blade effect

**Next:** Juice splash particles and combo bonuses for multi-slice swipes!
