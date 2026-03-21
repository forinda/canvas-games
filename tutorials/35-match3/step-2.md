# Step 2: Gem Swapping

**Goal:** Click two adjacent gems to swap them, with selection highlighting and adjacency validation.

**Time:** ~15 minutes

---

## What You'll Build

- **Click-to-select** a gem with a white highlight border
- **Click an adjacent gem** to swap the two gems on the board
- **Adjacency validation** -- only horizontal or vertical neighbours can be swapped
- **Click a non-adjacent gem** to change the selection instead of swapping
- **Keyboard shortcuts** for pause (P) and future extensibility

---

## Concepts

- **Two-Click Selection**: The first click selects a gem (highlight it). The second click either swaps (if adjacent) or re-selects (if not adjacent). This is the standard Bejeweled interaction model.
- **Adjacency Check**: Two cells are adjacent if the Manhattan distance is exactly 1: `(|dr| === 1 && dc === 0) || (dr === 0 && |dc| === 1)`. Diagonal swaps are not allowed.
- **Pixel-to-Grid Conversion**: Convert mouse coordinates to grid coordinates using `Math.floor((mouseX - boardOffsetX) / cellSize)`. This is the reverse of the gem positioning formula from Step 1.
- **Board Array Swap**: Swapping two gems means updating the 2D array entries and each gem's `row`/`col` fields, then recalculating pixel positions.

---

## Code

### 2.1 Add the Input System

**File:** `src/games/match3/systems/InputSystem.ts`

Handles mouse clicks for gem selection and swapping, plus keyboard shortcuts.

```typescript
import type { Match3State } from '../types';
import type { BoardSystem } from './BoardSystem';

export class InputSystem {
  private state: Match3State;
  private canvas: HTMLCanvasElement;
  private boardSystem: BoardSystem;

  private handleClick: (e: MouseEvent) => void;
  private handleKeyDown: (e: KeyboardEvent) => void;

  constructor(
    state: Match3State,
    canvas: HTMLCanvasElement,
    boardSystem: BoardSystem,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.boardSystem = boardSystem;

    this.handleClick = this.onClick.bind(this);
    this.handleKeyDown = this.onKeyDown.bind(this);
  }

  attach(): void {
    this.canvas.addEventListener('click', this.handleClick);
    window.addEventListener('keydown', this.handleKeyDown);
  }

  detach(): void {
    this.canvas.removeEventListener('click', this.handleClick);
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  private onClick(e: MouseEvent): void {
    const s = this.state;

    if (s.gameOver || s.paused) return;
    if (s.phase !== 'idle') return;

    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const col = Math.floor((mx - s.boardOffsetX) / s.cellSize);
    const row = Math.floor((my - s.boardOffsetY) / s.cellSize);

    // Click outside the board — deselect
    if (row < 0 || row >= s.rows || col < 0 || col >= s.cols) {
      s.selected = null;
      return;
    }

    // First click — select this gem
    if (!s.selected) {
      s.selected = { row, col };
      return;
    }

    // Second click — check adjacency
    const dr = Math.abs(row - s.selected.row);
    const dc = Math.abs(col - s.selected.col);
    const isAdjacent = (dr === 1 && dc === 0) || (dr === 0 && dc === 1);

    if (!isAdjacent) {
      // Not adjacent — re-select the new gem
      s.selected = { row, col };
      return;
    }

    // Perform swap
    this.boardSystem.swap(s, s.selected.row, s.selected.col, row, col);

    // Snap pixel positions immediately (no animation yet)
    const gemA = s.board[s.selected.row]?.[s.selected.col];
    const gemB = s.board[row]?.[col];
    if (gemA) {
      gemA.x = s.boardOffsetX + s.selected.col * s.cellSize + s.cellSize / 2;
      gemA.y = s.boardOffsetY + s.selected.row * s.cellSize + s.cellSize / 2;
    }
    if (gemB) {
      gemB.x = s.boardOffsetX + col * s.cellSize + s.cellSize / 2;
      gemB.y = s.boardOffsetY + row * s.cellSize + s.cellSize / 2;
    }

    s.movesLeft--;
    s.selected = null;
  }

  private onKeyDown(e: KeyboardEvent): void {
    const s = this.state;

    switch (e.key.toLowerCase()) {
      case 'p':
        if (!s.gameOver) s.paused = !s.paused;
        break;
    }
  }
}
```

**What's happening:**
- `onClick` converts the mouse position to grid coordinates using the board offset and cell size.
- The first click sets `state.selected`. The second click checks adjacency -- if the two cells are exactly 1 step apart horizontally or vertically, we call `boardSystem.swap()`.
- After swapping, we immediately snap both gems' pixel positions to their new grid cells. In Step 6 we will replace this with smooth tweened animation.
- If the second click is not adjacent, we simply re-select the clicked gem rather than doing nothing.

---

### 2.2 Add the Swap Method to BoardSystem

**File:** `src/games/match3/systems/BoardSystem.ts`

Add the `swap` method to the existing `BoardSystem` class.

```typescript
import type { Gem, GemType, Match3State } from '../types';
import { GEM_TYPES, ROWS, COLS } from '../types';

export class BoardSystem {
  /** Create a board with no initial matches */
  initBoard(state: Match3State): void {
    const board: (Gem | null)[][] = [];

    for (let r = 0; r < ROWS; r++) {
      board[r] = [];
      for (let c = 0; c < COLS; c++) {
        board[r][c] = this.createGem(r, c, state, board);
      }
    }

    state.board = board;
  }

  /** Perform a swap on the board array */
  swap(
    state: Match3State,
    rA: number,
    cA: number,
    rB: number,
    cB: number,
  ): void {
    const a = state.board[rA][cA];
    const b = state.board[rB][cB];

    if (a) {
      a.row = rB;
      a.col = cB;
    }
    if (b) {
      b.row = rA;
      b.col = cA;
    }

    state.board[rA][cA] = b;
    state.board[rB][cB] = a;
  }

  update(_state: Match3State, _dt: number): void {
    // No-op for now — we will add phase logic in Step 3
  }

  private createGem(
    row: number,
    col: number,
    state: Match3State,
    board: (Gem | null)[][],
  ): Gem {
    const { cellSize, boardOffsetX, boardOffsetY } = state;
    let type: GemType;

    do {
      type = GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
    } while (this.causesMatch(board, row, col, type));

    return {
      type,
      row,
      col,
      x: boardOffsetX + col * cellSize + cellSize / 2,
      y: boardOffsetY + row * cellSize + cellSize / 2,
      falling: false,
      scale: 1,
      opacity: 1,
    };
  }

  private causesMatch(
    board: (Gem | null)[][],
    row: number,
    col: number,
    type: GemType,
  ): boolean {
    if (
      col >= 2 &&
      board[row][col - 1]?.type === type &&
      board[row][col - 2]?.type === type
    )
      return true;

    if (
      row >= 2 &&
      board[row - 1]?.[col]?.type === type &&
      board[row - 2]?.[col]?.type === type
    )
      return true;

    return false;
  }
}
```

**What's happening:**
- `swap` exchanges two gems in the board array and updates each gem's `row` and `col` properties.
- The method handles `null` entries safely -- if either cell is empty, we still swap the array references.
- This is a pure data operation. The visual update (snapping pixel positions) is handled by the caller for now.

---

### 2.3 Update the Board Renderer for Selection Highlight

**File:** `src/games/match3/renderers/BoardRenderer.ts`

Add the selection highlight rendering between the grid lines and gems sections.

```typescript
import type { Match3State } from '../types';
import { GEM_COLORS, GEM_GLOW, ROWS, COLS } from '../types';

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: Match3State): void {
    const { board, cellSize, boardOffsetX, boardOffsetY, selected } = state;

    // Board background
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.roundRect(
      boardOffsetX - 4,
      boardOffsetY - 4,
      COLS * cellSize + 8,
      ROWS * cellSize + 8,
      12,
    );
    ctx.fill();

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;

    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(boardOffsetX, boardOffsetY + r * cellSize);
      ctx.lineTo(boardOffsetX + COLS * cellSize, boardOffsetY + r * cellSize);
      ctx.stroke();
    }

    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(boardOffsetX + c * cellSize, boardOffsetY);
      ctx.lineTo(boardOffsetX + c * cellSize, boardOffsetY + ROWS * cellSize);
      ctx.stroke();
    }

    // Selected highlight
    if (selected) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(
        boardOffsetX + selected.col * cellSize,
        boardOffsetY + selected.row * cellSize,
        cellSize,
        cellSize,
      );
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        boardOffsetX + selected.col * cellSize + 1,
        boardOffsetY + selected.row * cellSize + 1,
        cellSize - 2,
        cellSize - 2,
      );
    }

    // Gems
    const radius = cellSize * 0.38;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gem = board[r][c];
        if (!gem) continue;

        ctx.save();
        ctx.globalAlpha = gem.opacity;

        const cx = gem.x;
        const cy = gem.y;
        const drawRadius = radius * gem.scale;

        // Glow
        ctx.shadowColor = GEM_GLOW[gem.type];
        ctx.shadowBlur = 8;

        // Main circle with radial gradient
        const gradient = ctx.createRadialGradient(
          cx - drawRadius * 0.3,
          cy - drawRadius * 0.3,
          drawRadius * 0.1,
          cx,
          cy,
          drawRadius,
        );
        gradient.addColorStop(0, GEM_GLOW[gem.type]);
        gradient.addColorStop(1, GEM_COLORS[gem.type]);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, drawRadius, 0, Math.PI * 2);
        ctx.fill();

        // Specular highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.ellipse(
          cx - drawRadius * 0.2,
          cy - drawRadius * 0.25,
          drawRadius * 0.35,
          drawRadius * 0.2,
          -0.5,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        ctx.restore();
      }
    }
  }
}
```

**What's happening:**
- When `state.selected` is set, we draw a semi-transparent white fill and a 2px white border around the selected cell.
- The highlight is drawn after the grid lines but before the gems so it appears behind the gem circles.

---

### 2.4 Wire Input into the Engine

**File:** `src/games/match3/Match3Engine.ts`

Update the engine to create and attach the InputSystem.

```typescript
import type { Match3State } from './types';
import { ROWS, COLS, MAX_MOVES } from './types';
import { BoardSystem } from './systems/BoardSystem';
import { InputSystem } from './systems/InputSystem';
import { BoardRenderer } from './renderers/BoardRenderer';

export class Match3Engine {
  private ctx: CanvasRenderingContext2D;
  private state: Match3State;
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

    const cellSize = Math.floor(
      Math.min((canvas.width - 80) / COLS, (canvas.height - 120) / ROWS),
    );
    const boardW = COLS * cellSize;
    const boardH = ROWS * cellSize;

    this.state = {
      board: [],
      rows: ROWS,
      cols: COLS,
      cellSize,
      boardOffsetX: (canvas.width - boardW) / 2,
      boardOffsetY: (canvas.height - boardH) / 2 + 24,
      selected: null,
      swapA: null,
      swapB: null,
      phase: 'idle',
      phaseTimer: 0,
      score: 0,
      highScore: 0,
      combo: 0,
      movesLeft: MAX_MOVES,
      maxMoves: MAX_MOVES,
      matched: new Set(),
      paused: false,
      started: true,
      gameOver: false,
      canvasW: canvas.width,
      canvasH: canvas.height,
    };

    this.boardSystem = new BoardSystem();
    this.boardRenderer = new BoardRenderer();

    this.boardSystem.initBoard(this.state);

    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      this.boardSystem,
    );
    this.inputSystem.attach();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.recalcLayout(canvas);
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
    this.inputSystem.detach();
    window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;
    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    const { ctx, state } = this;

    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, state.canvasW, state.canvasH);

    this.boardRenderer.render(ctx, state);
  }

  private recalcLayout(canvas: HTMLCanvasElement): void {
    const s = this.state;
    s.canvasW = canvas.width;
    s.canvasH = canvas.height;
    s.cellSize = Math.floor(
      Math.min((canvas.width - 80) / COLS, (canvas.height - 120) / ROWS),
    );
    const boardW = COLS * s.cellSize;
    const boardH = ROWS * s.cellSize;

    s.boardOffsetX = (canvas.width - boardW) / 2;
    s.boardOffsetY = (canvas.height - boardH) / 2 + 24;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gem = s.board[r]?.[c];
        if (gem) {
          gem.x = s.boardOffsetX + c * s.cellSize + s.cellSize / 2;
          gem.y = s.boardOffsetY + r * s.cellSize + s.cellSize / 2;
        }
      }
    }
  }
}
```

**What's happening:**
- The `InputSystem` is created with references to the state, canvas, and board system.
- `attach()` is called in the constructor to start listening for clicks and keypresses.
- `detach()` is called in `destroy()` to clean up event listeners.

---

## Test It

1. **Run:** `pnpm dev`
2. **Open:** the Match-3 game in your browser
3. **Observe:**
   - **Click a gem** and see a white highlight border appear around it
   - **Click an adjacent gem** and the two gems swap positions instantly
   - **Click a non-adjacent gem** and the selection moves to the new gem
   - **Click outside the board** and the selection clears
   - The **moves counter** decreases by 1 with each successful swap
   - **Press P** to toggle pause (no visual indicator yet, but clicks are ignored)

---

## Challenges

**Easy:**
- Change the selection highlight colour from white to match the game's pink accent (`#e91e63`).
- Add a console.log in `onClick` showing the grid coordinates of each click.

**Medium:**
- Highlight the 4 adjacent cells (up/down/left/right) of the selected gem with a subtle coloured overlay, showing valid swap targets.

**Hard:**
- Add drag-and-drop swapping: click and drag from one gem to an adjacent gem to swap them in a single gesture.

---

## What You Learned

- Converting pixel coordinates to grid positions using offset and cell size
- Implementing two-click selection with adjacency validation
- Swapping gems in a 2D array while keeping row/col metadata in sync
- Attaching and detaching event listeners cleanly with an InputSystem class

**Next:** Match detection -- find runs of 3 or more matching gems and remove them from the board!

---
[<- Previous Step](./step-1.md) | [Back to Game README](./README.md) | [Next Step ->](./step-3.md)
