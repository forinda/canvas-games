# Step 1: Project Setup & Pipe Tile Rendering

**Goal:** Draw different pipe shapes (straight, elbow, T-junction, cross) on a grid of tiles with a dark background and responsive layout.

**Time:** ~15 minutes

---

## What You'll Build

- **Type definitions** for pipe pieces, rotations, grid state, and layout
- **A grid of tiles** rendered on a dark canvas background
- **Four pipe shapes** drawn as colored rectangles: straight, elbow, tee, and cross
- **Source and drain markers** with distinct colors and labels
- **Responsive layout** that centers and scales the board on window resize

---

## Concepts

- **Pipe Types**: The game has four pipe shapes -- `straight` (connects two opposite sides), `elbow` (connects two adjacent sides), `tee` (connects three sides), and `cross` (connects all four sides). Each shape is defined by which directions it opens toward.
- **Direction Model**: We number directions 0-3 clockwise: 0=up, 1=right, 2=down, 3=left. Each pipe type stores its base openings at rotation 0, and rotating by 90 degrees simply shifts each direction number by 1 (mod 4).
- **Drawing Pipes with Rectangles**: Each pipe is drawn as a center hub (a small square) plus rectangular arms extending from the hub toward each open direction. This is simpler than drawing curves and reads clearly at any size.
- **Layout Calculation**: `Math.min(availW / cols, availH / rows)` produces square cells that fit the viewport, keeping the board centered.

---

## Code

### 1. Create Types

**File:** `src/contexts/canvas2d/games/pipe-connect/types.ts`

All the types and helper functions for the entire game, defined up front so later files never need modification.

```typescript
/** Pipe piece types */
export type PipeType = "straight" | "elbow" | "tee" | "cross";

/** Valid rotation angles */
export type Rotation = 0 | 90 | 180 | 270;

/** A single pipe cell on the grid */
export interface Pipe {
  type: PipeType;
  rotation: Rotation;
  /** Whether this pipe is currently connected to the source */
  connected: boolean;
  /** Water fill animation progress 0..1 */
  waterFill: number;
  /** true if this cell is the source */
  isSource: boolean;
  /** true if this cell is the drain */
  isDrain: boolean;
}

export type GameStatus = "playing" | "won";

export interface PipeState {
  grid: Pipe[][];
  cols: number;
  rows: number;
  level: number;
  moves: number;
  timer: number;
  status: GameStatus;
  /** Canvas layout */
  offsetX: number;
  offsetY: number;
  cellSize: number;
  /** Source and drain positions */
  sourceRow: number;
  sourceCol: number;
  drainRow: number;
  drainCol: number;
}

export const GAME_COLOR = "#26a69a";

/** Rotations available */
export const ROTATIONS: Rotation[] = [0, 90, 180, 270];

/**
 * Openings for each pipe type at rotation 0.
 * Directions: 0=up, 1=right, 2=down, 3=left
 */
export const PIPE_OPENINGS: Record<PipeType, number[]> = {
  straight: [0, 2],       // up and down
  elbow: [0, 1],          // up and right
  tee: [0, 1, 2],         // up, right, down
  cross: [0, 1, 2, 3],    // all four
};

/**
 * Get actual openings for a pipe considering its rotation.
 * Each 90deg rotation shifts directions clockwise by 1.
 */
export function getOpenings(pipe: Pipe): number[] {
  const base = PIPE_OPENINGS[pipe.type];
  const shift = pipe.rotation / 90;
  return base.map((d) => (d + shift) % 4);
}

/** Direction offsets: 0=up(-1,0), 1=right(0,+1), 2=down(+1,0), 3=left(0,-1) */
export const DIR_OFFSETS: [number, number][] = [
  [-1, 0],  // up
  [0, 1],   // right
  [1, 0],   // down
  [0, -1],  // left
];

/** Opposite direction */
export function oppositeDir(d: number): number {
  return (d + 2) % 4;
}

/** Grid size per level */
export function gridSizeForLevel(level: number): number {
  return Math.min(5 + level * 2, 11);
}
```

**What's happening:**
- `Pipe` tracks the shape, rotation, connectivity state, water animation progress, and whether it is the source or drain. Every field we will need across all five steps is defined now.
- `PipeState` holds the entire game: the 2D grid, dimensions, level number, move counter, timer, win status, layout offsets, and source/drain positions.
- `PIPE_OPENINGS` encodes each shape's connectivity at rotation 0. A `straight` pipe opens up (0) and down (2). An `elbow` opens up (0) and right (1).
- `getOpenings()` applies rotation by adding `rotation / 90` to each base direction (mod 4). So an elbow at rotation 90 opens right (1) and down (2) instead of up and right.
- `DIR_OFFSETS` maps direction numbers to row/column deltas for grid traversal.
- `gridSizeForLevel()` grows the grid from 7x7 at level 1 up to a maximum of 11x11.

---

### 2. Create the Board Renderer

**File:** `src/contexts/canvas2d/games/pipe-connect/renderers/BoardRenderer.ts`

Draws the grid background and each pipe cell with its colored arms.

```typescript
import type { PipeState, Pipe } from "../types";
import { getOpenings } from "../types";

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: PipeState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Clear
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, W, H);

    const { grid, rows, cols, offsetX, offsetY, cellSize } = state;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = offsetX + c * cellSize;
        const y = offsetY + r * cellSize;
        const pipe = grid[r][c];

        this.drawCell(ctx, x, y, cellSize, pipe);
      }
    }
  }

  private drawCell(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    pipe: Pipe,
  ): void {
    const pad = 2;

    // Cell background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(x + pad, y + pad, size - pad * 2, size - pad * 2);

    // Cell border
    ctx.strokeStyle = "#2a2a4a";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + pad, y + pad, size - pad * 2, size - pad * 2);

    // Pipe dimensions
    const cx = x + size / 2;
    const cy = y + size / 2;
    const openings = getOpenings(pipe);
    const pipeWidth = size * 0.3;
    const halfPipe = pipeWidth / 2;

    // Choose pipe color based on role
    let pipeColor = "#555";
    if (pipe.isSource) {
      pipeColor = "#2ecc71";    // green for source
    } else if (pipe.isDrain) {
      pipeColor = "#e74c3c";    // red for drain
    }

    // Draw center hub
    ctx.fillStyle = pipeColor;
    ctx.fillRect(cx - halfPipe, cy - halfPipe, pipeWidth, pipeWidth);

    // Draw each opening as a rectangle from center to edge
    for (const dir of openings) {
      ctx.fillStyle = pipeColor;

      switch (dir) {
        case 0: // up
          ctx.fillRect(cx - halfPipe, y + pad, pipeWidth,
                       size / 2 - pad - halfPipe + halfPipe);
          break;
        case 1: // right
          ctx.fillRect(cx + halfPipe, cy - halfPipe,
                       size / 2 - pad, pipeWidth);
          break;
        case 2: // down
          ctx.fillRect(cx - halfPipe, cy + halfPipe,
                       pipeWidth, size / 2 - pad);
          break;
        case 3: // left
          ctx.fillRect(x + pad, cy - halfPipe,
                       size / 2 - pad - halfPipe + halfPipe, pipeWidth);
          break;
      }
    }

    // Draw source/drain indicator
    if (pipe.isSource) {
      ctx.fillStyle = "#2ecc71";
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.floor(size * 0.25)}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("S", cx, cy);
    } else if (pipe.isDrain) {
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.floor(size * 0.25)}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("D", cx, cy);
    }
  }
}
```

**What's happening:**
- The renderer clears the entire canvas with a dark background (`#0a0a1a`), then loops through every cell in the grid.
- Each cell gets a dark-blue fill (`#1a1a2e`) with a subtle border, creating a visible tile grid.
- The pipe is drawn as a center hub (a small square) plus rectangular arms extending toward each open direction. The `getOpenings()` call returns the correct directions for the pipe's current rotation.
- Source pipes are green (`#2ecc71`) with an "S" label, drain pipes are red (`#e74c3c`) with a "D" label, and regular pipes are gray (`#555`). In later steps we will add blue coloring for connected pipes.

---

### 3. Create the Engine

**File:** `src/contexts/canvas2d/games/pipe-connect/PipeEngine.ts`

The engine creates initial state, populates a placeholder grid, computes layout, and runs the render loop.

```typescript
import type { PipeState, Pipe } from "./types";
import { BoardRenderer } from "./renderers/BoardRenderer";

export class PipeEngine {
  private ctx: CanvasRenderingContext2D;
  private state: PipeState;
  private running = false;
  private rafId = 0;

  private boardRenderer: BoardRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const size = 7;

    this.state = {
      grid: [],
      cols: size,
      rows: size,
      level: 1,
      moves: 0,
      timer: 0,
      status: "playing",
      offsetX: 0,
      offsetY: 0,
      cellSize: 0,
      sourceRow: 0,
      sourceCol: 0,
      drainRow: size - 1,
      drainCol: size - 1,
    };

    this.boardRenderer = new BoardRenderer();
    this.initPlaceholderGrid();
    this.computeLayout();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.computeLayout();
    };
    window.addEventListener("resize", this.resizeHandler);
  }

  start(): void {
    this.running = true;
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;
    this.boardRenderer.render(this.ctx, this.state);
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private computeLayout(): void {
    const W = this.ctx.canvas.width;
    const H = this.ctx.canvas.height;
    const hudHeight = 50;
    const padding = 20;

    const availW = W - padding * 2;
    const availH = H - hudHeight - padding * 2;

    const cellW = Math.floor(availW / this.state.cols);
    const cellH = Math.floor(availH / this.state.rows);

    this.state.cellSize = Math.max(16, Math.min(cellW, cellH, 60));

    const boardW = this.state.cols * this.state.cellSize;
    const boardH = this.state.rows * this.state.cellSize;

    this.state.offsetX = Math.floor((W - boardW) / 2);
    this.state.offsetY = Math.floor(hudHeight + (H - hudHeight - boardH) / 2);
  }

  /**
   * Temporary: fill the grid with a mix of pipe types so we can
   * see the rendering. Step 5 replaces this with real puzzle generation.
   */
  private initPlaceholderGrid(): void {
    const { rows, cols } = this.state;
    const types: Array<Pipe["type"]> = ["straight", "elbow", "tee", "cross"];

    this.state.grid = [];
    for (let r = 0; r < rows; r++) {
      const row: Pipe[] = [];
      for (let c = 0; c < cols; c++) {
        const isSource = r === 0 && c === 0;
        const isDrain = r === rows - 1 && c === cols - 1;
        row.push({
          type: types[(r + c) % types.length],
          rotation: 0,
          connected: false,
          waterFill: 0,
          isSource,
          isDrain,
        });
      }
      this.state.grid.push(row);
    }
  }
}
```

**What's happening:**
- The constructor sizes the canvas to fill the window, initializes a 7x7 grid state, and computes responsive layout offsets.
- `computeLayout()` calculates `cellSize` so all tiles fit the viewport with room for a HUD area at the top. Cell size is clamped between 16 and 60 pixels.
- `initPlaceholderGrid()` fills the grid with a rotating pattern of all four pipe types so we can verify each shape renders correctly. The top-left cell is marked as source, bottom-right as drain.
- The game loop simply calls `boardRenderer.render()` on each animation frame -- no update logic yet.

---

### 4. Create the Platform Adapter

**File:** `src/contexts/canvas2d/games/pipe-connect/adapters/PlatformAdapter.ts`

A thin wrapper so the game plugs into any host page.

```typescript
import { PipeEngine } from "../PipeEngine";

export class PlatformAdapter {
  private engine: PipeEngine;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new PipeEngine(canvas);
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

**File:** `src/contexts/canvas2d/games/pipe-connect/index.ts`

```typescript
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export function createPipeConnect(canvas: HTMLCanvasElement): { destroy: () => void } {
  const adapter = new PlatformAdapter(canvas);
  adapter.start();
  return { destroy: () => adapter.destroy() };
}
```

---

## Test It

1. **Run:** `pnpm dev`
2. **Open:** the Pipe Connect game in your browser
3. **Observe:**
   - Dark background with a centered **7x7 grid** of tiles
   - Each tile shows a **pipe shape** -- straight, elbow, tee, and cross repeating in a diagonal pattern
   - The **top-left tile** has a green "S" (source) and the **bottom-right tile** has a red "D" (drain)
   - Gray arms extend from each pipe's center hub toward its open directions
   - **Resize the window** and watch the board scale and re-center

---

## Challenges

**Easy:**
- Change the pipe width from `size * 0.3` to `size * 0.4` for thicker pipes and see how it looks.
- Try different background colors for the cells.

**Medium:**
- Add rounded corners to the cell backgrounds using `ctx.roundRect()`.

**Hard:**
- Draw the pipe arms with rounded ends instead of flat rectangles by using `ctx.lineCap = "round"` and `ctx.stroke()` instead of `ctx.fillRect()`.

---

## What You Learned

- Defining pipe types with a direction-based openings model (0=up, 1=right, 2=down, 3=left)
- Applying rotation by shifting direction indices: `(baseDir + rotation/90) % 4`
- Drawing pipe shapes as a center hub plus directional arms using `fillRect`
- Computing responsive layout that centers a variable-size grid in any viewport

**Next:** [Step 2: Click to Rotate Tiles](./step-2.md) -- add mouse input so clicking a tile rotates it 90 degrees clockwise.

---
[Back to Game README](./README.md) | [Next Step -->](./step-2.md)
