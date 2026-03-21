# Step 5: Export & Polish

**Goal:** Add PNG export functionality, wire up the platform adapter and entry point, and polish the editor with the help overlay and final integration.

**Time:** ~15 minutes

---

## What You'll Build

- **PNG export** that renders pixel art to an off-screen canvas and triggers a file download
- **Platform adapter** that connects the engine to the host application with proper lifecycle management
- **Entry point** that registers the game with its metadata, controls help, and tips
- **Help overlay** toggled with `H` showing all controls and tips
- **ESC to exit** for clean navigation back to the game menu

---

## Concepts

- **Off-screen Canvas Export**: To export pixel art as a clean PNG, we create a temporary canvas sized exactly to the grid (e.g., 32x32 pixels), draw each cell as a single pixel, and use `canvas.toDataURL('image/png')` to generate the image data. This gives a crisp, unscaled export at native resolution.
- **Programmatic Download**: We create an invisible `<a>` element, set its `href` to the data URL and `download` to a filename, then trigger a click. The browser's download dialog handles the rest -- no server needed.
- **Platform Adapter Pattern**: The adapter wraps the engine and provides a standard `start()`/`destroy()` interface. This lets the host application manage game lifecycle without knowing engine internals.
- **GameDefinition Registration**: The entry point exports a `GameDefinition` object with metadata (name, description, icon, color, category) and a `create()` factory function. The host application uses this to build the game menu and launch games.

---

## Code

### 1. Add Export to the Engine

**File:** `src/contexts/canvas2d/games/pixel-art/PixelArtEngine.ts`

The complete engine with export functionality, help overlay, and all systems integrated.

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

  constructor(canvas: HTMLCanvasElement, private onExit: () => void) {
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
      onExit,
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

  exportPNG(): void {
    const { grid, gridSize } = this.state;

    // Create an off-screen canvas at the exact grid resolution
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = gridSize;
    exportCanvas.height = gridSize;
    const exportCtx = exportCanvas.getContext('2d')!;

    // Transparent background by default
    exportCtx.clearRect(0, 0, gridSize, gridSize);

    // Draw each pixel
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const color = grid[y][x];
        if (color !== null) {
          exportCtx.fillStyle = color;
          exportCtx.fillRect(x, y, 1, 1);
        }
        // null cells remain transparent in the PNG
      }
    }

    // Trigger download
    const dataURL = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `pixel-art-${gridSize}x${gridSize}.png`;
    link.href = dataURL;
    link.click();
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
- `exportPNG()` creates a temporary canvas sized to the grid resolution (e.g., 32x32). It draws each non-null cell as a 1x1 pixel, leaving null cells transparent. Then it generates a data URL and triggers a download by clicking a programmatically created `<a>` element.
- The filename includes the grid size (e.g., `pixel-art-32x32.png`) so exported files are self-documenting.
- The constructor now accepts an `onExit` callback passed to the InputSystem, so pressing ESC navigates back to the game menu.
- `clearRect()` on the export canvas ensures a transparent background -- empty areas in the pixel art become transparent in the PNG, which is the standard behavior for pixel art exports.

---

### 2. Update the Input System for Export

**File:** `src/contexts/canvas2d/games/pixel-art/systems/InputSystem.ts`

Add the `onExit` callback and the `s` key for export (or pass the export action through a callback).

```typescript
import type { PixelArtState, Tool } from "../types";
import { HUD_HEIGHT, COLOR_PALETTE, GRID_SIZES } from "../types";

export class InputSystem {
  private canvas: HTMLCanvasElement;
  private state: PixelArtState;
  private onExit: () => void;
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
    onExit: () => void,
    onClear: () => void,
    onGridResize: (size: number) => void
  ) {
    this.canvas = canvas;
    this.state = state;
    this.onExit = onExit;
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
      case "Escape":
        this.onExit();
        break;
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

    // Color palette
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

    // Tool buttons
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

    // Grid size buttons
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

    // Clear button
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
- The constructor now accepts `onExit` as the third parameter, placed before `onClear` and `onGridResize`. This matches the final source code's constructor signature.
- `handleKeyDown()` now handles `"Escape"` to trigger `onExit()`, allowing the user to return to the game menu.
- The complete `handleHUDClick()` method handles all four click regions: palette, tools, grid sizes, and clear.

---

### 3. Create the Platform Adapter

**File:** `src/contexts/canvas2d/games/pixel-art/adapters/PlatformAdapter.ts`

Wraps the engine with a standard lifecycle interface.

```typescript
import { PixelArtEngine } from '../PixelArtEngine';

export class PlatformAdapter {
  private engine: PixelArtEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new PixelArtEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

**What's happening:**
- The adapter passes `canvas` and `onExit` through to the engine. It exposes only `start()` and `destroy()` -- the minimum interface the host application needs.
- `destroy()` ensures all event listeners are removed and the animation loop stops when navigating away from the game.

---

### 4. Create the Entry Point

**File:** `src/contexts/canvas2d/games/pixel-art/index.ts`

Registers the game with metadata, help information, and the factory function.

```typescript
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const PixelArtGame = {
  id: "pixel-art",
  name: "Pixel Art",
  description: "Create pixel art on a customizable grid with multiple tools",
  icon: "\uD83C\uDFA8",
  color: "#9c27b0",
  category: "chill" as const,
  help: {
    goal: "Draw pixel art using a palette of 16 colors and 4 creative tools.",
    controls: [
      { key: "Left Click", action: "Use current tool (draw/fill/eyedropper)" },
      { key: "Right Click", action: "Erase pixel" },
      { key: "Click + Drag", action: "Draw or erase continuously" },
      { key: "D", action: "Switch to Draw tool" },
      { key: "E", action: "Switch to Erase tool" },
      { key: "F", action: "Switch to Fill tool (flood fill)" },
      { key: "I", action: "Switch to Eyedropper tool (pick color)" },
      { key: "C", action: "Clear the entire canvas" },
      { key: "H", action: "Toggle help overlay" },
      { key: "ESC", action: "Exit to menu" },
    ],
    tips: [
      "Use the eyedropper (I) to pick colors directly from your artwork",
      "Flood fill (F) fills all connected pixels of the same color",
      "Switch grid sizes (16x16, 32x32, 64x64) from the HUD -- this clears the canvas",
      "Right-click always erases regardless of the selected tool",
      "Click colors in the palette at the top of the HUD to change your drawing color",
    ],
  },
  create(canvas: HTMLCanvasElement, onExit: () => void) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
```

**What's happening:**
- `id`, `name`, `description`, `icon`, and `color` provide metadata for the game menu. The category `"chill"` groups it with other creative/relaxation games.
- `help` defines the controls list and tips shown in the help overlay. Each control maps a key to its action. Tips provide useful information that is not obvious from the controls alone.
- `create()` is the factory function called by the host. It constructs the adapter, starts the engine, and returns the instance so the host can later call `destroy()`.

---

## Test It

1. **Run:** `npm run dev`
2. **Test the complete editor:**
   - Select colors from the palette and draw pixel art
   - Use all four tools: Draw, Erase, Fill, Eyedropper
   - Switch between grid sizes (16x16, 32x32, 64x64)
   - Press **C** or click Clear to wipe the canvas
3. **Test PNG export:**
   - Draw some pixel art
   - Call `exportPNG()` from the engine (or add a keyboard shortcut/button)
   - Verify the downloaded PNG is the correct resolution (e.g., 32x32 pixels)
   - Open the PNG in an image editor -- empty cells should be transparent
4. **Test help overlay:**
   - Press **H** to toggle the help overlay
   - Verify all controls and tips are displayed
   - Press **H** again to dismiss
5. **Test exit:**
   - Press **ESC** -- the game should exit and return to the menu
6. **Test edge cases:**
   - Resize the browser window while drawing -- the grid should re-center
   - Draw on a 64x64 grid and export -- the PNG should be exactly 64x64 pixels
   - Export an empty canvas -- the PNG should be entirely transparent

---

## Challenges

**Easy:**
- Add an export button to the HUD (next to the Clear button) that calls `exportPNG()` when clicked.
- Change the export filename to include a timestamp (e.g., `pixel-art-32x32-1679900000.png`).

**Medium:**
- Add a "Save/Load" feature using `localStorage`. Serialize the grid to JSON on save, and deserialize it on load. Add keyboard shortcuts `Ctrl+S` and `Ctrl+L`.

**Hard:**
- Add a scaled export option that lets the user export at 2x, 4x, or 8x resolution. Instead of drawing 1x1 pixels on the export canvas, draw NxN squares where N is the scale factor. Add a scale selector to the HUD.

---

## What You Learned

- Exporting canvas content as a downloadable PNG using an off-screen canvas and data URLs
- Creating a platform adapter pattern for clean lifecycle management
- Registering a game with metadata, help information, and a factory function
- Building a complete creative tool with multiple systems: input, drawing, rendering, and HUD

**Congratulations!** You have built a complete pixel art editor with a configurable grid, four drawing tools, a color palette, and PNG export. The architecture separates concerns cleanly: InputSystem handles user events, DrawSystem mutates the grid, GameRenderer draws pixels, and HUDRenderer draws the toolbar.

**Next Game:** Continue to [Particle Sand](../40-particle-sand/README.md) -- where you will learn cellular automata and particle simulation!
