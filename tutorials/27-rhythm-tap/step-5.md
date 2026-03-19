# Step 5: Accuracy, Effects & Polish

**Goal:** Add accuracy tracking, hit burst effects, miss X marks, high score persistence, start overlay, and detailed game-over stats.

**Time:** ~15 minutes

---

## What You'll Build

- **Accuracy percentage** displayed during gameplay
- **Hit burst effects** -- expanding ring + particle lines on successful hits with grade text
- **Miss X marks** -- red X drawn at the position of missed/expired circles
- **Effect fade-out** -- effects gradually fade using alpha decay
- **High score persistence** in localStorage
- **Start overlay** prompting the player to click or tap
- **Detailed game-over stats** showing Perfect/Good/OK/Miss counts, accuracy, and high score

---

## Concepts

- **Particle Effects**: Expanding rings and radiating lines create satisfying hit feedback
- **Alpha Decay**: `effect.alpha = effect.time / DURATION` creates smooth fade-out tied to remaining lifetime
- **Scale Animation**: `1 + (1 - alpha) * 0.8` makes the burst ring grow as it fades
- **localStorage**: `getItem`/`setItem` with try-catch for environments where storage is unavailable

---

## Code

### 1. Update the Circle System with Effects

**File:** `src/games/rhythm-tap/systems/CircleSystem.ts`

Add hit and miss effect generation, plus effect update logic.

```typescript
import type { RhythmState, Circle, TimingGrade } from '../types';
import {
  CIRCLE_RADIUS, OUTER_RING_MULTIPLIER, SHRINK_DURATION,
  SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX, SPAWN_MARGIN,
  PERFECT_THRESHOLD, GOOD_THRESHOLD, OK_THRESHOLD,
  GRADE_POINTS, ROUND_DURATION,
  HIT_EFFECT_DURATION, MISS_EFFECT_DURATION,
} from '../types';
import { ComboSystem } from './ComboSystem';

export class CircleSystem {
  private comboSystem: ComboSystem;

  constructor(comboSystem: ComboSystem) {
    this.comboSystem = comboSystem;
  }

  update(state: RhythmState, dt: number): void {
    const dtSec = dt / 1000;

    state.timeRemaining -= dtSec;
    if (state.timeRemaining <= 0) {
      state.timeRemaining = 0;
      state.gameOver = true;
      return;
    }

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
    this.updateEffects(state, dtSec);
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
      state.missEffects.push({
        x: bestCircle.x, y: bestCircle.y, alpha: 1, time: MISS_EFFECT_DURATION,
      });
    } else {
      this.comboSystem.registerHit(state, grade);
      state.score += GRADE_POINTS[grade] * state.multiplier;
      state.totalHits += 1;
      if (grade === 'Perfect') state.perfectHits += 1;
      else if (grade === 'Good') state.goodHits += 1;
      else state.okHits += 1;

      state.hitEffects.push({
        x: bestCircle.x, y: bestCircle.y, radius: bestCircle.radius,
        grade, alpha: 1, scale: 1, time: HIT_EFFECT_DURATION,
      });
    }
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
        state.missEffects.push({
          x: circle.x, y: circle.y, alpha: 1, time: MISS_EFFECT_DURATION,
        });
        toRemove.push(i);
      }
    }
    for (let i = toRemove.length - 1; i >= 0; i--) {
      state.circles.splice(toRemove[i], 1);
    }
  }

  private updateEffects(state: RhythmState, dtSec: number): void {
    for (let i = state.hitEffects.length - 1; i >= 0; i--) {
      const e = state.hitEffects[i];
      e.time -= dtSec;
      e.alpha = Math.max(0, e.time / HIT_EFFECT_DURATION);
      e.scale = 1 + (1 - e.alpha) * 0.8;
      if (e.time <= 0) state.hitEffects.splice(i, 1);
    }
    for (let i = state.missEffects.length - 1; i >= 0; i--) {
      const e = state.missEffects[i];
      e.time -= dtSec;
      e.alpha = Math.max(0, e.time / MISS_EFFECT_DURATION);
      if (e.time <= 0) state.missEffects.splice(i, 1);
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
      const progress = 1 - state.timeRemaining / ROUND_DURATION;
      state.spawnTimer = SPAWN_INTERVAL_MAX - (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN) * progress;
    }
  }

  private spawnCircle(state: RhythmState): void {
    const margin = SPAWN_MARGIN;
    const x = margin + Math.random() * (state.width - margin * 2);
    const y = margin + Math.random() * (state.height - margin * 2);
    state.circles.push({
      x, y, radius: CIRCLE_RADIUS,
      outerRadius: CIRCLE_RADIUS * OUTER_RING_MULTIPLIER,
      shrinkRate: (CIRCLE_RADIUS * (OUTER_RING_MULTIPLIER - 1)) / SHRINK_DURATION,
      spawnTime: performance.now(), hit: false, missed: false, grade: null, id: state.nextId++,
    });
  }
}
```

---

### 2. Update the Game Renderer with Effects

**File:** `src/games/rhythm-tap/renderers/GameRenderer.ts`

Draw hit burst effects and miss X marks.

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
    this.drawHitEffects(ctx, state);
    this.drawMissEffects(ctx, state);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
    grad.addColorStop(0, '#1a1a2e'); grad.addColorStop(1, '#0d0d1a');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.04; ctx.strokeStyle = '#e040fb'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }

  private drawCircles(ctx: CanvasRenderingContext2D, state: RhythmState): void {
    for (const circle of state.circles) {
      if (circle.hit || circle.missed) continue;
      const gap = Math.abs(circle.outerRadius - circle.radius);
      const color = gap <= 8 ? GRADE_COLORS.Perfect : gap <= 20 ? GRADE_COLORS.Good : gap <= 35 ? GRADE_COLORS.OK : '#e040fb';

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

  private drawHitEffects(ctx: CanvasRenderingContext2D, state: RhythmState): void {
    for (const effect of state.hitEffects) {
      ctx.save();
      ctx.globalAlpha = effect.alpha;
      const color = GRADE_COLORS[effect.grade];

      // Burst ring
      ctx.strokeStyle = color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(effect.x, effect.y, effect.radius * effect.scale, 0, Math.PI * 2); ctx.stroke();

      // Particle burst lines
      const numLines = 8;
      const innerR = effect.radius * 0.5;
      const outerR = effect.radius * effect.scale * 1.3;
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      for (let i = 0; i < numLines; i++) {
        const angle = (i / numLines) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(effect.x + Math.cos(angle) * innerR, effect.y + Math.sin(angle) * innerR);
        ctx.lineTo(effect.x + Math.cos(angle) * outerR, effect.y + Math.sin(angle) * outerR);
        ctx.stroke();
      }

      // Grade text
      ctx.font = 'bold 20px monospace'; ctx.fillStyle = color;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(effect.grade, effect.x, effect.y - effect.radius * effect.scale - 15);
      ctx.restore();
    }
  }

  private drawMissEffects(ctx: CanvasRenderingContext2D, state: RhythmState): void {
    for (const effect of state.missEffects) {
      ctx.save();
      ctx.globalAlpha = effect.alpha;
      ctx.strokeStyle = '#f44336'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      const size = 20;
      ctx.beginPath(); ctx.moveTo(effect.x - size, effect.y - size); ctx.lineTo(effect.x + size, effect.y + size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(effect.x + size, effect.y - size); ctx.lineTo(effect.x - size, effect.y + size); ctx.stroke();
      ctx.font = 'bold 18px monospace'; ctx.fillStyle = '#f44336';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Miss', effect.x, effect.y - 30);
      ctx.restore();
    }
  }
}
```

---

### 3. Final HUD Renderer

**File:** `src/games/rhythm-tap/renderers/HUDRenderer.ts`

Complete HUD with accuracy, start overlay, and detailed game-over stats.

```typescript
import type { RhythmState } from '../types';
import { ROUND_DURATION, HS_KEY } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: RhythmState): void {
    const W = state.width;
    const H = state.height;

    if (!state.started) { this.drawStartOverlay(ctx, W, H); return; }

    this.drawScore(ctx, state);
    this.drawCombo(ctx, state, W);
    this.drawTimer(ctx, state, W);
    this.drawAccuracy(ctx, state, W, H);

    if (state.gameOver) this.drawGameOverOverlay(ctx, state, W, H);
    else if (state.paused) this.drawPausedOverlay(ctx, W, H);
  }

  private drawScore(ctx: CanvasRenderingContext2D, state: RhythmState): void {
    ctx.save();
    ctx.font = 'bold 32px monospace'; ctx.fillStyle = '#fff';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(224,64,251,0.5)'; ctx.shadowBlur = 8;
    ctx.fillText(`${state.score}`, 20, 20);
    ctx.shadowBlur = 0; ctx.font = '14px monospace'; ctx.fillStyle = '#888';
    ctx.fillText(`Best: ${state.highScore}`, 20, 58);
    ctx.restore();
  }

  private drawCombo(ctx: CanvasRenderingContext2D, state: RhythmState, W: number): void {
    if (state.combo < 2) return;
    ctx.save();
    const pulse = 1 + Math.sin(performance.now() * 0.008) * 0.08;
    const fontSize = Math.floor(28 * pulse);
    ctx.font = `bold ${fontSize}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    if (state.multiplier > 1) {
      ctx.fillStyle = '#ffeb3b'; ctx.shadowColor = 'rgba(255,235,59,0.6)'; ctx.shadowBlur = 12;
      ctx.fillText(`${state.multiplier}x`, W / 2, 20);
    }
    ctx.shadowBlur = 0; ctx.font = 'bold 20px monospace'; ctx.fillStyle = '#e040fb';
    ctx.fillText(`${state.combo} combo`, W / 2, 52);
    ctx.restore();
  }

  private drawTimer(ctx: CanvasRenderingContext2D, state: RhythmState, W: number): void {
    ctx.save();
    const seconds = Math.ceil(state.timeRemaining);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const isLow = state.timeRemaining <= 10;
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = isLow ? '#f44336' : '#fff';
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    if (isLow) { ctx.shadowColor = 'rgba(244,67,54,0.5)'; ctx.shadowBlur = 10; }
    ctx.fillText(`${minutes}:${secs.toString().padStart(2, '0')}`, W - 20, 20);
    ctx.shadowBlur = 0;
    const barW = 120; const barH = 6; const barX = W - 20 - barW; const barY = 54;
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = isLow ? '#f44336' : '#e040fb';
    ctx.fillRect(barX, barY, barW * (state.timeRemaining / ROUND_DURATION), barH);
    ctx.restore();
  }

  private drawAccuracy(ctx: CanvasRenderingContext2D, state: RhythmState, _W: number, H: number): void {
    const total = state.totalHits + state.totalMisses;
    if (total === 0) return;
    const accuracy = (state.totalHits / total) * 100;
    ctx.save(); ctx.font = '14px monospace'; ctx.fillStyle = '#888';
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText(`Accuracy: ${accuracy.toFixed(1)}%`, 20, H - 20);
    ctx.restore();
  }

  private drawStartOverlay(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 52px monospace'; ctx.fillStyle = '#e040fb';
    ctx.shadowColor = 'rgba(224,64,251,0.5)'; ctx.shadowBlur = 20;
    ctx.fillText('Rhythm Tap', W / 2, H / 2 - 60);
    ctx.shadowBlur = 0;
    ctx.font = '20px monospace'; ctx.fillStyle = '#fff';
    ctx.fillText('Tap circles when the rings align!', W / 2, H / 2);
    ctx.font = '18px monospace'; ctx.fillStyle = '#aaa';
    ctx.fillText('Click or tap to start', W / 2, H / 2 + 40);
    ctx.font = '14px monospace'; ctx.fillStyle = '#666';
    ctx.fillText('[P] Pause  |  [ESC] Exit', W / 2, H / 2 + 80);
    ctx.restore();
  }

  private drawGameOverOverlay(ctx: CanvasRenderingContext2D, state: RhythmState, W: number, H: number): void {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    ctx.font = 'bold 48px monospace'; ctx.fillStyle = '#e040fb';
    ctx.shadowColor = 'rgba(224,64,251,0.5)'; ctx.shadowBlur = 15;
    ctx.fillText('TIME UP!', W / 2, H / 2 - 100); ctx.shadowBlur = 0;

    ctx.font = 'bold 36px monospace'; ctx.fillStyle = '#fff';
    ctx.fillText(`Score: ${state.score}`, W / 2, H / 2 - 40);

    let hs = state.highScore;
    if (state.score > hs) {
      try { localStorage.setItem(HS_KEY, String(state.score)); } catch { /* noop */ }
      hs = state.score;
      ctx.font = 'bold 22px monospace'; ctx.fillStyle = '#ffeb3b';
      ctx.fillText('New High Score!', W / 2, H / 2);
    } else {
      ctx.font = '18px monospace'; ctx.fillStyle = '#aaa';
      ctx.fillText(`Best: ${hs}`, W / 2, H / 2);
    }

    const total = state.totalHits + state.totalMisses;
    const accuracy = total > 0 ? ((state.totalHits / total) * 100).toFixed(1) : '0.0';
    ctx.font = '16px monospace'; ctx.fillStyle = '#ccc';
    ctx.fillText(`Max Combo: ${state.maxCombo}  |  Accuracy: ${accuracy}%`, W / 2, H / 2 + 40);
    ctx.fillStyle = '#999';
    ctx.fillText(`Perfect: ${state.perfectHits}  Good: ${state.goodHits}  OK: ${state.okHits}  Miss: ${state.totalMisses}`, W / 2, H / 2 + 65);
    ctx.font = '20px monospace'; ctx.fillStyle = '#ccc';
    ctx.fillText('Press SPACE to restart', W / 2, H / 2 + 110);
    ctx.font = '14px monospace'; ctx.fillStyle = '#666';
    ctx.fillText('[ESC] Exit to menu', W / 2, H / 2 + 140);
    ctx.restore();
  }

  private drawPausedOverlay(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 48px monospace'; ctx.fillStyle = '#fff'; ctx.fillText('PAUSED', W / 2, H / 2 - 20);
    ctx.font = '20px monospace'; ctx.fillStyle = '#aaa'; ctx.fillText('Press [P] to resume', W / 2, H / 2 + 30);
    ctx.restore();
  }
}
```

---

### 4. Final Engine

**File:** `src/games/rhythm-tap/RhythmEngine.ts`

Complete engine with start screen, restart, and high score loading.

```typescript
import type { RhythmState } from './types';
import { ROUND_DURATION, SPAWN_INTERVAL_MAX, HS_KEY } from './types';
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

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let hs = 0;
    try { hs = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0; } catch { /* noop */ }

    this.state = this.createInitialState(canvas.width, canvas.height, hs);

    const comboSystem = new ComboSystem();
    this.circleSystem = new CircleSystem(comboSystem);
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();
    this.inputSystem = new InputSystem(this.state, canvas);

    this.resizeHandler = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      this.state.width = canvas.width; this.state.height = canvas.height;
    };

    this.inputSystem.attach();
    window.addEventListener('resize', this.resizeHandler);
  }

  start(): void { this.running = true; this.lastTime = performance.now(); this.loop(); }

  destroy(): void {
    this.running = false; cancelAnimationFrame(this.rafId);
    this.inputSystem.detach(); window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min(now - this.lastTime, 50);
    this.lastTime = now;

    if (this.state.started && !this.state.paused && !this.state.gameOver) {
      this.circleSystem.update(this.state, dt);
      if (this.state.score > this.state.highScore) {
        this.state.highScore = this.state.score;
        try { localStorage.setItem(HS_KEY, String(this.state.highScore)); } catch { /* noop */ }
      }
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
      timeRemaining: ROUND_DURATION, gameOver: false, started: false, paused: false,
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
   - **Start screen** shows "Rhythm Tap" with instructions
   - Click to start -- the 60-second round begins
   - Hit a circle -- a **burst effect** expands outward with grade text ("Perfect!", "Good!", etc.)
   - Miss a circle -- a red **X mark** fades at the position
   - **Accuracy percentage** displays in the bottom-left during gameplay
   - When time runs out, the **game-over screen** shows score, high score, max combo, accuracy, and per-grade counts
   - High score persists across page reloads

---

## Challenges

**Easy:**
- Add sound effects for Perfect hits (use the Web Audio API to play a short beep).
- Change the burst effect to use 12 lines instead of 8.

**Medium:**
- Add screen shake when the combo breaks.
- Show floating "+300" text at the hit position that drifts upward and fades.

**Hard:**
- Implement a "fever mode" that activates at 20+ combo, doubling all point values and adding a screen-wide purple glow.

---

## What You Learned

- Creating expanding burst effects with alpha decay and scale animation
- Drawing X marks for miss indicators with fade-out
- Tracking per-grade hit statistics for detailed results
- Calculating real-time accuracy percentages
- Persisting high scores with localStorage
- Building complete start/pause/game-over overlay flows

**Congratulations!** You have built a complete Rhythm Tap game with timing-based gameplay, combo multipliers, visual effects, accuracy tracking, and high score persistence.

**Next game:** [Connect Four](../28-connect-four/step-1.md) -- classic strategy with disc dropping and AI!
