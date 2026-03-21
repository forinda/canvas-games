# Step 3: Drag-to-Select Letters

**Goal:** Click and drag across cells to highlight a selection line constrained to horizontal, vertical, or diagonal directions.

**Time:** ~15 minutes

---

## What You'll Build

- **InputSystem** that handles mouse down, move, and up events to track drag state
- **Line constraint logic** that snaps the selection to horizontal, vertical, or diagonal
- **Visual feedback** showing which cells are currently selected during a drag
- **Touch support** so the game works on mobile devices

---

## Concepts

- **Drag State Machine**: A drag has three phases -- `mousedown` starts it (sets `dragStart`), `mousemove` updates the selection, and `mouseup` ends it (clears the drag). The `dragging` boolean on state gates the move/up handlers.
- **Line Snapping**: The player can drag in any direction, but we snap to the nearest axis: if the vertical distance is more than double the horizontal, it is vertical; if horizontal dominates, it is horizontal; otherwise diagonal. This matches how words are placed.
- **Cell-from-Pixel Lookup**: `Math.floor((x - offsetX) / cellSize)` converts a canvas pixel coordinate to a grid column. Combined with bounds checking, this maps any click to a cell or `null`.
- **Touch Parity**: Touch events mirror mouse events exactly -- `touchstart` maps to `mousedown`, `touchmove` to `mousemove`, `touchend` to `mouseup`. We call `preventDefault()` to stop the browser from scrolling.

---

## Code

### 1. Create the Input System

**File:** `src/games/word-search/systems/InputSystem.ts`

Handles all pointer interaction: mouse clicks, drag movement, and keyboard shortcuts.

```typescript
import type { WordSearchState } from '../types';

export class InputSystem {
  private state: WordSearchState;
  private canvas: HTMLCanvasElement;
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
    onExit: () => void,
    onReset: () => void,
  ) {
    this.state = state;
    this.canvas = canvas;
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
      // Word checking will be added in Step 4
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

  /** Get cells along the line from start to end, constrained to horizontal/vertical/diagonal */
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
      // Vertical
      stepR = dr > 0 ? 1 : -1;
      stepC = 0;
      steps = absDr;
    } else if (absDc >= absDr * 2) {
      // Horizontal
      stepR = 0;
      stepC = dc > 0 ? 1 : -1;
      steps = absDc;
    } else {
      // Diagonal
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
- `handleMouseDown` converts the click position to a grid cell. If valid, it sets `dragging = true`, records the `dragStart` cell, and initializes the selection with just that one cell.
- `handleMouseMove` calls `getLineCells()` to compute all cells between the drag start and the current cell. The selection updates live as the mouse moves.
- `handleMouseUp` ends the drag, clears the selection, and resets drag state. In Step 4, we will add word checking here before clearing.
- `getLineCells()` is the core snap logic. It computes the raw delta (`dr`, `dc`) between start and end cells, then snaps to the dominant axis. If `absDr >= absDc * 2`, the drag is mostly vertical. If `absDc >= absDr * 2`, it is mostly horizontal. Otherwise, it is diagonal. The step values are always -1, 0, or 1, producing a straight line.
- `getCellFromPos()` divides pixel coordinates by `cellSize` and subtracts the offset to get grid coordinates. Bounds checking ensures clicks outside the grid return `null`.
- Touch handlers mirror mouse handlers exactly, using `e.touches[0]` for coordinates and `preventDefault()` to block scrolling.

---

### 2. Update the Board Renderer for Selection Highlighting

**File:** `src/games/word-search/renderers/BoardRenderer.ts`

Add visual feedback for the current selection.

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

        const isSelected = state.selection.some(
          (s) => s.row === r && s.col === c,
        );

        if (isSelected) {
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
}
```

**What's happening:**
- Before drawing letters, we check if `state.selection` has cells and draw a highlight line through them using `drawWordHighlight()`.
- `drawWordHighlight()` draws a thick, semi-transparent, rounded line from the first selected cell to the last. The line width is `cellSize * 0.75`, so it nearly fills each cell -- creating a capsule-shaped highlight.
- Selected letters render in bright white (`#e0e0ff`) instead of the default muted color, making them pop against the highlight.
- `ctx.save()` and `ctx.restore()` isolate the `globalAlpha` change so it does not affect subsequent drawing.

---

### 3. Update the Engine with InputSystem

**File:** `src/games/word-search/WordSearchEngine.ts`

Wire up the InputSystem and add a reset method.

```typescript
import type { WordSearchState } from './types';
import { GRID_ROWS, GRID_COLS } from './types';
import { BoardSystem } from './systems/BoardSystem';
import { InputSystem } from './systems/InputSystem';
import { BoardRenderer } from './renderers/BoardRenderer';

export class WordSearchEngine {
  private ctx: CanvasRenderingContext2D;
  private state: WordSearchState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private boardSystem: BoardSystem;
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
    this.boardRenderer = new BoardRenderer();

    this.inputSystem = new InputSystem(
      this.state,
      canvas,
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
- The engine now accepts an `onExit` callback and creates an `InputSystem`, passing it the state, canvas, exit callback, and a reset callback.
- `inputSystem.attach()` registers all event listeners after the board is initialized.
- `destroy()` calls `inputSystem.detach()` to clean up all event listeners.
- `reset()` regenerates the puzzle and recomputes layout, giving the player a fresh board.

---

## Test It

1. **Run:** `pnpm dev`
2. **Open:** the Word Search game in your browser
3. **Observe:**
   - **Click and hold** on any letter, then **drag** across the grid
   - A **purple highlight line** follows your drag, snapping to horizontal, vertical, or diagonal
   - **Selected letters** turn bright white
   - **Release** the mouse and the selection clears
   - Press **R** to generate a new puzzle
   - Try dragging on a **touch device** or in device emulation mode

---

## Challenges

**Easy:**
- Change the selection highlight color from `GAME_COLOR` to a bright green and see how it looks.
- Increase the highlight line width from `cellSize * 0.75` to `cellSize * 0.9` for a bolder selection.

**Medium:**
- Add a visual indicator at the drag start cell (like a small circle) so the player knows which end is the anchor.

**Hard:**
- Display the currently selected letters as text above the grid while dragging, so the player can read what they are selecting without looking at individual cells.

---

## What You Learned

- Implementing a drag state machine with start, move, and end phases
- Converting pixel coordinates to grid cell positions
- Snapping free-form drag to constrained directions (horizontal, vertical, diagonal)
- Drawing thick rounded highlight lines through cell centers
- Supporting both mouse and touch input with parallel event handlers

**Next:** Word matching -- check selections against the word list and permanently highlight found words!
