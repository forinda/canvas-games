# Step 4: Scoring & Win Screen

**Goal:** Track moves and time, detect when all pairs are found, and show a win screen.

**Time:** ~15 minutes

---

## What You'll Build

A complete game loop with:
- **Move counter**: Tracks how many pairs you've attempted
- **Timer**: Shows elapsed seconds
- **Win detection**: When all pairs are found, show a victory screen
- **HUD**: Display moves, time, and game status

```
┌────────────────────────────┐
│ Memory Match    Time: 0:45s │
│ Moves: 12                   │
│                              │
│   [Grid of cards]            │
│                              │
│   🎉 You Win!                │
│   Solved in 12 moves (45s)   │
└────────────────────────────┘
```

---

## Concepts

- **Move Tracking**: Increment on each second card flip
- **Elapsed Timer**: Use `performance.now()` to track seconds
- **Win Condition**: `pairsFound === totalPairs`
- **Overlay UI**: Render win screen on top of the board

---

## Code

### 1. Update Types

**File:** `src/contexts/canvas2d/games/memory-match/types.ts`

```typescript
export type Phase = 'idle' | 'one-flipped' | 'two-flipped' | 'won';

export interface MemoryState {
  board: Card[];
  rows: number;
  cols: number;
  cellSize: number;
  boardOffsetX: number;
  boardOffsetY: number;

  phase: Phase;
  firstPick: number | null;
  secondPick: number | null;
  revealTimer: number;

  moves: number; // ← NEW: Total moves (pair flips)
  pairsFound: number; // ← NEW: Matched pairs
  totalPairs: number; // ← NEW: Total pairs needed to win
  elapsedTime: number; // ← NEW: Time in ms
  timerRunning: boolean; // ← NEW: Whether timer is active
  gameOver: boolean; // ← NEW: Win flag
}
```

---

### 2. Update Board System

**File:** `src/contexts/canvas2d/games/memory-match/systems/BoardSystem.ts`

```typescript
export class BoardSystem implements Updatable<MemoryState> {
  /** Initialize board with move/timer tracking */
  initBoard(state: MemoryState, rows: number, cols: number): void {
    const totalCards = rows * cols;
    const numPairs = totalCards / 2;

    // ... existing card creation logic ...

    state.totalPairs = numPairs;
    state.pairsFound = 0;
    state.moves = 0;
    state.elapsedTime = 0;
    state.timerRunning = false;
    state.gameOver = false;
    state.phase = 'idle';
  }

  flipCard(state: MemoryState, idx: number): void {
    const card = state.board[idx];
    if (card.flipped || card.matched) return;

    card.flipped = true;

    if (state.firstPick === null) {
      state.firstPick = idx;
      state.phase = 'one-flipped';

      // Start timer on first move
      if (!state.timerRunning) {
        state.timerRunning = true;
      }
    } else {
      state.secondPick = idx;
      state.moves++; // ← Increment moves on second card flip
      state.phase = 'two-flipped';
      state.revealTimer = 0;
    }
  }

  private checkMatch(state: MemoryState): void {
    if (state.firstPick === null || state.secondPick === null) return;

    const cardA = state.board[state.firstPick];
    const cardB = state.board[state.secondPick];

    if (cardA.iconIndex === cardB.iconIndex) {
      // Match found
      cardA.matched = true;
      cardB.matched = true;
      state.pairsFound++;

      // Check win condition
      if (state.pairsFound >= state.totalPairs) {
        state.phase = 'won';
        state.gameOver = true;
        state.timerRunning = false; // ← Stop timer
      } else {
        state.phase = 'idle';
      }
    } else {
      // No match
      cardA.flipped = false;
      cardB.flipped = false;
      state.phase = 'idle';
    }

    state.firstPick = null;
    state.secondPick = null;
    state.revealTimer = 0;
  }

  // ... existing update() method ...
}
```

**Key Changes:**
- Start timer on first flip
- Increment `moves` on every second card flip (1 move = 1 pair attempt)
- Check win condition: `pairsFound >= totalPairs`

---

### 3. Create Score System

**File:** `src/contexts/canvas2d/games/memory-match/systems/ScoreSystem.ts`

```typescript
import type { Updatable } from '@core/Updatable';
import type { MemoryState } from '../types';

export class ScoreSystem implements Updatable<MemoryState> {
  /** Update elapsed time each frame */
  update(state: MemoryState, dt: number): void {
    if (state.timerRunning) {
      state.elapsedTime += dt;
    }
  }

  /** Format milliseconds as "M:SS" */
  formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
```

---

### 4. Create HUD Renderer

**File:** `src/contexts/canvas2d/games/memory-match/renderers/HUDRenderer.ts`

```typescript
import type { MemoryState } from '../types';
import { GAME_COLOR } from '../types';
import { ScoreSystem } from '../systems/ScoreSystem';

export class HUDRenderer {
  private scoreSystem: ScoreSystem;

  constructor() {
    this.scoreSystem = new ScoreSystem();
  }

  render(ctx: CanvasRenderingContext2D, state: MemoryState): void {
    const W = ctx.canvas.width;

    // Top bar
    ctx.fillStyle = 'white';
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Memory Match', 20, 35);

    ctx.textAlign = 'right';
    ctx.fillText(
      `Time: ${this.scoreSystem.formatTime(state.elapsedTime)}`,
      W - 20,
      35
    );

    // Moves counter (centered below title)
    ctx.textAlign = 'center';
    ctx.fillText(`Moves: ${state.moves}`, W / 2, 35);

    // Win screen overlay
    if (state.phase === 'won') {
      this.renderWinScreen(ctx, state);
    }
  }

  private renderWinScreen(ctx: CanvasRenderingContext2D, state: MemoryState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, W, H);

    // Win message
    ctx.fillStyle = GAME_COLOR;
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎉 You Win!', W / 2, H / 2 - 60);

    ctx.fillStyle = 'white';
    ctx.font = '28px sans-serif';
    ctx.fillText(
      `Solved in ${state.moves} moves`,
      W / 2,
      H / 2
    );

    ctx.fillText(
      `Time: ${this.scoreSystem.formatTime(state.elapsedTime)}`,
      W / 2,
      H / 2 + 40
    );

    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Press [Space] to play again', W / 2, H / 2 + 90);
  }
}
```

---

### 5. Update Engine

**File:** `src/contexts/canvas2d/games/memory-match/MemoryEngine.ts`

```typescript
import { ScoreSystem } from './systems/ScoreSystem';
import { HUDRenderer } from './renderers/HUDRenderer';

export class MemoryEngine {
  // ... existing properties ...
  private scoreSystem: ScoreSystem;
  private hudRenderer: HUDRenderer;

  constructor(canvas: HTMLCanvasElement) {
    // ... existing setup ...

    this.state = {
      board: this.createBoard(4, 4),
      rows: 4,
      cols: 4,
      cellSize: 0,
      boardOffsetX: 0,
      boardOffsetY: 0,
      phase: 'idle',
      firstPick: null,
      secondPick: null,
      revealTimer: 0,
      moves: 0,
      pairsFound: 0,
      totalPairs: 8, // 4x4 = 8 pairs
      elapsedTime: 0,
      timerRunning: false,
      gameOver: false,
    };

    this.scoreSystem = new ScoreSystem();
    this.hudRenderer = new HUDRenderer();

    // ... rest of constructor ...
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    this.boardSystem.update(this.state, dt);
    this.scoreSystem.update(this.state, dt); // ← Update timer

    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    this.ctx.fillStyle = '#0f0f1a';
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    this.renderBoard();
    this.hudRenderer.render(this.ctx, this.state); // ← Render HUD
  }

  // ... rest of the code ...
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Start flipping cards**: Timer starts on first click, moves increment on each pair attempt
3. **Find all pairs**: Win screen appears when all 8 pairs are matched
4. **Check stats**: See your final moves and time

---

## What You Learned

✅ Track game metrics (moves, time, pairs found)  
✅ Implement win condition detection  
✅ Create a HUD overlay system  
✅ Format time as "M:SS"  
✅ Build a complete game loop (play → win)

---

## Next Step

→ [Step 5: Shuffle, Levels & Polish](./step-5.md) — Add Fisher-Yates shuffle, difficulty levels, and flip animations
