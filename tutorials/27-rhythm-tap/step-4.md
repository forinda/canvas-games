# Step 4: 60-Second Rounds & Scoring

**Goal:** Add a 60-second countdown timer with dynamic spawn rates and game-over when time runs out.

**Time:** ~15 minutes

---

## What You'll Build

- **60-second countdown timer** displayed in the top-right corner
- **Timer bar** showing visual progress of the round
- **Dynamic spawn intervals** -- circles spawn faster as the round progresses
- **Game over** when the timer hits zero
- **Round timer coloring** -- turns red when under 10 seconds remain

---

## Concepts

- **Countdown Timer**: Subtract `dtSec` from `timeRemaining` each frame. When it hits 0, the round ends.
- **Progress-Based Difficulty**: `1 - timeRemaining / ROUND_DURATION` gives a 0-to-1 progress value that drives spawn rate
- **Timer Bar**: A filled rectangle whose width is `barWidth * (timeRemaining / ROUND_DURATION)`
- **Visual Urgency**: Red coloring and shadow glow when time is low creates tension

---

## Code

### 1. Update the Circle System

**File:** `src/games/rhythm-tap/systems/CircleSystem.ts`

Add countdown timer and dynamic spawn intervals.

```typescript
import type { RhythmState, Circle, TimingGrade } from '../types';
import {
  CIRCLE_RADIUS, OUTER_RING_MULTIPLIER, SHRINK_DURATION,
  SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX, SPAWN_MARGIN,
  PERFECT_THRESHOLD, GOOD_THRESHOLD, OK_THRESHOLD,
  GRADE_POINTS, ROUND_DURATION,
} from '../types';
import { ComboSystem } from './ComboSystem';

export class CircleSystem {
  private comboSystem: ComboSystem;

  constructor(comboSystem: ComboSystem) {
    this.comboSystem = comboSystem;
  }

  update(state: RhythmState, dt: number): void {
    const dtSec = dt / 1000;

    // Update round timer
    state.timeRemaining -= dtSec;
    if (state.timeRemaining <= 0) {
      state.timeRemaining = 0;
      state.gameOver = true;
      return;
    }

    // Spawn with dynamic interval
    this.handleSpawning(state, dtSec);

    // Shrink
    for (const circle of state.circles) {
      if (circle.hit || circle.missed) continue;
      circle.outerRadius -= circle.shrinkRate * dtSec;
    }

    // Process click
    if (state.pendingClick) {
      this.processClick(state, state.pendingClick.x, state.pendingClick.y);
      state.pendingClick = null;
    }

    this.removeExpired(state);
  }

  private handleSpawning(state: RhythmState, dtSec: number): void {
    state.spawnTimer -= dtSec;
    if (state.spawnTimer <= 0) {
      this.spawnCircle(state);
      // Spawn interval decreases as round progresses
      const progress = 1 - state.timeRemaining / ROUND_DURATION;
      const interval = SPAWN_INTERVAL_MAX - (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN) * progress;
      state.spawnTimer = interval;
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
      state.score += GRADE_POINTS[grade] * state.multiplier;
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
}
```

**What's happening:**
- `state.timeRemaining -= dtSec` counts down each frame. When it hits 0, `gameOver = true`.
- The spawn interval smoothly decreases from 1.2s to 0.4s as the round progresses. At the start, `progress = 0` and interval = 1.2s. At the end, `progress = 1` and interval = 0.4s.
- This means the final 10 seconds of the round are *much* more intense than the first 10.

---

### 2. Create the HUD Renderer

**File:** `src/games/rhythm-tap/renderers/HUDRenderer.ts`

Display the countdown timer with a progress bar and game-over overlay.

```typescript
import type { RhythmState } from '../types';
import { ROUND_DURATION } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: RhythmState): void {
    const W = state.width;
    const H = state.height;

    this.drawTimer(ctx, state, W);

    if (state.gameOver) {
      this.drawGameOverOverlay(ctx, state, W, H);
    } else if (state.paused) {
      this.drawPausedOverlay(ctx, W, H);
    }
  }

  private drawTimer(ctx: CanvasRenderingContext2D, state: RhythmState, W: number): void {
    ctx.save();
    const seconds = Math.ceil(state.timeRemaining);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const timeStr = `${minutes}:${secs.toString().padStart(2, '0')}`;

    const isLow = state.timeRemaining <= 10;
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = isLow ? '#f44336' : '#fff';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';

    if (isLow) {
      ctx.shadowColor = 'rgba(244,67,54,0.5)';
      ctx.shadowBlur = 10;
    }

    ctx.fillText(timeStr, W - 20, 20);

    // Timer bar
    ctx.shadowBlur = 0;
    const barW = 120;
    const barH = 6;
    const barX = W - 20 - barW;
    const barY = 54;
    const progress = state.timeRemaining / ROUND_DURATION;

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = isLow ? '#f44336' : '#e040fb';
    ctx.fillRect(barX, barY, barW * progress, barH);

    ctx.restore();
  }

  private drawGameOverOverlay(
    ctx: CanvasRenderingContext2D,
    state: RhythmState,
    W: number,
    H: number,
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 48px monospace';
    ctx.fillStyle = '#e040fb';
    ctx.shadowColor = 'rgba(224,64,251,0.5)';
    ctx.shadowBlur = 15;
    ctx.fillText('TIME UP!', W / 2, H / 2 - 100);
    ctx.shadowBlur = 0;

    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Score: ${state.score}`, W / 2, H / 2 - 40);

    ctx.font = '16px monospace';
    ctx.fillStyle = '#ccc';
    ctx.fillText(`Max Combo: ${state.maxCombo}`, W / 2, H / 2 + 10);

    ctx.font = '20px monospace';
    ctx.fillStyle = '#ccc';
    ctx.fillText('Press SPACE to restart', W / 2, H / 2 + 60);

    ctx.restore();
  }

  private drawPausedOverlay(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 48px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('PAUSED', W / 2, H / 2 - 20);
    ctx.font = '20px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Press [P] to resume', W / 2, H / 2 + 30);
    ctx.restore();
  }
}
```

**What's happening:**
- The timer displays as `M:SS` in the top-right corner. When under 10 seconds, it turns red with a glow.
- A thin progress bar below the timer shrinks from right to left, also turning red when low.
- The game-over overlay shows "TIME UP!" with the final score and max combo.

---

### 3. Update the Engine

**File:** `src/games/rhythm-tap/RhythmEngine.ts`

Add HUD renderer and restart support.

```typescript
import type { RhythmState } from './types';
import { ROUND_DURATION, SPAWN_INTERVAL_MAX } from './types';
import { InputSystem } from './systems/InputSystem';
import { CircleSystem } from './systems/CircleSystem';
import { ComboSystem } from './systems/ComboSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class RhythmEngine {
  private ctx: CanvasRenderingContext2D;
  private state: RhythmState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private circleSystem: CircleSystem;
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.createInitialState(canvas.width, canvas.height, 0);

    const comboSystem = new ComboSystem();
    this.circleSystem = new CircleSystem(comboSystem);
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();
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
    this.hudRenderer.render(this.ctx, this.state);
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private createInitialState(width: number, height: number, highScore: number): RhythmState {
    return {
      circles: [], hitEffects: [], missEffects: [],
      score: 0, highScore, combo: 0, maxCombo: 0, multiplier: 1,
      totalHits: 0, perfectHits: 0, goodHits: 0, okHits: 0, totalMisses: 0,
      timeRemaining: ROUND_DURATION, gameOver: false, started: true, paused: false,
      nextId: 0, spawnTimer: SPAWN_INTERVAL_MAX,
      width, height, pendingClick: null,
    };
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Rhythm Tap game
3. **Observe:**
   - A **1:00 countdown timer** in the top-right corner
   - Circles spawn slowly at first, then **faster and faster** as time runs out
   - When under 10 seconds, the timer **turns red** and glows
   - When the timer hits 0:00, "**TIME UP!**" appears with your final score
   - The game freezes -- no more circles spawn or shrink

---

## Challenges

**Easy:**
- Change `ROUND_DURATION` to 30 for a faster round.
- Make the timer bar thicker (12px instead of 6px).

**Medium:**
- Add a "3, 2, 1, GO!" countdown before the round starts.

**Hard:**
- Implement an "endless" mode where there is no timer but the game ends after 10 misses.

---

## What You Learned

- Implementing a countdown timer with per-frame subtraction
- Progress-based difficulty scaling for spawn intervals
- Visual urgency cues (color change, glow) for time pressure
- Drawing timer progress bars with proportional fill
- Game-over state triggered by timer expiration

**Next:** Accuracy tracking, hit effects, miss markers, and final polish!
