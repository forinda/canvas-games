# Step 5: Notes Mode & Undo

**Goal:** Add pencil-mark notes for candidate tracking and an undo system to reverse mistakes.

**Time:** ~15 minutes

---

## What You'll Build

- **Notes mode toggle** (press N) -- number keys add/remove small pencil marks instead of placing values
- **Pencil marks** rendered as tiny 1-9 digits in a 3x3 sub-grid within each cell
- **Auto-clear notes** when placing a value (notes in the same row/col/box get cleaned up)
- **Undo stack** that saves state before each action and restores it with Z or Ctrl+Z
- **Restart** with R that keeps the same difficulty but generates a fresh puzzle

---

## Concepts

- **Pencil Marks (Notes)**: In paper Sudoku, players write small candidate numbers in cells to track which digits are still possible. We store these as a `Set<number>` on each cell, and render them in a 3x3 mini-grid layout where digit N occupies position `((N-1)/3, (N-1)%3)`.
- **Mode Toggle**: A single boolean `notesMode` changes the meaning of number keys. In normal mode, they place values. In notes mode, they toggle pencil marks.
- **Undo Stack**: Before every action, we push an `UndoEntry` containing the cell coordinates, previous value, and previous notes set. Undo pops the stack and restores that snapshot. This is a simple but effective pattern -- no need for full state cloning.

---

## Code

### 1. Update the Board System

**File:** `src/contexts/canvas2d/games/sudoku/systems/BoardSystem.ts`

Add notes mode handling and the undo system.

```typescript
import {
  GRID,
  BOX,
  type SudokuState,
  type Cell,
  type UndoEntry,
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
    this.validate(state);
  }

  /** Place a number (or toggle a note) at the selected cell. */
  placeNumber(state: SudokuState, num: number): void {
    const { selectedRow: r, selectedCol: c } = state;
    if (r < 0 || c < 0 || state.status === 'won') return;
    const cell = state.board[r][c];
    if (cell.given) return;

    // Save undo entry BEFORE making changes
    const undo: UndoEntry = {
      row: r,
      col: c,
      prevValue: cell.value,
      prevNotes: new Set(cell.notes),
    };
    state.undoStack.push(undo);

    if (state.notesMode) {
      // NOTES MODE: toggle pencil marks
      if (num === 0) {
        cell.notes.clear();
      } else {
        if (cell.notes.has(num)) {
          cell.notes.delete(num);
        } else {
          cell.notes.add(num);
        }
        cell.value = 0; // clear value when adding notes
      }
    } else {
      // NORMAL MODE: place a value
      if (num === 0) {
        cell.value = 0;
      } else {
        cell.value = num;
        cell.notes.clear(); // clear notes when placing value
      }
    }

    this.validate(state);
    this.checkCompletion(state);
  }

  /** Clear the selected cell. */
  clearCell(state: SudokuState): void {
    this.placeNumber(state, 0);
  }

  /** Undo the last action by restoring the saved cell state. */
  undo(state: SudokuState): void {
    if (state.undoStack.length === 0 || state.status === 'won') return;
    const entry = state.undoStack.pop()!;
    const cell = state.board[entry.row][entry.col];
    cell.value = entry.prevValue;
    cell.notes = new Set(entry.prevNotes);
    this.validate(state);
  }

  /** Validate the entire board -- flag conflicting cells. */
  validate(state: SudokuState): void {
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        state.board[r][c].invalid = false;
      }
    }

    // Check rows
    for (let r = 0; r < GRID; r++) {
      this.flagDuplicates(
        state,
        Array.from({ length: GRID }, (_, c) => [r, c] as [number, number]),
      );
    }

    // Check columns
    for (let c = 0; c < GRID; c++) {
      this.flagDuplicates(
        state,
        Array.from({ length: GRID }, (_, r) => [r, c] as [number, number]),
      );
    }

    // Check boxes
    for (let br = 0; br < GRID; br += BOX) {
      for (let bc = 0; bc < GRID; bc += BOX) {
        const positions: [number, number][] = [];
        for (let r = br; r < br + BOX; r++) {
          for (let c = bc; c < bc + BOX; c++) {
            positions.push([r, c]);
          }
        }
        this.flagDuplicates(state, positions);
      }
    }
  }

  private flagDuplicates(state: SudokuState, positions: [number, number][]): void {
    const seen = new Map<number, [number, number][]>();
    for (const [r, c] of positions) {
      const v = state.board[r][c].value;
      if (v === 0) continue;
      if (!seen.has(v)) seen.set(v, []);
      seen.get(v)!.push([r, c]);
    }
    for (const cells of seen.values()) {
      if (cells.length > 1) {
        for (const [r, c] of cells) {
          state.board[r][c].invalid = true;
        }
      }
    }
  }

  private checkCompletion(state: SudokuState): void {
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const cell = state.board[r][c];
        if (cell.value === 0 || cell.invalid) return;
      }
    }
    state.status = 'won';
  }

  update(_state: SudokuState, _dt: number): void {
    // Timer will be added in Step 6
  }
}
```

**What's happening:**

- **Undo entry**: Before every change, we snapshot the cell's current value and notes into an `UndoEntry` and push it onto the stack. The `new Set(cell.notes)` creates a copy so the undo data is not affected by subsequent changes.

- **Notes mode**: When `notesMode` is true and the player presses a number, we toggle that digit in the cell's `notes` Set. If the note was already there, remove it; if not, add it. We also clear the cell's placed value, since a cell with notes should not also have a value.

- **Normal mode**: Places the digit directly, clearing any existing notes. This means switching from notes to placing a number is seamless.

- **Undo**: Pops the last entry and restores the cell. Then re-validates the board. Simple and effective.

---

### 2. Update the Board Renderer

**File:** `src/contexts/canvas2d/games/sudoku/renderers/BoardRenderer.ts`

Add pencil mark rendering inside empty cells.

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

        // Cell background
        let bg = '#1a1a2e';

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

        if (r === selectedRow && c === selectedCol) {
          bg = '#3a3a6a';
        }

        if (
          selectedRow >= 0 &&
          selectedCol >= 0 &&
          board[selectedRow][selectedCol].value !== 0 &&
          cell.value === board[selectedRow][selectedCol].value &&
          !(r === selectedRow && c === selectedCol)
        ) {
          bg = '#2e2e55';
        }

        if (cell.invalid && cell.value !== 0) {
          bg = '#4a1a1a';
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
            ctx.fillStyle = cell.invalid ? '#ff5555' : '#7e9aff';
          }
          ctx.fillText(String(cell.value), x + cellSize / 2, y + cellSize / 2 + 1);
        } else if (cell.notes.size > 0) {
          // DRAW PENCIL MARKS
          // Arrange digits 1-9 in a 3x3 mini-grid inside the cell
          const noteSize = Math.max(7, cellSize * 0.22);
          ctx.font = `${noteSize}px monospace`;
          ctx.fillStyle = '#888';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const third = cellSize / 3;
          for (let n = 1; n <= 9; n++) {
            if (!cell.notes.has(n)) continue;
            const nr = Math.floor((n - 1) / 3); // row 0-2
            const nc = (n - 1) % 3;              // col 0-2
            const nx = x + nc * third + third / 2;
            const ny = y + nr * third + third / 2;
            ctx.fillText(String(n), nx, ny);
          }
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

    // Win overlay
    if (state.status === 'won') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#7e57c2';
      ctx.font = 'bold 36px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Puzzle Complete!', W / 2, H / 2 - 20);

      ctx.fillStyle = '#777';
      ctx.font = '14px monospace';
      ctx.fillText('Press [R] for a new game', W / 2, H / 2 + 25);
    }
  }
}
```

**What's happening with pencil marks:**
- When a cell has no value but has notes, we render tiny digits in a 3x3 arrangement.
- Digit N is placed at row `floor((N-1)/3)` and column `(N-1) % 3` of the mini-grid. So digit 1 goes top-left, digit 5 goes center, digit 9 goes bottom-right.
- Each third of the cell is `cellSize / 3` wide and tall. The text is centered within each third.
- Notes render in a muted gray (`#888`) so they are clearly distinct from placed values.

---

### 3. Update the Input System

**File:** `src/contexts/canvas2d/games/sudoku/systems/InputSystem.ts`

Add N for notes toggle, Z/Ctrl+Z for undo.

```typescript
import { GRID, type SudokuState } from '../types';
import type { BoardSystem } from './BoardSystem';

export class InputSystem {
  private state: SudokuState;
  private canvas: HTMLCanvasElement;
  private boardSystem: BoardSystem;
  private onReset: () => void;

  private keyHandler: (e: KeyboardEvent) => void;
  private clickHandler: (e: MouseEvent) => void;

  constructor(
    state: SudokuState,
    canvas: HTMLCanvasElement,
    boardSystem: BoardSystem,
    onReset: () => void,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.boardSystem = boardSystem;
    this.onReset = onReset;

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

    // R to restart
    if (key === 'r' || key === 'R') {
      this.onReset();
      return;
    }

    // N to toggle notes mode
    if (key === 'n' || key === 'N') {
      this.state.notesMode = !this.state.notesMode;
      return;
    }

    // Z / Ctrl+Z for undo
    if ((key === 'z' || key === 'Z') && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.boardSystem.undo(this.state);
      return;
    }
    if (key === 'u' || key === 'U') {
      this.boardSystem.undo(this.state);
      return;
    }

    // Number keys 1-9
    if (key >= '1' && key <= '9') {
      this.boardSystem.placeNumber(this.state, parseInt(key));
      return;
    }

    // 0, Delete, Backspace to clear
    if (key === '0' || key === 'Delete' || key === 'Backspace') {
      this.boardSystem.clearCell(this.state);
      return;
    }

    // Arrow keys
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
- **N key** flips `notesMode`. The board system checks this flag to decide whether to place a value or toggle a note.
- **Ctrl+Z** (or Cmd+Z on Mac) and **U** both call `boardSystem.undo()`. We use `e.preventDefault()` on Ctrl+Z to stop the browser's native undo.
- Two undo shortcuts (U and Ctrl+Z) accommodate different player preferences.

---

### 4. Unchanged Files

These files are the same as the previous step: `types.ts`, `data/puzzles.ts`, `SudokuEngine.ts`, `adapters/PlatformAdapter.ts`, `index.ts`

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Sudoku game
3. **Test notes mode:**
   - Press **N** to enter notes mode
   - Select an empty cell and press **1**, **3**, **5** -- tiny "1", "3", "5" appear in the cell's mini-grid
   - Press **3** again -- the "3" note disappears (toggle behavior)
   - Press **N** again to exit notes mode
   - Press **7** -- the notes disappear and "7" is placed as the cell value
4. **Test undo:**
   - Place a number, then press **U** -- the number disappears and the previous state is restored
   - Toggle some notes, then press **Ctrl+Z** -- the notes revert
   - Undo multiple times in a row -- each action is reversed one by one
5. **Test restart:**
   - Press **R** -- a brand new puzzle generates, all notes and player entries are cleared

---

## Challenges

**Easy:**
- Add visual feedback when notes mode is active -- change the selected cell's border color to purple.

**Medium:**
- When a value is placed in normal mode, automatically remove that number from the notes of all cells in the same row, column, and box.

**Hard:**
- Implement a redo stack: when the player undoes, push the undone action onto a redo stack. Pressing Y or Ctrl+Y redoes the action. Clear the redo stack whenever a new action is taken.

---

## What You Learned

- Implementing a mode toggle that changes the meaning of input keys
- Rendering pencil marks in a 3x3 mini-grid layout using position math
- Building an undo stack with pre-action snapshots
- Cloning Sets (`new Set(original)`) to prevent reference-sharing bugs
- Multiple keyboard shortcuts for the same action (U and Ctrl+Z)

**Next:** Difficulty selector, timer, number pad, and final polish!
