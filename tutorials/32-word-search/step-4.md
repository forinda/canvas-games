# Step 4: Word Matching & Highlighting

**Goal:** Check selections against the word list, permanently highlight found words with unique colors, and detect the win condition.

**Time:** ~15 minutes

---

## What You'll Build

- **WordSystem** that checks if the selected letters match any unfound word
- **Reverse matching** so dragging a word backwards still counts
- **Colored highlights** that persist on the grid for each found word
- **Win detection** that triggers when all words are found
- **Brighter letters** for cells belonging to found words

---

## Concepts

- **String Extraction**: The selected cells form a straight line through the grid. We extract the letter from each cell and join them into a string. If this string (or its reverse) matches a placed word, it is a match.
- **Cell Coordinate Matching**: String matching alone is not enough -- "TIGER" might appear as random letters elsewhere. We also verify that the selected cell coordinates match the placed word's coordinates exactly, forward or backward.
- **Color Assignment**: Each found word gets a unique color from the `HIGHLIGHT_COLORS` palette. A rotating index ensures consecutive found words get visually distinct colors.
- **Win Condition**: After every successful match, we check if `every` placed word has `found === true`. If so, the game status changes to `'won'`.

---

## Code

### 1. Create the Word System

**File:** `src/games/word-search/systems/WordSystem.ts`

Handles word matching logic and color assignment.

```typescript
import type { WordSearchState } from '../types';
import { HIGHLIGHT_COLORS } from '../types';

export class WordSystem {
  private colorIndex = 0;

  /** Check if the current selection matches any unfound word */
  checkSelection(state: WordSearchState): void {
    if (state.selection.length < 2) return;

    // Build the selected string
    const selectedLetters = state.selection
      .map((c) => state.grid[c.row][c.col].letter)
      .join('');

    // Also check reverse
    const reversedLetters = selectedLetters.split('').reverse().join('');

    for (const pw of state.placedWords) {
      if (pw.found) continue;

      if (pw.word === selectedLetters || pw.word === reversedLetters) {
        // Verify cells match
        const match =
          this.cellsMatch(state.selection, pw.cells) ||
          this.cellsMatch([...state.selection].reverse(), pw.cells);

        if (match) {
          pw.found = true;
          const color =
            HIGHLIGHT_COLORS[this.colorIndex % HIGHLIGHT_COLORS.length];

          this.colorIndex++;
          state.foundColors.set(pw.word, color);
          break;
        }
      }
    }

    // Check win
    if (state.placedWords.every((pw) => pw.found)) {
      state.status = 'won';
    }
  }

  private cellsMatch(
    selection: { row: number; col: number }[],
    wordCells: { row: number; col: number }[],
  ): boolean {
    if (selection.length !== wordCells.length) return false;

    return selection.every(
      (s, i) => s.row === wordCells[i].row && s.col === wordCells[i].col,
    );
  }

  reset(): void {
    this.colorIndex = 0;
  }
}
```

**What's happening:**
- `checkSelection()` first requires at least 2 selected cells (single-cell selections cannot be words).
- It builds `selectedLetters` by mapping each selected cell to its letter and joining. It also builds the reverse string so dragging "REGIT" still matches "TIGER".
- For each unfound placed word, it checks if the string matches. If it does, it additionally verifies that the cell coordinates align -- either forward or reversed. This prevents false positives from random letter sequences elsewhere in the grid.
- On a match, `pw.found = true` permanently marks the word. A color from `HIGHLIGHT_COLORS` is assigned using a rotating index, and stored in `state.foundColors`.
- After a match, we check if all words are found. If `every()` returns true, `state.status = 'won'`.
- `reset()` resets the color index so a new puzzle starts with the first color.

---

### 2. Update the Input System to Use WordSystem

**File:** `src/games/word-search/systems/InputSystem.ts`

Wire the WordSystem into the mouse-up handler so selections are checked.

```typescript
import type { WordSearchState } from '../types';
import type { WordSystem } from './WordSystem';

export class InputSystem {
  private state: WordSearchState;
  private canvas: HTMLCanvasElement;
  private wordSystem: WordSystem;
  private onExit: () => void;
  private onReset: () => void;

  private handleMouseDown: (e: MouseEvent) => void;
  private handleMouseMove: (e: MouseEvent) => void;
  private handleMouseUp: (e: MouseEvent) => void;
  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleTouchStart: (e: TouchEvent) => void;
  private handleTouchMove: (e: TouchEvent) => void;
  private handleTouchEnd: (e: TouchEvent) => void;

  constructor(
    state: WordSearchState,
    canvas: HTMLCanvasElement,
    wordSystem: WordSystem,
    onExit: () => void,
    onReset: () => void,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.wordSystem = wordSystem;
    this.onExit = onExit;
    this.onReset = onReset;

    this.handleMouseDown = (e: MouseEvent) => {
      if (this.state.status !== 'playing') return;

      const cell = this.getCellFromPos(e.clientX, e.clientY);

      if (cell) {
        this.state.dragging = true;
        this.state.dragStart = cell;
        this.state.selection = [cell];
        this.state.pointerPos = { x: e.clientX, y: e.clientY };
      }
    };

    this.handleMouseMove = (e: MouseEvent) => {
      if (!this.state.dragging || !this.state.dragStart) return;

      this.state.pointerPos = { x: e.clientX, y: e.clientY };
      const cell = this.getCellFromPos(e.clientX, e.clientY);

      if (cell) {
        this.state.selection = this.getLineCells(this.state.dragStart, cell);
      }
    };

    this.handleMouseUp = (_e: MouseEvent) => {
      if (!this.state.dragging) return;

      this.state.dragging = false;
      this.state.pointerPos = null;
      this.wordSystem.checkSelection(this.state);
      this.state.selection = [];
      this.state.dragStart = null;
    };

    this.handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.onExit();
      } else if (e.key === 'r' || e.key === 'R') {
        this.onReset();
      }
    };

    this.handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (this.state.status !== 'playing') return;

      const t = e.touches[0];
      const cell = this.getCellFromPos(t.clientX, t.clientY);

      if (cell) {
        this.state.dragging = true;
        this.state.dragStart = cell;
        this.state.selection = [cell];
        this.state.pointerPos = { x: t.clientX, y: t.clientY };
      }
    };

    this.handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!this.state.dragging || !this.state.dragStart) return;

      const t = e.touches[0];
      this.state.pointerPos = { x: t.clientX, y: t.clientY };
      const cell = this.getCellFromPos(t.clientX, t.clientY);

      if (cell) {
        this.state.selection = this.getLineCells(this.state.dragStart, cell);
      }
    };

    this.handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (!this.state.dragging) return;

      this.state.dragging = false;
      this.state.pointerPos = null;
      this.wordSystem.checkSelection(this.state);
      this.state.selection = [];
      this.state.dragStart = null;
    };
  }

  attach(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('keydown', this.handleKeyDown);
    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
  }

  detach(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('keydown', this.handleKeyDown);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
  }

  private getCellFromPos(
    x: number,
    y: number,
  ): { row: number; col: number } | null {
    const s = this.state;
    const col = Math.floor((x - s.offsetX) / s.cellSize);
    const row = Math.floor((y - s.offsetY) / s.cellSize);

    if (row >= 0 && row < s.rows && col >= 0 && col < s.cols) {
      return { row, col };
    }

    return null;
  }

  private getLineCells(
    start: { row: number; col: number },
    end: { row: number; col: number },
  ): { row: number; col: number }[] {
    const dr = end.row - start.row;
    const dc = end.col - start.col;

    const absDr = Math.abs(dr);
    const absDc = Math.abs(dc);

    let stepR: number;
    let stepC: number;
    let steps: number;

    if (absDr === 0 && absDc === 0) {
      return [{ row: start.row, col: start.col }];
    }

    if (absDr >= absDc * 2) {
      stepR = dr > 0 ? 1 : -1;
      stepC = 0;
      steps = absDr;
    } else if (absDc >= absDr * 2) {
      stepR = 0;
      stepC = dc > 0 ? 1 : -1;
      steps = absDc;
    } else {
      stepR = dr > 0 ? 1 : -1;
      stepC = dc > 0 ? 1 : -1;
      steps = Math.max(absDr, absDc);
    }

    const cells: { row: number; col: number }[] = [];

    for (let i = 0; i <= steps; i++) {
      const r = start.row + i * stepR;
      const c = start.col + i * stepC;

      if (r >= 0 && r < this.state.rows && c >= 0 && c < this.state.cols) {
        cells.push({ row: r, col: c });
      }
    }

    return cells;
  }
}
```

**What's happening:**
- The constructor now accepts a `WordSystem` reference.
- In `handleMouseUp` and `handleTouchEnd`, we call `this.wordSystem.checkSelection(this.state)` before clearing the selection. This is the moment of truth -- the player releases the drag and we check if they found a word.
- The rest of the input handling is unchanged from Step 3.

---

### 3. Update the Board Renderer for Found Word Highlights

**File:** `src/games/word-search/renderers/BoardRenderer.ts`

Add persistent highlights for found words and brighten their letters.

```typescript
import type { WordSearchState } from '../types';
import { GAME_COLOR } from '../types';

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: WordSearchState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    const { offsetX, offsetY, cellSize, rows, cols } = state;

    // Grid background
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

    // Draw found word highlights
    for (const pw of state.placedWords) {
      if (!pw.found) continue;

      const color = state.foundColors.get(pw.word) || GAME_COLOR;
      this.drawWordHighlight(ctx, state, pw.cells, color, 0.3);
    }

    // Draw current selection highlight
    if (state.selection.length > 0) {
      this.drawWordHighlight(ctx, state, state.selection, GAME_COLOR, 0.4);
    }

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

        const isFound = this.isCellInFoundWord(state, r, c);
        const isSelected = state.selection.some(
          (s) => s.row === r && s.col === c,
        );

        if (isFound) {
          ctx.fillStyle = '#fff';
        } else if (isSelected) {
          ctx.fillStyle = '#e0e0ff';
        } else {
          ctx.fillStyle = '#8888aa';
        }

        ctx.fillText(cell.letter, cx, cy);
      }
    }
  }

  private drawWordHighlight(
    ctx: CanvasRenderingContext2D,
    state: WordSearchState,
    cells: { row: number; col: number }[],
    color: string,
    alpha: number,
  ): void {
    if (cells.length === 0) return;

    const { offsetX, offsetY, cellSize } = state;
    const half = cellSize / 2;

    const first = cells[0];
    const last = cells[cells.length - 1];

    const x1 = offsetX + first.col * cellSize + half;
    const y1 = offsetY + first.row * cellSize + half;
    const x2 = offsetX + last.col * cellSize + half;
    const y2 = offsetY + last.row * cellSize + half;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = cellSize * 0.75;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  private isCellInFoundWord(
    state: WordSearchState,
    row: number,
    col: number,
  ): boolean {
    for (const pw of state.placedWords) {
      if (!pw.found) continue;
      if (pw.cells.some((c) => c.row === row && c.col === col)) return true;
    }

    return false;
  }
}
```

**What's happening:**
- Found word highlights are drawn before the current selection, so they layer correctly. Each found word uses its assigned color from `state.foundColors` at 0.3 alpha.
- The current selection still draws at 0.4 alpha with `GAME_COLOR`, slightly more opaque so it is clearly the active drag.
- Letter colors now have three tiers: `#fff` (white) for cells in found words, `#e0e0ff` (light blue) for currently selected cells, and `#8888aa` (muted) for everything else.
- `isCellInFoundWord()` checks if a cell belongs to any found word by iterating the placed words list. This is called per-cell per-frame, but with only 8 words and ~5-7 cells each, the cost is negligible.

---

### 4. Update the Engine

**File:** `src/games/word-search/WordSearchEngine.ts`

Add the WordSystem and pass it to the InputSystem.

```typescript
import type { WordSearchState } from './types';
import { GRID_ROWS, GRID_COLS } from './types';
import { BoardSystem } from './systems/BoardSystem';
import { InputSystem } from './systems/InputSystem';
import { WordSystem } from './systems/WordSystem';
import { BoardRenderer } from './renderers/BoardRenderer';

export class WordSearchEngine {
  private ctx: CanvasRenderingContext2D;
  private state: WordSearchState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private boardSystem: BoardSystem;
  private wordSystem: WordSystem;
  private inputSystem: InputSystem;
  private boardRenderer: BoardRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
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
    this.wordSystem = new WordSystem();
    this.boardRenderer = new BoardRenderer();

    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      this.wordSystem,
      onExit,
      () => this.reset(),
    );

    this.boardSystem.initBoard(this.state);
    this.computeLayout();

    this.inputSystem.attach();

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
    this.inputSystem.detach();
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

  private reset(): void {
    this.wordSystem.reset();
    this.boardSystem.initBoard(this.state);
    this.computeLayout();
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
- The engine now creates a `WordSystem` and passes it to the `InputSystem` constructor.
- `reset()` calls `wordSystem.reset()` to reset the color index before generating a new board.
- The render loop remains the same -- the BoardRenderer now handles found word highlights automatically based on state.

---

## Test It

1. **Run:** `pnpm dev`
2. **Open:** the Word Search game in your browser
3. **Observe:**
   - **Drag across a hidden word** -- when you release, it stays highlighted with a colored line
   - Each found word gets a **different color** (red, amber, green, blue, etc.)
   - **Letters in found words** turn bright white
   - Try dragging a word **backwards** -- it still matches
   - **Find all words** and verify the timer stops (the game enters `'won'` state)
   - Press **R** to restart with a fresh puzzle and reset colors

---

## Challenges

**Easy:**
- Add a `console.log` when a word is found that prints the word and its color.
- Change the found word highlight alpha from 0.3 to 0.5 for more vivid colors.

**Medium:**
- Add a brief flash animation when a word is found -- temporarily increase the highlight alpha to 1.0 for a few frames, then fade back to 0.3.

**Hard:**
- Add a "hint" feature (press H) that briefly flashes the first unfound word's starting cell for 1 second.

---

## What You Learned

- Extracting a letter string from a grid selection and checking it against placed words
- Matching both forward and reversed selections to support bidirectional dragging
- Verifying cell coordinates (not just letters) to prevent false positives
- Assigning rotating highlight colors from a palette
- Detecting the win condition with `Array.every()`

**Next:** Word list display and polish -- show the word list, cross off found words, add a timer, and build the win screen!
