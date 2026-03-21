# Step 2: Word Placement Algorithm

**Goal:** Place words into the grid in various directions (horizontal, vertical, diagonal, and reversed), then fill remaining cells with random letters.

**Time:** ~15 minutes

---

## What You'll Build

- **BoardSystem** that generates puzzles by placing words in 8 possible directions
- **Collision-safe placement** that allows words to share letters but not conflict
- **Random fill** of remaining empty cells after all words are placed
- **Theme selection** so each puzzle uses a random word category

---

## Concepts

- **8-Direction Placement**: Words can go right, left, up, down, and along all four diagonals. Using `DIRECTION_VECTORS`, the same loop handles every direction -- `row + i * dr, col + i * dc` walks through each cell the word would occupy.
- **Valid Position Filtering**: Before trying to place a word, we compute all grid positions where the word would stay in bounds. This avoids out-of-bounds checks during placement.
- **Collision Detection**: A word can be placed at a position if every cell along its path is either empty (`""`) or already contains the same letter. This allows words to cross each other at shared letters.
- **Shuffle-and-Try**: We shuffle both the direction list and the valid positions before trying to place. This means each puzzle looks different even with the same word list.

---

## Code

### 1. Create the Board System

**File:** `src/games/word-search/systems/BoardSystem.ts`

This system owns puzzle generation: placing words and filling empty cells.

```typescript
import type { WordSearchState, Direction, Cell } from '../types';
import { DIRECTION_VECTORS, GRID_ROWS, GRID_COLS, WORDS_PER_PUZZLE } from '../types';
import { getRandomTheme } from '../data/words';

const ALL_DIRECTIONS: Direction[] = [
  'right', 'left', 'down', 'up',
  'down-right', 'down-left', 'up-right', 'up-left',
];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export class BoardSystem {
  /** Generate a new puzzle into the state */
  initBoard(state: WordSearchState): void {
    const theme = getRandomTheme();

    state.theme = theme.name;
    state.rows = GRID_ROWS;
    state.cols = GRID_COLS;
    state.status = 'playing';
    state.timer = 0;
    state.selection = [];
    state.dragging = false;
    state.dragStart = null;
    state.pointerPos = null;
    state.foundColors = new Map();

    // Initialize empty grid
    const grid: Cell[][] = [];

    for (let r = 0; r < GRID_ROWS; r++) {
      grid[r] = [];

      for (let c = 0; c < GRID_COLS; c++) {
        grid[r][c] = { letter: '', row: r, col: c };
      }
    }

    // Shuffle and pick words
    const shuffled = [...theme.words].sort(() => Math.random() - 0.5);
    const toPlace = shuffled.slice(0, WORDS_PER_PUZZLE);

    state.placedWords = [];

    for (const word of toPlace) {
      const placed = this.placeWord(grid, word);

      if (placed) {
        state.placedWords.push(placed);
      }
    }

    // Fill remaining cells with random letters
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (grid[r][c].letter === '') {
          grid[r][c].letter = ALPHABET[Math.floor(Math.random() * 26)];
        }
      }
    }

    state.grid = grid;
  }

  private placeWord(
    grid: Cell[][],
    word: string,
  ): WordSearchState['placedWords'][0] | null {
    const dirs = [...ALL_DIRECTIONS].sort(() => Math.random() - 0.5);

    for (const dir of dirs) {
      const { dr, dc } = DIRECTION_VECTORS[dir];
      const positions = this.getValidPositions(word.length, dir);

      // Shuffle positions for variety
      positions.sort(() => Math.random() - 0.5);

      for (const { row, col } of positions) {
        if (this.canPlace(grid, word, row, col, dr, dc)) {
          const cells: { row: number; col: number }[] = [];

          for (let i = 0; i < word.length; i++) {
            const r = row + i * dr;
            const c = col + i * dc;

            grid[r][c].letter = word[i];
            cells.push({ row: r, col: c });
          }

          return {
            word,
            startRow: row,
            startCol: col,
            direction: dir,
            found: false,
            cells,
          };
        }
      }
    }

    return null;
  }

  private getValidPositions(
    length: number,
    dir: Direction,
  ): { row: number; col: number }[] {
    const { dr, dc } = DIRECTION_VECTORS[dir];
    const positions: { row: number; col: number }[] = [];

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const endR = r + (length - 1) * dr;
        const endC = c + (length - 1) * dc;

        if (endR >= 0 && endR < GRID_ROWS && endC >= 0 && endC < GRID_COLS) {
          positions.push({ row: r, col: c });
        }
      }
    }

    return positions;
  }

  private canPlace(
    grid: Cell[][],
    word: string,
    row: number,
    col: number,
    dr: number,
    dc: number,
  ): boolean {
    for (let i = 0; i < word.length; i++) {
      const r = row + i * dr;
      const c = col + i * dc;
      const existing = grid[r][c].letter;

      if (existing !== '' && existing !== word[i]) {
        return false;
      }
    }

    return true;
  }

  update(state: WordSearchState, dt: number): void {
    if (state.status === 'playing') {
      state.timer += dt / 1000;
    }
  }
}
```

**What's happening:**
- `initBoard()` resets the state, picks a random theme, creates an empty grid, places words, then fills remaining cells. This is the complete puzzle generation pipeline.
- `placeWord()` tries all 8 directions in random order. For each direction, it gathers valid starting positions (where the word fits in bounds), shuffles them, and tries each one until `canPlace()` succeeds. If no position works in any direction, the word is skipped (returns `null`).
- `getValidPositions()` computes the end position of the word (`r + (length-1) * dr`) and checks it stays within grid bounds. This pre-filters so `canPlace()` never needs bounds checks.
- `canPlace()` walks the word's path and checks each cell: an empty cell (`""`) is always fine, a cell with the same letter means two words are crossing (allowed), but a different letter means a conflict (rejected).
- `update()` increments the timer every frame while the game is in the `playing` state.

---

### 2. Update the Engine to Use BoardSystem

**File:** `src/games/word-search/WordSearchEngine.ts`

Replace the random grid initialization with the BoardSystem.

```typescript
import type { WordSearchState } from './types';
import { GRID_ROWS, GRID_COLS } from './types';
import { BoardSystem } from './systems/BoardSystem';
import { BoardRenderer } from './renderers/BoardRenderer';

export class WordSearchEngine {
  private ctx: CanvasRenderingContext2D;
  private state: WordSearchState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private boardSystem: BoardSystem;
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
    this.lastTime = performance.now();
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    this.boardSystem.update(this.state, dt);
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
}
```

**What's happening:**
- The engine now creates a `BoardSystem` and calls `initBoard()` instead of filling random letters directly.
- The game loop calls `boardSystem.update(state, dt)` to increment the timer, then renders.
- `lastTime` tracking enables delta-time calculation so the timer counts real seconds regardless of frame rate.

---

## Test It

1. **Run:** `pnpm dev`
2. **Open:** the Word Search game in your browser
3. **Observe:**
   - The grid now contains **real words hidden among random letters**
   - Open the browser console and log `state.placedWords` to verify words were placed (or temporarily add `console.log(state.placedWords)` after `initBoard`)
   - **Refresh** the page multiple times -- each puzzle uses a different theme and different word positions
   - Words may cross each other where they share a letter

---

## Challenges

**Easy:**
- Log each placed word's direction to the console and verify you see a mix of directions (right, down, diagonal, etc.).
- Change `WORDS_PER_PUZZLE` to 10 and observe more words packed into the grid.

**Medium:**
- Modify the algorithm to only use 4 directions (right, down, down-right, down-left) so words never go backwards. How does this change the puzzle difficulty?

**Hard:**
- Add a "difficulty" parameter that controls direction count: Easy uses 4 directions, Medium uses 6, Hard uses all 8.

---

## What You Learned

- Implementing a word placement algorithm that tries all 8 directions with shuffle-based randomization
- Pre-filtering valid start positions to avoid bounds checks during placement
- Allowing words to cross at shared letters while rejecting letter conflicts
- Filling remaining empty cells with random letters after word placement

**Next:** Drag-to-select interaction -- click and drag across cells to highlight a selection line!
