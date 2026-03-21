# Step 3: Combo System & Multiplier

**Goal:** Track consecutive hits as a combo streak with tiered score multipliers.

**Time:** ~15 minutes

---

## What You'll Build

- **Combo counter** that increments on each successful hit (non-Miss)
- **Multiplier tiers** -- 5+ combo = 2x, 10+ = 3x, 20+ = 4x, 30+ = 8x
- **Combo reset** on any Miss (clicked too early or circle expired)
- **Max combo tracking** for the end-of-round stats
- **Pulsing combo display** in the center-top of the screen

---

## Concepts

- **Streak Tracking**: A single counter increments on hits and resets to 0 on misses
- **Tiered Multipliers**: A lookup table maps combo thresholds to multiplier values, checked from highest to lowest
- **Multiplied Scoring**: `GRADE_POINTS[grade] * multiplier` makes combos increasingly valuable
- **Visual Pulse**: `Math.sin(performance.now() * rate)` creates a pulsing font-size effect for the multiplier display

---

## Code

### 1. Create the Combo System

**File:** `src/contexts/canvas2d/games/rhythm-tap/systems/ComboSystem.ts`

Standalone system that manages combo state and multiplier calculation.

```typescript
import type { RhythmState, TimingGrade } from '../types';
import { COMBO_MULTIPLIER_TIERS } from '../types';

export class ComboSystem {
  registerHit(state: RhythmState, _grade: TimingGrade): void {
    state.combo += 1;
    if (state.combo > state.maxCombo) {
      state.maxCombo = state.combo;
    }
    this.updateMultiplier(state);
  }

  registerMiss(state: RhythmState): void {
    state.combo = 0;
    this.updateMultiplier(state);
  }

  private updateMultiplier(state: RhythmState): void {
    for (const [threshold, mult] of COMBO_MULTIPLIER_TIERS) {
      if (state.combo >= threshold) {
        state.multiplier = mult;
        return;
      }
    }
    state.multiplier = 1;
  }
}
```

**What's happening:**
- `registerHit` increments the combo and updates `maxCombo` if a new record is set.
- `registerMiss` resets the combo to 0 immediately.
- `updateMultiplier` iterates `COMBO_MULTIPLIER_TIERS` (sorted highest-first): `[30,8], [20,4], [10,3], [5,2], [0,1]`. The first threshold the combo meets determines the multiplier.

---

### 2. Update the Circle System

**File:** `src/contexts/canvas2d/games/rhythm-tap/systems/CircleSystem.ts`

Integrate the combo system for hits and misses, apply multiplier to scoring.

```typescript
import type { RhythmState, Circle, TimingGrade } from '../types';
import {
  CIRCLE_RADIUS, OUTER_RING_MULTIPLIER, SHRINK_DURATION,
  SPAWN_INTERVAL_MAX, SPAWN_MARGIN,
  PERFECT_THRESHOLD, GOOD_THRESHOLD, OK_THRESHOLD,
  GRADE_POINTS,
} from '../types';
import { ComboSystem } from './ComboSystem';

export class CircleSystem {
  private comboSystem: ComboSystem;

  constructor(comboSystem: ComboSystem) {
    this.comboSystem = comboSystem;
  }

  update(state: RhythmState, dt: number): void {
    const dtSec = dt / 1000;

    this.handleSpawning(state, dtSec);

    for (const circle of state.circles) {
      if (circle.hit || circle.missed) continue;
      circle.outerRadius -= circle.shrinkRate * dtSec;
    }

    if (state.pendingClick) {
      this.processClick(state, state.pendingClick.x, state.pendingClick.y);
      state.pendingClick = null;
    }

    this.removeExpired(state);
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
      this.comboSystem.registerMiss(state);
      state.totalMisses += 1;
    } else {
      this.comboSystem.registerHit(state, grade);
      const points = GRADE_POINTS[grade] * state.multiplier;
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

  private removeExpired(state: RhythmState): void {
    const toRemove: number[] = [];
    for (let i = 0; i < state.circles.length; i++) {
      const circle = state.circles[i];
      if (circle.hit) { toRemove.push(i); continue; }
      if (!circle.missed && circle.outerRadius <= circle.radius * 0.3) {
        circle.missed = true;
        state.totalMisses += 1;
        this.comboSystem.registerMiss(state);
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
      x, y, radius: CIRCLE_RADIUS,
      outerRadius: CIRCLE_RADIUS * OUTER_RING_MULTIPLIER,
      shrinkRate: (CIRCLE_RADIUS * (OUTER_RING_MULTIPLIER - 1)) / SHRINK_DURATION,
      spawnTime: performance.now(), hit: false, missed: false, grade: null, id: state.nextId,
    };
    state.nextId += 1;
    state.circles.push(circle);
  }
}
```

**What's happening:**
- The `CircleSystem` now takes a `ComboSystem` in its constructor.
- On a successful hit, `comboSystem.registerHit` is called before scoring, so the multiplier is already updated. Points are then `GRADE_POINTS[grade] * state.multiplier`.
- On a miss (either clicked too early or circle expired), `comboSystem.registerMiss` resets the combo to 0.

---

### 3. Add Combo Display to the Renderer

**File:** `src/contexts/canvas2d/games/rhythm-tap/renderers/GameRenderer.ts`

Add combo counter and multiplier display.

```typescript
import type { RhythmState, TimingGrade } from '../types';

const GRADE_COLORS: Record<TimingGrade, string> = {
  Perfect: '#00e676', Good: '#ffeb3b', OK: '#ff9800', Miss: '#f44336',
};

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: RhythmState): void {
    const W = state.width;
    const H = state.height;
    this.drawBackground(ctx, W, H);
    this.drawCircles(ctx, state);
    this.drawScore(ctx, state);
    this.drawCombo(ctx, state, W);
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
    for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }

  private drawCircles(ctx: CanvasRenderingContext2D, state: RhythmState): void {
    for (const circle of state.circles) {
      if (circle.hit || circle.missed) continue;
      const gap = Math.abs(circle.outerRadius - circle.radius);
      const color = this.getCircleColor(gap);

      ctx.beginPath(); ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.globalAlpha = 0.25; ctx.fill(); ctx.globalAlpha = 1;

      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2); ctx.stroke();

      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(circle.x, circle.y, circle.outerRadius, 0, Math.PI * 2); ctx.stroke();

      ctx.lineWidth = 1; ctx.globalAlpha = 0.4;
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

  private drawCombo(ctx: CanvasRenderingContext2D, state: RhythmState, W: number): void {
    if (state.combo < 2) return;

    ctx.save();
    const pulse = 1 + Math.sin(performance.now() * 0.008) * 0.08;
    const fontSize = Math.floor(28 * pulse);

    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    if (state.multiplier > 1) {
      ctx.fillStyle = '#ffeb3b';
      ctx.shadowColor = 'rgba(255,235,59,0.6)';
      ctx.shadowBlur = 12;
      ctx.fillText(`${state.multiplier}x`, W / 2, 20);
    }

    ctx.shadowBlur = 0;
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#e040fb';
    ctx.fillText(`${state.combo} combo`, W / 2, 52);
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

**What's happening:**
- The combo display only appears when the combo reaches 2 or higher.
- The multiplier text pulses using `Math.sin(performance.now() * 0.008)` to create a breathing effect.
- When `multiplier > 1`, a yellow glowing multiplier value (e.g., "4x") appears above the combo count.
- The combo text is purple to match the game's theme.

---

### 4. Update the Engine

**File:** `src/contexts/canvas2d/games/rhythm-tap/RhythmEngine.ts`

Create ComboSystem and pass it to CircleSystem.

```typescript
import type { RhythmState } from './types';
import { ROUND_DURATION, SPAWN_INTERVAL_MAX } from './types';
import { InputSystem } from './systems/InputSystem';
import { CircleSystem } from './systems/CircleSystem';
import { ComboSystem } from './systems/ComboSystem';
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
      timeRemaining: ROUND_DURATION, gameOver: false, started: true, paused: false,
      nextId: 0, spawnTimer: SPAWN_INTERVAL_MAX,
      width: canvas.width, height: canvas.height, pendingClick: null,
    };

    const comboSystem = new ComboSystem();
    this.circleSystem = new CircleSystem(comboSystem);
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

  start(): void { this.running = true; this.lastTime = performance.now(); this.loop(); }

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
   - Hit circles consecutively -- the **combo counter** appears after 2 hits
   - Reach 5 combo -- a **"2x" multiplier** appears in glowing yellow
   - Reach 10 combo -- multiplier becomes **3x**, then **4x** at 20, **8x** at 30
   - Miss a circle or click too early -- combo resets to 0
   - Score climbs much faster with high multipliers (a Perfect at 8x = 2400 points!)

---

## Challenges

**Easy:**
- Lower the combo threshold for 2x from 5 to 3.
- Change the combo display color from purple to cyan.

**Medium:**
- Make the combo text grow larger the higher the combo gets.

**Hard:**
- Add a "combo breaker" visual effect when the combo resets (red flash + screen shake).

---

## What You Learned

- Implementing a streak-based combo counter
- Tiered multiplier lookup tables sorted by threshold
- Multiplied scoring that makes combos exponentially valuable
- Pulsing text animations using `Math.sin(performance.now())`
- Separating combo logic into its own system for clean architecture

**Next:** 60-second rounds and full scoring -- timed gameplay with countdown!
