# Step 3: Pair Matching Logic

**Goal:** Flip exactly 2 cards at a time, check if they match, and either keep them face-up or flip them back after a delay.

**Time:** ~15 minutes

---

## What You'll Build

The core memory game mechanic:
1. **First click** → Flip card A
2. **Second click** → Flip card B
3. **Wait 1.5 seconds** → Check if A and B match
4. **If match** → Keep both face-up (mark as `matched`)
5. **If no match** → Flip both back to face-down

---

## Concepts

- **Game Phases**: Track state with `'idle'`, `'one-flipped'`, `'two-flipped'`
- **Delayed Actions**: Use a timer to wait before checking matches
- **Match Detection**: Compare `iconIndex` of two cards

---

## Code

### 1. Update Types

**File:** `src/contexts/canvas2d/games/memory-match/types.ts`

```typescript
export type Phase = 'idle' | 'one-flipped' | 'two-flipped';

export const REVEAL_DURATION = 1500; // 1.5 seconds

export interface MemoryState {
  board: Card[];
  rows: number;
  cols: number;
  cellSize: number;
  boardOffsetX: number;
  boardOffsetY: number;

  phase: Phase; // ← NEW
  firstPick: number | null; // ← Index of first card
  secondPick: number | null; // ← Index of second card
  revealTimer: number; // ← Countdown timer (ms)
}
```

---

### 2. Create Board System

**File:** `src/contexts/canvas2d/games/memory-match/systems/BoardSystem.ts`

```typescript
import type { Updatable } from '@core/Updatable';
import type { MemoryState } from '../types';
import { REVEAL_DURATION } from '../types';

export class BoardSystem implements Updatable<MemoryState> {
  /** Flip a card at the given board index */
  flipCard(state: MemoryState, idx: number): void {
    const card = state.board[idx];
    if (card.flipped || card.matched) return;

    card.flipped = true;

    if (state.firstPick === null) {
      // This is the first card flipped
      state.firstPick = idx;
      state.phase = 'one-flipped';
    } else {
      // This is the second card flipped
      state.secondPick = idx;
      state.phase = 'two-flipped';
      state.revealTimer = 0; // Start timer
    }
  }

  /** Called every frame to handle reveal timer and match checking */
  update(state: MemoryState, dt: number): void {
    if (state.phase === 'two-flipped') {
      state.revealTimer += dt;

      // After 1.5 seconds, check if cards match
      if (state.revealTimer >= REVEAL_DURATION) {
        this.checkMatch(state);
      }
    }
  }

  /** Check if the two flipped cards match */
  private checkMatch(state: MemoryState): void {
    if (state.firstPick === null || state.secondPick === null) return;

    const cardA = state.board[state.firstPick];
    const cardB = state.board[state.secondPick];

    if (cardA.iconIndex === cardB.iconIndex) {
      // Match! Keep both face-up
      cardA.matched = true;
      cardB.matched = true;
    } else {
      // No match — flip both back
      cardA.flipped = false;
      cardB.flipped = false;
    }

    // Reset state
    state.firstPick = null;
    state.secondPick = null;
    state.revealTimer = 0;
    state.phase = 'idle';
  }
}
```

**Key Points:**
- **First Pick**: Store index, wait for second pick
- **Second Pick**: Start 1.5-second timer
- **Timer Expiry**: Check if `iconIndex` values match
- **Match Logic**: If match → mark as `matched`, else → flip back

---

### 3. Update Input System

**File:** `src/contexts/canvas2d/games/memory-match/systems/InputSystem.ts`

```typescript
import { BoardSystem } from './BoardSystem';

export class InputSystem {
  // ... existing code ...

  constructor(
    private state: MemoryState,
    private canvas: HTMLCanvasElement,
    private boardSystem: BoardSystem, // ← NEW
  ) {
    this.clickHandler = (e: MouseEvent) => this.onClick(e);
  }

  private onClick(e: MouseEvent): void {
    // Prevent clicks while two cards are already being checked
    if (this.state.phase === 'two-flipped') return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor((x - this.state.boardOffsetX) / this.state.cellSize);
    const row = Math.floor((y - this.state.boardOffsetY) / this.state.cellSize);

    if (row >= 0 && row < this.state.rows && col >= 0 && col < this.state.cols) {
      const index = row * this.state.cols + col;
      this.boardSystem.flipCard(this.state, index); // ← Use BoardSystem
    }
  }
}
```

**Why:** Block clicks during the `'two-flipped'` phase to prevent flipping more cards while checking a match.

---

### 4. Wire Up in Engine

**File:** `src/contexts/canvas2d/games/memory-match/MemoryEngine.ts`

```typescript
import { BoardSystem } from './systems/BoardSystem';

export class MemoryEngine {
  // ... existing properties ...
  private boardSystem: BoardSystem;
  private lastTime: number;

  constructor(canvas: HTMLCanvasElement) {
    // ... existing setup ...

    this.lastTime = 0;

    this.state = {
      board: this.createBoard(4, 4),
      rows: 4,
      cols: 4,
      cellSize: 0,
      boardOffsetX: 0,
      boardOffsetY: 0,
      phase: 'idle', // ← Initialize phase
      firstPick: null,
      secondPick: null,
      revealTimer: 0,
    };

    this.boardSystem = new BoardSystem();
    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      this.boardSystem, // ← Pass BoardSystem
    );

    this.inputSystem.attach();
    this.computeLayout();
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now(); // ← Initialize timer
    this.loop();
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    this.boardSystem.update(this.state, dt); // ← Update timer/matching
    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  // ... rest of the code ...
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Click first card**: It flips to show an emoji
3. **Click second card**:
   - If **matching** → Both stay face-up and turn green
   - If **not matching** → Both flip back after 1.5 seconds
4. **Click third card**: After the timer resets, you can flip new cards

---

## Expected Behavior

| Scenario | Result |
|----------|--------|
| Click 2 matching cards | Both stay face-up, turn green |
| Click 2 non-matching cards | Both flip back after 1.5s |
| Click 3rd card too soon | Click is blocked until timer expires |

---

## What You Learned

✅ Implement game state machines (`idle` → `one-flipped` → `two-flipped`)  
✅ Use a timer to delay actions (reveal before checking)  
✅ Compare card values to detect matches  
✅ Prevent player input during transitions

---

## Next Step

→ [Step 4: Scoring & Win Screen](./step-4.md) — Track moves and time, detect when all pairs are found
