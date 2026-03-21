# Step 3: Color Palette & Fill Tool

**Goal:** Add a clickable color palette in the HUD, implement the flood-fill bucket tool, and add an eyedropper tool that picks colors from existing pixels.

**Time:** ~15 minutes

---

## What You'll Build

- **Color palette row** rendered as 16 clickable swatches in the HUD with a selection indicator
- **Flood-fill bucket tool** that uses BFS to fill all connected cells of the same color
- **Eyedropper tool** that picks a color from the grid and switches back to draw mode
- **Keyboard shortcuts** for fill (`F`) and eyedropper (`I`)
- **Current color indicator** displayed in the HUD

---

## Concepts

- **Flood Fill (BFS)**: The fill tool uses breadth-first search. Starting from the clicked cell, it explores all four neighbors (up, down, left, right). If a neighbor has the same color as the starting cell, it gets filled and its neighbors are added to the queue. A `visited` set prevents infinite loops.
- **Color Identity**: We compare colors as strings (`"#ff0000" === "#ff0000"`). Since all colors come from our palette or are stored verbatim, this simple equality check works correctly.
- **Eyedropper Pattern**: Click a pixel to read its color, set it as the current color, and automatically switch to the draw tool. This is a "one-shot" tool that immediately changes the active tool after use.
- **HUD Click Regions**: The HUD is rendered at fixed positions. To detect clicks, we check if the mouse coordinates fall within each swatch rectangle. No complex hit-testing framework needed -- just coordinate math.

---

## Code

### 1. Update the Draw System

**File:** `src/contexts/canvas2d/games/pixel-art/systems/DrawSystem.ts`

Add flood-fill and eyedropper operations to the existing draw and erase tools.

```typescript
import type { PixelArtState } from "../types";

export class DrawSystem {
  private lastDrawX: number;
  private lastDrawY: number;
  private needsFloodFill: boolean;
  private needsEyedropper: boolean;

  constructor() {
    this.lastDrawX = -1;
    this.lastDrawY = -1;
    this.needsFloodFill = false;
    this.needsEyedropper = false;
  }

  update(state: PixelArtState, _dt: number): void {
    if (!state.isDrawing) {
      this.lastDrawX = -1;
      this.lastDrawY = -1;
      this.needsFloodFill = false;
      this.needsEyedropper = false;
      return;
    }

    const gx = state.hoverX;
    const gy = state.hoverY;

    if (gx < 0 || gx >= state.gridSize || gy < 0 || gy >= state.gridSize) {
      return;
    }

    switch (state.currentTool) {
      case "draw":
        this.placePixel(state, gx, gy);
        break;
      case "erase":
        this.erasePixel(state, gx, gy);
        break;
      case "fill":
        if (
          !this.needsFloodFill ||
          gx !== this.lastDrawX ||
          gy !== this.lastDrawY
        ) {
          this.floodFill(state, gx, gy);
          this.needsFloodFill = true;
          this.lastDrawX = gx;
          this.lastDrawY = gy;
        }
        break;
      case "eyedropper":
        if (
          !this.needsEyedropper ||
          gx !== this.lastDrawX ||
          gy !== this.lastDrawY
        ) {
          this.pickColor(state, gx, gy);
          this.needsEyedropper = true;
          this.lastDrawX = gx;
          this.lastDrawY = gy;
        }
        break;
    }

    if (state.currentTool === "draw" || state.currentTool === "erase") {
      this.lastDrawX = gx;
      this.lastDrawY = gy;
    }
  }

  private placePixel(state: PixelArtState, x: number, y: number): void {
    state.grid[y][x] = state.currentColor;
  }

  private erasePixel(state: PixelArtState, x: number, y: number): void {
    state.grid[y][x] = null;
  }

  private floodFill(
    state: PixelArtState,
    startX: number,
    startY: number
  ): void {
    const targetColor = state.grid[startY][startX];
    const fillColor = state.currentColor;

    // Don't fill if target is already the fill color
    if (targetColor === fillColor) return;

    const queue: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();
    visited.add(`${startX},${startY}`);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const cx = current[0];
      const cy = current[1];

      if (state.grid[cy][cx] !== targetColor) continue;

      state.grid[cy][cx] = fillColor;

      const neighbors: [number, number][] = [
        [cx - 1, cy],
        [cx + 1, cy],
        [cx, cy - 1],
        [cx, cy + 1],
      ];

      for (const neighbor of neighbors) {
        const nx = neighbor[0];
        const ny = neighbor[1];
        const key = `${nx},${ny}`;

        if (
          nx >= 0 &&
          nx < state.gridSize &&
          ny >= 0 &&
          ny < state.gridSize &&
          !visited.has(key)
        ) {
          visited.add(key);
          queue.push([nx, ny]);
        }
      }
    }
  }

  private pickColor(state: PixelArtState, x: number, y: number): void {
    const color = state.grid[y][x];

    if (color !== null) {
      state.currentColor = color;
      state.currentTool = "draw";
    }
  }
}
```

**What's happening:**
- `floodFill()` implements a classic BFS flood fill. It reads the color of the clicked cell (`targetColor`), then explores outward through all four cardinal neighbors. Every cell matching `targetColor` is recolored to `fillColor`. The `visited` set (using string keys like `"3,7"`) prevents re-processing.
- The guard `if (targetColor === fillColor) return` prevents a no-op fill that would wastefully traverse the entire region.
- `needsFloodFill` and `needsEyedropper` prevent the tool from re-triggering every frame while the mouse button stays pressed on the same cell. They reset when `isDrawing` becomes false (mouse released).
- `pickColor()` reads the cell color and sets it as the current color. It also switches the tool to `"draw"` so the user can immediately start painting with the picked color.

---

### 2. Create the HUD Renderer

**File:** `src/contexts/canvas2d/games/pixel-art/renderers/HUDRenderer.ts`

Draws the color palette row with selection indicator at the bottom of the screen.

```typescript
import type { PixelArtState } from "../types";
import { HUD_HEIGHT, COLOR_PALETTE } from "../types";

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: PixelArtState): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;
    const hudY = H - HUD_HEIGHT;

    // HUD background
    ctx.fillStyle = "#0d0d1a";
    ctx.fillRect(0, hudY, W, HUD_HEIGHT);

    // Top border
    ctx.strokeStyle = "#9c27b0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, hudY);
    ctx.lineTo(W, hudY);
    ctx.stroke();

    // Color palette row
    const swatchSize = 24;
    const swatchGap = 4;
    const paletteStartX = 10;
    const paletteY = hudY + 8;

    for (let i = 0; i < COLOR_PALETTE.length; i++) {
      const sx = paletteStartX + i * (swatchSize + swatchGap);

      ctx.fillStyle = COLOR_PALETTE[i];
      ctx.fillRect(sx, paletteY, swatchSize, swatchSize);

      // Selected indicator
      if (state.currentColor === COLOR_PALETTE[i]) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(sx - 1, paletteY - 1, swatchSize + 2, swatchSize + 2);
      } else {
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1;
        ctx.strokeRect(sx, paletteY, swatchSize, swatchSize);
      }
    }

    // Current color indicator (after tool buttons area)
    const indicatorX = W - 80;
    const indicatorSize = 20;
    const toolY = hudY + 42;

    ctx.fillStyle = "#666666";
    ctx.textAlign = "left";
    ctx.font = "10px monospace";
    ctx.fillText("Color:", indicatorX, toolY - 4);

    ctx.fillStyle = state.currentColor;
    ctx.fillRect(indicatorX, toolY + 2, indicatorSize, indicatorSize);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.strokeRect(indicatorX, toolY + 2, indicatorSize, indicatorSize);
  }
}
```

**What's happening:**
- The HUD occupies the bottom 100px of the canvas. We fill it with a dark background (`#0d0d1a`) and draw a purple accent line (`#9c27b0`) at the top.
- Each color swatch is a 24x24 filled rectangle. The selected color gets a bright white 2px border; unselected swatches get a subtle 20% white border.
- A "Color:" label with a filled swatch near the right edge shows the current active color at all times. This is especially useful when the selected color does not match any palette swatch (e.g., picked via eyedropper from a custom color).

---

### 3. Update the Input System

**File:** `src/contexts/canvas2d/games/pixel-art/systems/InputSystem.ts`

Add HUD click detection for color palette selection and keyboard shortcuts for fill and eyedropper.

```typescript
import type { PixelArtState } from "../types";
import { HUD_HEIGHT, COLOR_PALETTE } from "../types";

export class InputSystem {
  private canvas: HTMLCanvasElement;
  private state: PixelArtState;

  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundContextMenu: (e: MouseEvent) => void;
  private boundMouseLeave: () => void;
  private boundKeyDown: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement, state: PixelArtState) {
    this.canvas = canvas;
    this.state = state;

    this.boundMouseDown = (e: MouseEvent) => this.handleMouseDown(e);
    this.boundMouseMove = (e: MouseEvent) => this.handleMouseMove(e);
    this.boundMouseUp = () => this.handleMouseUp();
    this.boundContextMenu = (e: MouseEvent) => e.preventDefault();
    this.boundMouseLeave = () => this.handleMouseLeave();
    this.boundKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
  }

  attach(): void {
    this.canvas.addEventListener("mousedown", this.boundMouseDown);
    this.canvas.addEventListener("mousemove", this.boundMouseMove);
    this.canvas.addEventListener("mouseup", this.boundMouseUp);
    this.canvas.addEventListener("contextmenu", this.boundContextMenu);
    this.canvas.addEventListener("mouseleave", this.boundMouseLeave);
    window.addEventListener("keydown", this.boundKeyDown);
  }

  detach(): void {
    this.canvas.removeEventListener("mousedown", this.boundMouseDown);
    this.canvas.removeEventListener("mousemove", this.boundMouseMove);
    this.canvas.removeEventListener("mouseup", this.boundMouseUp);
    this.canvas.removeEventListener("contextmenu", this.boundContextMenu);
    this.canvas.removeEventListener("mouseleave", this.boundMouseLeave);
    window.removeEventListener("keydown", this.boundKeyDown);
  }

  private getGridCoords(e: MouseEvent): { gx: number; gy: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const s = this.state;
    const availH = s.canvasHeight - HUD_HEIGHT;
    const cellSize = Math.floor(
      Math.min(s.canvasWidth / s.gridSize, availH / s.gridSize)
    );
    const offsetX = Math.floor((s.canvasWidth - cellSize * s.gridSize) / 2);
    const offsetY = Math.floor((availH - cellSize * s.gridSize) / 2);

    const gx = Math.floor((mx - offsetX) / cellSize);
    const gy = Math.floor((my - offsetY) / cellSize);

    if (gx < 0 || gx >= s.gridSize || gy < 0 || gy >= s.gridSize) {
      return null;
    }

    return { gx, gy };
  }

  private handleMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check HUD clicks (palette selection)
    if (my >= this.state.canvasHeight - HUD_HEIGHT) {
      this.handleHUDClick(mx, my);
      return;
    }

    // Right-click always erases
    if (e.button === 2) {
      const coords = this.getGridCoords(e);
      if (coords) {
        this.state.currentTool = "erase";
        this.state.isDrawing = true;
      }
      return;
    }

    const coords = this.getGridCoords(e);
    if (coords) {
      this.state.hoverX = coords.gx;
      this.state.hoverY = coords.gy;
      this.state.isDrawing = true;
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const coords = this.getGridCoords(e);
    if (coords) {
      this.state.hoverX = coords.gx;
      this.state.hoverY = coords.gy;
      this.state.hoverActive = true;
    } else {
      this.state.hoverActive = false;
    }
  }

  private handleMouseUp(): void {
    this.state.isDrawing = false;
  }

  private handleMouseLeave(): void {
    this.state.hoverActive = false;
    this.state.isDrawing = false;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case "d":
        this.state.currentTool = "draw";
        break;
      case "e":
        this.state.currentTool = "erase";
        break;
      case "f":
        this.state.currentTool = "fill";
        break;
      case "i":
        this.state.currentTool = "eyedropper";
        break;
    }
  }

  private handleHUDClick(mx: number, my: number): void {
    const s = this.state;
    const hudY = s.canvasHeight - HUD_HEIGHT;
    const relY = my - hudY;

    // Color palette: rendered as a row of swatches starting at x=10, y=8 relative to HUD
    const swatchSize = 24;
    const swatchGap = 4;
    const paletteStartX = 10;
    const paletteStartY = 8;

    if (relY >= paletteStartY && relY <= paletteStartY + swatchSize) {
      for (let i = 0; i < COLOR_PALETTE.length; i++) {
        const sx = paletteStartX + i * (swatchSize + swatchGap);

        if (mx >= sx && mx <= sx + swatchSize) {
          s.currentColor = COLOR_PALETTE[i];

          // Switch to draw if currently on erase or eyedropper
          if (s.currentTool === "erase" || s.currentTool === "eyedropper") {
            s.currentTool = "draw";
          }

          return;
        }
      }
    }
  }
}
```

**What's happening:**
- `handleMouseDown()` now checks if the click is in the HUD region (bottom 100px). If so, it delegates to `handleHUDClick()` instead of starting a grid drawing operation.
- `handleHUDClick()` calculates relative Y position within the HUD, then iterates over each palette swatch to check if the click falls within its bounds. When a match is found, it sets the current color and switches to draw mode if the user was on erase or eyedropper.
- The keyboard handler now includes `"f"` for fill and `"i"` for eyedropper.

---

### 4. Update the Engine

**File:** `src/contexts/canvas2d/games/pixel-art/PixelArtEngine.ts`

Add the HUD renderer to the render loop.

```typescript
import type { PixelArtState } from './types';
import { DEFAULT_GRID_SIZE, COLOR_PALETTE, createEmptyGrid } from './types';
import { InputSystem } from './systems/InputSystem';
import { DrawSystem } from './systems/DrawSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class PixelArtEngine {
  private ctx: CanvasRenderingContext2D;
  private state: PixelArtState;
  private running: boolean;
  private rafId: number;

  private inputSystem: InputSystem;
  private drawSystem: DrawSystem;
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;
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

    this.drawSystem = new DrawSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();
    this.inputSystem = new InputSystem(canvas, this.state);

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasWidth = canvas.width;
      this.state.canvasHeight = canvas.height;
    };
  }

  start(): void {
    this.running = true;
    this.inputSystem.attach();
    window.addEventListener('resize', this.resizeHandler);
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

    this.drawSystem.update(this.state, 0);
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

**What's happening:**
- We add `HUDRenderer` to the engine and call `hudRenderer.render()` after `gameRenderer.render()` in the loop. The HUD draws on top of everything else.
- The render order matters: grid first, then HUD. This ensures the HUD's solid background covers any grid content that might overlap.

---

## Test It

1. **Run:** `npm run dev`
2. **Test the color palette:**
   - **Click** any color swatch in the bottom HUD -- the white selection border should move to it
   - **Draw** on the grid -- it should use the newly selected color
   - The current color indicator on the right should update
3. **Test flood fill:**
   - Draw a closed shape (e.g., a rectangle outline) using one color
   - Press **F** to switch to fill mode
   - **Click inside** the shape -- all connected empty cells should fill with the current color
   - **Click outside** the shape -- only the outside area fills, not the inside
   - Click on an already-filled region -- it should recolor to the current color
4. **Test eyedropper:**
   - Draw some pixels in different colors
   - Press **I** to switch to eyedropper mode
   - **Click** on a colored pixel -- the current color should change to match it
   - The tool should automatically switch back to draw mode
5. **Edge cases:**
   - Try to fill with the same color that is already there -- nothing should happen (no infinite loop)
   - Use the eyedropper on an empty cell -- nothing should happen (null is ignored)

---

## Challenges

**Easy:**
- Add a second row of custom colors to the palette by extending the `COLOR_PALETTE` array in types.ts.
- Change the palette selection border from white to the game's accent color (`#9c27b0`).

**Medium:**
- Add diagonal flood fill by including the four diagonal neighbors (`[cx-1, cy-1]`, `[cx+1, cy-1]`, etc.) in the `floodFill()` neighbor list.

**Hard:**
- Implement an "undo last fill" feature that saves the grid state before each flood fill and restores it when the user presses `Ctrl+Z`.

---

## What You Learned

- Implementing BFS-based flood fill with a visited set to prevent infinite loops
- Building an eyedropper tool that reads grid state and switches tools automatically
- Rendering clickable UI elements on canvas and detecting clicks with coordinate math
- Separating HUD interaction from grid interaction in the input handler

**Next:** HUD controls -- add tool buttons, grid size selectors, and a clear button to the toolbar!
