# Step 2: Puzzle Generation

**Goal:** Generate valid Sudoku puzzles with unique solutions using a backtracking algorithm.

**Time:** ~20 minutes

---

## What You'll Build

- **Backtracking solver** that fills a complete 9x9 grid with valid numbers
- **Puzzle creator** that removes cells to create the actual puzzle
- **Uniqueness checker** that guarantees exactly one solution exists
- **Difficulty control** via the number of given cells left on the board
- A real, playable puzzle displayed on screen every time you load the game

---

## Concepts

### Backtracking: The Core Algorithm

Backtracking is a "try-and-undo" strategy. Imagine filling a Sudoku grid cell by cell, left to right, top to bottom:

1. Find the next empty cell.
2. Try placing digits 1 through 9 (in random order for variety).
3. For each digit, check: does it conflict with the same row, column, or 3x3 box?
4. If no conflict, place it and move to the next cell (recurse).
5. If the recursion succeeds, great -- the grid is valid.
6. If no digit works, **backtrack**: undo the placement, return to the previous cell, and try the next candidate.

Here is a visual example for a small portion of the grid:

```
Trying cell (0,0):
  Try 5 -> valid! Place it, move to (0,1)
    Try 3 -> valid! Place it, move to (0,2)
      Try 1 -> conflict in box! Skip.
      Try 7 -> valid! Place it, move to (0,3)
        ...continues until grid is full or backtracks
```

The randomisation (shuffling candidates) ensures each generated puzzle is different.

### Creating a Puzzle from a Solved Grid

Once we have a completed grid, we create the puzzle by removing cells:

1. Shuffle all 81 cell positions.
2. For each position, tentatively remove the number.
3. Run a solution counter: does the puzzle still have exactly 1 solution?
4. If yes, keep it removed. If no, restore it.
5. Stop when we have removed enough cells to reach the target number of givens.

The `countSolutions()` function is the key -- it uses the same backtracking approach but counts solutions instead of generating one. We cap it at 2 because we only need to know "is there more than one solution?"

---

## Code

### 1. Create the Puzzle Generator

**File:** `src/games/sudoku/data/puzzles.ts`

This is the most algorithmic file in the entire game. Read through the comments carefully.

```typescript
import { GRID, BOX, type Difficulty, DIFFICULTY_PRESETS } from '../types';

/**
 * Create an empty 9x9 grid filled with zeroes.
 */
function emptyGrid(): number[][] {
  return Array.from({ length: GRID }, () => Array(GRID).fill(0));
}

/**
 * Shuffle an array in-place (Fisher-Yates).
 */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Check whether placing `num` at (row, col) is valid.
 * A placement is valid if `num` does not already appear in
 * the same row, same column, or same 3x3 box.
 */
function isValid(grid: number[][], row: number, col: number, num: number): boolean {
  // Row check: scan all columns in this row
  for (let c = 0; c < GRID; c++) {
    if (grid[row][c] === num) return false;
  }
  // Column check: scan all rows in this column
  for (let r = 0; r < GRID; r++) {
    if (grid[r][col] === num) return false;
  }
  // Box check: find the top-left corner of the 3x3 box
  const boxR = Math.floor(row / BOX) * BOX;
  const boxC = Math.floor(col / BOX) * BOX;
  for (let r = boxR; r < boxR + BOX; r++) {
    for (let c = boxC; c < boxC + BOX; c++) {
      if (grid[r][c] === num) return false;
    }
  }
  return true;
}

/**
 * Fill the grid completely using backtracking with randomised candidates.
 *
 * Algorithm:
 * 1. Scan cells left-to-right, top-to-bottom.
 * 2. When we hit an empty cell (value 0), try digits 1-9 in random order.
 * 3. If a digit is valid, place it and recurse.
 * 4. If recursion fills the rest of the grid, return true (success).
 * 5. If no digit works, set the cell back to 0 and return false (backtrack).
 * 6. If we get through all cells without hitting an empty one, the grid is full.
 */
function fillGrid(grid: number[][]): boolean {
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (grid[r][c] !== 0) continue;
      const candidates = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (const num of candidates) {
        if (isValid(grid, r, c, num)) {
          grid[r][c] = num;
          if (fillGrid(grid)) return true;
          grid[r][c] = 0; // backtrack
        }
      }
      return false; // no valid candidate -- backtrack
    }
  }
  return true; // entire grid filled successfully
}

/**
 * Count solutions (up to `limit`) to determine uniqueness.
 *
 * This works exactly like fillGrid, but instead of stopping at the
 * first solution, it counts how many exist. We pass limit=2 so it
 * stops as soon as it finds a second solution -- we only care
 * whether there is exactly 1.
 */
function countSolutions(grid: number[][], limit: number): number {
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (grid[r][c] !== 0) continue;
      let count = 0;
      for (let num = 1; num <= GRID; num++) {
        if (isValid(grid, r, c, num)) {
          grid[r][c] = num;
          count += countSolutions(grid, limit - count);
          grid[r][c] = 0;
          if (count >= limit) return count;
        }
      }
      return count;
    }
  }
  return 1; // no empty cells -- found a solution
}

/**
 * Remove cells from a fully-solved grid to create a puzzle.
 * Ensures a unique solution by checking after each removal.
 *
 * Algorithm:
 * 1. Copy the solved grid.
 * 2. Shuffle all 81 positions.
 * 3. For each position, remove the number.
 * 4. Count solutions on a copy of the grid.
 * 5. If solutions != 1, restore the number (removal breaks uniqueness).
 * 6. If solutions == 1, keep it removed and increment the counter.
 * 7. Stop when enough cells are removed.
 */
function removeCells(solution: number[][], givens: number): number[][] {
  const puzzle = solution.map((row) => [...row]);
  const cellsToRemove = GRID * GRID - givens;

  // Build list of all positions and shuffle
  const positions: [number, number][] = [];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      positions.push([r, c]);
    }
  }
  shuffle(positions);

  let removed = 0;
  for (const [r, c] of positions) {
    if (removed >= cellsToRemove) break;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;

    // Check uniqueness on a copy (countSolutions mutates the grid)
    const copy = puzzle.map((row) => [...row]);
    if (countSolutions(copy, 2) !== 1) {
      puzzle[r][c] = backup; // restore -- removal breaks uniqueness
    } else {
      removed++;
    }
  }

  return puzzle;
}

export interface GeneratedPuzzle {
  puzzle: number[][];
  solution: number[][];
}

/**
 * Generate a new Sudoku puzzle for the given difficulty.
 */
export function generatePuzzle(difficulty: Difficulty): GeneratedPuzzle {
  const solution = emptyGrid();
  fillGrid(solution);

  const { givens } = DIFFICULTY_PRESETS[difficulty];
  const puzzle = removeCells(solution, givens);

  return { puzzle, solution };
}
```

**What's happening -- step by step:**

1. **`emptyGrid()`** creates a 9x9 array of zeroes. This is our blank canvas.

2. **`shuffle()`** uses the Fisher-Yates algorithm to randomize an array in-place. We use it to randomize candidate digits (so each puzzle is different) and cell removal order.

3. **`isValid()`** is the constraint checker. For a given cell and digit, it scans the row (9 cells), column (9 cells), and the 3x3 box (9 cells) for duplicates. If the digit already appears in any of those groups, the placement is invalid.

4. **`fillGrid()`** is the backtracking solver. It finds the first empty cell, tries digits 1-9 in shuffled order, and recurses. If no digit works, it backtracks. On a modern machine this fills the grid in under a millisecond.

5. **`countSolutions()`** is similar but counts how many valid completions exist. The `limit` parameter is an early-exit optimization: once we find 2 solutions, we know uniqueness is broken and stop searching.

6. **`removeCells()`** is the puzzle creator. It removes cells one by one, checking uniqueness after each removal. If removing a cell creates multiple solutions, it puts the number back. The `givens` parameter (from difficulty presets) controls how many cells remain.

7. **`generatePuzzle()`** ties it all together: generate a full solution, then punch holes to create the puzzle.

---

### 2. Create the Board System

**File:** `src/games/sudoku/systems/BoardSystem.ts`

Replaces the placeholder board with real puzzle generation.

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

  update(_state: SudokuState, _dt: number): void {
    // Timer will be added in Step 6
  }
}
```

**What's happening:**
- `initBoard()` calls `generatePuzzle()` to get a fresh puzzle and its solution.
- It builds the `Cell[][]` board: cells with a non-zero value from the puzzle are marked `given: true` (the player cannot edit these).
- All game state is reset: no selection, no notes mode, timer at zero, empty undo stack.

---

### 3. Update the Engine

**File:** `src/games/sudoku/SudokuEngine.ts`

Replace the placeholder board with the real BoardSystem.

```typescript
import type { SudokuState, Difficulty } from './types';
import { GRID } from './types';
import { BoardSystem } from './systems/BoardSystem';
import { BoardRenderer } from './renderers/BoardRenderer';

export class SudokuEngine {
  private ctx: CanvasRenderingContext2D;
  private state: SudokuState;
  private running = false;
  private rafId = 0;
  private boardSystem: BoardSystem;
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

    this.boardSystem.initBoard(this.state);
    this.computeLayout();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.computeLayout();
    };
    window.addEventListener('resize', this.resizeHandler);
  }

  start(): void {
    this.running = true;
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
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

### 4. Keep Remaining Files

**Files unchanged from Step 1:** `types.ts`, `renderers/BoardRenderer.ts`, `adapters/PlatformAdapter.ts`, `index.ts`

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Sudoku game
3. **Observe:**
   - A **randomly generated** puzzle each time you reload the page
   - Around **35 bold white numbers** scattered across the grid (Easy difficulty has 35 givens)
   - The remaining cells are **empty** (dark blue)
   - Every puzzle is **valid** -- no two identical numbers in any row, column, or 3x3 box
   - **Refresh the page** and you get a different puzzle each time

---

## Challenges

**Easy:**
- Change the difficulty to `'medium'` in the engine constructor and verify fewer numbers appear.

**Medium:**
- Add a `console.time('puzzle')` / `console.timeEnd('puzzle')` around the `generatePuzzle()` call to see how fast it runs. Try all three difficulties.

**Hard:**
- Modify `fillGrid()` to try candidates in sorted order (1-9 instead of shuffled) and observe that every puzzle is now identical. This demonstrates why randomisation is essential.

---

## What You Learned

- How backtracking works: try, check, recurse, undo on failure
- Generating a complete valid Sudoku grid by trying random candidates
- Ensuring puzzle uniqueness with a bounded solution counter
- Controlling difficulty by varying how many cells are removed
- The difference between a solver (find one solution) and a counter (find all solutions)

**Next:** Cell selection and number input -- make the puzzle interactive!
