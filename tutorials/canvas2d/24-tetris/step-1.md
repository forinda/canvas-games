# Step 1: Board & Grid

**Goal:** Draw a 10x20 Tetris board with cell borders and define the color palette for all seven tetrominoes.

**Time:** ~15 minutes

---

## What You'll Build

The foundational playfield:
- **10x20 grid**: The classic Tetris board dimensions
- **Centered board**: Board sits in the middle of the viewport
- **Cell grid lines**: Subtle lines so players can count cells
- **Dark theme**: Deep navy background with a slightly lighter board area
- **Cell rendering**: A helper that draws a single block with beveled highlight and shadow

---

## Concepts

- **Grid sizing**: Calculate a `cellSize` that fits the viewport, then derive the board pixel dimensions from it
- **Coordinate mapping**: Convert grid `(row, col)` to pixel `(x, y)` with an offset so the board is centered
- **Bevel shading**: A 2-pixel white highlight on the top-left edges and a dark shadow on the bottom-right gives each block a 3D look

---

## Code

### 1. Create Types

**File:** `src/contexts/canvas2d/games/tetris/types.ts`

Define the grid constants, state shape, and helpers. We will add more fields in later steps, but setting up the full type now avoids refactors.

```typescript
export const COLS = 10;
export const ROWS = 20;
export const HS_KEY = 'tetris_highscore';

export type CellColor = string | null;

/** A 2D shape matrix: each rotation is an array of [row, col] offsets from the piece origin */
export type RotationMatrix = readonly (readonly [number, number])[];

export interface PieceDefinition {
  id: string;
  color: string;
  rotations: readonly RotationMatrix[];
}

export interface ActivePiece {
  defIndex: number;    // index into PIECES array
  rotation: number;    // current rotation index
  x: number;           // column of origin
  y: number;           // row of origin
}

export interface TetrisState {
  board: CellColor[][];             // ROWS x COLS grid, null = empty
  currentPiece: ActivePiece | null;
  nextPieceIndex: number;
  score: number;
  highScore: number;
  level: number;
  lines: number;
  gameOver: boolean;
  paused: boolean;
  started: boolean;

  // Timing
  dropTimer: number;       // ms accumulated since last gravity drop
  lockTimer: number;       // ms accumulated in lock delay
  lockDelay: number;       // ms before piece locks (500ms)
  isLocking: boolean;

  // Line clear animation
  clearingLines: number[]; // rows being cleared (animated)
  clearTimer: number;      // ms into clear animation
  clearDuration: number;   // total clear animation time

  // DAS state
  dasKey: string | null;
  dasTimer: number;
  dasDelay: number;        // initial delay before repeat (170ms)
  dasInterval: number;     // repeat interval (50ms)
  dasReady: boolean;       // passed initial delay
}

/** Create a fresh empty board */
export function createEmptyBoard(): CellColor[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

/** Get the drop interval in ms for a given level */
export function getDropInterval(level: number): number {
  // NES-style speed curve (approximate)
  const speeds = [800, 720, 630, 550, 470, 380, 300, 220, 140, 100, 80, 80, 80, 70, 70, 70, 50, 50, 50, 30];
  return speeds[Math.min(level, speeds.length - 1)] ?? 30;
}
```

**What's happening:**
- `CellColor` is either a CSS color string (occupied) or `null` (empty). This lets the board store exactly what color each locked block should be.
- `createEmptyBoard()` builds a 20-row by 10-column 2D array filled with `null`. We will call this on every reset.
- `getDropInterval` returns the milliseconds between automatic gravity ticks. Level 0 is a relaxed 800 ms; by level 9 it is a frantic 100 ms.
- The `TetrisState` interface looks large, but most fields have simple jobs. We define them all now so the type stays stable as we add features step by step.

---

### 2. Create the Board Renderer

**File:** `src/contexts/canvas2d/games/tetris/renderers/BoardRenderer.ts`

Draw the empty board grid. Later steps will add blocks and ghost pieces to this renderer.

```typescript
import type { TetrisState } from '../types';
import { COLS, ROWS } from '../types';

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: TetrisState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Calculate cell size and board position (centered)
    const cellSize = Math.floor(Math.min((H - 40) / ROWS, (W * 0.5) / COLS));
    const boardW = cellSize * COLS;
    const boardH = cellSize * ROWS;
    const offsetX = Math.floor((W - boardW) / 2);
    const offsetY = Math.floor((H - boardH) / 2);

    // Background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    // Board background
    ctx.fillStyle = '#111122';
    ctx.fillRect(offsetX, offsetY, boardW, boardH);

    // Grid lines
    ctx.strokeStyle = '#1a1a33';
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + r * cellSize);
      ctx.lineTo(offsetX + boardW, offsetY + r * cellSize);
      ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(offsetX + c * cellSize, offsetY);
      ctx.lineTo(offsetX + c * cellSize, offsetY + boardH);
      ctx.stroke();
    }

    // Placed blocks
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const color = state.board[r][c];
        if (color) {
          this.drawCell(ctx, offsetX + c * cellSize, offsetY + r * cellSize, cellSize, color);
        }
      }
    }

    // Board border
    ctx.strokeStyle = '#334';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX - 1, offsetY - 1, boardW + 2, boardH + 2);
  }

  drawCell(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
    const gap = 1;
    ctx.fillStyle = color;
    ctx.fillRect(x + gap, y + gap, size - gap * 2, size - gap * 2);

    // Highlight (top-left)
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x + gap, y + gap, size - gap * 2, 2);
    ctx.fillRect(x + gap, y + gap, 2, size - gap * 2);

    // Shadow (bottom-right)
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + gap, y + size - gap - 2, size - gap * 2, 2);
    ctx.fillRect(x + size - gap - 2, y + gap, 2, size - gap * 2);
  }
}
```

**What's happening:**
- `cellSize` is calculated to fit the board inside the viewport. We use `H - 40` to leave a small margin and `W * 0.5` so there is room for side panels later.
- `offsetX` and `offsetY` center the board both horizontally and vertically.
- Grid lines use a very dark blue (`#1a1a33`) at half-pixel line width, visible enough to count cells but not distracting.
- `drawCell` fills a square inset by 1 pixel on each side (the `gap`), then paints a 2-pixel white strip along the top and left edges and a dark strip along the bottom and right. This bevel trick is cheap and gives each block a satisfying 3D appearance.
- We iterate over `state.board` and draw any non-null cells. Right now the board is empty, so nothing appears yet.

---

### 3. Create the Engine

**File:** `src/contexts/canvas2d/games/tetris/TetrisEngine.ts`

Wire the state and renderer into a game loop:

```typescript
import type { TetrisState } from './types';
import { createEmptyBoard } from './types';
import { BoardRenderer } from './renderers/BoardRenderer';

export class TetrisEngine {
  private ctx: CanvasRenderingContext2D;
  private state: TetrisState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private boardRenderer: BoardRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = {
      board: createEmptyBoard(),
      currentPiece: null,
      nextPieceIndex: 0,
      score: 0,
      highScore: 0,
      level: 0,
      lines: 0,
      gameOver: false,
      paused: false,
      started: false,
      dropTimer: 0,
      lockTimer: 0,
      lockDelay: 500,
      isLocking: false,
      clearingLines: [],
      clearTimer: 0,
      clearDuration: 300,
      dasKey: null,
      dasTimer: 0,
      dasDelay: 170,
      dasInterval: 50,
      dasReady: false,
    };

    this.boardRenderer = new BoardRenderer();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
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
    this.lastTime = now;

    // Render
    this.boardRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

**What's happening:**
- We initialize every field of `TetrisState` even though most are unused this step. This prevents undefined-field bugs later.
- The resize handler keeps the canvas matched to the viewport so the board scales when the window changes.
- The loop only renders for now. We will add update logic in step 4.

---

### 4. Create the Entry Point

**File:** `src/contexts/canvas2d/games/tetris/index.ts`

```typescript
import { TetrisEngine } from './TetrisEngine';

export function createTetris(canvas: HTMLCanvasElement): { destroy: () => void } {
  const engine = new TetrisEngine(canvas);
  engine.start();
  return { destroy: () => engine.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Tetris game
3. **Observe:**
   - Dark navy background fills the entire viewport
   - A darker rectangular board sits centered on screen
   - Faint grid lines divide the board into a 10-wide, 20-tall grid
   - A thin border outlines the board
   - Resizing the browser window recalculates the cell size and re-centers the board

---

## Try It

- Change `COLS` to `12` and `ROWS` to `24` temporarily. The board adapts because everything derives from `cellSize`.
- Manually set `state.board[19][4] = '#00e5ff'` (a cyan cell in the bottom-center) and confirm the beveled block appears.
- Increase the grid-line `strokeStyle` alpha to `#333366` to see the lines more clearly.

---

## Challenges

**Easy:**
- Change the board background from `#111122` to a dark green for a Game Boy feel.
- Make the grid lines dashed using `ctx.setLineDash([2, 4])`.

**Medium:**
- Draw row numbers (0-19) along the left edge of the board in a tiny font.
- Add a subtle gradient to the outer background using `ctx.createLinearGradient`.

**Hard:**
- Make the board background semi-transparent and draw a slowly scrolling star field behind it.

---

## What You Learned

- Grid sizing with `Math.min` to fit a fixed aspect ratio into any viewport
- Centering a fixed-size element with offset calculation
- Drawing a grid with horizontal and vertical stroke lines
- Bevel shading technique: white highlight on top-left, dark shadow on bottom-right
- Full state type definition up front to avoid incremental refactors

**Next:** Define all seven tetrominoes as rotation matrices and spawn them at the top of the board.
