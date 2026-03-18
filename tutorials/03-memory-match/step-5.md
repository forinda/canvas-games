# Step 5: Shuffle, Levels & Polish

**Goal:** Add Fisher-Yates shuffle, difficulty levels (4×4, 5×4, 6×6), and smooth flip animations.

**Time:** ~15 minutes

---

## What You'll Build

A polished Memory Match game with:
- **Randomized cards** using Fisher-Yates shuffle
- **3 difficulty levels**: 4×4 (8 pairs), 5×4 (10 pairs), 6×6 (18 pairs)
- **Smooth flip animation** (cards rotate 90° when flipping)
- **Best score tracking** using localStorage
- **Level selection** with arrow keys

---

## Concepts

- **Fisher-Yates Shuffle**: Efficient array randomization
- **Flip Animation**: Interpolate `flipProgress` from 0 → 1
- **LocalStorage**: Persist best moves/time per difficulty
- **Difficulty Switching**: Change grid size dynamically

---

## Code

### 1. Update Types

**File:** `src/games/memory-match/types.ts`

```typescript
export interface Card {
  iconIndex: number;
  flipped: boolean;
  matched: boolean;
  flipProgress: number; // ← NEW: 0 = face-down, 1 = face-up
  row: number;
  col: number;
}

export type Difficulty = '4x4' | '5x4' | '6x6';

export interface DifficultyConfig {
  rows: number;
  cols: number;
  label: string;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  '4x4': { rows: 4, cols: 4, label: '4x4 (8 pairs)' },
  '5x4': { rows: 4, cols: 5, label: '5x4 (10 pairs)' },
  '6x6': { rows: 6, cols: 6, label: '6x6 (18 pairs)' },
};

export const FLIP_SPEED = 0.004; // Progress per ms

export interface MemoryState {
  board: Card[];
  rows: number;
  cols: number;
  cellSize: number;
  boardOffsetX: number;
  boardOffsetY: number;

  difficulty: Difficulty; // ← NEW
  phase: Phase;
  firstPick: number | null;
  secondPick: number | null;
  revealTimer: number;

  moves: number;
  pairsFound: number;
  totalPairs: number;
  elapsedTime: number;
  timerRunning: boolean;
  gameOver: boolean;

  bestMoves: number | null; // ← NEW: Best score
  bestTime: number | null; // ← NEW: Best time
}
```

---

### 2. Add Fisher-Yates Shuffle

**File:** `src/games/memory-match/systems/BoardSystem.ts`

```typescript
import { DIFFICULTIES, FLIP_SPEED } from '../types';

export class BoardSystem implements Updatable<MemoryState> {
  /** Fisher-Yates shuffle */
  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]; // Swap
    }
    return arr;
  }

  /** Initialize a shuffled board */
  initBoard(state: MemoryState): void {
    const config = DIFFICULTIES[state.difficulty];
    const totalCards = config.rows * config.cols;
    const numPairs = totalCards / 2;

    // Create pairs: [0,0, 1,1, 2,2, ...]
    const pairs: number[] = [];
    for (let i = 0; i < numPairs; i++) {
      pairs.push(i, i); // Add each icon twice
    }

    // Shuffle the pairs
    this.shuffle(pairs);

    // Create Card objects
    const board: Card[] = [];
    for (let i = 0; i < totalCards; i++) {
      const row = Math.floor(i / config.cols);
      const col = i % config.cols;

      board.push({
        iconIndex: pairs[i],
        flipped: false,
        matched: false,
        flipProgress: 0,
        row,
        col,
      });
    }

    state.board = board;
    state.rows = config.rows;
    state.cols = config.cols;
    state.totalPairs = numPairs;
    state.pairsFound = 0;
    state.moves = 0;
    state.elapsedTime = 0;
    state.timerRunning = false;
    state.gameOver = false;
    state.phase = 'idle';
    state.firstPick = null;
    state.secondPick = null;
    state.revealTimer = 0;
  }

  /** Animate flip progress each frame */
  update(state: MemoryState, dt: number): void {
    // Animate all cards
    for (const card of state.board) {
      const target = (card.flipped || card.matched) ? 1 : 0;

      if (card.flipProgress < target) {
        card.flipProgress = Math.min(1, card.flipProgress + FLIP_SPEED * dt);
      } else if (card.flipProgress > target) {
        card.flipProgress = Math.max(0, card.flipProgress - FLIP_SPEED * dt);
      }
    }

    // Handle reveal timer
    if (state.phase === 'two-flipped') {
      state.revealTimer += dt;
      if (state.revealTimer >= REVEAL_DURATION) {
        this.checkMatch(state);
      }
    }
  }

  // ... rest of the methods unchanged ...
}
```

**Key Points:**
- **Fisher-Yates**: In-place shuffle in O(n) time
- **Flip Animation**: `flipProgress` gradually moves toward target (0 or 1)
- **Update Loop**: Called every frame to animate flips

---

### 3. Create Board Renderer with Animations

**File:** `src/games/memory-match/renderers/BoardRenderer.ts`

```typescript
import type { MemoryState } from '../types';
import { GAME_COLOR } from '../types';
import { ICONS } from '../data/icons';

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: MemoryState): void {
    for (const card of state.board) {
      const x = state.boardOffsetX + card.col * state.cellSize;
      const y = state.boardOffsetY + card.row * state.cellSize;
      const size = state.cellSize - 8;

      // Calculate flip scale (simulate 3D rotation)
      const scaleX = Math.abs(Math.cos(card.flipProgress * Math.PI));
      const offsetX = (size * (1 - scaleX)) / 2;

      ctx.save();
      ctx.translate(x + 4 + offsetX, y + 4);
      ctx.scale(scaleX, 1);

      // Show icon when mostly flipped (> 50%)
      if (card.flipProgress > 0.5) {
        // Face-up
        ctx.fillStyle = card.matched ? '#2e7d32' : 'white';
        ctx.fillRect(0, 0, size, size);

        const icon = ICONS[card.iconIndex];
        ctx.scale(1 / scaleX, 1); // Undo X scale for emoji
        ctx.fillStyle = '#000';
        ctx.font = `${size * 0.6}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, size / 2, size / 2);
      } else {
        // Face-down
        ctx.fillStyle = GAME_COLOR;
        ctx.fillRect(0, 0, size, size);

        ctx.scale(1 / scaleX, 1); // Undo X scale for "?"
        ctx.fillStyle = 'white';
        ctx.font = `${size * 0.5}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', size / 2, size / 2);
      }

      ctx.restore();
    }
  }
}
```

**Why:**
- **3D Flip Effect**: Use `Math.cos()` to simulate card rotation
- **Show Icon**: Only render emoji when `flipProgress > 0.5` (past halfway)
- **Scale Compensation**: Use `1 / scaleX` to keep text unscaled

---

### 4. Add LocalStorage for Best Scores

**File:** `src/games/memory-match/systems/ScoreSystem.ts`

```typescript
const LS_PREFIX = 'memory_match_';

export class ScoreSystem implements Updatable<MemoryState> {
  update(state: MemoryState, dt: number): void {
    if (state.timerRunning) {
      state.elapsedTime += dt;
    }

    // Save best scores when game ends
    if (state.gameOver && state.phase === 'won') {
      this.saveBestIfNeeded(state);
    }
  }

  /** Load best scores from localStorage */
  loadBest(state: MemoryState): void {
    const key = `${LS_PREFIX}${state.difficulty}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const data = JSON.parse(saved);
      state.bestMoves = data.moves ?? null;
      state.bestTime = data.time ?? null;
    } else {
      state.bestMoves = null;
      state.bestTime = null;
    }
  }

  /** Save new best scores if current is better */
  private saveBestIfNeeded(state: MemoryState): void {
    let shouldSave = false;

    if (state.bestMoves === null || state.moves < state.bestMoves) {
      state.bestMoves = state.moves;
      shouldSave = true;
    }
    if (state.bestTime === null || state.elapsedTime < state.bestTime) {
      state.bestTime = state.elapsedTime;
      shouldSave = true;
    }

    if (shouldSave) {
      const key = `${LS_PREFIX}${state.difficulty}`;
      localStorage.setItem(key, JSON.stringify({
        moves: state.bestMoves,
        time: state.bestTime,
      }));
    }
  }

  formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
```

---

### 5. Add Difficulty Switching

**File:** `src/games/memory-match/systems/InputSystem.ts`

```typescript
export class InputSystem {
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(
    private state: MemoryState,
    private canvas: HTMLCanvasElement,
    private boardSystem: BoardSystem,
    private onReset: () => void,
    private onChangeDifficulty: (direction: number) => void,
  ) {
    this.clickHandler = (e: MouseEvent) => this.onClick(e);
    this.keyHandler = (e: KeyboardEvent) => this.onKey(e);
  }

  attach(): void {
    this.canvas.addEventListener('click', this.clickHandler);
    window.addEventListener('keydown', this.keyHandler);
  }

  detach(): void {
    this.canvas.removeEventListener('click', this.clickHandler);
    window.removeEventListener('keydown', this.keyHandler);
  }

  private onKey(e: KeyboardEvent): void {
    if (e.key === ' ') {
      // Spacebar: restart game
      this.onReset();
    } else if (e.key === 'ArrowLeft') {
      this.onChangeDifficulty(-1); // Easier
    } else if (e.key === 'ArrowRight') {
      this.onChangeDifficulty(1); // Harder
    }
  }

  // ... rest of onClick method ...
}
```

---

### 6. Wire Everything in Engine

**File:** `src/games/memory-match/MemoryEngine.ts`

```typescript
export class MemoryEngine {
  constructor(canvas: HTMLCanvasElement) {
    // ... existing setup ...

    const difficulty: Difficulty = '4x4';

    this.state = {
      board: [],
      rows: 4,
      cols: 4,
      cellSize: 0,
      boardOffsetX: 0,
      boardOffsetY: 0,
      difficulty,
      phase: 'idle',
      firstPick: null,
      secondPick: null,
      revealTimer: 0,
      moves: 0,
      pairsFound: 0,
      totalPairs: 0,
      elapsedTime: 0,
      timerRunning: false,
      gameOver: false,
      bestMoves: null,
      bestTime: null,
    };

    this.boardSystem.initBoard(this.state); // ← Initialize with shuffle
    this.scoreSystem.loadBest(this.state); // ← Load best scores

    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      this.boardSystem,
      () => this.reset(),
      (dir: number) => this.changeDifficulty(dir),
    );

    // ... rest of constructor ...
  }

  private reset(): void {
    this.boardSystem.initBoard(this.state);
    this.scoreSystem.loadBest(this.state);
    this.computeLayout();
  }

  private changeDifficulty(direction: number): void {
    const difficulties: Difficulty[] = ['4x4', '5x4', '6x6'];
    const currentIndex = difficulties.indexOf(this.state.difficulty);
    const newIndex = Math.max(0, Math.min(2, currentIndex + direction));

    if (newIndex !== currentIndex) {
      this.state.difficulty = difficulties[newIndex];
      this.reset();
    }
  }

  // ... rest of the code ...
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Play a game**: Cards are now randomized!
3. **Watch animations**: Cards flip smoothly with 3D rotation
4. **Win a game**: Best scores are saved to localStorage
5. **Press ← / →**: Change difficulty (4×4, 5×4, 6×6)
6. **Press Space**: Restart current difficulty

---

## What You Learned

✅ Implement Fisher-Yates shuffle for randomization  
✅ Create smooth flip animations with `Math.cos()`  
✅ Use localStorage to persist high scores  
✅ Build difficulty selection systems  
✅ Complete a full memory card game!

---

## Complete!

You've built a fully functional **Memory Match** game! 🎉

**Source Code:** [`src/games/memory-match/`](../../src/games/memory-match/)

---

## Next Tutorial

→ [Tic-Tac-Toe](../04-tic-tac-toe/README.md) — Learn turn-based gameplay and simple AI algorithms

