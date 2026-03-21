# Step 2: Drawing & Erasing Tools

**Goal:** Add mouse input so you can click and drag to paint pixels with the draw tool and erase them with the eraser or right-click.

**Time:** ~15 minutes

---

## What You'll Build

- **InputSystem** that tracks mouse position, converts screen coordinates to grid coordinates, and manages drawing state
- **DrawSystem** that applies draw and erase operations to the grid each frame
- **Click-and-drag painting** so holding the mouse button paints continuously
- **Right-click erasing** that always erases regardless of the selected tool
- **Keyboard shortcuts** to switch between draw (`D`) and erase (`E`) tools

---

## Concepts

- **Screen-to-Grid Coordinate Mapping**: Mouse events give screen pixel positions. We subtract the grid offset, divide by cell size, and floor the result to get the grid cell index. This is the same pattern used in any tile-based editor.
- **Drawing State Machine**: `isDrawing` is set to `true` on mousedown and `false` on mouseup. Each frame, the DrawSystem checks this flag and applies the current tool to the hovered cell -- this decouples input from rendering.
- **Continuous Stroke**: By tracking `lastDrawX`/`lastDrawY`, the DrawSystem avoids re-applying the same pixel repeatedly when the mouse stays in one cell. It also resets when the user lifts the mouse.
- **Null Erasure**: Erasing simply sets a cell to `null`, which the GameRenderer already displays as the checkerboard pattern. No special "erased" state is needed.

---

## Code

### 1. Create the Input System

**File:** `src/contexts/canvas2d/games/pixel-art/systems/InputSystem.ts`

Handles all mouse and keyboard events, translating screen coordinates into grid coordinates and updating the shared state.

```typescript
import type { PixelArtState } from "../types";
import { HUD_HEIGHT } from "../types";

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
    }
  }
}
```

**What's happening:**
- `getGridCoords()` is the key function: it takes a mouse event, subtracts the canvas bounding rect, computes the same `cellSize`, `offsetX`, and `offsetY` as the renderer, and returns the grid cell indices. If the click is outside the grid, it returns `null`.
- On `mousedown`, we set `isDrawing = true` and record the hovered cell. Right-click (`button === 2`) forces the erase tool. We also prevent the context menu with `boundContextMenu`.
- On `mousemove`, we update `hoverX`/`hoverY` and `hoverActive` so the renderer can show the hover preview from Step 1.
- On `mouseup` and `mouseleave`, we stop drawing. Leaving the canvas also hides the hover preview.
- Keyboard shortcuts `D` and `E` switch tools. We will add `F` (fill) and `I` (eyedropper) in Step 3.

---

### 2. Create the Draw System

**File:** `src/contexts/canvas2d/games/pixel-art/systems/DrawSystem.ts`

Runs each frame to apply the current tool to the grid based on the input state.

```typescript
import type { PixelArtState } from "../types";

export class DrawSystem {
  private lastDrawX: number;
  private lastDrawY: number;

  constructor() {
    this.lastDrawX = -1;
    this.lastDrawY = -1;
  }

  update(state: PixelArtState, _dt: number): void {
    if (!state.isDrawing) {
      this.lastDrawX = -1;
      this.lastDrawY = -1;
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
    }

    this.lastDrawX = gx;
    this.lastDrawY = gy;
  }

  private placePixel(state: PixelArtState, x: number, y: number): void {
    state.grid[y][x] = state.currentColor;
  }

  private erasePixel(state: PixelArtState, x: number, y: number): void {
    state.grid[y][x] = null;
  }
}
```

**What's happening:**
- `update()` runs every frame. If `isDrawing` is false, it resets tracking and returns. Otherwise, it reads the hovered grid cell and applies the current tool.
- `placePixel()` writes the current color string into the grid array. `erasePixel()` sets it to `null`.
- `lastDrawX`/`lastDrawY` track the previous cell. In this step we do not use them yet, but they will prevent redundant flood-fill operations in Step 3.
- The system only handles `"draw"` and `"erase"` for now. We will add `"fill"` and `"eyedropper"` cases in Step 3.

---

### 3. Update the Engine

**File:** `src/contexts/canvas2d/games/pixel-art/PixelArtEngine.ts`

Wire the InputSystem and DrawSystem into the engine.

```typescript
import type { PixelArtState } from './types';
import { DEFAULT_GRID_SIZE, COLOR_PALETTE, createEmptyGrid } from './types';
import { InputSystem } from './systems/InputSystem';
import { DrawSystem } from './systems/DrawSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class PixelArtEngine {
  private ctx: CanvasRenderingContext2D;
  private state: PixelArtState;
  private running: boolean;
  private rafId: number;

  private inputSystem: InputSystem;
  private drawSystem: DrawSystem;
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

    this.drawSystem = new DrawSystem();
    this.gameRenderer = new GameRenderer();
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

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

**What's happening:**
- We create the `InputSystem` and `DrawSystem` alongside the `GameRenderer`.
- `start()` now calls `inputSystem.attach()` to register event listeners.
- `destroy()` calls `inputSystem.detach()` to clean up.
- The game loop now runs `drawSystem.update()` before rendering. This is the classic update-then-render pattern: input updates state, the draw system mutates the grid, and the renderer draws the result.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Pixel Art game in your browser
3. **Test drawing:**
   - **Click** on any cell -- it should fill with black (the default color)
   - **Click and drag** across cells -- they should all turn black as the mouse moves
   - **Release** the mouse button -- drawing stops
4. **Test erasing:**
   - Press **E** to switch to the erase tool
   - **Click** on a painted cell -- it should return to the checkerboard pattern
   - **Right-click** on any painted cell -- it should erase regardless of the current tool
5. **Test hover preview:**
   - Press **D** to switch back to draw
   - **Move** the mouse over the grid -- you should see a semi-transparent preview of the current color with a white border
6. **Resize** the window -- the grid should re-center and drawing should still work correctly

---

## Challenges

**Easy:**
- Change the default color from black (`COLOR_PALETTE[0]`) to red (`COLOR_PALETTE[2]`) in the engine constructor.
- Add a console log in `DrawSystem.placePixel()` that prints the coordinates being painted.

**Medium:**
- Add a middle-click handler (`button === 1`) that picks the color from the clicked cell (eyedropper preview -- we will build the real eyedropper in Step 3).

**Hard:**
- Implement Bresenham's line algorithm in the DrawSystem so that fast mouse movements do not skip cells. Interpolate between `lastDrawX`/`lastDrawY` and the current position.

---

## What You Learned

- Converting screen coordinates to grid coordinates using offset and cell size math
- Implementing a drawing state machine with mousedown/mouseup/mousemove
- Decoupling input handling from grid mutation using separate systems
- Using right-click override and keyboard shortcuts to switch tools

**Next:** Color palette and fill tool -- add a clickable color palette and a flood-fill bucket tool!
