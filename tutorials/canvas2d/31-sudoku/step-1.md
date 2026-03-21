# Step 1: Grid Setup & Rendering

**Goal:** Draw a 9x9 Sudoku grid with thick 3x3 box borders, given numbers, and responsive layout.

**Time:** ~15 minutes

---

## What You'll Build

- **9x9 Sudoku grid** with thin cell lines and thick 3x3 box borders
- **Given numbers** displayed in bold white, empty cells left blank
- **Dark background** with the board centered on screen
- **Responsive layout** that scales and re-centers on window resize
- **Type definitions** for the entire game state

---

## Concepts

- **Sudoku Grid Structure**: A standard Sudoku board is 9x9 cells grouped into nine 3x3 boxes. Every row, column, and box must contain the digits 1-9 exactly once.
- **Cell Representation**: Each cell tracks its current value (0 = empty), whether it was part of the original puzzle (`given`), pencil-mark notes, and a conflict flag.
- **Two-Level Grid Lines**: Thin lines (1px) separate individual cells; thick lines (2.5px) separate the 3x3 boxes. This visual hierarchy is essential for Sudoku readability.
- **Layout Calculation**: `Math.min(availW / 9, availH / 9)` produces square cells that fit the viewport, just like Minesweeper.

---

## Code

### 1. Create Types

**File:** `src/contexts/canvas2d/games/sudoku/types.ts`

All the types we will need across every step, defined up front so later files never need modification.

```typescript
export const GRID = 9;
export const BOX = 3;
export const TOTAL_CELLS = GRID * GRID; // 81

export interface Cell {
  /** 0 = empty, 1-9 = placed number */
  value: number;
  /** true if the cell was part of the original puzzle (cannot be edited) */
  given: boolean;
  /** Pencil-mark notes (set of candidate numbers 1-9) */
  notes: Set<number>;
  /** true when the cell has a row/col/box conflict */
  invalid: boolean;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultyPreset {
  label: string;
  givens: number;
}

export const DIFFICULTY_PRESETS: Record<Difficulty, DifficultyPreset> = {
  easy: { label: 'Easy', givens: 35 },
  medium: { label: 'Medium', givens: 28 },
  hard: { label: 'Hard', givens: 22 },
};

export type GameStatus = 'playing' | 'won';

export interface UndoEntry {
  row: number;
  col: number;
  prevValue: number;
  prevNotes: Set<number>;
}

export interface SudokuState {
  board: Cell[][];
  /** The full solved grid for validation / hints */
  solution: number[][];
  difficulty: Difficulty;
  status: GameStatus;
  /** Currently selected cell (-1 = none) */
  selectedRow: number;
  selectedCol: number;
  /** Notes mode toggle */
  notesMode: boolean;
  /** Timer in seconds */
  timer: number;
  /** Undo stack */
  undoStack: UndoEntry[];
  /** Layout helpers */
  offsetX: number;
  offsetY: number;
  cellSize: number;
  /** HUD region height */
  hudHeight: number;
}

export const GAME_COLOR = '#7e57c2';
```

**What's happening:**
- `Cell` has four fields: `value` (the placed digit or 0), `given` (locked puzzle cells), `notes` (pencil marks for later), and `invalid` (conflict flag for later).
- `DIFFICULTY_PRESETS` controls how many cells are pre-filled: Easy gives you 35 of the 81 cells, Medium 28, Hard only 22.
- `SudokuState` holds everything: the board grid, the solved answer, layout offsets, timer, undo history, and selection state. Defining it all now means we never need to restructure later.
- `GRID = 9` and `BOX = 3` are used everywhere to avoid magic numbers.

---

### 2. Create the Board Renderer

**File:** `src/contexts/canvas2d/games/sudoku/renderers/BoardRenderer.ts`

Draws the grid background, cell values, thin grid lines, and thick box borders.

```typescript
import { GRID, BOX, type SudokuState } from '../types';

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: SudokuState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Clear background
    ctx.fillStyle = '#0e0e1a';
    ctx.fillRect(0, 0, W, H);

    const { offsetX, offsetY, cellSize, board } = state;

    // Draw cells
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const x = offsetX + c * cellSize;
        const y = offsetY + r * cellSize;
        const cell = board[r][c];

        // Cell background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(x, y, cellSize, cellSize);

        // Draw value (given numbers only for now)
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

    // Draw thin grid lines (between every cell)
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID; i++) {
      // Horizontal
      const y = offsetY + i * cellSize;
      ctx.beginPath();
      ctx.moveTo(offsetX, y);
      ctx.lineTo(offsetX + GRID * cellSize, y);
      ctx.stroke();
      // Vertical
      const x = offsetX + i * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, offsetY);
      ctx.lineTo(x, offsetY + GRID * cellSize);
      ctx.stroke();
    }

    // Draw thick box borders (every 3 cells)
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 2.5;
    for (let i = 0; i <= BOX; i++) {
      // Horizontal
      const y = offsetY + i * BOX * cellSize;
      ctx.beginPath();
      ctx.moveTo(offsetX, y);
      ctx.lineTo(offsetX + GRID * cellSize, y);
      ctx.stroke();
      // Vertical
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
- We draw the dark background, then loop through all 81 cells, filling each with a dark blue.
- Given numbers render in bold white (`#e0e0e0`), player-placed numbers in a lighter blue (`#7e9aff`). The font scales with cell size so it looks good at any resolution.
- Grid lines have two layers: thin lines (`#444`, 1px) for every cell boundary, then thick lines (`#aaa`, 2.5px) at every 3rd row/column to delineate the boxes. This is what makes a Sudoku grid look like a Sudoku grid.
- A 3px outer border frames the entire board.

---

### 3. Create the Engine

**File:** `src/contexts/canvas2d/games/sudoku/SudokuEngine.ts`

The engine creates the initial state, computes layout, and runs the render loop.

```typescript
import type { SudokuState, Difficulty, Cell } from './types';
import { GRID, DIFFICULTY_PRESETS } from './types';
import { BoardRenderer } from './renderers/BoardRenderer';

export class SudokuEngine {
  private ctx: CanvasRenderingContext2D;
  private state: SudokuState;
  private running = false;
  private rafId = 0;
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

    this.boardRenderer = new BoardRenderer();

    // Create a placeholder board with some given numbers
    this.initPlaceholderBoard();
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

  /**
   * Temporary: fill the board with a few hardcoded given numbers
   * so we can see the grid rendering. Step 2 replaces this with
   * real puzzle generation.
   */
  private initPlaceholderBoard(): void {
    this.state.board = [];
    for (let r = 0; r < GRID; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < GRID; c++) {
        row.push({ value: 0, given: false, notes: new Set(), invalid: false });
      }
      this.state.board.push(row);
    }

    // Sprinkle some given numbers so we can verify rendering
    const samples: [number, number, number][] = [
      [0, 0, 5], [0, 1, 3], [0, 4, 7],
      [1, 0, 6], [1, 3, 1], [1, 4, 9], [1, 5, 5],
      [2, 1, 9], [2, 2, 8], [2, 7, 6],
      [3, 0, 8], [3, 4, 6], [3, 8, 3],
      [4, 0, 4], [4, 3, 8], [4, 5, 3], [4, 8, 1],
      [5, 0, 7], [5, 4, 2], [5, 8, 6],
      [6, 1, 6], [6, 6, 2], [6, 7, 8],
      [7, 3, 4], [7, 4, 1], [7, 5, 9], [7, 8, 5],
      [8, 4, 8], [8, 7, 7], [8, 8, 9],
    ];

    for (const [r, c, v] of samples) {
      this.state.board[r][c].value = v;
      this.state.board[r][c].given = true;
    }
  }
}
```

**What's happening:**
- The constructor sizes the canvas to fill the window, creates an empty state, and computes responsive layout.
- `computeLayout()` calculates `cellSize` so the board fits the viewport with room for the HUD (top) and number pad (bottom). The cell size is clamped between 16 and 50 pixels.
- `initPlaceholderBoard()` fills in a partial puzzle by hand so we can verify the grid renders correctly. In Step 2 we will replace this with real puzzle generation.
- The game loop simply calls `boardRenderer.render()` on each frame.

---

### 4. Create the Platform Adapter

**File:** `src/contexts/canvas2d/games/sudoku/adapters/PlatformAdapter.ts`

A thin wrapper so the game plugs into any host page.

```typescript
import { SudokuEngine } from '../SudokuEngine';

export class PlatformAdapter {
  private engine: SudokuEngine;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new SudokuEngine(canvas);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

---

### 5. Create the Entry Point

**File:** `src/contexts/canvas2d/games/sudoku/index.ts`

```typescript
import { PlatformAdapter } from './adapters/PlatformAdapter';

export function createSudoku(canvas: HTMLCanvasElement): { destroy: () => void } {
  const adapter = new PlatformAdapter(canvas);
  adapter.start();
  return { destroy: () => adapter.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Sudoku game in your browser
3. **Observe:**
   - Dark background with a centered **9x9 grid**
   - **Thin lines** between every cell, **thick lines** around each 3x3 box
   - **Bold white numbers** scattered across the grid (the placeholder givens)
   - A **3px outer border** framing the board
   - **Resize the window** and watch the board scale and re-center

---

## Challenges

**Easy:**
- Change the cell background color to a darker or lighter shade and see how it affects readability.
- Increase the thick border line width from 2.5 to 4 for a bolder look.

**Medium:**
- Add alternating background shading so every other 3x3 box uses a slightly different color (like a checkerboard of boxes).

**Hard:**
- Add row labels (A-I) on the left and column labels (1-9) on the top so cells can be referenced like "B4" or "G7".

---

## What You Learned

- Defining a complete game state type with cell, board, and layout fields
- Drawing a two-level grid: thin lines for cells, thick lines for 3x3 boxes
- Rendering numbers with conditional bold styling for given vs. player cells
- Computing responsive layout that centers and scales the board to any viewport

**Next:** Puzzle generation -- build a backtracking solver that creates valid Sudoku puzzles with unique solutions!
