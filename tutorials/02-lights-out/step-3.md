# Step 3: Win Detection & Restart

**Goal:** Detect when all lights are off, show a win screen, and add a restart button.

**Time:** ~15 minutes

---

## What You'll Build

A complete game loop: win when all lights are off, then reset to play again.

```
All lights off:
┌───────────────────────┐
│  🎉 Level Complete!   │
│    [Press R] Restart  │
└───────────────────────┘
```

---

## Concepts

- **Win Condition**: Check if every cell is `false`
- **Game States**: `'playing'` vs `'level-complete'`
- **Keyboard Input**: Press `R` to reset

---

## Code

### 1. Update Types

**File:** `src/games/lights-out/types.ts`

```typescript
export type GameStatus = 'playing' | 'level-complete';

export interface LightsOutState {
  board: Cell[][];
  moves: number;
  status: GameStatus; // ← NEW
  offsetX: number;
  offsetY: number;
  cellSize: number;
}
```

---

### 2. Add Win Detection

**File:** `src/games/lights-out/systems/BoardSystem.ts`

```typescript
export class BoardSystem {
  /** Load/reset the puzzle */
  loadLevel(state: LightsOutState, pattern: number[][]): void {
    state.board = pattern.map((row) =>
      row.map((val) => ({ on: val === 1 }))
    );
    state.moves = 0;
    state.status = 'playing';
  }

  toggle(state: LightsOutState, row: number, col: number): void {
    if (state.status !== 'playing') return; // ← Don't allow clicks after win

    // ... existing toggle logic ...

    state.moves++;

    // Check win condition after every move
    if (this.isWin(state)) {
      state.status = 'level-complete';
    }
  }

  /** Check if all lights are off */
  isWin(state: LightsOutState): boolean {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (state.board[row][col].on) {
          return false; // Found a light that's still on
        }
      }
    }
    return true; // All lights are off!
  }
}
```

**Why:**
- `isWin()` iterates through the entire board to check if every cell is `false`
- After each toggle, check if the player won
- Prevent further clicks after winning

---

### 3. Add Restart Logic

**File:** `src/games/lights-out/systems/InputSystem.ts`

```typescript
export class InputSystem {
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(
    private state: LightsOutState,
    private canvas: HTMLCanvasElement,
    private boardSystem: BoardSystem,
    private onReset: () => void, // ← NEW: Callback to reset game
  ) {
    this.clickHandler = (e: MouseEvent) => this.onClick(e);
    this.keyHandler = (e: KeyboardEvent) => this.onKey(e);
  }

  attach(): void {
    this.canvas.addEventListener('click', this.clickHandler);
    window.addEventListener('keydown', this.keyHandler); // ← Listen for keyboard
  }

  detach(): void {
    this.canvas.removeEventListener('click', this.clickHandler);
    window.removeEventListener('keydown', this.keyHandler);
  }

  private onKey(e: KeyboardEvent): void {
    if (e.key === 'r' || e.key === 'R') {
      this.onReset(); // Trigger reset in the engine
    }
  }

  // ... rest of onClick code ...
}
```

---

### 4. Wire Up Reset in Engine

**File:** `src/games/lights-out/LightsOutEngine.ts`

```typescript
export class LightsOutEngine {
  private initialPattern: number[][]; // ← Store starting pattern

  constructor(canvas: HTMLCanvasElement) {
    // ... canvas setup ...

    this.initialPattern = [
      [1, 1, 0, 1, 0],
      [0, 1, 1, 0, 1],
      [1, 0, 1, 1, 0],
      [0, 1, 0, 1, 1],
      [1, 0, 1, 0, 1],
    ];

    this.state = {
      board: [],
      moves: 0,
      status: 'playing',
      offsetX: 0,
      offsetY: 0,
      cellSize: 0,
    };

    this.boardSystem = new BoardSystem();
    this.boardSystem.loadLevel(this.state, this.initialPattern); // ← Use loadLevel

    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      this.boardSystem,
      () => this.reset(), // ← Pass reset callback
    );

    this.inputSystem.attach();
    this.computeLayout();
  }

  private reset(): void {
    this.boardSystem.loadLevel(this.state, this.initialPattern);
  }

  private render(): void {
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.renderBoard();
    this.renderHUD();
    
    if (this.state.status === 'level-complete') {
      this.renderWinScreen(); // ← NEW
    }
  }

  private renderWinScreen(): void {
    const W = this.ctx.canvas.width;
    const H = this.ctx.canvas.height;

    // Semi-transparent overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, W, H);

    // Win message
    this.ctx.fillStyle = GAME_COLOR;
    this.ctx.font = 'bold 48px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🎉 Level Complete!', W / 2, H / 2 - 30);

    this.ctx.fillStyle = 'white';
    this.ctx.font = '24px sans-serif';
    this.ctx.fillText(`Solved in ${this.state.moves} moves`, W / 2, H / 2 + 20);

    this.ctx.font = '20px sans-serif';
    this.ctx.fillStyle = '#aaa';
    this.ctx.fillText('Press [R] to restart', W / 2, H / 2 + 60);
  }

  // ... rest of the code ...
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Turn off all lights**: Click strategically until the board is all dark
3. **Win screen**: Should show "🎉 Level Complete!" overlay
4. **Press R**: Resets to the starting pattern

---

## Strategy Tip

To solve the puzzle quickly, try this approach:
1. Start from the **top row**
2. For each light that's ON in row 1, click the cell **directly below** it in row 2
3. Move to the next row and repeat
4. This "chasing lights" technique works on many patterns!

---

## What You Learned

✅ Implement win condition by checking all cells  
✅ Use a state machine (`'playing'` → `'level-complete'`)  
✅ Draw overlay UI on top of the game board  
✅ Handle keyboard input for game controls

---

## Next Step

→ [Step 4: Move Counter & Polish](./step-4.md) — Add ripple animations, multiple levels, and visual polish
