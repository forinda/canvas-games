# Step 3: Click to Reveal & Flood Fill

**Goal:** Reveal cells on click with flood-fill auto-expansion for empty (zero-adjacent) areas.

**Time:** ~15 minutes

---

## What You'll Build

- **Cell reveal** that shows the mine count or empty space
- **Mine hit detection** that triggers game-over and reveals all mines
- **Flood fill** for zero-count cells that automatically reveals all connected empty cells and their numbered borders
- **Stack-based algorithm** for efficient iterative flood fill (no recursion limit)

---

## Concepts

- **Flood Fill**: When a cell with `adjacentMines === 0` is revealed, automatically reveal all 8 neighbors. If any of those are also zero, continue expanding. Stop at numbered cells (reveal them but do not expand further).
- **Stack-Based Iteration**: Use an explicit stack `[row, col][]` instead of recursion to avoid call stack overflow on large boards.
- **Game Over on Mine**: When a mine is clicked, immediately set `status = 'lost'` and reveal all mines on the board.

---

## Code

### 1. Update the Board System

**File:** `src/contexts/canvas2d/games/minesweeper/systems/BoardSystem.ts`

Add reveal with flood fill and mine-hit game-over.

```typescript
import type { MinesweeperState, Cell } from '../types';
import { DIFFICULTY_PRESETS } from '../types';

export class BoardSystem {
  private timerAccum = 0;

  initBoard(state: MinesweeperState): void {
    const preset = DIFFICULTY_PRESETS[state.difficulty];
    state.cols = preset.cols; state.rows = preset.rows;
    state.totalMines = preset.mines; state.flagCount = 0;
    state.status = 'idle'; state.timer = 0; state.firstClick = false;
    this.timerAccum = 0;
    state.board = [];
    for (let r = 0; r < state.rows; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < state.cols; c++) {
        row.push({ revealed: false, flagged: false, mine: false, adjacentMines: 0 });
      }
      state.board.push(row);
    }
  }

  placeMines(state: MinesweeperState, safeRow: number, safeCol: number): void {
    const { rows, cols, totalMines, board } = state;
    const safeSet = new Set<string>();
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = safeRow + dr; const nc = safeCol + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) safeSet.add(`${nr},${nc}`);
      }
    }
    let placed = 0;
    while (placed < totalMines) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (board[r][c].mine || safeSet.has(`${r},${c}`)) continue;
      board[r][c].mine = true; placed++;
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c].mine) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr; const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) count++;
          }
        }
        board[r][c].adjacentMines = count;
      }
    }
  }

  /** Reveal a cell. Flood-fill if adjacentMines === 0. Returns false if a mine was hit. */
  reveal(state: MinesweeperState, row: number, col: number): boolean {
    const cell = state.board[row][col];
    if (cell.revealed || cell.flagged) return true;

    cell.revealed = true;

    if (cell.mine) {
      state.status = 'lost';
      this.revealAllMines(state);
      return false;
    }

    if (cell.adjacentMines === 0) {
      this.floodFill(state, row, col);
    }

    return true;
  }

  update(state: MinesweeperState, dt: number): void {
    if (state.status !== 'playing') return;
    this.timerAccum += dt;
    if (this.timerAccum >= 1000) {
      const seconds = Math.floor(this.timerAccum / 1000);
      state.timer += seconds;
      this.timerAccum -= seconds * 1000;
    }
  }

  resetTimer(): void { this.timerAccum = 0; }

  private floodFill(state: MinesweeperState, row: number, col: number): void {
    const stack: [number, number][] = [[row, col]];
    while (stack.length > 0) {
      const [r, c] = stack.pop()!;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr; const nc = c + dc;
          if (nr < 0 || nr >= state.rows || nc < 0 || nc >= state.cols) continue;
          const neighbour = state.board[nr][nc];
          if (neighbour.revealed || neighbour.flagged || neighbour.mine) continue;
          neighbour.revealed = true;
          if (neighbour.adjacentMines === 0) {
            stack.push([nr, nc]);
          }
        }
      }
    }
  }

  private revealAllMines(state: MinesweeperState): void {
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        if (state.board[r][c].mine) state.board[r][c].revealed = true;
      }
    }
  }
}
```

**What's happening:**
- `reveal` first checks if the cell is already revealed or flagged. If the cell is a mine, the game is lost and all mines are revealed.
- If `adjacentMines === 0`, `floodFill` is called. It uses an explicit stack to iteratively process neighbors.
- Each neighbor is revealed. If it is also a zero-count cell, it is pushed onto the stack for further processing. Numbered cells are revealed but not expanded.
- This produces the satisfying "cascade reveal" when clicking an empty area.

---

### 2. Update the Input System

**File:** `src/contexts/canvas2d/games/minesweeper/systems/InputSystem.ts`

Use the board system's `reveal` method instead of direct cell manipulation.

```typescript
import type { MinesweeperState } from '../types';
import type { BoardSystem } from './BoardSystem';

export class InputSystem {
  private state: MinesweeperState;
  private canvas: HTMLCanvasElement;
  private boardSystem: BoardSystem;
  private clickHandler: (e: MouseEvent) => void;

  constructor(state: MinesweeperState, canvas: HTMLCanvasElement, boardSystem: BoardSystem) {
    this.state = state; this.canvas = canvas; this.boardSystem = boardSystem;
    this.clickHandler = (e: MouseEvent) => this.handleClick(e);
  }

  attach(): void { this.canvas.addEventListener('click', this.clickHandler); }
  detach(): void { this.canvas.removeEventListener('click', this.clickHandler); }

  private getCanvasPos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height),
    };
  }

  private getCellFromPos(x: number, y: number): { row: number; col: number } | null {
    const s = this.state;
    const col = Math.floor((x - s.offsetX) / s.cellSize);
    const row = Math.floor((y - s.offsetY) / s.cellSize);
    if (row < 0 || row >= s.rows || col < 0 || col >= s.cols) return null;
    return { row, col };
  }

  private handleClick(e: MouseEvent): void {
    const s = this.state;
    if (s.status === 'won' || s.status === 'lost') return;

    const { x, y } = this.getCanvasPos(e);
    const cell = this.getCellFromPos(x, y);
    if (!cell) return;

    // First click -- place mines
    if (!s.firstClick) {
      s.firstClick = true;
      s.status = 'playing';
      this.boardSystem.placeMines(s, cell.row, cell.col);
    }

    this.boardSystem.reveal(s, cell.row, cell.col);
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Minesweeper game
3. **Observe:**
   - Click an empty area -- a **large region floods open** revealing numbers around the edges
   - Click a numbered cell -- just that single cell reveals
   - Click a mine -- all mines are revealed and the game stops (**GAME OVER**)
   - First click is always safe with a good opening area
   - The flood fill creates satisfying cascading reveals

---

## Challenges

**Easy:**
- Add a brief delay between each flood-fill reveal for an animated cascade effect.

**Medium:**
- Highlight the mine that was clicked in a different color (bright red vs dark red for others).

**Hard:**
- Implement chord-reveal: clicking an already-revealed number with the correct number of adjacent flags reveals remaining neighbors.

---

## What You Learned

- Stack-based flood fill algorithm for iterative grid expansion
- Revealing numbered borders without expanding through them
- Game-over handling that reveals all mines
- The cascade effect that makes Minesweeper satisfying to play
- First-click safety combined with flood fill for guaranteed good openings

**Next:** Right-click flagging and win detection -- flag mines and win the game!
