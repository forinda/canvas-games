# Step 1: Project Setup & Grid Map

**Goal:** Draw a pannable grid map with terrain tiles, a dark green background, and responsive layout.

**Time:** ~15 minutes

---

## What You'll Build

- **Grid map** with alternating dark green terrain tiles
- **Cell borders** with subtle grid lines for visual clarity
- **HUD bar** placeholder at the top of the screen
- **Responsive canvas** that fills the browser window and resizes with it
- **Type definitions** for the entire game state, defined up front

---

## Concepts

- **Grid-Based World**: The city is built on a 2D grid where each cell can hold one building. The grid dimensions are computed from the canvas size and a fixed `CELL_SIZE` of 48 pixels.
- **CityState Object**: A single state object holds everything -- the grid array, resource counters, selected tool, hover position, simulation tick, and UI flags. Defining it all now means we never restructure later.
- **Checkerboard Terrain**: Alternating two shades of dark green (`#1a2a1a` / `#172417`) makes empty cells visually distinguishable without being distracting.
- **Coordinate System**: The HUD occupies the top 52 pixels. Grid row 0 starts at `y = HUD_HEIGHT`. Column and row indices map to pixel positions via `col * CELL_SIZE` and `HUD_HEIGHT + row * CELL_SIZE`.

---

## Code

### 1. Create Types

**File:** `src/contexts/canvas2d/games/city-builder/types.ts`

All the types needed across every step, defined up front so later files never need modification.

```typescript
export type BuildingType = 'house' | 'farm' | 'factory' | 'park' | 'road' | 'powerplant';

export interface Building {
  type: BuildingType;
  col: number;
  row: number;
  level: number;
}

export interface CityState {
  grid: (Building | null)[][];
  cols: number;
  rows: number;
  population: number;
  money: number;
  happiness: number;
  power: number;
  food: number;
  selectedType: BuildingType | null;
  hoveredCell: { col: number; row: number } | null;
  tick: number;
  started: boolean;
  speed: number; // 1x, 2x, 3x
  message: string;
  messageTimer: number;
}

export const CELL_SIZE = 48;
export const HUD_HEIGHT = 52;
```

**What's happening:**
- `Building` tracks a placed structure's type, grid position, and upgrade level. Every cell in the grid holds either a `Building` or `null`.
- `CityState` is the single source of truth: grid data, five resource counters (`population`, `money`, `happiness`, `power`, `food`), input state (`selectedType`, `hoveredCell`), and simulation state (`tick`, `speed`).
- `CELL_SIZE = 48` means each grid cell is 48x48 pixels. `HUD_HEIGHT = 52` reserves the top strip for resource display.
- `BuildingType` is a union of the six building kinds we will add in Step 2.

---

### 2. Create the Grid System

**File:** `src/contexts/canvas2d/games/city-builder/systems/GridSystem.ts`

Manages the grid data structure -- creating it, checking cells, and placing buildings.

```typescript
import type { CityState, Building } from '../types';
import { CELL_SIZE, HUD_HEIGHT } from '../types';

export class GridSystem {
  pixelToCell(
    state: CityState,
    x: number,
    y: number,
  ): { col: number; row: number } | null {
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor((y - HUD_HEIGHT) / CELL_SIZE);

    if (col < 0 || col >= state.cols || row < 0 || row >= state.rows)
      return null;

    return { col, row };
  }

  isCellEmpty(state: CityState, col: number, row: number): boolean {
    return state.grid[row]?.[col] === null;
  }

  placeBuilding(state: CityState, building: Building): void {
    state.grid[building.row][building.col] = building;
  }

  createEmptyGrid(cols: number, rows: number): (Building | null)[][] {
    const grid: (Building | null)[][] = [];

    for (let r = 0; r < rows; r++) {
      grid[r] = [];
      for (let c = 0; c < cols; c++) grid[r][c] = null;
    }

    return grid;
  }
}
```

**What's happening:**
- `createEmptyGrid()` builds a 2D array of `null` values. Each `null` means "empty land."
- `pixelToCell()` converts mouse coordinates to grid coordinates, subtracting `HUD_HEIGHT` from the y value so row 0 starts below the HUD. Returns `null` if the click is out of bounds.
- `isCellEmpty()` and `placeBuilding()` are simple helpers we will use in Step 2 when we add building placement.

---

### 3. Create the Grid Renderer

**File:** `src/contexts/canvas2d/games/city-builder/renderers/GridRenderer.ts`

Draws the terrain grid with alternating tile colors and subtle borders.

```typescript
import type { CityState } from '../types';
import { CELL_SIZE, HUD_HEIGHT } from '../types';

export class GridRenderer {
  render(ctx: CanvasRenderingContext2D, state: CityState): void {
    const s = state;

    for (let row = 0; row < s.rows; row++) {
      for (let col = 0; col < s.cols; col++) {
        const x = col * CELL_SIZE;
        const y = HUD_HEIGHT + row * CELL_SIZE;

        // Checkerboard terrain
        ctx.fillStyle = (col + row) % 2 === 0 ? '#1a2a1a' : '#172417';
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

        // Subtle cell border
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
      }
    }
  }
}
```

**What's happening:**
- We loop through every row and column, drawing a filled rectangle for each cell. The `(col + row) % 2` check alternates between two dark green shades, creating a subtle checkerboard.
- The `strokeRect` with `rgba(255,255,255,0.04)` draws nearly-invisible cell borders -- just enough to see the grid without overpowering the terrain.
- The `+ 0.5` offset on stroke coordinates aligns lines to pixel boundaries, avoiding anti-aliased blurriness.

---

### 4. Create the Engine

**File:** `src/contexts/canvas2d/games/city-builder/CityEngine.ts`

The engine initializes state, computes grid dimensions, and runs the render loop.

```typescript
import type { CityState } from './types';
import { CELL_SIZE, HUD_HEIGHT } from './types';
import { GridSystem } from './systems/GridSystem';
import { GridRenderer } from './renderers/GridRenderer';

export class CityEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: CityState;
  private running = false;
  private rafId = 0;

  private gridSystem: GridSystem;
  private gridRenderer: GridRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cols = Math.floor(canvas.width / CELL_SIZE);
    const rows = Math.floor((canvas.height - HUD_HEIGHT - 100) / CELL_SIZE);

    this.gridSystem = new GridSystem();
    this.gridRenderer = new GridRenderer();

    this.state = {
      grid: this.gridSystem.createEmptyGrid(cols, rows),
      cols,
      rows,
      population: 0,
      money: 1000,
      happiness: 50,
      power: 10,
      food: 20,
      selectedType: null,
      hoveredCell: null,
      tick: 0,
      started: false,
      speed: 1,
      message: '',
      messageTimer: 0,
    };

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
    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    const { ctx, canvas, state } = this;
    const W = canvas.width, H = canvas.height;

    // Dark green background
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(0, 0, W, H);

    // HUD placeholder
    ctx.fillStyle = '#0d1a0d';
    ctx.fillRect(0, 0, W, HUD_HEIGHT);
    ctx.fillStyle = '#2a4a2a';
    ctx.fillRect(0, HUD_HEIGHT - 2, W, 2);

    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#3498db';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CITY BUILDER', W / 2, HUD_HEIGHT / 2);

    // Grid
    this.gridRenderer.render(ctx, state);
  }
}
```

**What's happening:**
- The constructor sizes the canvas to fill the window, computes how many columns and rows fit (reserving 100px at the bottom for the building panel we will add later), and creates an empty grid.
- The initial state gives the player `$1000`, 50% happiness, 10 power, and 20 food -- enough to start building.
- `render()` clears the background, draws the HUD bar, then delegates to `GridRenderer` for the terrain.
- The resize handler keeps the canvas full-screen. In later steps we will recompute the grid on resize.

---

### 5. Create the Platform Adapter

**File:** `src/contexts/canvas2d/games/city-builder/adapters/PlatformAdapter.ts`

A thin wrapper so the game plugs into any host page.

```typescript
import { CityEngine } from '../CityEngine';

export class PlatformAdapter {
  private engine: CityEngine;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new CityEngine(canvas);
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

**File:** `src/contexts/canvas2d/games/city-builder/index.ts`

```typescript
import { PlatformAdapter } from './adapters/PlatformAdapter';

export function createCityBuilder(canvas: HTMLCanvasElement): { destroy: () => void } {
  const adapter = new PlatformAdapter(canvas);
  adapter.start();
  return { destroy: () => adapter.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the City Builder game in your browser
3. **Observe:**
   - Dark green background filling the entire window
   - A **dark HUD bar** across the top with "CITY BUILDER" centered in blue
   - A **grid of alternating dark green tiles** below the HUD, each 48x48 pixels
   - **Subtle white borders** on each cell, barely visible but defining the grid
   - **Resize the window** and watch the canvas adapt

---

## Challenges

**Easy:**
- Change the two terrain colors to different shades (try blues for a water theme) and see how it changes the feel.
- Increase `CELL_SIZE` to 64 and observe how the grid gets larger with fewer cells.

**Medium:**
- Add row and column numbers along the edges of the grid (like a spreadsheet: A, B, C... across the top; 1, 2, 3... down the side).

**Hard:**
- Make the grid dimensions recompute on window resize so the number of cells changes dynamically. You will need to recreate the grid array while preserving any placed buildings.

---

## What You Learned

- Defining a complete game state type with grid, resource, and UI fields
- Computing grid dimensions from canvas size and a fixed cell size
- Drawing a checkerboard terrain with two alternating tile colors
- Setting up a `requestAnimationFrame` render loop with clean start/destroy lifecycle

**Next:** Building Placement -- add a building panel and let the player click the grid to place structures!
