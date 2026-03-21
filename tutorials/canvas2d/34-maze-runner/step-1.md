# Step 1: Project Setup & Maze Grid

**Goal:** Draw a grid of cells with walls on all sides, centered on a dark canvas.

**Time:** ~15 minutes

---

## What You'll Build

- **Type definitions** for cells, walls, grid positions, and the full game state
- **A grid of cells** where every cell has four walls (top, right, bottom, left)
- **A renderer** that draws the grid with visible walls and floor tiles
- **A game engine** with a render loop and responsive layout
- **Platform adapter and entry point** wiring everything together

---

## Concepts

- **Cell/Wall Data Structure**: Each cell stores four booleans (`top`, `right`, `bottom`, `left`) indicating whether a wall exists on that side. Starting with all walls `true` gives us a grid of fully enclosed boxes -- the raw material the maze generator will carve paths through.
- **Grid Coordinates**: The grid uses `grid[y][x]` ordering, where `y` is the row (top to bottom) and `x` is the column (left to right). This matches how 2D arrays map to screen coordinates.
- **Responsive Layout**: We compute `cellSize` from available screen space so the grid fills the viewport at any resolution: `Math.floor(Math.min(availW / mazeW, availH / mazeH))`.
- **Engine Pattern**: A central engine class owns the state, systems, and renderers. It runs a `requestAnimationFrame` loop that updates logic and draws each frame.

---

## Code

### 1.1 Create Types

**File:** `src/contexts/canvas2d/games/maze-runner/types.ts`

All the types we need across every step, defined up front so later files never need restructuring.

```typescript
/** Walls present on each side of a cell */
export interface CellWalls {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

/** A single maze cell */
export interface Cell {
  walls: CellWalls;
  visited: boolean;
}

/** Player position on the grid */
export interface GridPos {
  x: number;
  y: number;
}

/** Full mutable game state */
export interface MazeState {
  /** 2D grid of cells: grid[y][x] */
  grid: Cell[][];
  mazeW: number;
  mazeH: number;
  player: GridPos;
  exit: GridPos;
  /** Cells within this radius of the player are visible */
  revealRadius: number;
  /** Set of "x,y" keys the player has ever been near (persistent fog reveal) */
  revealed: Set<string>;
  level: number;
  timeLeft: number;
  won: boolean;
  lost: boolean;
  paused: boolean;
  started: boolean;
  /** Accumulated levels completed */
  totalScore: number;
}

/** Starting maze dimensions (grows each level) */
export const BASE_MAZE_W = 10;
export const BASE_MAZE_H = 10;
/** Maze grows by this amount each level */
export const MAZE_GROW = 2;
/** Default reveal radius in cells */
export const REVEAL_RADIUS = 3;
/** Base time in seconds for level 1 */
export const BASE_TIME = 60;
/** Extra time per additional cell beyond the base size */
export const TIME_PER_EXTRA_CELL = 0.5;
/** Bonus seconds added when completing a level */
export const COMPLETION_BONUS = 15;
/** LocalStorage key for high score */
export const HS_KEY = 'maze_runner_highscore';
```

**What's happening:**
- `CellWalls` has four booleans -- one per side. When all are `true`, the cell is fully enclosed. The maze generator will set some to `false` to carve passages.
- `Cell` pairs the walls with a `visited` flag used during maze generation (Step 2).
- `GridPos` is a simple `{x, y}` pair used for the player position and exit marker.
- `MazeState` holds everything: grid, dimensions, player/exit positions, fog-of-war data, timer, level info, and game status flags. Defining it all now means we never need to restructure later.
- The constants (`BASE_MAZE_W`, `MAZE_GROW`, `BASE_TIME`, etc.) control game balance and are used in later steps.

---

### 1.2 Create the Maze Renderer

**File:** `src/contexts/canvas2d/games/maze-runner/renderers/MazeRenderer.ts`

Draws the grid background, cell floors, and all four walls per cell.

```typescript
import type { MazeState } from '../types';

export class MazeRenderer {
  render(ctx: CanvasRenderingContext2D, state: MazeState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    const { grid, mazeW, mazeH } = state;

    // Compute cell size so maze fits on screen with some padding
    const padding = 60;
    const availW = W - padding * 2;
    const availH = H - padding * 2 - 40;
    const cellSize = Math.floor(Math.min(availW / mazeW, availH / mazeH));

    const offsetX = Math.floor((W - cellSize * mazeW) / 2);
    const offsetY = Math.floor((H - cellSize * mazeH) / 2) + 20;

    // Draw cells
    for (let y = 0; y < mazeH; y++) {
      for (let x = 0; x < mazeW; x++) {
        const px = offsetX + x * cellSize;
        const py = offsetY + y * cellSize;

        // Floor tile
        ctx.fillStyle = '#222244';
        ctx.fillRect(px, py, cellSize, cellSize);

        // Walls
        const cell = grid[y][x];
        ctx.strokeStyle = '#607d8b';
        ctx.lineWidth = 2;

        if (cell.walls.top) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + cellSize, py);
          ctx.stroke();
        }

        if (cell.walls.right) {
          ctx.beginPath();
          ctx.moveTo(px + cellSize, py);
          ctx.lineTo(px + cellSize, py + cellSize);
          ctx.stroke();
        }

        if (cell.walls.bottom) {
          ctx.beginPath();
          ctx.moveTo(px, py + cellSize);
          ctx.lineTo(px + cellSize, py + cellSize);
          ctx.stroke();
        }

        if (cell.walls.left) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + cellSize);
          ctx.stroke();
        }
      }
    }

    // Outer maze border
    ctx.strokeStyle = '#607d8b';
    ctx.lineWidth = 3;
    ctx.strokeRect(offsetX, offsetY, cellSize * mazeW, cellSize * mazeH);
  }
}
```

**What's happening:**
- We clear the canvas with a dark background (`#1a1a2e`), then loop through every cell in the grid.
- Each cell gets a dark blue floor tile (`#222244`), then we check all four wall booleans and draw a line segment for each wall that exists.
- Walls are drawn in a blue-grey (`#607d8b`) at 2px width, giving the grid a clean industrial look.
- `cellSize` is computed from available space so the grid scales to any viewport. The offsets center the grid horizontally and vertically.
- A 3px outer border frames the entire maze.

---

### 1.3 Create the Engine

**File:** `src/contexts/canvas2d/games/maze-runner/MazeEngine.ts`

The engine creates the initial state with all walls up, and runs the render loop.

```typescript
import type { MazeState, Cell } from './types';
import { BASE_MAZE_W, BASE_MAZE_H } from './types';
import { MazeRenderer } from './renderers/MazeRenderer';

export class MazeEngine {
  private ctx: CanvasRenderingContext2D;
  private state: MazeState;
  private running = false;
  private rafId = 0;

  private mazeRenderer: MazeRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.createState(1);
    this.initGrid();

    this.mazeRenderer = new MazeRenderer();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
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
    this.mazeRenderer.render(this.ctx, this.state);
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private createState(level: number): MazeState {
    const mazeW = BASE_MAZE_W;
    const mazeH = BASE_MAZE_H;

    return {
      grid: [],
      mazeW,
      mazeH,
      player: { x: 0, y: 0 },
      exit: { x: mazeW - 1, y: mazeH - 1 },
      revealRadius: 3,
      revealed: new Set<string>(),
      level,
      timeLeft: 60,
      won: false,
      lost: false,
      paused: false,
      started: false,
      totalScore: 0,
    };
  }

  /** Fill the grid with cells that have all four walls up */
  private initGrid(): void {
    const { mazeW, mazeH } = this.state;
    const grid: Cell[][] = [];

    for (let y = 0; y < mazeH; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < mazeW; x++) {
        row.push({
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false,
        });
      }
      grid.push(row);
    }

    this.state.grid = grid;
  }
}
```

**What's happening:**
- The constructor sizes the canvas to fill the window, creates the initial state for a 10x10 grid, and populates it with fully-walled cells.
- `createState()` builds the state object with default values. The player starts at (0,0) and the exit is at the bottom-right corner.
- `initGrid()` creates a 2D array where every cell has all four walls set to `true`. Right now this produces a grid of isolated boxes -- Step 2 will carve passages through them.
- The game loop simply calls `mazeRenderer.render()` on each animation frame.
- The resize handler keeps the canvas matching the window dimensions.

---

### 1.4 Create the Platform Adapter

**File:** `src/contexts/canvas2d/games/maze-runner/adapters/PlatformAdapter.ts`

A thin wrapper so the game plugs into any host page.

```typescript
import { MazeEngine } from '../MazeEngine';

export class PlatformAdapter {
  private engine: MazeEngine;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new MazeEngine(canvas);
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

### 1.5 Create the Entry Point

**File:** `src/contexts/canvas2d/games/maze-runner/index.ts`

```typescript
import { PlatformAdapter } from './adapters/PlatformAdapter';

export function createMazeRunner(canvas: HTMLCanvasElement): { destroy: () => void } {
  const adapter = new PlatformAdapter(canvas);
  adapter.start();
  return { destroy: () => adapter.destroy() };
}
```

---

## Test It

1. **Run:** `pnpm dev`
2. **Open:** the Maze Runner game in your browser
3. **Observe:**
   - Dark background with a centered **10x10 grid**
   - Every cell is a small box with **walls on all four sides** drawn in blue-grey
   - A **3px outer border** frames the entire maze
   - **Resize the window** and watch the grid scale and re-center

You should see a grid that looks like graph paper -- every cell fully enclosed. This is the "raw material" that the maze generator will carve paths through in Step 2.

---

## Challenges

**Easy:**
- Change the floor tile color from `#222244` to something brighter and see how it affects the wall contrast.
- Increase the wall line width from 2 to 4 for a bolder look.

**Medium:**
- Add a checkerboard pattern by alternating floor tile colors based on whether `(x + y) % 2 === 0`.

**Hard:**
- Draw row numbers on the left and column numbers on top so you can reference cells by coordinate (e.g., "3,7").

---

## What You Learned

- Defining a cell/wall data structure where each cell tracks four wall booleans
- Drawing a grid with per-cell wall segments using Canvas line drawing
- Computing responsive layout that centers and scales the grid to any viewport
- Setting up the engine/renderer/adapter pattern used throughout the project

**Next:** [Step 2: Maze Generation Algorithm](./step-2.md) -- carve paths through the walls using recursive backtracking to create a real maze!

---
[Back to Game README](./README.md) | [Next Step ->](./step-2.md)
