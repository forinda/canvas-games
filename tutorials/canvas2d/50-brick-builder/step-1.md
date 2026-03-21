# Step 1: Project Setup & Isometric Grid

**Goal:** Define the game's type system and draw a grid on the canvas that bricks will snap to.

**Time:** ~10 minutes

---

## What You'll Build

- **Type definitions** for bricks, templates, colors, and the full game state
- **A 20x18 cell grid** rendered on a dark background with subtle grid lines
- **Responsive layout** that centers the grid with room for a side palette
- **Engine scaffold** with a render loop and window resize handling

---

## Concepts

- **Grid-Based Building**: The entire game is built on a flat 2D grid. Each cell is `CELL_SIZE` pixels (32px). Bricks occupy one or more cells. The grid is `GRID_COLS` (20) wide and `GRID_ROWS` (18) tall.
- **State Object Pattern**: A single `BrickBuilderState` object holds every piece of mutable data — placed bricks, mouse position, selected tools, layout offsets. Passing this object to systems and renderers keeps the architecture clean.
- **Layout Calculation**: The grid is centered horizontally (with 200px reserved on the right for the palette) and vertically (below a 48px HUD bar). This mirrors how real creative tools separate the canvas from the toolbox.

---

## Code

### 1. Create Types

**File:** `src/contexts/canvas2d/games/brick-builder/types.ts`

All types and constants for the entire game, defined up front so later files never need restructuring.

```typescript
/** Grid cell size in pixels */
export const CELL_SIZE = 32;

/** Grid dimensions in cells */
export const GRID_COLS = 20;
export const GRID_ROWS = 18;

/** Palette panel width */
export const PALETTE_WIDTH = 180;

/** HUD bar height at top */
export const HUD_HEIGHT = 48;

/** Available brick colors */
export const BRICK_COLORS: readonly string[] = [
  '#e53935', // red
  '#fb8c00', // orange
  '#fdd835', // yellow
  '#43a047', // green
  '#1e88e5', // blue
  '#8e24aa', // purple
  '#00acc1', // cyan
  '#f5f5f5', // white
];

/** A brick template: width and height in grid units */
export interface BrickTemplate {
  id: string;
  label: string;
  w: number;
  h: number;
}

/** A placed brick on the grid */
export interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  id: number;
}

/** Full game state */
export interface BrickBuilderState {
  /** All placed bricks */
  bricks: Brick[];

  /** Currently selected brick template index */
  selectedTemplateIndex: number;

  /** Currently selected color index */
  selectedColorIndex: number;

  /** Whether the current template is rotated (w/h swapped) */
  rotated: boolean;

  /** Mouse position in canvas coordinates */
  mouseX: number;
  mouseY: number;

  /** Whether mouse is over the grid area */
  mouseOnGrid: boolean;

  /** Snapped grid cell for hover preview */
  hoverGridX: number;
  hoverGridY: number;

  /** Running brick id counter */
  nextBrickId: number;

  /** Total bricks placed (lifetime counter) */
  totalPlaced: number;

  /** Canvas dimensions */
  canvasWidth: number;
  canvasHeight: number;

  /** Grid offset (top-left pixel of the grid area) */
  gridOffsetX: number;
  gridOffsetY: number;

  /** Help overlay visible */
  helpVisible: boolean;
}

/** Create a fresh default state */
export function createInitialState(): BrickBuilderState {
  return {
    bricks: [],
    selectedTemplateIndex: 0,
    selectedColorIndex: 0,
    rotated: false,
    mouseX: 0,
    mouseY: 0,
    mouseOnGrid: false,
    hoverGridX: 0,
    hoverGridY: 0,
    nextBrickId: 1,
    totalPlaced: 0,
    canvasWidth: 0,
    canvasHeight: 0,
    gridOffsetX: 0,
    gridOffsetY: 0,
    helpVisible: false,
  };
}
```

**What's happening:**
- `CELL_SIZE = 32` means every grid square is 32x32 pixels. Bricks are measured in whole grid units (a 2x1 brick is 64x32 pixels).
- `Brick` stores a placed brick's grid position (`x`, `y`), size (`w`, `h`), color, and a unique `id` used later for gravity and removal.
- `BrickBuilderState` is the single source of truth. It tracks placed bricks, mouse state, selected tools, and layout offsets. Every system reads and writes this one object.
- `createInitialState()` returns a clean starting state. This factory pattern makes it easy to reset the game later.

---

### 2. Create Brick Templates Data

**File:** `src/contexts/canvas2d/games/brick-builder/data/bricks.ts`

The available brick shapes players can choose from.

```typescript
import type { BrickTemplate } from '../types';

/** All available brick templates */
export const BRICK_TEMPLATES: readonly BrickTemplate[] = [
  { id: '1x1', label: '1x1', w: 1, h: 1 },
  { id: '2x1', label: '2x1', w: 2, h: 1 },
  { id: '3x1', label: '3x1', w: 3, h: 1 },
  { id: '4x1', label: '4x1', w: 4, h: 1 },
  { id: '2x2', label: '2x2', w: 2, h: 2 },
];
```

**What's happening:**
- Each template defines a brick shape by its width and height in grid cells. A `2x1` brick covers 2 columns and 1 row.
- The array is `readonly` so templates cannot be mutated at runtime.
- Later, we will add rotation that swaps `w` and `h` to turn a `3x1` into a `1x3`.

---

### 3. Create the Game Renderer (Grid Only)

**File:** `src/contexts/canvas2d/games/brick-builder/renderers/GameRenderer.ts`

For this step, the renderer only draws the grid. We will add brick rendering in Step 2.

```typescript
import type { BrickBuilderState } from '../types';
import { CELL_SIZE, GRID_COLS, GRID_ROWS } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: BrickBuilderState): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    this.renderGrid(ctx, state);
  }

  private renderGrid(
    ctx: CanvasRenderingContext2D,
    state: BrickBuilderState,
  ): void {
    const ox = state.gridOffsetX;
    const oy = state.gridOffsetY;
    const gridW = GRID_COLS * CELL_SIZE;
    const gridH = GRID_ROWS * CELL_SIZE;

    // Grid background
    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(ox, oy, gridW, gridH);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;

    for (let c = 0; c <= GRID_COLS; c++) {
      const x = ox + c * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(x, oy);
      ctx.lineTo(x, oy + gridH);
      ctx.stroke();
    }

    for (let r = 0; r <= GRID_ROWS; r++) {
      const y = oy + r * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(ox, y);
      ctx.lineTo(ox + gridW, y);
      ctx.stroke();
    }

    // Grid border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy, gridW, gridH);

    // Ground line (bottom of grid)
    ctx.strokeStyle = '#4a4a5a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ox, oy + gridH);
    ctx.lineTo(ox + gridW, oy + gridH);
    ctx.stroke();
  }
}
```

**What's happening:**
- The entire canvas is cleared with a dark purple (`#1a1a2e`), then the grid area gets an even darker background (`#0d1b2a`). This contrast makes the building area stand out.
- Grid lines are drawn at very low opacity (`0.06`) so they guide placement without overwhelming the scene.
- A thicker "ground line" at the bottom of the grid gives a visual base for stacking bricks.
- Vertical lines iterate over `GRID_COLS + 1` and horizontal lines over `GRID_ROWS + 1` to include both edges.

---

### 4. Create the Engine

**File:** `src/contexts/canvas2d/games/brick-builder/BrickBuilderEngine.ts`

The engine initializes state, computes layout, and runs the render loop.

```typescript
import type { BrickBuilderState } from './types';
import {
  CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
  HUD_HEIGHT,
  createInitialState,
} from './types';
import { GameRenderer } from './renderers/GameRenderer';

export class BrickBuilderEngine {
  private ctx: CanvasRenderingContext2D;
  private state: BrickBuilderState;
  private running: boolean;
  private rafId: number;
  private gameRenderer: GameRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = createInitialState();
    this.state.canvasWidth = canvas.width;
    this.state.canvasHeight = canvas.height;
    this.computeGridOffset();

    // Renderer
    this.gameRenderer = new GameRenderer();

    // Resize handler
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasWidth = canvas.width;
      this.state.canvasHeight = canvas.height;
      this.computeGridOffset();
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

    this.gameRenderer.render(this.ctx, this.state);
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private computeGridOffset(): void {
    const gridW = GRID_COLS * CELL_SIZE;
    const gridH = GRID_ROWS * CELL_SIZE;
    const availW = this.state.canvasWidth - 200; // reserve space for palette
    const availH = this.state.canvasHeight - HUD_HEIGHT;

    this.state.gridOffsetX = Math.max(16, (availW - gridW) / 2);
    this.state.gridOffsetY = HUD_HEIGHT + Math.max(16, (availH - gridH) / 2);
  }
}
```

**What's happening:**
- The constructor sizes the canvas to fill the browser window, creates the initial state, and computes where the grid should be drawn.
- `computeGridOffset()` centers the grid horizontally (leaving 200px on the right for the palette panel we build later) and vertically (below the 48px HUD bar). `Math.max(16, ...)` ensures at least 16px of padding.
- The render loop calls `requestAnimationFrame` recursively. Right now it only draws the grid, but we will add systems and more renderers in later steps.
- `destroy()` cancels the animation frame and removes the resize listener to prevent memory leaks.

---

### 5. Create the Platform Adapter

**File:** `src/contexts/canvas2d/games/brick-builder/adapters/PlatformAdapter.ts`

```typescript
import { BrickBuilderEngine } from '../BrickBuilderEngine';

export class PlatformAdapter {
  private engine: BrickBuilderEngine;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new BrickBuilderEngine(canvas);
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

**File:** `src/contexts/canvas2d/games/brick-builder/index.ts`

```typescript
import { PlatformAdapter } from './adapters/PlatformAdapter';

export function createBrickBuilder(canvas: HTMLCanvasElement): { destroy: () => void } {
  const adapter = new PlatformAdapter(canvas);
  adapter.start();
  return { destroy: () => adapter.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Brick Builder game in your browser
3. **Observe:**
   - Dark background with a centered **20x18 grid**
   - **Subtle grid lines** that show individual cell boundaries
   - A **thick ground line** at the bottom of the grid
   - **Empty space on the right** reserved for the palette (coming in Step 5)
   - **Resize the window** and watch the grid re-center

---

## Challenges

**Easy:**
- Change `CELL_SIZE` to 24 or 48 and see how the grid scales.
- Change the grid background color from `#0d1b2a` to something lighter.

**Medium:**
- Draw coordinate labels along the top (0-19) and left side (0-17) of the grid to show column and row numbers.

**Hard:**
- Add a checkerboard pattern to the grid by alternating two slightly different background colors for even/odd cells.

---

## What You Learned

- Defining a comprehensive game state type with brick, mouse, and layout fields
- Drawing a grid with subtle lines that guide placement without visual noise
- Computing responsive layout that centers the grid and reserves space for UI panels
- Setting up an engine with a `requestAnimationFrame` render loop

**Next:** Drawing bricks with 3D studs and visual depth!
