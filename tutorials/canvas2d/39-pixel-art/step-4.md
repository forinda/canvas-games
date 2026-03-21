# Step 4: HUD Controls & Grid Resize

**Goal:** Add interactive tool buttons, grid size selectors, and a clear button to the HUD toolbar, plus wire up grid resizing and canvas clearing in the engine.

**Time:** ~15 minutes

---

## What You'll Build

- **Tool buttons** (Draw, Erase, Fill, Pick) rendered as styled rectangles with active-state highlighting
- **Grid size buttons** (16x16, 32x32, 64x64) that resize the canvas and reset the grid
- **Clear button** that wipes all pixels from the grid
- **Grid resize logic** in the engine that creates a fresh grid at the new size
- **Complete HUD** with palette, tools, grid sizes, clear, and status text

---

## Concepts

- **Canvas UI Buttons**: Since we are not using HTML elements, we render button-like rectangles on the canvas and detect clicks by checking if the mouse coordinates fall within each button's bounding box. `roundRect()` gives buttons a modern rounded-corner look.
- **Active State Highlighting**: The currently selected tool and grid size get a distinct fill color and brighter border, providing immediate visual feedback about which option is active.
- **Grid Resize Strategy**: Changing grid size creates an entirely new empty grid. Attempting to scale existing pixel art between different resolutions adds complexity with minimal benefit for a pixel art tool.
- **Callback Pattern**: The InputSystem receives `onClear` and `onGridResize` callbacks from the engine. This keeps the InputSystem focused on detecting user intent while the engine handles state mutations.

---

## Code

### 1. Update the HUD Renderer

**File:** `src/contexts/canvas2d/games/pixel-art/renderers/HUDRenderer.ts`

Add tool buttons, grid size buttons, clear button, and status text alongside the existing palette.

```typescript
import type { PixelArtState, Tool } from "../types";
import { HUD_HEIGHT, COLOR_PALETTE, GRID_SIZES } from "../types";

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

    // Tool buttons row
    const tools: Tool[] = ["draw", "erase", "fill", "eyedropper"];
    const toolLabels: Record<Tool, string> = {
      draw: "Draw [D]",
      erase: "Erase [E]",
      fill: "Fill [F]",
      eyedropper: "Pick [I]",
    };
    const toolBtnW = 80;
    const toolBtnH = 24;
    const toolGap = 8;
    const toolY = hudY + 42;

    ctx.font = "12px monospace";
    ctx.textBaseline = "middle";

    for (let i = 0; i < tools.length; i++) {
      const tx = 10 + i * (toolBtnW + toolGap);
      const isActive = state.currentTool === tools[i];

      ctx.fillStyle = isActive ? "#9c27b0" : "#2a2a3e";
      ctx.beginPath();
      ctx.roundRect(tx, toolY, toolBtnW, toolBtnH, 4);
      ctx.fill();

      ctx.strokeStyle = isActive ? "#ce93d8" : "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(tx, toolY, toolBtnW, toolBtnH, 4);
      ctx.stroke();

      ctx.fillStyle = isActive ? "#ffffff" : "#aaaaaa";
      ctx.textAlign = "center";
      ctx.fillText(
        toolLabels[tools[i]],
        tx + toolBtnW / 2,
        toolY + toolBtnH / 2
      );
    }

    // Grid size buttons
    const gridBtnStartX = 10 + tools.length * (toolBtnW + toolGap) + 20;
    const gridBtnW = 54;

    // Label
    ctx.fillStyle = "#666666";
    ctx.textAlign = "left";
    ctx.font = "10px monospace";
    ctx.fillText("Grid:", gridBtnStartX, toolY - 4);

    ctx.font = "12px monospace";

    for (let i = 0; i < GRID_SIZES.length; i++) {
      const gx = gridBtnStartX + i * (gridBtnW + toolGap);
      const isActive = state.gridSize === GRID_SIZES[i];

      ctx.fillStyle = isActive ? "#4a148c" : "#2a2a3e";
      ctx.beginPath();
      ctx.roundRect(gx, toolY, gridBtnW, toolBtnH, 4);
      ctx.fill();

      ctx.strokeStyle = isActive ? "#9c27b0" : "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(gx, toolY, gridBtnW, toolBtnH, 4);
      ctx.stroke();

      ctx.fillStyle = isActive ? "#ffffff" : "#aaaaaa";
      ctx.textAlign = "center";
      ctx.fillText(
        `${GRID_SIZES[i]}x${GRID_SIZES[i]}`,
        gx + gridBtnW / 2,
        toolY + toolBtnH / 2
      );
    }

    // Clear button
    const clearBtnX =
      gridBtnStartX + GRID_SIZES.length * (gridBtnW + toolGap) + 20;
    const clearBtnW = 60;

    ctx.fillStyle = "#5c1010";
    ctx.beginPath();
    ctx.roundRect(clearBtnX, toolY, clearBtnW, toolBtnH, 4);
    ctx.fill();

    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(clearBtnX, toolY, clearBtnW, toolBtnH, 4);
    ctx.stroke();

    ctx.fillStyle = "#ff6666";
    ctx.textAlign = "center";
    ctx.fillText("Clear [C]", clearBtnX + clearBtnW / 2, toolY + toolBtnH / 2);

    // Current color indicator
    const indicatorX = clearBtnX + clearBtnW + 30;
    const indicatorSize = 20;

    ctx.fillStyle = "#666666";
    ctx.textAlign = "left";
    ctx.font = "10px monospace";
    ctx.fillText("Color:", indicatorX, toolY - 4);

    ctx.fillStyle = state.currentColor;
    ctx.fillRect(indicatorX, toolY + 2, indicatorSize, indicatorSize);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.strokeRect(indicatorX, toolY + 2, indicatorSize, indicatorSize);

    // Exit/help hint
    ctx.fillStyle = "#555555";
    ctx.font = "10px monospace";
    ctx.textAlign = "right";
    ctx.fillText("ESC to exit | H for help", W - 10, hudY + HUD_HEIGHT - 8);
  }
}
```

**What's happening:**
- Tool buttons are drawn using `roundRect()` for rounded corners. The active tool gets a purple fill (`#9c27b0`) and lighter border (`#ce93d8`); inactive tools get a dark fill with subtle borders.
- Each button label includes the keyboard shortcut in brackets (e.g., `"Draw [D]"`) so users discover shortcuts naturally.
- Grid size buttons follow the same pattern but use a deeper purple (`#4a148c`) for the active size. They are positioned after the tool buttons with a "Grid:" label above.
- The clear button stands out with a red color scheme (`#5c1010` fill, `#ff4444` border) to signal its destructive nature.
- The status line at the bottom right shows ESC to exit and H for help.

---

### 2. Update the Input System

**File:** `src/contexts/canvas2d/games/pixel-art/systems/InputSystem.ts`

Add click detection for tool buttons, grid size buttons, clear button, and the clear keyboard shortcut. Accept callbacks for clear and grid resize.

```typescript
import type { PixelArtState, Tool } from "../types";
import { HUD_HEIGHT, COLOR_PALETTE, GRID_SIZES } from "../types";

export class InputSystem {
  private canvas: HTMLCanvasElement;
  private state: PixelArtState;
  private onClear: () => void;
  private onGridResize: (size: number) => void;

  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundContextMenu: (e: MouseEvent) => void;
  private boundMouseLeave: () => void;
  private boundKeyDown: (e: KeyboardEvent) => void;

  constructor(
    canvas: HTMLCanvasElement,
    state: PixelArtState,
    onClear: () => void,
    onGridResize: (size: number) => void
  ) {
    this.canvas = canvas;
    this.state = state;
    this.onClear = onClear;
    this.onGridResize = onGridResize;

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

    // Check HUD clicks
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
      case "c":
        this.onClear();
        break;
    }
  }

  private handleHUDClick(mx: number, my: number): void {
    const s = this.state;
    const hudY = s.canvasHeight - HUD_HEIGHT;
    const relY = my - hudY;

    // Color palette: row of swatches at y=8 relative to HUD
    const swatchSize = 24;
    const swatchGap = 4;
    const paletteStartX = 10;
    const paletteStartY = 8;

    if (relY >= paletteStartY && relY <= paletteStartY + swatchSize) {
      for (let i = 0; i < COLOR_PALETTE.length; i++) {
        const sx = paletteStartX + i * (swatchSize + swatchGap);

        if (mx >= sx && mx <= sx + swatchSize) {
          s.currentColor = COLOR_PALETTE[i];

          if (s.currentTool === "erase" || s.currentTool === "eyedropper") {
            s.currentTool = "draw";
          }

          return;
        }
      }
    }

    // Tool buttons: row at y=42 relative to HUD
    const toolY = 42;
    const toolBtnW = 80;
    const toolBtnH = 24;
    const toolGap = 8;
    const tools: Tool[] = ["draw", "erase", "fill", "eyedropper"];

    if (relY >= toolY && relY <= toolY + toolBtnH) {
      for (let i = 0; i < tools.length; i++) {
        const tx = 10 + i * (toolBtnW + toolGap);

        if (mx >= tx && mx <= tx + toolBtnW) {
          s.currentTool = tools[i];
          return;
        }
      }
    }

    // Grid size buttons: after tools
    const gridBtnStartX = 10 + tools.length * (toolBtnW + toolGap) + 20;
    const gridBtnW = 54;

    if (relY >= toolY && relY <= toolY + toolBtnH) {
      for (let i = 0; i < GRID_SIZES.length; i++) {
        const gx = gridBtnStartX + i * (gridBtnW + toolGap);

        if (mx >= gx && mx <= gx + gridBtnW) {
          this.onGridResize(GRID_SIZES[i]);
          return;
        }
      }
    }

    // Clear button: after grid sizes
    const clearBtnX =
      gridBtnStartX + GRID_SIZES.length * (gridBtnW + toolGap) + 20;
    const clearBtnW = 60;

    if (relY >= toolY && relY <= toolY + toolBtnH) {
      if (mx >= clearBtnX && mx <= clearBtnX + clearBtnW) {
        this.onClear();
        return;
      }
    }
  }
}
```

**What's happening:**
- The constructor now accepts `onClear` and `onGridResize` callbacks. These let the input system signal intent without knowing how the engine manages state.
- `handleHUDClick()` checks each UI region in order: palette swatches first, then tool buttons, grid size buttons, and finally the clear button. Each check uses the same pattern: compute the button's bounding box and test if `mx`/`my` falls inside.
- Tool button click detection mirrors the render layout exactly: starting at x=10, each button is 80px wide with 8px gaps. The grid size buttons start after a 20px spacer.
- The `"c"` keyboard shortcut for clear is added to `handleKeyDown()`.

---

### 3. Update the Engine

**File:** `src/contexts/canvas2d/games/pixel-art/PixelArtEngine.ts`

Add `clearGrid()` and `resizeGrid()` methods and pass them as callbacks to the InputSystem.

```typescript
import type { PixelArtState, GridSize } from './types';
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

    this.inputSystem = new InputSystem(
      canvas,
      this.state,
      () => this.clearGrid(),
      (size: number) => this.resizeGrid(size as GridSize)
    );

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

  private clearGrid(): void {
    this.state.grid = createEmptyGrid(this.state.gridSize);
  }

  private resizeGrid(size: GridSize): void {
    this.state.gridSize = size;
    this.state.grid = createEmptyGrid(size);
  }
}
```

**What's happening:**
- `clearGrid()` replaces the grid with a fresh empty grid of the same size. All pixel data is lost -- this is intentional for a simple clear operation.
- `resizeGrid()` updates the `gridSize` state and creates a new empty grid at the new size. The renderer automatically recalculates cell sizes and offsets because it reads from `state.gridSize`.
- Both methods are passed as arrow-function callbacks to the InputSystem constructor, capturing `this` correctly.

---

## Test It

1. **Run:** `npm run dev`
2. **Test tool buttons:**
   - **Click** each tool button in the HUD -- the active button should highlight purple
   - Draw some pixels, then click "Erase" and erase them
   - Click "Fill" and flood-fill an area
   - Click "Pick" and pick a color from the grid
3. **Test grid size buttons:**
   - Click **16x16** -- the grid should become much larger cells (fewer pixels)
   - Click **64x64** -- the grid should become tiny cells (more pixels)
   - Click **32x32** -- back to the default
   - Note: changing size clears the canvas
4. **Test clear button:**
   - Draw some artwork
   - Click the red **Clear [C]** button -- all pixels should disappear
   - Press **C** on the keyboard -- same effect
5. **Test the complete workflow:**
   - Select a color from the palette
   - Draw with click-and-drag
   - Switch tools using both buttons and keyboard shortcuts
   - Change grid sizes
   - Verify the current color indicator updates correctly

---

## Challenges

**Easy:**
- Add a hover effect to the tool buttons by changing their fill color when the mouse is over them (you will need to track mouse position in the HUD area).
- Change the clear button color scheme to match the purple theme instead of red.

**Medium:**
- Add a "Grid" toggle button that shows/hides the grid lines. Add a `showGrid` boolean to `PixelArtState` and check it in the GameRenderer.

**Hard:**
- Add an undo stack: before each draw/erase/fill operation, save a copy of the grid. Press `Ctrl+Z` to restore the previous state. Limit the stack to 20 entries to avoid memory issues.

---

## What You Learned

- Rendering interactive buttons on canvas using `roundRect()` with active-state highlighting
- Implementing click detection for multiple UI regions using coordinate-based hit testing
- Using the callback pattern to decouple input detection from state mutation
- Managing grid resize by replacing the entire grid array

**Next:** Export and polish -- add PNG export and final touches to complete the pixel art editor!
