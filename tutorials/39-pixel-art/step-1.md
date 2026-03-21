# Step 1: Project Setup & Pixel Grid

**Goal:** Define the game state types and render a zoomable pixel grid with a checkerboard transparency pattern on the canvas.

**Time:** ~15 minutes

---

## What You'll Build

- **Type definitions** for the entire pixel art editor state
- **A configurable grid** (16x16, 32x32, or 64x64) stored as a 2D array of color strings
- **Checkerboard transparency pattern** for empty cells, just like image editors
- **Grid lines** drawn over the cells for visual clarity
- **Responsive layout** that centers the grid and scales on window resize

---

## Concepts

- **Grid as a 2D Array**: Each cell holds either a color string (`"#ff0000"`) or `null` for empty. This is simpler than ImageData and lets us reason about individual pixels easily.
- **Checkerboard Pattern**: Professional image editors show a light/dark checkerboard behind transparent areas. We alternate cell colors based on `(x + y) % 2` to achieve this effect.
- **Responsive Cell Sizing**: `Math.floor(Math.min(canvasWidth / gridSize, availableHeight / gridSize))` gives us the largest square cell size that fits the viewport, keeping the grid centered.
- **Sub-pixel Rendering**: Adding `0.5` to line coordinates aligns strokes to physical pixels, preventing blurry anti-aliased grid lines on standard displays.

---

## Code

### 1. Create Types

**File:** `src/games/pixel-art/types.ts`

All the types we need across every step, defined up front so later files never need modification.

```typescript
export type Tool = "draw" | "erase" | "fill" | "eyedropper";

export type GridSize = 16 | 32 | 64;

export const GRID_SIZES: GridSize[] = [16, 32, 64];

export const DEFAULT_GRID_SIZE: GridSize = 32;

export const COLOR_PALETTE: string[] = [
  "#000000", // black
  "#ffffff", // white
  "#ff0000", // red
  "#00ff00", // green
  "#0000ff", // blue
  "#ffff00", // yellow
  "#ff00ff", // magenta
  "#00ffff", // cyan
  "#ff8800", // orange
  "#8800ff", // purple
  "#0088ff", // sky blue
  "#ff0088", // hot pink
  "#88ff00", // lime
  "#884400", // brown
  "#888888", // gray
  "#444444", // dark gray
];

export interface PixelArtState {
  grid: (string | null)[][];
  gridSize: GridSize;
  currentTool: Tool;
  currentColor: string;
  hoverX: number;
  hoverY: number;
  hoverActive: boolean;
  isDrawing: boolean;
  canvasWidth: number;
  canvasHeight: number;
}

export const HUD_HEIGHT = 100;

export function createEmptyGrid(size: GridSize): (string | null)[][] {
  const grid: (string | null)[][] = [];

  for (let y = 0; y < size; y++) {
    const row: (string | null)[] = [];

    for (let x = 0; x < size; x++) {
      row.push(null);
    }

    grid.push(row);
  }

  return grid;
}
```

**What's happening:**
- `Tool` defines the four drawing tools we will build across later steps: draw, erase, fill, and eyedropper.
- `GridSize` restricts canvas dimensions to three valid sizes. `DEFAULT_GRID_SIZE` of 32 gives a good balance between detail and usability.
- `COLOR_PALETTE` provides 16 curated colors covering the full spectrum plus neutrals. These will become clickable swatches in the HUD.
- `PixelArtState` holds everything: the pixel grid, current tool and color, mouse hover coordinates, drawing state, and canvas dimensions. Defining it all now means we never restructure later.
- `createEmptyGrid()` builds a 2D array filled with `null` (transparent). Each cell stores a hex color string when painted.
- `HUD_HEIGHT` reserves 100px at the bottom for the toolbar area we build in later steps.

---

### 2. Create the Game Renderer

**File:** `src/games/pixel-art/renderers/GameRenderer.ts`

Draws the pixel grid with checkerboard transparency, colored pixels, grid lines, and hover preview.

```typescript
import type { PixelArtState } from "../types";
import { HUD_HEIGHT } from "../types";

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: PixelArtState): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;

    // Clear entire canvas
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, W, H);

    const availH = H - HUD_HEIGHT;
    const cellSize = Math.floor(
      Math.min(W / state.gridSize, availH / state.gridSize)
    );
    const gridPixelW = cellSize * state.gridSize;
    const gridPixelH = cellSize * state.gridSize;
    const offsetX = Math.floor((W - gridPixelW) / 2);
    const offsetY = Math.floor((availH - gridPixelH) / 2);

    // Draw checkerboard background for empty cells
    for (let y = 0; y < state.gridSize; y++) {
      for (let x = 0; x < state.gridSize; x++) {
        const px = offsetX + x * cellSize;
        const py = offsetY + y * cellSize;
        const color = state.grid[y][x];

        if (color !== null) {
          ctx.fillStyle = color;
        } else {
          // Checkerboard pattern for transparency
          const isLight = (x + y) % 2 === 0;
          ctx.fillStyle = isLight ? "#2a2a3e" : "#22223a";
        }

        ctx.fillRect(px, py, cellSize, cellSize);
      }
    }

    // Draw grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;

    for (let x = 0; x <= state.gridSize; x++) {
      const px = offsetX + x * cellSize;
      ctx.beginPath();
      ctx.moveTo(px + 0.5, offsetY);
      ctx.lineTo(px + 0.5, offsetY + gridPixelH);
      ctx.stroke();
    }

    for (let y = 0; y <= state.gridSize; y++) {
      const py = offsetY + y * cellSize;
      ctx.beginPath();
      ctx.moveTo(offsetX, py + 0.5);
      ctx.lineTo(offsetX + gridPixelW, py + 0.5);
      ctx.stroke();
    }

    // Hover preview
    if (state.hoverActive) {
      const hx = state.hoverX;
      const hy = state.hoverY;

      if (hx >= 0 && hx < state.gridSize && hy >= 0 && hy < state.gridSize) {
        const px = offsetX + hx * cellSize;
        const py = offsetY + hy * cellSize;

        if (state.currentTool === "draw" || state.currentTool === "fill") {
          ctx.fillStyle = state.currentColor + "80"; // semi-transparent preview
          ctx.fillRect(px, py, cellSize, cellSize);
        }

        // Highlight border
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
      }
    }
  }
}
```

**What's happening:**
- We clear the canvas with a dark background (`#1a1a2e`), then compute `cellSize` so the grid fits the available space (total height minus the 100px HUD area at the bottom).
- `offsetX` and `offsetY` center the grid within the available area.
- For each cell, we either fill it with its stored color or draw a checkerboard square. The two-tone pattern (`#2a2a3e` and `#22223a`) creates a subtle transparency indicator.
- Grid lines use a very low-opacity white (`rgba(255, 255, 255, 0.08)`) so they are visible without overpowering the pixel art. The `+ 0.5` offset aligns strokes to physical pixels.
- The hover preview shows a semi-transparent version of the current color (appending `"80"` to the hex string for 50% alpha) with a white border, giving immediate feedback before the user clicks.

---

### 3. Create the Engine

**File:** `src/games/pixel-art/PixelArtEngine.ts`

The engine creates the initial state, manages the render loop, and handles window resizing. For this step, we wire up only the GameRenderer.

```typescript
import type { PixelArtState } from './types';
import { DEFAULT_GRID_SIZE, COLOR_PALETTE, createEmptyGrid } from './types';
import { GameRenderer } from './renderers/GameRenderer';

export class PixelArtEngine {
  private ctx: CanvasRenderingContext2D;
  private state: PixelArtState;
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

    this.state = {
      grid: createEmptyGrid(DEFAULT_GRID_SIZE),
      gridSize: DEFAULT_GRID_SIZE,
      currentTool: 'draw',
      currentColor: COLOR_PALETTE[0],
      hoverX: -1,
      hoverY: -1,
      hoverActive: false,
      isDrawing: false,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    };

    this.gameRenderer = new GameRenderer();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasWidth = canvas.width;
      this.state.canvasHeight = canvas.height;
    };
  }

  start(): void {
    this.running = true;
    window.addEventListener('resize', this.resizeHandler);
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
}
```

**What's happening:**
- The constructor sizes the canvas to fill the window, creates the default state with a 32x32 empty grid, and sets black as the initial drawing color.
- `start()` begins the render loop and listens for window resize events. `destroy()` cleans everything up.
- The render loop calls `gameRenderer.render()` every frame. In later steps, we will add `drawSystem.update()`, `hudRenderer.render()`, and the input system here.
- The resize handler updates both the canvas element and the state dimensions so the grid recomputes its layout automatically.

---

### 4. Create the Platform Adapter

**File:** `src/games/pixel-art/adapters/PlatformAdapter.ts`

A thin wrapper so the game plugs into any host page.

```typescript
import { PixelArtEngine } from '../PixelArtEngine';

export class PlatformAdapter {
  private engine: PixelArtEngine;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new PixelArtEngine(canvas);
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

**File:** `src/games/pixel-art/index.ts`

```typescript
import { PlatformAdapter } from './adapters/PlatformAdapter';

export function createPixelArt(canvas: HTMLCanvasElement): { destroy: () => void } {
  const adapter = new PlatformAdapter(canvas);
  adapter.start();
  return { destroy: () => adapter.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Pixel Art game in your browser
3. **Observe:**
   - Dark background with a centered **32x32 grid**
   - **Checkerboard pattern** fills every cell (two alternating dark tones)
   - **Subtle grid lines** separate each cell
   - **Resize the window** and watch the grid scale and re-center automatically
   - The bottom 100px is empty dark space (reserved for the HUD in later steps)

---

## Challenges

**Easy:**
- Change the checkerboard colors to brighter tones (e.g., `#3a3a5e` and `#32325a`) to make the transparency pattern more visible.
- Increase the grid line opacity from `0.08` to `0.2` for bolder lines.

**Medium:**
- Add an outer border around the entire grid using `ctx.strokeRect()` with a 2px white line.

**Hard:**
- Draw row and column numbers along the edges of the grid (like a spreadsheet) so you can reference specific pixel coordinates.

---

## What You Learned

- Defining a complete editor state with grid, tool, color, and layout fields
- Rendering a checkerboard transparency pattern using coordinate parity
- Computing responsive layout that centers and scales a grid to any viewport
- Using sub-pixel offsets (`+ 0.5`) for crisp 1px grid lines on canvas

**Next:** Drawing and erasing -- add mouse input so you can click and drag to paint pixels!
