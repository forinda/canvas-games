# Step 3: Scoring, Combo & Countdown Timer

**Goal:** Add score tracking with combo multipliers and a 60-second countdown timer.

**Time:** ~15 minutes

---

## What You'll Build

A complete scoring system with:
- **Base Points**: 10 points per mole
- **Combo Multiplier**: Up to 5x for consecutive hits
- **Countdown Timer**: 60 seconds to get the highest score
- **High Score Persistence**: Saved in localStorage

```
┌──────────────────────────────────────┐
│ Score: 230  Time: 45s  Combo x3! 🔥 │
├──────────────────────────────────────┤
│         [Moles popping up]           │
└──────────────────────────────────────┘
```

---

## Concepts

- **Score Calculation**: Base points × combo multiplier
- **Combo Streaks**: Increment on hit, reset on miss
- **Timer Countdown**: Decrement each frame with deltaTime
- **Game Over Detection**: Timer reaches zero
- **localStorage**: Persist high scores

---

## Code

### 1. Create Score System

**File:** `src/contexts/canvas2d/games/whack-a-mole/systems/ScoreSystem.ts`

```typescript
import type { WhackState } from '../types';
import { HS_KEY } from '../types';

export class ScoreSystem {
  /** Update countdown timer and check game over */
  update(state: WhackState, dt: number): void {
    if (state.phase !== 'playing') return;

    // Countdown timer (dt is in milliseconds)
    state.timeRemaining -= dt / 1000;

    if (state.timeRemaining <= 0) {
      state.timeRemaining = 0;
      state.phase = 'gameover';

      // Save high score
      if (state.score > state.highScore) {
        state.highScore = state.score;
        this.saveHighScore(state.highScore);
      }
    }
  }

  /** Load high score from localStorage */
  loadHighScore(): number {
    try {
      return parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  /** Save high score to localStorage */
  saveHighScore(score: number): void {
    try {
      localStorage.setItem(HS_KEY, String(score));
    } catch (e) {
      console.warn('Could not save high score');
    }
  }
}
```

---

### 2. Update Input System with Scoring Logic

**File:** `src/contexts/canvas2d/games/whack-a-mole/systems/InputSystem.ts`

Update the `handleClick` method to add scoring:

```typescript
import type { WhackState } from '../types';
import { GRID_COLS, GRID_ROWS, MOLE_POINTS } from '../types';

export class InputSystem {
  private canvas: HTMLCanvasElement;
  private boundClick: (e: MouseEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.boundClick = (e: MouseEvent) => this.handleClick(e);
  }

  attach(state: WhackState): void {
    this.canvas.addEventListener('click', this.boundClick);
    (this.canvas as any).__whackState = state;
  }

  detach(): void {
    this.canvas.removeEventListener('click', this.boundClick);
  }

  private handleClick(e: MouseEvent): void {
    const state: WhackState = (this.canvas as any).__whackState;
    if (!state || state.phase !== 'playing') return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const W = this.canvas.width;
    const H = this.canvas.height;

    const gridSize = Math.min(W * 0.8, H * 0.65);
    const cellW = gridSize / GRID_COLS;
    const cellH = gridSize / GRID_ROWS;
    const gridX = (W - gridSize) / 2;
    const gridY = (H - gridSize) / 2 + 60;

    if (
      mx < gridX ||
      mx > gridX + gridSize ||
      my < gridY ||
      my > gridY + gridSize
    ) {
      // Miss - clicked outside grid, reset combo
      state.combo = 0;
      return;
    }

    const col = Math.floor((mx - gridX) / cellW);
    const row = Math.floor((my - gridY) / cellH);

    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) {
      state.combo = 0;
      return;
    }

    const idx = row * GRID_COLS + col;
    const hole = state.holes[idx];

    if ((hole.state === 'rising' || hole.state === 'up') && !hole.hit) {
      // Hit!
      hole.hit = true;
      hole.state = 'sinking';
      hole.timer = 0;

      // Update combo
      state.combo += 1;
      if (state.combo > state.maxCombo) {
        state.maxCombo = state.combo;
      }

      // Calculate score with multiplier (max 5x)
      const multiplier = Math.min(state.combo, 5);
      const points = MOLE_POINTS * multiplier;
      state.score += points;

      console.log(`Hit! +${points} points (${multiplier}x combo)`);
    } else if (hole.state === 'empty' || hole.state === 'sinking') {
      // Miss - clicked on empty/sinking hole
      state.combo = 0;
    }
  }
}
```

**Key Changes:**
- **Combo Tracking**: Increment on hit, reset on miss
- **Multiplier**: Capped at 5x for balance
- **Max Combo**: Track best combo streak for stats

---

### 3. Create HUD Renderer

**File:** `src/contexts/canvas2d/games/whack-a-mole/renderers/HUDRenderer.ts`

```typescript
import type { WhackState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: WhackState): void {
    this.renderTopBar(ctx, state);

    if (state.phase === 'ready') {
      this.renderReadyOverlay(ctx, state);
    } else if (state.phase === 'gameover') {
      this.renderGameOverOverlay(ctx, state);
    }
  }

  private renderTopBar(ctx: CanvasRenderingContext2D, state: WhackState): void {
    if (state.phase === 'ready') return; // Hide during ready screen

    const W = ctx.canvas.width;

    // Background bar
    ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
    ctx.fillRect(0, 0, W, 50);

    // Score
    ctx.fillStyle = '#4caf50';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Score: ${state.score}`, 20, 25);

    // Timer (red when < 10 seconds)
    const secs = Math.ceil(state.timeRemaining);
    ctx.fillStyle = secs < 10 ? '#ff4444' : '#4caf50';
    ctx.textAlign = 'center';
    ctx.fillText(`Time: ${secs}s`, W / 2 - 80, 25);

    // Combo (only show if active)
    if (state.combo >= 2) {
      ctx.fillStyle = '#ffd700';
      ctx.fillText(`Combo x${Math.min(state.combo, 5)}!`, W / 2 + 80, 25);
    }

    // Best score
    ctx.fillStyle = '#4caf50';
    ctx.textAlign = 'right';
    ctx.fillText(`Best: ${state.highScore}`, W - 20, 25);
  }

  private renderReadyOverlay(ctx: CanvasRenderingContext2D, state: WhackState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Semi-transparent background
    ctx.fillStyle = 'rgba(15, 15, 26, 0.85)';
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.fillStyle = '#4caf50';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Whack-a-Mole', W / 2, H / 2 - 80);

    // Instructions
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('Hit the moles, avoid the bombs!', W / 2, H / 2 - 20);
    ctx.fillText(`60 seconds - Get the highest score!`, W / 2, H / 2 + 20);

    // High score
    if (state.highScore > 0) {
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.fillText(`🏆 High Score: ${state.highScore}`, W / 2, H / 2 + 70);
    }

    // Start prompt
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Click or press SPACE to start', W / 2, H / 2 + 120);
  }

  private renderGameOverOverlay(ctx: CanvasRenderingContext2D, state: WhackState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Semi-transparent background
    ctx.fillStyle = 'rgba(15, 15, 26, 0.85)';
    ctx.fillRect(0, 0, W, H);

    // Game Over
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Time Up!', W / 2, H / 2 - 80);

    // Final score
    ctx.font = '32px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Final Score: ${state.score}`, W / 2, H / 2 - 20);

    // Max combo
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`Best Combo: x${state.maxCombo}`, W / 2, H / 2 + 20);

    // New high score indicator
    if (state.score > state.highScore - state.score) {
      // Simplified check (state.score equals new high score if it was just updated)
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('🎉 New High Score! 🎉', W / 2, H / 2 + 70);
    }

    // Restart prompt
    ctx.fillStyle = '#aaa';
    ctx.font = '20px sans-serif';
    ctx.fillText('Click or press SPACE to play again', W / 2, H / 2 + 120);
  }
}
```

---

### 4. Update Game Engine

**File:** `src/contexts/canvas2d/games/whack-a-mole/WhackEngine.ts`

```typescript
import type { WhackState, Hole } from './types';
import { GRID_SIZE, SPAWN_INTERVAL_BASE, ROUND_DURATION, HS_KEY } from './types';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';
import { MoleSystem } from './systems/MoleSystem';
import { ScoreSystem } from './systems/ScoreSystem';
import { InputSystem } from './systems/InputSystem';

export class WhackEngine {
  private ctx: CanvasRenderingContext2D;
  private state: WhackState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;

  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;
  private moleSystem: MoleSystem;
  private scoreSystem: ScoreSystem;
  private inputSystem: InputSystem;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.scoreSystem = new ScoreSystem();
    const highScore = this.scoreSystem.loadHighScore();

    const holes: Hole[] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      holes.push({
        state: 'empty',
        timer: 0,
        isBomb: false,
        hit: false,
      });
    }

    this.state = {
      holes,
      score: 0,
      highScore,
      combo: 0,
      maxCombo: 0,
      timeRemaining: ROUND_DURATION,
      round: 1,
      phase: 'ready', // Start at ready screen
      paused: false,
      particles: [],
      hammerEffect: null,
      spawnInterval: SPAWN_INTERVAL_BASE,
      spawnTimer: 0,
    };

    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();
    this.moleSystem = new MoleSystem();
    this.inputSystem = new InputSystem(canvas);

    this.inputSystem.attach(this.state);

    // Click to start
    canvas.addEventListener('click', () => {
      if (this.state.phase === 'ready' || this.state.phase === 'gameover') {
        this.startGame();
      }
    });
  }

  private startGame(): void {
    // Reset state
    for (const hole of this.state.holes) {
      hole.state = 'empty';
      hole.timer = 0;
      hole.hit = false;
      hole.isBomb = false;
    }

    this.state.score = 0;
    this.state.combo = 0;
    this.state.maxCombo = 0;
    this.state.timeRemaining = ROUND_DURATION;
    this.state.phase = 'playing';
    this.state.spawnTimer = 0;
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
    const dt = now - this.lastTime;
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    this.moleSystem.update(this.state, dt);
    this.scoreSystem.update(this.state, dt);
  }

  private render(): void {
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }
}
```

**Key Changes:**
- Added `ScoreSystem` and `HUDRenderer`
- Changed initial phase to `'ready'`
- Added `startGame()` method to reset state
- Click listener starts/restarts game

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Whack-a-Mole"
3. **Ready Screen:**
   - Shows title, instructions, high score
   - Click to start
4. **Gameplay:**
   - Hit moles → score increases
   - Consecutive hits → combo multiplier (1x, 2x, 3x, 4x, 5x)
   - Miss (click empty hole) → combo resets
   - Timer counts down from 60
5. **Scoring:**
   - Base: 10 points per mole
   - Combo x2: 20 points
   - Combo x5: 50 points
6. **Game Over:**
   - Timer reaches 0
   - Shows final score and max combo
   - High score saved
   - Click to restart

---

## Scoring Formula

```typescript
multiplier = min(combo, 5)  // Cap at 5x
points = 10 × multiplier

Examples:
  1st hit: 10 × 1 = 10 points
  2nd hit: 10 × 2 = 20 points
  5th hit: 10 × 5 = 50 points
  6th hit: 10 × 5 = 50 points (capped)
```

---

## What You Learned

✅ Implement combo streak mechanics  
✅ Calculate score with multipliers  
✅ Create countdown timers with deltaTime  
✅ Detect game over conditions  
✅ Persist high scores with localStorage  
✅ Design HUD layouts with multiple elements  
✅ Create start/game-over overlays

---

## Next Step

→ [Step 4: Speed Ramp, Bombs & Polish](./step-4.md) — Add difficulty scaling, bomb mechanics, particles, and hammer effects
