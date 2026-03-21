# Step 1: Project Setup & Letter Grid

**Goal:** Draw a 12x12 grid of random letters on the canvas with a dark background and responsive layout.

**Time:** ~15 minutes

---

## What You'll Build

- **Type definitions** for the entire Word Search game state
- **A 12x12 grid** of random uppercase letters rendered on a dark canvas
- **Subtle grid lines** separating each cell
- **Responsive layout** that centers the board and scales on window resize
- **Data file** with themed word lists for later use

---

## Concepts

- **Grid Structure**: A Word Search board is a rectangular grid of cells, each holding a single uppercase letter. We use a 12x12 grid, which is large enough to hide 8 words in multiple directions.
- **Cell Representation**: Each `Cell` stores its `letter`, `row`, and `col`. Unlike Sudoku where cells have values and notes, Word Search cells are simple -- just a character and a position.
- **Direction Vectors**: Words can be placed in 8 directions (right, left, up, down, and 4 diagonals). We define these as `{ dr, dc }` vectors so placement and traversal use the same math.
- **Layout Calculation**: `Math.min(availW / cols, availH / rows)` produces square cells that fit the viewport, reserving space on the right for the word list panel.

---

## Code

### 1. Create Types

**File:** `src/games/word-search/types.ts`

All the types we need across every step, defined up front so later files never need modification.

```typescript
export interface Cell {
  letter: string;
  row: number;
  col: number;
}

export type Direction =
  | 'right'
  | 'left'
  | 'down'
  | 'up'
  | 'down-right'
  | 'down-left'
  | 'up-right'
  | 'up-left';

export interface PlacedWord {
  word: string;
  startRow: number;
  startCol: number;
  direction: Direction;
  found: boolean;
  /** Cell coordinates for this word */
  cells: { row: number; col: number }[];
}

export type GameStatus = 'playing' | 'won';

export interface WordSearchState {
  grid: Cell[][];
  rows: number;
  cols: number;
  placedWords: PlacedWord[];
  /** Currently selected cell indices during drag */
  selection: { row: number; col: number }[];
  /** Is the user actively dragging? */
  dragging: boolean;
  /** Start cell of current drag */
  dragStart: { row: number; col: number } | null;
  /** Current pointer position (canvas coords) for live selection line */
  pointerPos: { x: number; y: number } | null;
  status: GameStatus;
  timer: number;
  theme: string;
  /** Layout: offset and cell size for centering */
  offsetX: number;
  offsetY: number;
  cellSize: number;
  /** Found word highlight colors */
  foundColors: Map<string, string>;
}

/** Direction vectors for word placement */
export const DIRECTION_VECTORS: Record<Direction, { dr: number; dc: number }> = {
  right: { dr: 0, dc: 1 },
  left: { dr: 0, dc: -1 },
  down: { dr: 1, dc: 0 },
  up: { dr: -1, dc: 0 },
  'down-right': { dr: 1, dc: 1 },
  'down-left': { dr: 1, dc: -1 },
  'up-right': { dr: -1, dc: 1 },
  'up-left': { dr: -1, dc: -1 },
};

export const GRID_ROWS = 12;
export const GRID_COLS = 12;
export const WORDS_PER_PUZZLE = 8;

export const GAME_COLOR = '#5c6bc0';

export const HIGHLIGHT_COLORS = [
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#14b8a6',
  '#a855f7',
];
```

**What's happening:**
- `Cell` is intentionally simple: just a `letter` and its grid position (`row`, `col`). No value/notes complexity like Sudoku.
- `Direction` is a union of 8 string literals. `DIRECTION_VECTORS` maps each to a `{ dr, dc }` pair so we can walk in any direction with the same code: `row + i * dr, col + i * dc`.
- `PlacedWord` tracks where each word was placed, its direction, and whether the player has found it. The `cells` array stores every coordinate the word occupies for fast matching later.
- `WordSearchState` holds everything: the grid, placed words, drag state, layout offsets, a timer, and a `foundColors` map that assigns each found word a unique highlight color.
- `GRID_ROWS = 12` and `GRID_COLS = 12` give us a 144-cell grid -- enough room for 8 words without being overwhelming.

---

### 2. Create the Word Data

**File:** `src/games/word-search/data/words.ts`

Themed word lists that the game randomly picks from.

```typescript
export interface Theme {
  name: string;
  words: string[];
}

export const THEMES: Theme[] = [
  {
    name: 'Animals',
    words: ['TIGER', 'EAGLE', 'SHARK', 'PANDA', 'HORSE', 'WHALE', 'SNAKE', 'ROBIN', 'MOUSE', 'GECKO'],
  },
  {
    name: 'Food',
    words: ['PIZZA', 'STEAK', 'SALAD', 'MANGO', 'BREAD', 'GRAPE', 'SUSHI', 'TACOS', 'CURRY', 'PASTA'],
  },
  {
    name: 'Sports',
    words: ['RUGBY', 'CHESS', 'GOLF', 'TENNIS', 'HOCKEY', 'BOXING', 'SOCCER', 'DIVING', 'SKIING', 'KAYAK'],
  },
  {
    name: 'Colors',
    words: ['CRIMSON', 'AMBER', 'IVORY', 'CORAL', 'OLIVE', 'PEACH', 'LILAC', 'AZURE', 'SIENNA', 'MAUVE'],
  },
];

/** Pick a random theme */
export function getRandomTheme(): Theme {
  return THEMES[Math.floor(Math.random() * THEMES.length)];
}
```

**What's happening:**
- Each theme has a `name` (displayed in the HUD later) and 10 words. We only place 8 per puzzle (`WORDS_PER_PUZZLE`), so each game gets a different subset.
- All words are uppercase -- the grid uses uppercase letters exclusively, so matching is straightforward string comparison.
- `getRandomTheme()` picks a theme at random each time the player starts or restarts.

---

### 3. Create the Board Renderer

**File:** `src/games/word-search/renderers/BoardRenderer.ts`

Draws the grid background, grid lines, and letters. For now, we skip highlights -- those come in Step 4.

```typescript
import type { WordSearchState } from '../types';

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: WordSearchState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    const { offsetX, offsetY, cellSize, rows, cols } = state;

    // Grid background with rounded corners
    ctx.fillStyle = '#151530';
    ctx.beginPath();
    ctx.roundRect(
      offsetX - 4,
      offsetY - 4,
      cols * cellSize + 8,
      rows * cellSize + 8,
      8,
    );
    ctx.fill();

    ctx.strokeStyle = 'rgba(92, 107, 192, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(
      offsetX - 4,
      offsetY - 4,
      cols * cellSize + 8,
      rows * cellSize + 8,
      8,
    );
    ctx.stroke();

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;

    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + r * cellSize);
      ctx.lineTo(offsetX + cols * cellSize, offsetY + r * cellSize);
      ctx.stroke();
    }

    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo(offsetX + c * cellSize, offsetY);
      ctx.lineTo(offsetX + c * cellSize, offsetY + rows * cellSize);
      ctx.stroke();
    }

    // Draw letters
    const fontSize = Math.max(12, cellSize * 0.55);
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = state.grid[r][c];
        const cx = offsetX + c * cellSize + cellSize / 2;
        const cy = offsetY + r * cellSize + cellSize / 2;

        ctx.fillStyle = '#8888aa';
        ctx.fillText(cell.letter, cx, cy);
      }
    }
  }
}
```

**What's happening:**
- The entire canvas is cleared with a very dark blue (`#0a0a1a`), then a slightly lighter rounded rectangle (`#151530`) frames the grid area.
- Grid lines use a very low alpha (`rgba(255,255,255,0.05)`) so they are visible but do not compete with the letters.
- Letters are drawn in a muted purple-grey (`#8888aa`). Later steps will make found/selected letters brighter.
- Font size scales with cell size (`cellSize * 0.55`), clamped to a minimum of 12px.

---

### 4. Create the Engine

**File:** `src/games/word-search/WordSearchEngine.ts`

The engine creates the initial state, fills the grid with random letters, computes layout, and runs the render loop.

```typescript
import type { WordSearchState, Cell } from './types';
import { GRID_ROWS, GRID_COLS } from './types';
import { BoardRenderer } from './renderers/BoardRenderer';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export class WordSearchEngine {
  private ctx: CanvasRenderingContext2D;
  private state: WordSearchState;
  private running = false;
  private rafId = 0;
  private boardRenderer: BoardRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = {
      grid: [],
      rows: GRID_ROWS,
      cols: GRID_COLS,
      placedWords: [],
      selection: [],
      dragging: false,
      dragStart: null,
      pointerPos: null,
      status: 'playing',
      timer: 0,
      theme: '',
      offsetX: 0,
      offsetY: 0,
      cellSize: 0,
      foundColors: new Map(),
    };

    this.boardRenderer = new BoardRenderer();

    this.initRandomGrid();
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
    const topPad = 42;
    const bottomPad = 30;
    const sidePad = 20;
    const wordListWidth = Math.min(160, W * 0.2);

    const availW = W - sidePad * 2 - wordListWidth;
    const availH = H - topPad - bottomPad;

    const cellW = Math.floor(availW / this.state.cols);
    const cellH = Math.floor(availH / this.state.rows);

    this.state.cellSize = Math.max(16, Math.min(cellW, cellH, 50));

    const boardW = this.state.cols * this.state.cellSize;
    const boardH = this.state.rows * this.state.cellSize;

    this.state.offsetX = Math.floor((W - wordListWidth - boardW) / 2);
    this.state.offsetY = Math.floor(topPad + (availH - boardH) / 2);
  }

  /**
   * Fill the entire grid with random letters.
   * Step 2 will replace this with real word placement.
   */
  private initRandomGrid(): void {
    this.state.grid = [];

    for (let r = 0; r < GRID_ROWS; r++) {
      const row: Cell[] = [];

      for (let c = 0; c < GRID_COLS; c++) {
        row.push({
          letter: ALPHABET[Math.floor(Math.random() * 26)],
          row: r,
          col: c,
        });
      }

      this.state.grid.push(row);
    }
  }
}
```

**What's happening:**
- The constructor sizes the canvas to fill the window, initializes the full `WordSearchState`, and fills the grid with random letters.
- `computeLayout()` calculates `cellSize` so the 12x12 grid fits the viewport. It reserves space on the right for the word list panel (`wordListWidth`) and pads top/bottom. Cell size is clamped between 16 and 50 pixels.
- `initRandomGrid()` populates every cell with a random letter from A-Z. In Step 2, we will place real words first and only fill the remaining empty cells randomly.
- The game loop simply calls `boardRenderer.render()` each frame via `requestAnimationFrame`.

---

### 5. Create the Platform Adapter

**File:** `src/games/word-search/adapters/PlatformAdapter.ts`

A thin wrapper so the game plugs into any host page.

```typescript
import { WordSearchEngine } from '../WordSearchEngine';

export class PlatformAdapter {
  private engine: WordSearchEngine;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new WordSearchEngine(canvas);
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

### 6. Create the Entry Point

**File:** `src/games/word-search/index.ts`

```typescript
import { PlatformAdapter } from './adapters/PlatformAdapter';

export function createWordSearch(canvas: HTMLCanvasElement): { destroy: () => void } {
  const adapter = new PlatformAdapter(canvas);
  adapter.start();
  return { destroy: () => adapter.destroy() };
}
```

---

## Test It

1. **Run:** `pnpm dev`
2. **Open:** the Word Search game in your browser
3. **Observe:**
   - Dark background with a centered **12x12 grid**
   - **Random uppercase letters** filling every cell
   - **Subtle grid lines** separating each cell
   - A **rounded border** framing the grid area
   - **Resize the window** and watch the board scale and re-center

---

## Challenges

**Easy:**
- Change the letter color from `#8888aa` to a brighter shade and see how readability changes.
- Try a 10x10 grid by modifying `GRID_ROWS` and `GRID_COLS`.

**Medium:**
- Add alternating cell background colors (like a checkerboard) to make it easier to track rows visually.

**Hard:**
- Add row numbers (1-12) on the left and column letters (A-L) across the top as coordinate labels.

---

## What You Learned

- Defining a complete game state type with cell, grid, layout, and interaction fields
- Drawing a letter grid with scaled fonts and subtle grid lines
- Computing responsive layout that centers the board with reserved side panel space
- Setting up themed word data for random puzzle generation

**Next:** Word placement algorithm -- hide real words in the grid across 8 directions!
