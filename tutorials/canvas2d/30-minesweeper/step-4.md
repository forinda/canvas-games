# Step 4: Right-Click Flagging & Win Detection

**Goal:** Add right-click to flag suspected mines and detect victory when all non-mine cells are revealed.

**Time:** ~15 minutes

---

## What You'll Build

- **Right-click flagging** to mark cells you suspect contain mines
- **Flag toggle** -- right-click again to remove a flag
- **Flag rendering** with a red triangular flag on a pole
- **Flag count** tracking how many flags are placed
- **Win detection** -- when all non-mine cells are revealed, the game is won
- **Flagged cells are protected** from accidental left-click reveals

---

## Concepts

- **Context Menu Prevention**: `e.preventDefault()` on the `contextmenu` event stops the browser's right-click menu from appearing
- **Flag Toggle**: If a cell is unrevealed, right-click toggles its `flagged` property and adjusts the flag counter
- **Win Condition**: Iterate all cells. If every non-mine cell is revealed, the player wins. Note: flagging is NOT required to win -- only revealing all safe cells.

---

## Code

### 1. Update the Board System

**File:** `src/contexts/canvas2d/games/minesweeper/systems/BoardSystem.ts`

Add flag toggling and win detection.

```typescript
// Add these methods to the BoardSystem class:

/** Toggle flag on a cell */
toggleFlag(state: MinesweeperState, row: number, col: number): void {
  const cell = state.board[row][col];
  if (cell.revealed) return;
  cell.flagged = !cell.flagged;
  state.flagCount += cell.flagged ? 1 : -1;
}

/** Check if all non-mine cells are revealed */
private checkWin(state: MinesweeperState): void {
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const cell = state.board[r][c];
      if (!cell.mine && !cell.revealed) return;
    }
  }
  state.status = 'won';
}
```

Also add `this.checkWin(state)` at the end of the `reveal` method (after the flood fill), so win is checked after every reveal:

```typescript
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

  this.checkWin(state);  // <-- Check after every reveal
  return true;
}
```

---

### 2. Update the Input System

**File:** `src/contexts/canvas2d/games/minesweeper/systems/InputSystem.ts`

Add right-click handler for flagging.

```typescript
import type { MinesweeperState } from '../types';
import type { BoardSystem } from './BoardSystem';

export class InputSystem {
  private state: MinesweeperState;
  private canvas: HTMLCanvasElement;
  private boardSystem: BoardSystem;
  private onExit: () => void;

  private clickHandler: (e: MouseEvent) => void;
  private contextHandler: (e: MouseEvent) => void;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(state: MinesweeperState, canvas: HTMLCanvasElement, boardSystem: BoardSystem, onExit: () => void) {
    this.state = state; this.canvas = canvas; this.boardSystem = boardSystem;
    this.onExit = onExit;
    this.clickHandler = (e) => this.handleClick(e);
    this.contextHandler = (e) => this.handleRightClick(e);
    this.keyHandler = (e) => this.handleKey(e);
  }

  attach(): void {
    this.canvas.addEventListener('click', this.clickHandler);
    this.canvas.addEventListener('contextmenu', this.contextHandler);
    window.addEventListener('keydown', this.keyHandler);
  }

  detach(): void {
    this.canvas.removeEventListener('click', this.clickHandler);
    this.canvas.removeEventListener('contextmenu', this.contextHandler);
    window.removeEventListener('keydown', this.keyHandler);
  }

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

    if (!s.firstClick) {
      s.firstClick = true; s.status = 'playing';
      this.boardSystem.placeMines(s, cell.row, cell.col);
    }

    this.boardSystem.reveal(s, cell.row, cell.col);
  }

  private handleRightClick(e: MouseEvent): void {
    e.preventDefault();
    const s = this.state;
    if (s.status === 'won' || s.status === 'lost') return;

    const { x, y } = this.getCanvasPos(e);
    const cell = this.getCellFromPos(x, y);
    if (!cell) return;

    this.boardSystem.toggleFlag(s, cell.row, cell.col);
  }

  private handleKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') this.onExit();
    if (e.key === 'r' || e.key === 'R') {
      this.boardSystem.initBoard(this.state);
      this.boardSystem.resetTimer();
    }
  }
}
```

---

### 3. Update the Board Renderer

**File:** `src/contexts/canvas2d/games/minesweeper/renderers/BoardRenderer.ts`

Add flag drawing for flagged cells.

```typescript
// Add to the cell rendering loop, after drawing unrevealed cells:
if (cell.flagged) {
  this.drawFlag(ctx, cx, cy, cellSize);
}

// Add the drawFlag method:
private drawFlag(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const s = size * 0.25;
  // Pole
  ctx.strokeStyle = '#aaa'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 1.2);
  ctx.lineTo(cx, cy + s);
  ctx.stroke();
  // Flag triangle
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 1.2);
  ctx.lineTo(cx + s * 1.2, cy - s * 0.4);
  ctx.lineTo(cx, cy + s * 0.2);
  ctx.closePath();
  ctx.fill();
  // Base
  ctx.fillStyle = '#aaa';
  ctx.fillRect(cx - s * 0.6, cy + s, s * 1.2, 2);
}
```

The complete cell rendering block should look like:

```typescript
if (cell.revealed) {
  if (cell.mine) {
    this.drawMine(ctx, cx, cy, cellSize);
  } else if (cell.adjacentMines > 0) {
    this.drawNumber(ctx, cx, cy, cellSize, cell.adjacentMines);
  }
} else if (cell.flagged) {
  this.drawFlag(ctx, cx, cy, cellSize);
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Minesweeper game
3. **Observe:**
   - **Right-click** a cell -- a red **flag** appears
   - Right-click again -- the flag is removed
   - **Left-click** a flagged cell -- nothing happens (protected)
   - Reveal all non-mine cells -- the game detects a **WIN**
   - Flags do not affect win condition -- only reveals matter
   - Press **R** to restart, **ESC** to exit

---

## Challenges

**Easy:**
- Change the flag color from red to orange.
- Add a flag counter display somewhere on screen.

**Medium:**
- Implement chord-reveal: left-clicking a revealed number that has the correct number of adjacent flags reveals the remaining unflagged neighbors.

**Hard:**
- Add a "question mark" state as a third toggle option (unrevealed -> flagged -> question -> unrevealed).

---

## What You Learned

- Handling right-click events with `contextmenu` and `preventDefault`
- Implementing flag toggle with a counter
- Win detection by checking all non-mine cells are revealed
- Protecting flagged cells from accidental reveals
- Drawing flag icons with triangles and lines on canvas

**Next:** Difficulties, timer, mine counter, and final polish!
