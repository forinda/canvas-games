# Step 1: Circles & Shrinking Rings

**Goal:** Spawn target circles at random positions with an outer ring that shrinks toward the center.

**Time:** ~15 minutes

---

## What You'll Build

- **Dark radial-gradient background** with a subtle purple grid pattern
- **Target circles** that appear at random positions with a filled inner circle and border
- **Shrinking outer rings** that start large and contract toward the inner circle over 1.5 seconds
- **Crosshair markers** in the center of each circle for visual targeting
- **Auto-despawn** when the outer ring shrinks past the inner circle (missed)

---

## Concepts

- **Shrink-to-Target Pattern**: An outer ring starts at `radius * 3` and shrinks at a constant rate. The player must click when the ring aligns with the inner circle.
- **Timed Spawning**: New circles appear at intervals, with the interval calculated per spawn.
- **Radial Gradient Background**: `createRadialGradient` adds depth to the arena.
- **Dynamic Color**: Circle color changes based on how close the outer ring is to the target (far = purple, close = green).

---

## Code

### 1. Create Types

**File:** `src/contexts/canvas2d/games/rhythm-tap/types.ts`

Define the state, circle interface, and all game constants.

```typescript
export type TimingGrade = 'Perfect' | 'Good' | 'OK' | 'Miss';

export interface Circle {
  x: number;
  y: number;
  radius: number;
  outerRadius: number;
  shrinkRate: number;
  spawnTime: number;
  hit: boolean;
  missed: boolean;
  grade: TimingGrade | null;
  id: number;
}

export interface HitEffect {
  x: number;
  y: number;
  radius: number;
  grade: TimingGrade;
  alpha: number;
  scale: number;
  time: number;
}

export interface MissEffect {
  x: number;
  y: number;
  alpha: number;
  time: number;
}

export interface RhythmState {
  circles: Circle[];
  hitEffects: HitEffect[];
  missEffects: MissEffect[];
  score: number;
  highScore: number;
  combo: number;
  maxCombo: number;
  multiplier: number;
  totalHits: number;
  perfectHits: number;
  goodHits: number;
  okHits: number;
  totalMisses: number;
  timeRemaining: number;
  gameOver: boolean;
  started: boolean;
  paused: boolean;
  nextId: number;
  spawnTimer: number;
  width: number;
  height: number;
  pendingClick: { x: number; y: number } | null;
}

export const ROUND_DURATION = 60;
export const CIRCLE_RADIUS = 35;
export const OUTER_RING_MULTIPLIER = 3;
export const SHRINK_DURATION = 1.5;
export const SPAWN_INTERVAL_MIN = 0.4;
export const SPAWN_INTERVAL_MAX = 1.2;
export const SPAWN_MARGIN = 80;
export const PERFECT_THRESHOLD = 8;
export const GOOD_THRESHOLD = 20;
export const OK_THRESHOLD = 35;
export const GRADE_POINTS: Record<TimingGrade, number> = {
  Perfect: 300,
  Good: 100,
  OK: 50,
  Miss: 0,
};
export const COMBO_MULTIPLIER_TIERS: [number, number][] = [
  [30, 8], [20, 4], [10, 3], [5, 2], [0, 1],
];
export const HS_KEY = 'rhythm-tap-hs';
export const HIT_EFFECT_DURATION = 0.6;
export const MISS_EFFECT_DURATION = 0.8;
```

**What's happening:**
- `Circle` stores position, inner radius, current outer radius, and shrink rate. `hit`/`missed` flags track state.
- `OUTER_RING_MULTIPLIER = 3` means the ring starts at 3x the target radius (105px for a 35px circle).
- `SHRINK_DURATION = 1.5` seconds for the ring to collapse. The player has a ~1.5s window per circle.

---

### 2. Create the Circle System

**File:** `src/contexts/canvas2d/games/rhythm-tap/systems/CircleSystem.ts`

Handles spawning, shrinking, and auto-despawning circles.

```typescript
import type { RhythmState, Circle } from '../types';
import {
  CIRCLE_RADIUS,
  OUTER_RING_MULTIPLIER,
  SHRINK_DURATION,
  SPAWN_INTERVAL_MAX,
  SPAWN_MARGIN,
} from '../types';

export class CircleSystem {
  update(state: RhythmState, dt: number): void {
    const dtSec = dt / 1000;

    // Spawn new circles
    this.handleSpawning(state, dtSec);

    // Shrink existing circles
    for (const circle of state.circles) {
      if (circle.hit || circle.missed) continue;
      circle.outerRadius -= circle.shrinkRate * dtSec;
    }

    // Remove expired circles (outer ring shrank past inner)
    const toRemove: number[] = [];
    for (let i = 0; i < state.circles.length; i++) {
      const circle = state.circles[i];
      if (circle.hit) {
        toRemove.push(i);
        continue;
      }
      if (!circle.missed && circle.outerRadius <= circle.radius * 0.3) {
        circle.missed = true;
        state.totalMisses += 1;
        toRemove.push(i);
      }
    }
    for (let i = toRemove.length - 1; i >= 0; i--) {
      state.circles.splice(toRemove[i], 1);
    }
  }

  private handleSpawning(state: RhythmState, dtSec: number): void {
    state.spawnTimer -= dtSec;
    if (state.spawnTimer <= 0) {
      this.spawnCircle(state);
      state.spawnTimer = SPAWN_INTERVAL_MAX;
    }
  }

  private spawnCircle(state: RhythmState): void {
    const margin = SPAWN_MARGIN;
    const x = margin + Math.random() * (state.width - margin * 2);
    const y = margin + Math.random() * (state.height - margin * 2);

    const circle: Circle = {
      x,
      y,
      radius: CIRCLE_RADIUS,
      outerRadius: CIRCLE_RADIUS * OUTER_RING_MULTIPLIER,
      shrinkRate: (CIRCLE_RADIUS * (OUTER_RING_MULTIPLIER - 1)) / SHRINK_DURATION,
      spawnTime: performance.now(),
      hit: false,
      missed: false,
      grade: null,
      id: state.nextId,
    };
    state.nextId += 1;
    state.circles.push(circle);
  }
}
```

**What's happening:**
- `shrinkRate` is calculated so the outer ring reaches the inner circle in exactly `SHRINK_DURATION` seconds.
- When `outerRadius` drops below `radius * 0.3`, the circle is considered missed and removed.
- For now, spawn interval is fixed at `SPAWN_INTERVAL_MAX`. Step 4 will make it dynamic.

---

### 3. Create the Game Renderer

**File:** `src/contexts/canvas2d/games/rhythm-tap/renderers/GameRenderer.ts`

Draw the background and circles with dynamic coloring.

```typescript
import type { RhythmState } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: RhythmState): void {
    const W = state.width;
    const H = state.height;

    this.drawBackground(ctx, W, H);
    this.drawCircles(ctx, state);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(1, '#0d0d1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    ctx.globalAlpha = 0.04;
    ctx.strokeStyle = '#e040fb';
    ctx.lineWidth = 1;
    const spacing = 60;
    for (let x = 0; x < W; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawCircles(ctx: CanvasRenderingContext2D, state: RhythmState): void {
    for (const circle of state.circles) {
      if (circle.hit || circle.missed) continue;

      const gap = Math.abs(circle.outerRadius - circle.radius);
      const color = this.getCircleColor(gap);

      // Inner target circle (filled)
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.25;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Inner circle border
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Outer shrinking ring
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.outerRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshair in center
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4;
      const cr = circle.radius * 0.4;
      ctx.beginPath();
      ctx.moveTo(circle.x - cr, circle.y);
      ctx.lineTo(circle.x + cr, circle.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(circle.x, circle.y - cr);
      ctx.lineTo(circle.x, circle.y + cr);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  private getCircleColor(gap: number): string {
    if (gap <= 8) return '#00e676';   // Perfect range - green
    if (gap <= 20) return '#ffeb3b';  // Good range - yellow
    if (gap <= 35) return '#ff9800';  // OK range - orange
    return '#e040fb';                  // Far away - purple
  }
}
```

**What's happening:**
- The background uses a radial gradient from dark purple to near-black, with a faint purple grid overlay.
- Each circle has three visual layers: a translucent filled inner circle, a solid inner border, and the thick outer ring.
- The color dynamically changes based on the gap between the outer ring and the inner circle. This teaches the player the timing visually.
- A small crosshair in the center provides a precise targeting point.

---

### 4. Create the Engine

**File:** `src/contexts/canvas2d/games/rhythm-tap/RhythmEngine.ts`

Wire the circle system and renderer together.

```typescript
import type { RhythmState } from './types';
import { ROUND_DURATION, SPAWN_INTERVAL_MAX } from './types';
import { CircleSystem } from './systems/CircleSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class RhythmEngine {
  private ctx: CanvasRenderingContext2D;
  private state: RhythmState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private circleSystem: CircleSystem;
  private gameRenderer: GameRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = {
      circles: [],
      hitEffects: [],
      missEffects: [],
      score: 0,
      highScore: 0,
      combo: 0,
      maxCombo: 0,
      multiplier: 1,
      totalHits: 0,
      perfectHits: 0,
      goodHits: 0,
      okHits: 0,
      totalMisses: 0,
      timeRemaining: ROUND_DURATION,
      gameOver: false,
      started: true,       // auto-start for this step
      paused: false,
      nextId: 0,
      spawnTimer: SPAWN_INTERVAL_MAX,
      width: canvas.width,
      height: canvas.height,
      pendingClick: null,
    };

    this.circleSystem = new CircleSystem();
    this.gameRenderer = new GameRenderer();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.width = canvas.width;
      this.state.height = canvas.height;
    };
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
    window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const dt = Math.min(now - this.lastTime, 50);
    this.lastTime = now;

    this.circleSystem.update(this.state, dt);
    this.gameRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

---

### 5. Create the Entry Point

**File:** `src/contexts/canvas2d/games/rhythm-tap/index.ts`

```typescript
import { RhythmEngine } from './RhythmEngine';

export function createRhythmTap(canvas: HTMLCanvasElement): { destroy: () => void } {
  const engine = new RhythmEngine(canvas);
  engine.start();
  return { destroy: () => engine.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Rhythm Tap game
3. **Observe:**
   - Dark purple background with a faint grid pattern
   - Circles spawn at random positions every ~1.2 seconds
   - Each circle has a large outer ring that **shrinks toward the center**
   - The circle color changes from purple to orange to yellow to green as the ring approaches
   - When the ring shrinks past the inner circle, the circle disappears (missed)
   - New circles keep spawning continuously

---

## Challenges

**Easy:**
- Change `CIRCLE_RADIUS` to 50 for larger, easier targets.
- Change the grid color from purple to blue.

**Medium:**
- Add a pulsing animation to the inner circle (scale it slightly with `Math.sin`).
- Draw a faint trail behind the shrinking ring.

**Hard:**
- Make the shrink duration random per circle (between 1.0 and 2.0 seconds).

---

## What You Learned

- Creating a shrink-to-target timing mechanic
- Using radial gradients for atmospheric backgrounds
- Dynamic color coding based on proximity/timing
- Timer-based entity spawning with configurable intervals
- Drawing crosshair markers for precise visual targeting

**Next:** Click detection and timing grades -- tap circles for Perfect, Good, OK, or Miss!
