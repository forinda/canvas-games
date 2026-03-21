# Step 4: Validation & Conflict Highlighting

**Goal:** Detect duplicate numbers in rows, columns, and boxes, highlight conflicts in red, and detect puzzle completion.

**Time:** ~15 minutes

---

## What You'll Build

- **Row, column, and box validation** that detects duplicate numbers
- **Red conflict highlighting** on cells that violate Sudoku rules
- **Same-value highlighting** combined with conflict colors
- **Completion detection** -- when all 81 cells are filled with no conflicts, the player wins
- **Win overlay** with congratulations and final time

---

## Concepts

- **Duplicate Detection**: For each row, column, and 3x3 box, scan all cells and group them by value. Any value that appears more than once is a conflict, and all cells with that value in that group get flagged.
- **Three-Phase Validation**: First clear all flags, then check rows, then columns, then boxes. A cell can be flagged by any of the three checks.
- **Completion Check**: The puzzle is complete when every cell has a non-zero value and no cell is flagged invalid. This is simpler than checking against the solution because the validation already ensures correctness.

---

## Code

### 1. Update the Board System

**File:** `src/contexts/canvas2d/games/sudoku/systems/BoardSystem.ts`

Add the `validate()` method and completion check.

```typescript
import {
  GRID,
  BOX,
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
    this.validate(state);
  }

  /** Place a number at the selected cell. */
  placeNumber(state: SudokuState, num: number): void {
    const { selectedRow: r, selectedCol: c } = state;
    if (r < 0 || c < 0 || state.status === 'won') return;
    const cell = state.board[r][c];
    if (cell.given) return;

    if (num === 0) {
      cell.value = 0;
    } else {
      cell.value = num;
      cell.notes.clear();
    }

    this.validate(state);
    this.checkCompletion(state);
  }

  /** Clear the selected cell. */
  clearCell(state: SudokuState): void {
    this.placeNumber(state, 0);
  }

  /** Validate the entire board -- flag conflicting cells. */
  validate(state: SudokuState): void {
    // Phase 1: Clear all invalid flags
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        state.board[r][c].invalid = false;
      }
    }

    // Phase 2: Check rows
    for (let r = 0; r < GRID; r++) {
      this.flagDuplicates(
        state,
        Array.from({ length: GRID }, (_, c) => [r, c] as [number, number]),
      );
    }

    // Phase 3: Check columns
    for (let c = 0; c < GRID; c++) {
      this.flagDuplicates(
        state,
        Array.from({ length: GRID }, (_, r) => [r, c] as [number, number]),
      );
    }

    // Phase 4: Check 3x3 boxes
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

  /**
   * Given a list of cell positions (a row, column, or box),
   * find any value that appears more than once and mark
   * all cells with that value as invalid.
   */
  private flagDuplicates(state: SudokuState, positions: [number, number][]): void {
    const seen = new Map<number, [number, number][]>();
    for (const [r, c] of positions) {
      const v = state.board[r][c].value;
      if (v === 0) continue; // skip empty cells
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

  /** Check if the puzzle is completed (all filled, no conflicts). */
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

- **`validate()`** runs after every number placement. It first clears all `invalid` flags, then checks rows, columns, and boxes independently. A cell can be flagged by any of the three checks.

- **`flagDuplicates()`** is the workhorse. It takes a list of 9 positions (one row, one column, or one box), groups cells by their value using a Map, and flags any value that appears more than once. Empty cells (value 0) are skipped.

  For example, if row 3 has two 5s at columns 1 and 7:
  ```
  seen = { 5: [[3,1], [3,7]], 3: [[3,0]], ... }
  ```
  The entry for 5 has length 2, so both cells get `invalid = true`.

- **`checkCompletion()`** scans all 81 cells. If every cell has a value and none are invalid, the puzzle is solved. This works because our validation catches every possible error -- if no conflicts remain and no cells are empty, the board must be correct.

---

### 2. Update the Board Renderer

**File:** `src/contexts/canvas2d/games/sudoku/renderers/BoardRenderer.ts`

Add conflict highlighting (red background) and red text for invalid player cells.

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

        // Cell background with layered highlighting
        let bg = '#1a1a2e';

        // Zone highlight (same row, column, or box)
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

        // Selected cell
        if (r === selectedRow && c === selectedCol) {
          bg = '#3a3a6a';
        }

        // Same-value highlight
        if (
          selectedRow >= 0 &&
          selectedCol >= 0 &&
          board[selectedRow][selectedCol].value !== 0 &&
          cell.value === board[selectedRow][selectedCol].value &&
          !(r === selectedRow && c === selectedCol)
        ) {
          bg = '#2e2e55';
        }

        // CONFLICT HIGHLIGHT -- red background overrides everything
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
            // Red text for invalid player cells, blue for valid
            ctx.fillStyle = cell.invalid ? '#ff5555' : '#7e9aff';
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

    // WIN OVERLAY
    if (state.status === 'won') {
      // Dim the board
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, W, H);

      // Victory text
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

**What's happening:**
- Conflict cells get a dark red background (`#4a1a1a`) that overrides all other highlighting. This makes errors immediately visible.
- Player-placed numbers that are invalid render in bright red (`#ff5555`) instead of the normal blue. Given numbers keep their white color even when invalid (they are part of the puzzle so the conflict is on the player's side).
- The win overlay draws a semi-transparent black layer over the entire screen, then shows "Puzzle Complete!" in the game's signature purple.

---

### 3. Update the Input System

**File:** `src/contexts/canvas2d/games/sudoku/systems/InputSystem.ts`

Add R to restart the puzzle.

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

---

### 4. Update the Engine

**File:** `src/contexts/canvas2d/games/sudoku/SudokuEngine.ts`

Add the reset callback for the input system.

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
      () => this.reset(),
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

  private reset(): void {
    this.boardSystem.initBoard(this.state);
    this.computeLayout();
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
3. **Test validation:**
   - Select an empty cell in a row that already has a **5**
   - Type **5** -- both cells turn **red** (background and text)
   - Delete the 5 -- the conflict clears immediately
   - Place a duplicate in a **column** or **3x3 box** -- same red highlighting
4. **Test completion:**
   - Fill in all empty cells correctly (use the solution if needed -- you can log `state.solution` to console)
   - When the last cell is filled with no conflicts, the **"Puzzle Complete!"** overlay appears
5. **Test restart:**
   - Press **R** -- a new puzzle generates and all state resets

---

## Challenges

**Easy:**
- Change the conflict background color from dark red to dark orange and see which is more readable.

**Medium:**
- Add a "mistakes counter" that increments each time the player places a number that creates a conflict.

**Hard:**
- Highlight the specific row/column/box that contains the conflict (not just the conflicting cells) so the player can see exactly which constraint is violated.

---

## What You Learned

- Scanning rows, columns, and boxes for duplicate values using a Map
- Three-phase validation: clear flags, then check each constraint type
- The `flagDuplicates()` pattern: group by value, flag groups with count > 1
- Simple completion detection: all filled + no conflicts = win
- Rendering a win overlay with semi-transparent dimming

**Next:** Notes mode and undo -- add pencil marks and the ability to take back moves!
