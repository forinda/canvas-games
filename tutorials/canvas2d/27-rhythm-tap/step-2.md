# Step 2: Click Detection & Timing Grades

**Goal:** Detect clicks on circles and grade timing as Perfect, Good, OK, or Miss based on ring alignment.

**Time:** ~15 minutes

---

## What You'll Build

- **Click/tap detection** that finds the closest circle to the click point
- **Timing grades** based on the gap between the outer ring and the inner circle
- **Grade thresholds**: Perfect (gap <= 8px), Good (<= 20px), OK (<= 35px), Miss (> 35px)
- **Visual grade text** displayed briefly above hit circles
- **Score display** showing points earned per hit

---

## Concepts

- **Distance-Based Hit Detection**: Calculate distance from click to each circle center, pick the closest within the outer ring
- **Gap Measurement**: `Math.abs(outerRadius - radius)` gives the timing accuracy
- **Threshold Grading**: Compare the gap against increasing thresholds to assign a grade
- **Pending Click Pattern**: Store the click position in state, process it in the update loop to keep input and logic decoupled

---

## Code

### 1. Create the Input System

**File:** `src/contexts/canvas2d/games/rhythm-tap/systems/InputSystem.ts`

Capture mouse clicks and touch events, convert to canvas coordinates.

```typescript
import type { RhythmState } from '../types';

export class InputSystem {
  private state: RhythmState;
  private canvas: HTMLCanvasElement;

  private boundMouseDown: (e: MouseEvent) => void;
  private boundKeyDown: (e: KeyboardEvent) => void;

  constructor(state: RhythmState, canvas: HTMLCanvasElement) {
    this.state = state;
    this.canvas = canvas;

    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.boundKeyDown = this.handleKeyDown.bind(this);
  }

  attach(): void {
    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    window.addEventListener('keydown', this.boundKeyDown);
  }

  detach(): void {
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    window.removeEventListener('keydown', this.boundKeyDown);
  }

  private getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * this.canvas.width,
      y: ((clientY - rect.top) / rect.height) * this.canvas.height,
    };
  }

  private handleMouseDown(e: MouseEvent): void {
    if (this.state.gameOver || this.state.paused) return;
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.state.pendingClick = { x: pos.x, y: pos.y };
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'p' || e.key === 'P') {
      if (this.state.started && !this.state.gameOver) {
        this.state.paused = !this.state.paused;
      }
    }
  }
}
```

**What's happening:**
- `getCanvasPos` converts client coordinates to canvas coordinates, handling CSS scaling.
- The click position is stored as `pendingClick` in state. The CircleSystem will process it on the next update.
- This decoupling keeps the input system clean -- it only captures events, never modifies game logic directly.

---

### 2. Update the Circle System

**File:** `src/contexts/canvas2d/games/rhythm-tap/systems/CircleSystem.ts`

Add click processing with timing grade calculation.

```typescript
import type { RhythmState, Circle, TimingGrade } from '../types';
import {
  CIRCLE_RADIUS,
  OUTER_RING_MULTIPLIER,
  SHRINK_DURATION,
  SPAWN_INTERVAL_MAX,
  SPAWN_MARGIN,
  PERFECT_THRESHOLD,
  GOOD_THRESHOLD,
  OK_THRESHOLD,
  GRADE_POINTS,
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

    // Process pending click
    if (state.pendingClick) {
      this.processClick(state, state.pendingClick.x, state.pendingClick.y);
      state.pendingClick = null;
    }

    // Remove expired circles
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

  private processClick(state: RhythmState, cx: number, cy: number): void {
    let bestCircle: Circle | null = null;
    let bestDist = Infinity;

    for (const circle of state.circles) {
      if (circle.hit || circle.missed) continue;
      const dx = cx - circle.x;
      const dy = cy - circle.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= circle.outerRadius && dist < bestDist) {
        bestDist = dist;
        bestCircle = circle;
      }
    }

    if (!bestCircle) return;

    const gap = Math.abs(bestCircle.outerRadius - bestCircle.radius);
    const grade = this.getTimingGrade(gap);

    bestCircle.hit = true;
    bestCircle.grade = grade;

    if (grade === 'Miss') {
      state.totalMisses += 1;
    } else {
      const points = GRADE_POINTS[grade];
      state.score += points;
      state.totalHits += 1;

      if (grade === 'Perfect') state.perfectHits += 1;
      else if (grade === 'Good') state.goodHits += 1;
      else state.okHits += 1;
    }
  }

  private getTimingGrade(gap: number): TimingGrade {
    if (gap <= PERFECT_THRESHOLD) return 'Perfect';
    if (gap <= GOOD_THRESHOLD) return 'Good';
    if (gap <= OK_THRESHOLD) return 'OK';
    return 'Miss';
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
      x, y,
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
- `processClick` finds the closest un-hit circle whose center is within the outer ring radius of the click point.
- The `gap` between outer ring and inner circle determines the grade. A gap of 5px is Perfect; a gap of 50px is Miss.
- Points are awarded immediately: 300 for Perfect, 100 for Good, 50 for OK, 0 for Miss.
- Hit counts are tracked per grade for the accuracy breakdown later.

---

### 3. Update the Renderer

**File:** `src/contexts/canvas2d/games/rhythm-tap/renderers/GameRenderer.ts`

Add score display and grade text for hits.

```typescript
import type { RhythmState, TimingGrade } from '../types';

const GRADE_COLORS: Record<TimingGrade, string> = {
  Perfect: '#00e676',
  Good: '#ffeb3b',
  OK: '#ff9800',
  Miss: '#f44336',
};

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: RhythmState): void {
    const W = state.width;
    const H = state.height;

    this.drawBackground(ctx, W, H);
    this.drawCircles(ctx, state);
    this.drawScore(ctx, state);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(1, '#0d0d1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = 0.04;
    ctx.strokeStyle = '#e040fb';
    ctx.lineWidth = 1;
    const spacing = 60;
    for (let x = 0; x < W; x += spacing) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += spacing) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawCircles(ctx: CanvasRenderingContext2D, state: RhythmState): void {
    for (const circle of state.circles) {
      if (circle.hit || circle.missed) continue;

      const gap = Math.abs(circle.outerRadius - circle.radius);
      const color = this.getCircleColor(gap);

      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.25;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.outerRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4;
      const cr = circle.radius * 0.4;
      ctx.beginPath(); ctx.moveTo(circle.x - cr, circle.y); ctx.lineTo(circle.x + cr, circle.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(circle.x, circle.y - cr); ctx.lineTo(circle.x, circle.y + cr); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  private drawScore(ctx: CanvasRenderingContext2D, state: RhythmState): void {
    ctx.save();
    ctx.font = 'bold 32px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(224,64,251,0.5)';
    ctx.shadowBlur = 8;
    ctx.fillText(`${state.score}`, 20, 20);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private getCircleColor(gap: number): string {
    if (gap <= 8) return GRADE_COLORS.Perfect;
    if (gap <= 20) return GRADE_COLORS.Good;
    if (gap <= 35) return GRADE_COLORS.OK;
    return '#e040fb';
  }
}
```

---

### 4. Update the Engine

**File:** `src/contexts/canvas2d/games/rhythm-tap/RhythmEngine.ts`

Wire in the input system.

```typescript
import type { RhythmState } from './types';
import { ROUND_DURATION, SPAWN_INTERVAL_MAX } from './types';
import { InputSystem } from './systems/InputSystem';
import { CircleSystem } from './systems/CircleSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class RhythmEngine {
  private ctx: CanvasRenderingContext2D;
  private state: RhythmState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private circleSystem: CircleSystem;
  private gameRenderer: GameRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = {
      circles: [], hitEffects: [], missEffects: [],
      score: 0, highScore: 0, combo: 0, maxCombo: 0, multiplier: 1,
      totalHits: 0, perfectHits: 0, goodHits: 0, okHits: 0, totalMisses: 0,
      timeRemaining: ROUND_DURATION,
      gameOver: false, started: true, paused: false,
      nextId: 0, spawnTimer: SPAWN_INTERVAL_MAX,
      width: canvas.width, height: canvas.height,
      pendingClick: null,
    };

    this.circleSystem = new CircleSystem();
    this.gameRenderer = new GameRenderer();
    this.inputSystem = new InputSystem(this.state, canvas);

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.width = canvas.width;
      this.state.height = canvas.height;
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
    const dt = Math.min(now - this.lastTime, 50);
    this.lastTime = now;

    if (this.state.started && !this.state.paused && !this.state.gameOver) {
      this.circleSystem.update(this.state, dt);
    }

    this.gameRenderer.render(this.ctx, this.state);
    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Rhythm Tap game
3. **Observe:**
   - Circles appear with shrinking outer rings as before
   - **Click a circle** when the ring is close -- the circle disappears and points are added
   - Click when the ring is far away -- no points (Miss grade)
   - Click when the ring is very close -- 300 points (Perfect)
   - The score displays in the top-left corner
   - Circles that shrink past the center still auto-despawn as misses

---

## Challenges

**Easy:**
- Increase `PERFECT_THRESHOLD` to 15 to make Perfect easier to achieve.
- Change the Perfect grade color from green to gold.

**Medium:**
- Display the grade text ("Perfect!", "Good!", etc.) floating above the clicked position for 0.5 seconds.

**Hard:**
- Add a brief screen flash in the grade color when hitting Perfect.

---

## What You Learned

- Distance-based click detection against circular targets
- Measuring timing accuracy as the gap between two radii
- Threshold-based grading systems (Perfect/Good/OK/Miss)
- The pending-click pattern for decoupling input from game logic
- Converting client coordinates to canvas space for accurate hit detection

**Next:** Combo system and score multiplier -- build streaks for massive points!
