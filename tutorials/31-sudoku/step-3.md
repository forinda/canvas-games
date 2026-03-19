# Step 3: Cell Selection & Number Input

**Goal:** Click to select cells, type numbers to fill them, and navigate with arrow keys.

**Time:** ~15 minutes

---

## What You'll Build

- **Click to select** a cell -- highlighted in a brighter color
- **Row/column/box highlighting** so you can see the selected cell's zone
- **Number keys 1-9** to place a digit in the selected cell
- **0/Delete/Backspace** to clear a cell
- **Arrow keys** to navigate between cells
- **Given cell protection** -- pre-filled cells cannot be edited

---

## Concepts

- **Selection Highlighting**: When a cell is selected, we highlight the entire row, column, and 3x3 box it belongs to. This helps the player visually identify which cells share constraints.
- **Hit Testing**: Convert mouse click coordinates to grid row/col using `Math.floor((mouseX - offsetX) / cellSize)`. If the result is within [0, 8], the click is on the board.
- **Input Guards**: Before accepting a number placement, check that a cell is selected, the game is not won, and the cell is not a given. These guards prevent invalid state changes.

---

## Code

### 1. Update the Board Renderer

**File:** `src/games/sudoku/renderers/BoardRenderer.ts`

Add selection highlighting and same-value highlighting.

```typescript
import { GRID, BOX, type SudokuState } from '../types';

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: SudokuState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Clear background
    ctx.fillStyle = '#0e0e1a';
    ctx.fillRect(0, 0, W, H);

    const { offsetX, offsetY, cellSize, board, selectedRow, selectedCol } = state;

    // Draw cells
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const x = offsetX + c * cellSize;
        const y = offsetY + r * cellSize;
        const cell = board[r][c];

        // Cell background -- layered highlighting
        let bg = '#1a1a2e';

        // Highlight same row, column, or box as selected cell
        if (selectedRow >= 0 && selectedCol >= 0) {
          const selBoxR = Math.floor(selectedRow / BOX);
          const selBoxC = Math.floor(selectedCol / BOX);
          const cellBoxR = Math.floor(r / BOX);
          const cellBoxC = Math.floor(c / BOX);
          if (
            r === selectedRow ||
            c === selectedCol ||
            (cellBoxR === selBoxR && cellBoxC === selBoxC)
          ) {
            bg = '#252545';
          }
        }

        // Selected cell itself gets the brightest highlight
        if (r === selectedRow && c === selectedCol) {
          bg = '#3a3a6a';
        }

        // Highlight cells with the same value as the selected cell
        if (
          selectedRow >= 0 &&
          selectedCol >= 0 &&
          board[selectedRow][selectedCol].value !== 0 &&
          cell.value === board[selectedRow][selectedCol].value &&
          !(r === selectedRow && c === selectedCol)
        ) {
          bg = '#2e2e55';
        }

        ctx.fillStyle = bg;
        ctx.fillRect(x, y, cellSize, cellSize);

        // Draw value
        if (cell.value !== 0) {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const fontSize = Math.max(12, cellSize * 0.55);
          if (cell.given) {
            ctx.font = `bold ${fontSize}px monospace`;
            ctx.fillStyle = '#e0e0e0';
          } else {
            ctx.font = `${fontSize}px monospace`;
            ctx.fillStyle = '#7e9aff';
          }
          ctx.fillText(String(cell.value), x + cellSize / 2, y + cellSize / 2 + 1);
        }
      }
    }

    // Draw thin grid lines
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID; i++) {
      const y = offsetY + i * cellSize;
      ctx.beginPath();
      ctx.moveTo(offsetX, y);
      ctx.lineTo(offsetX + GRID * cellSize, y);
      ctx.stroke();
      const x = offsetX + i * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, offsetY);
      ctx.lineTo(x, offsetY + GRID * cellSize);
      ctx.stroke();
    }

    // Draw thick box borders
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 2.5;
    for (let i = 0; i <= BOX; i++) {
      const y = offsetY + i * BOX * cellSize;
      ctx.beginPath();
      ctx.moveTo(offsetX, y);
      ctx.lineTo(offsetX + GRID * cellSize, y);
      ctx.stroke();
      const x = offsetX + i * BOX * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, offsetY);
      ctx.lineTo(x, offsetY + GRID * cellSize);
      ctx.stroke();
    }

    // Outer border
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 3;
    ctx.strokeRect(offsetX, offsetY, GRID * cellSize, GRID * cellSize);
  }
}
```

**What's happening:**
- When a cell is selected, three layers of highlighting kick in:
  1. **Zone highlight** (`#252545`): all cells in the same row, column, or 3x3 box.
  2. **Selected cell** (`#3a3a6a`): the cell itself stands out brightest.
  3. **Same-value highlight** (`#2e2e55`): all other cells with the same number glow, helping you spot duplicates.
- The priority order matters: the selected cell overrides the zone color, and the zone color overrides the default.

---

### 2. Create the Input System

**File:** `src/games/sudoku/systems/InputSystem.ts`

Handles mouse clicks and keyboard input.

```typescript
import { GRID, type SudokuState } from '../types';
import type { BoardSystem } from './BoardSystem';

export class InputSystem {
  private state: SudokuState;
  private canvas: HTMLCanvasElement;
  private boardSystem: BoardSystem;

  private keyHandler: (e: KeyboardEvent) => void;
  private clickHandler: (e: MouseEvent) => void;

  constructor(
    state: SudokuState,
    canvas: HTMLCanvasElement,
    boardSystem: BoardSystem,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.boardSystem = boardSystem;

    this.keyHandler = this.handleKey.bind(this);
    this.clickHandler = this.handleClick.bind(this);
  }

  attach(): void {
    window.addEventListener('keydown', this.keyHandler);
    this.canvas.addEventListener('click', this.clickHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyHandler);
    this.canvas.removeEventListener('click', this.clickHandler);
  }

  private handleKey(e: KeyboardEvent): void {
    const key = e.key;

    // Number keys 1-9: place a number
    if (key >= '1' && key <= '9') {
      this.boardSystem.placeNumber(this.state, parseInt(key));
      return;
    }

    // 0, Delete, Backspace: clear the cell
    if (key === '0' || key === 'Delete' || key === 'Backspace') {
      this.boardSystem.clearCell(this.state);
      return;
    }

    // Arrow keys: navigate selection
    if (key === 'ArrowUp' && this.state.selectedRow > 0) {
      this.state.selectedRow--;
    } else if (key === 'ArrowDown' && this.state.selectedRow < GRID - 1) {
      this.state.selectedRow++;
    } else if (key === 'ArrowLeft' && this.state.selectedCol > 0) {
      this.state.selectedCol--;
    } else if (key === 'ArrowRight' && this.state.selectedCol < GRID - 1) {
      this.state.selectedCol++;
    }
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const s = this.state;

    // Convert mouse position to grid coordinates
    const col = Math.floor((mx - s.offsetX) / s.cellSize);
    const row = Math.floor((my - s.offsetY) / s.cellSize);

    if (row >= 0 && row < GRID && col >= 0 && col < GRID) {
      s.selectedRow = row;
      s.selectedCol = col;
    }
  }
}
```

**What's happening:**
- **Click handling**: We convert pixel coordinates to grid row/col by subtracting the board offset and dividing by cell size. If the result is within bounds (0-8), we update the selection.
- **Number keys**: Pressing 1-9 calls `placeNumber()` on the board system, which will place the digit (with guards we are about to add).
- **Clear keys**: 0, Delete, and Backspace all clear the selected cell.
- **Arrow keys**: Move the selection up/down/left/right with boundary clamping.

---

### 3. Update the Board System

**File:** `src/games/sudoku/systems/BoardSystem.ts`

Add `placeNumber()` and `clearCell()` methods.

```typescript
import {
  GRID,
  type SudokuState,
  type Cell,
} from '../types';
import { generatePuzzle } from '../data/puzzles';

export class BoardSystem {
  /** Initialise (or re-initialise) the board for a given difficulty. */
  initBoard(state: SudokuState): void {
    const { puzzle, solution } = generatePuzzle(state.difficulty);
    state.solution = solution;
    state.board = [];
    for (let r = 0; r < GRID; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < GRID; c++) {
        row.push({
          value: puzzle[r][c],
          given: puzzle[r][c] !== 0,
          notes: new Set(),
          invalid: false,
        });
      }
      state.board.push(row);
    }
    state.status = 'playing';
    state.selectedRow = -1;
    state.selectedCol = -1;
    state.notesMode = false;
    state.timer = 0;
    state.undoStack = [];
  }

  /** Place a number at the selected cell. */
  placeNumber(state: SudokuState, num: number): void {
    const { selectedRow: r, selectedCol: c } = state;
    if (r < 0 || c < 0 || state.status === 'won') return;
    const cell = state.board[r][c];
    if (cell.given) return; // cannot edit given cells

    if (num === 0) {
      cell.value = 0;
    } else {
      cell.value = num;
      cell.notes.clear();
    }
  }

  /** Clear the selected cell. */
  clearCell(state: SudokuState): void {
    this.placeNumber(state, 0);
  }

  update(_state: SudokuState, _dt: number): void {
    // Timer will be added in Step 6
  }
}
```

**What's happening:**
- `placeNumber()` has three guards: is a cell selected? Is the game still playing? Is the cell editable (not given)? Only if all pass does it modify the cell.
- Setting `num = 0` clears the cell. Setting 1-9 places the digit and clears any notes.
- `clearCell()` is just a shorthand for `placeNumber(state, 0)`.

---

### 4. Update the Engine

**File:** `src/games/sudoku/SudokuEngine.ts`

Wire up the InputSystem.

```typescript
import type { SudokuState, Difficulty } from './types';
import { GRID } from './types';
import { BoardSystem } from './systems/BoardSystem';
import { InputSystem } from './systems/InputSystem';
import { BoardRenderer } from './renderers/BoardRenderer';

export class SudokuEngine {
  private ctx: CanvasRenderingContext2D;
  private state: SudokuState;
  private running = false;
  private rafId = 0;
  private boardSystem: BoardSystem;
  private inputSystem: InputSystem;
  private boardRenderer: BoardRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = {
      board: [],
      solution: [],
      difficulty: 'easy',
      status: 'playing',
      selectedRow: -1,
      selectedCol: -1,
      notesMode: false,
      timer: 0,
      undoStack: [],
      offsetX: 0,
      offsetY: 0,
      cellSize: 0,
      hudHeight: 44,
    };

    this.boardSystem = new BoardSystem();
    this.boardRenderer = new BoardRenderer();
    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      this.boardSystem,
    );

    this.boardSystem.initBoard(this.state);
    this.computeLayout();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.computeLayout();
    };

    this.inputSystem.attach();
    window.addEventListener('resize', this.resizeHandler);
  }

  start(): void {
    this.running = true;
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
    window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;
    this.boardRenderer.render(this.ctx, this.state);
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private computeLayout(): void {
    const W = this.ctx.canvas.width;
    const H = this.ctx.canvas.height;
    const hudTop = this.state.hudHeight;
    const padding = 20;
    const bottomPad = 80;

    const availW = W - padding * 2;
    const availH = H - hudTop - bottomPad - padding;

    const cellSize = Math.max(16, Math.min(
      Math.floor(availW / GRID),
      Math.floor(availH / GRID),
      50,
    ));
    this.state.cellSize = cellSize;

    const boardW = GRID * cellSize;
    const boardH = GRID * cellSize;

    this.state.offsetX = Math.floor((W - boardW) / 2);
    this.state.offsetY = Math.floor(hudTop + (availH - boardH) / 2);
  }
}
```

---

### 5. Unchanged Files

These files are the same as the previous step: `types.ts`, `data/puzzles.ts`, `adapters/PlatformAdapter.ts`, `index.ts`

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Sudoku game
3. **Test these interactions:**
   - **Click a cell** -- it highlights in a brighter blue, and the entire row, column, and box dim slightly
   - **Press 1-9** -- the number appears in the cell (in lighter blue, since it is player-placed, not bold)
   - **Click a given cell** (bold white number) and press a number -- **nothing happens** (givens are protected)
   - **Press Delete or Backspace** on a player-placed number -- it clears
   - **Use arrow keys** to navigate between cells
   - **Place the same number** as another cell in the row -- both numbers appear (validation comes in Step 4)
   - **Click a cell with a number** -- all cells with the same number subtly glow

---

## Challenges

**Easy:**
- Add a visible cursor style change (pointer) when hovering over the board area.

**Medium:**
- Make the first arrow key press select cell (0,0) if no cell is currently selected (instead of doing nothing).

**Hard:**
- Add Tab/Shift+Tab navigation that moves to the next/previous empty cell, skipping givens.

---

## What You Learned

- Converting mouse click coordinates to grid positions with offset math
- Layered cell highlighting: zone, selection, and same-value highlights
- Protecting given cells from player edits
- Keyboard navigation with boundary clamping
- Attaching and detaching event listeners for clean lifecycle management

**Next:** Validation and conflict highlighting -- catch mistakes in real time!
