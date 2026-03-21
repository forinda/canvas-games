# Step 5: Color Picker & Brick Palette

**Goal:** Build the side panel UI with a clickable brick template palette, color swatches, and keyboard shortcuts for selecting tools.

**Time:** ~10 minutes

---

## What You'll Build

- **Brick template palette** on the right side with 5 selectable shapes, each with a mini preview
- **Color picker** with 8 color swatches arranged in a 4x2 grid
- **Keyboard shortcuts**: number keys 1-5 to select templates, C to cycle colors
- **Scroll wheel rotation** to swap brick width and height for non-square templates
- **Selection indicators**: highlighted borders on the active template and color

---

## Concepts

- **Side Panel Layout**: The palette is positioned to the right of the grid using `gridOffsetX + GRID_COLS * CELL_SIZE + 16`. This keeps the panel aligned with the grid regardless of window size.
- **Hit Testing UI Elements**: Clicking the palette requires checking if the mouse coordinates fall within each item's bounding rectangle. This is the same AABB test used for brick collision, applied to UI buttons.
- **Keyboard Number Mapping**: `parseInt(e.key, 10)` converts a key like `'3'` to the number `3`. Subtracting 1 gives the template index (0-based). This is a common pattern for hotkey selection.
- **Rotation via Swap**: Rotating a brick simply swaps `w` and `h`. A `3x1` becomes a `1x3`. The `rotated` boolean flag tracks this state. Square bricks (like `2x2`) ignore rotation since swapping has no effect.

---

## Code

### 1. Create the HUD Renderer

**File:** `src/games/brick-builder/renderers/HUDRenderer.ts`

Renders the top bar, brick palette, color picker, clear button, and brick counter.

```typescript
import type { BrickBuilderState } from '../types';
import {
  CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
  BRICK_COLORS,
  HUD_HEIGHT,
} from '../types';
import { BRICK_TEMPLATES } from '../data/bricks';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: BrickBuilderState): void {
    this.renderTopBar(ctx, state);
    this.renderPalette(ctx, state);
    this.renderColorPicker(ctx, state);
    this.renderClearButton(ctx, state);
    this.renderBrickCount(ctx, state);
  }

  private renderTopBar(
    ctx: CanvasRenderingContext2D,
    state: BrickBuilderState,
  ): void {
    const W = state.canvasWidth;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, W, HUD_HEIGHT);

    // Title
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#ff7043';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Brick Builder', 16, HUD_HEIGHT / 2);

    // Controls hint
    ctx.font = '11px monospace';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'right';
    ctx.fillText(
      '[H] Help  [Scroll] Rotate  [Right-click] Remove',
      W - 16,
      HUD_HEIGHT / 2,
    );
  }

  private renderPalette(
    ctx: CanvasRenderingContext2D,
    state: BrickBuilderState,
  ): void {
    const paletteX = state.gridOffsetX + GRID_COLS * CELL_SIZE + 16;
    const y = state.gridOffsetY + 8;

    // Palette header
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('BRICKS', paletteX, y - 20);

    const selectedColor = BRICK_COLORS[state.selectedColorIndex];

    for (let i = 0; i < BRICK_TEMPLATES.length; i++) {
      const template = BRICK_TEMPLATES[i];
      const itemY = y + i * 44;
      const isSelected = i === state.selectedTemplateIndex;

      // Background
      ctx.fillStyle = isSelected
        ? 'rgba(255, 112, 67, 0.15)'
        : 'rgba(255, 255, 255, 0.03)';
      ctx.beginPath();
      ctx.roundRect(paletteX, itemY, 160, 38, 6);
      ctx.fill();

      // Selection border
      if (isSelected) {
        ctx.strokeStyle = '#ff7043';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(paletteX, itemY, 160, 38, 6);
        ctx.stroke();
      }

      // Mini brick preview
      const previewCellSize = 10;
      const previewX = paletteX + 10;
      const previewY = itemY + (38 - template.h * previewCellSize) / 2;

      for (let cy = 0; cy < template.h; cy++) {
        for (let cx = 0; cx < template.w; cx++) {
          const bx = previewX + cx * previewCellSize;
          const by = previewY + cy * previewCellSize;

          ctx.fillStyle = selectedColor;
          ctx.fillRect(bx, by, previewCellSize - 1, previewCellSize - 1);
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          ctx.fillRect(bx, by, previewCellSize - 1, 2);
        }
      }

      // Label
      ctx.font = '12px monospace';
      ctx.fillStyle = isSelected ? '#fff' : '#888';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(template.label, paletteX + 60, itemY + 19);

      // Key hint
      ctx.font = '10px monospace';
      ctx.fillStyle = '#555';
      ctx.textAlign = 'right';
      ctx.fillText(`[${i + 1}]`, paletteX + 150, itemY + 19);
    }
  }

  private renderColorPicker(
    ctx: CanvasRenderingContext2D,
    state: BrickBuilderState,
  ): void {
    const paletteX = state.gridOffsetX + GRID_COLS * CELL_SIZE + 16;
    const colorY = state.gridOffsetY + BRICK_TEMPLATES.length * 44 + 48;
    const swatchSize = 28;
    const gap = 6;
    const perRow = 4;

    // Header
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('COLORS  [C]', paletteX, colorY - 20);

    for (let i = 0; i < BRICK_COLORS.length; i++) {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const cx = paletteX + col * (swatchSize + gap);
      const cy = colorY + row * (swatchSize + gap);
      const isSelected = i === state.selectedColorIndex;

      // Swatch
      ctx.fillStyle = BRICK_COLORS[i];
      ctx.beginPath();
      ctx.roundRect(cx, cy, swatchSize, swatchSize, 4);
      ctx.fill();

      // Selection ring
      if (isSelected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(cx - 2, cy - 2, swatchSize + 4, swatchSize + 4, 6);
        ctx.stroke();
      }
    }
  }

  private renderClearButton(
    ctx: CanvasRenderingContext2D,
    state: BrickBuilderState,
  ): void {
    const paletteX = state.gridOffsetX + GRID_COLS * CELL_SIZE + 16;
    const clearY = state.gridOffsetY + BRICK_TEMPLATES.length * 44 + 48 + 80;
    const btnW = 160;
    const btnH = 32;

    // Button background
    ctx.fillStyle = 'rgba(229, 57, 53, 0.15)';
    ctx.beginPath();
    ctx.roundRect(paletteX, clearY, btnW, btnH, 6);
    ctx.fill();

    ctx.strokeStyle = 'rgba(229, 57, 53, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(paletteX, clearY, btnW, btnH, 6);
    ctx.stroke();

    ctx.font = '12px monospace';
    ctx.fillStyle = '#e53935';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Clear All [Del]', paletteX + btnW / 2, clearY + btnH / 2);
  }

  private renderBrickCount(
    ctx: CanvasRenderingContext2D,
    state: BrickBuilderState,
  ): void {
    const paletteX = state.gridOffsetX + GRID_COLS * CELL_SIZE + 16;
    const countY = state.gridOffsetY + GRID_ROWS * CELL_SIZE - 30;

    ctx.font = '12px monospace';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Bricks: ${state.bricks.length}`, paletteX, countY);
    ctx.fillText(`Total placed: ${state.totalPlaced}`, paletteX, countY + 18);
  }
}
```

**What's happening:**
- `renderTopBar` draws a semi-transparent black bar across the top with the game title in orange and a controls hint in gray.
- `renderPalette` draws 5 template items, each with a mini brick preview (colored squares matching the selected color), a label, and a keyboard shortcut hint. The selected template gets an orange highlight border.
- `renderColorPicker` draws 8 color swatches in a 4x2 grid. Each is a rounded rectangle filled with the color. The active color gets a white ring.
- `renderClearButton` draws a red-tinted button labeled "Clear All [Del]".
- `renderBrickCount` shows the current number of placed bricks and a lifetime total counter at the bottom of the palette.

---

### 2. Update InputSystem — Add Keyboard, Scroll, and UI Clicks

**File:** `src/games/brick-builder/systems/InputSystem.ts`

Add keyboard shortcuts, scroll wheel rotation, and click handlers for the palette and color picker.

```typescript
import type { BrickBuilderState } from '../types';
import { CELL_SIZE, GRID_COLS, GRID_ROWS, BRICK_COLORS } from '../types';
import { BRICK_TEMPLATES } from '../data/bricks';
import type { BuildSystem } from './BuildSystem';

export class InputSystem {
  private state: BrickBuilderState;
  private canvas: HTMLCanvasElement;
  private buildSystem: BuildSystem;

  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundContextMenu: (e: MouseEvent) => void;
  private boundWheel: (e: WheelEvent) => void;
  private boundKeyDown: (e: KeyboardEvent) => void;

  constructor(
    state: BrickBuilderState,
    canvas: HTMLCanvasElement,
    buildSystem: BuildSystem,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.buildSystem = buildSystem;

    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.boundContextMenu = this.handleContextMenu.bind(this);
    this.boundWheel = this.handleWheel.bind(this);
    this.boundKeyDown = this.handleKeyDown.bind(this);
  }

  attach(): void {
    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    this.canvas.addEventListener('contextmenu', this.boundContextMenu);
    this.canvas.addEventListener('wheel', this.boundWheel, { passive: false });
    window.addEventListener('keydown', this.boundKeyDown);
  }

  detach(): void {
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    this.canvas.removeEventListener('contextmenu', this.boundContextMenu);
    this.canvas.removeEventListener('wheel', this.boundWheel);
    window.removeEventListener('keydown', this.boundKeyDown);
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const s = this.state;

    s.mouseX = e.clientX - rect.left;
    s.mouseY = e.clientY - rect.top;

    const gx = Math.floor((s.mouseX - s.gridOffsetX) / CELL_SIZE);
    const gy = Math.floor((s.mouseY - s.gridOffsetY) / CELL_SIZE);

    s.mouseOnGrid = gx >= 0 && gy >= 0 && gx < GRID_COLS && gy < GRID_ROWS;
    s.hoverGridX = Math.max(0, Math.min(gx, GRID_COLS - 1));
    s.hoverGridY = Math.max(0, Math.min(gy, GRID_ROWS - 1));
  }

  private handleMouseDown(e: MouseEvent): void {
    const s = this.state;

    // Left click
    if (e.button === 0) {
      // Check palette click
      if (this.handlePaletteClick(s.mouseX, s.mouseY)) return;

      // Check color picker click
      if (this.handleColorPickerClick(s.mouseX, s.mouseY)) return;

      // Check clear button click
      if (this.handleClearButtonClick(s.mouseX, s.mouseY)) return;

      // Place brick on grid
      if (s.mouseOnGrid) {
        const template = BRICK_TEMPLATES[s.selectedTemplateIndex];
        const bw = s.rotated ? template.h : template.w;
        const bh = s.rotated ? template.w : template.h;
        const color = BRICK_COLORS[s.selectedColorIndex];

        this.buildSystem.placeBrick(s, s.hoverGridX, s.hoverGridY, bw, bh, color);
      }
    }

    // Right click — remove brick
    if (e.button === 2) {
      if (s.mouseOnGrid) {
        this.buildSystem.removeBrickAt(s, s.hoverGridX, s.hoverGridY);
      }
    }
  }

  private handleContextMenu(e: MouseEvent): void {
    e.preventDefault();
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const s = this.state;
    const template = BRICK_TEMPLATES[s.selectedTemplateIndex];

    // Only rotate if the brick is non-square
    if (template.w !== template.h) {
      s.rotated = !s.rotated;
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const s = this.state;

    // Number keys to select templates
    const num = parseInt(e.key, 10);
    if (num >= 1 && num <= BRICK_TEMPLATES.length) {
      s.selectedTemplateIndex = num - 1;
      s.rotated = false;
      return;
    }

    // C to cycle color
    if (e.key === 'c' || e.key === 'C') {
      s.selectedColorIndex = (s.selectedColorIndex + 1) % BRICK_COLORS.length;
      return;
    }

    // Delete / Backspace to clear all
    if (e.key === 'Delete' || e.key === 'Backspace') {
      s.bricks = [];
      return;
    }
  }

  private handlePaletteClick(mx: number, my: number): boolean {
    const s = this.state;
    const paletteX = s.gridOffsetX + GRID_COLS * CELL_SIZE + 16;
    const paletteY = s.gridOffsetY + 8;

    for (let i = 0; i < BRICK_TEMPLATES.length; i++) {
      const itemY = paletteY + i * 44;

      if (mx >= paletteX && mx <= paletteX + 160 && my >= itemY && my <= itemY + 38) {
        s.selectedTemplateIndex = i;
        s.rotated = false;
        return true;
      }
    }
    return false;
  }

  private handleColorPickerClick(mx: number, my: number): boolean {
    const s = this.state;
    const paletteX = s.gridOffsetX + GRID_COLS * CELL_SIZE + 16;
    const colorY = s.gridOffsetY + BRICK_TEMPLATES.length * 44 + 48;
    const swatchSize = 28;
    const gap = 6;
    const perRow = 4;

    for (let i = 0; i < BRICK_COLORS.length; i++) {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const cx = paletteX + col * (swatchSize + gap);
      const cy = colorY + row * (swatchSize + gap);

      if (mx >= cx && mx <= cx + swatchSize && my >= cy && my <= cy + swatchSize) {
        s.selectedColorIndex = i;
        return true;
      }
    }
    return false;
  }

  private handleClearButtonClick(mx: number, my: number): boolean {
    const s = this.state;
    const paletteX = s.gridOffsetX + GRID_COLS * CELL_SIZE + 16;
    const clearY = s.gridOffsetY + BRICK_TEMPLATES.length * 44 + 48 + 80;
    const btnW = 160;
    const btnH = 32;

    if (mx >= paletteX && mx <= paletteX + btnW && my >= clearY && my <= clearY + btnH) {
      s.bricks = [];
      return true;
    }
    return false;
  }
}
```

**What's happening:**
- `handleMouseDown` checks UI elements first (palette, color picker, clear button) before checking the grid. Each UI hit test returns `true` to short-circuit so a palette click does not also place a brick.
- `handlePaletteClick` loops through the 5 template items, checking if the mouse falls within each item's 160x38px bounding box. When matched, it sets `selectedTemplateIndex` and resets `rotated`.
- `handleColorPickerClick` checks the 4x2 grid of 28px swatches with 6px gaps between them.
- `handleWheel` toggles `rotated` for non-square bricks. Square bricks (like 2x2) skip rotation since swapping equal dimensions does nothing.
- `handleKeyDown` maps keys 1-5 to template selection, C to color cycling, and Delete/Backspace to clearing all bricks.

---

### 3. Wire HUDRenderer into the Engine

**File:** `src/games/brick-builder/BrickBuilderEngine.ts`

Add the `HUDRenderer` to the engine and call it after `GameRenderer`.

```typescript
import type { BrickBuilderState } from './types';
import {
  CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
  HUD_HEIGHT,
  createInitialState,
} from './types';
import { BuildSystem } from './systems/BuildSystem';
import { InputSystem } from './systems/InputSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class BrickBuilderEngine {
  private ctx: CanvasRenderingContext2D;
  private state: BrickBuilderState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;

  private buildSystem: BuildSystem;
  private inputSystem: InputSystem;
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = createInitialState();
    this.state.canvasWidth = canvas.width;
    this.state.canvasHeight = canvas.height;
    this.computeGridOffset();

    // Systems
    this.buildSystem = new BuildSystem();
    this.inputSystem = new InputSystem(this.state, canvas, this.buildSystem);

    // Renderers
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasWidth = canvas.width;
      this.state.canvasHeight = canvas.height;
      this.computeGridOffset();
    };

    this.inputSystem.attach();
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
    this.inputSystem.detach();
    window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    // Update
    this.buildSystem.update(this.state, dt);

    // Render
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private computeGridOffset(): void {
    const gridW = GRID_COLS * CELL_SIZE;
    const gridH = GRID_ROWS * CELL_SIZE;
    const availW = this.state.canvasWidth - 200;
    const availH = this.state.canvasHeight - HUD_HEIGHT;

    this.state.gridOffsetX = Math.max(16, (availW - gridW) / 2);
    this.state.gridOffsetY = HUD_HEIGHT + Math.max(16, (availH - gridH) / 2);
  }
}
```

**What's happening:**
- `HUDRenderer` is created alongside `GameRenderer` and called after it in the render loop. This ensures UI elements draw on top of the grid and bricks.
- The render order matters: grid first, then placed bricks, then hover preview, then HUD/palette. Later layers draw on top of earlier ones.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Brick Builder game in your browser
3. **Observe:**
   - **Top bar** shows "Brick Builder" in orange with control hints on the right
   - **Brick palette** on the right shows 5 templates with mini previews and `[1]-[5]` hints
   - **Color swatches** below the palette with 8 colors; the active color has a white ring
   - **Press 1-5** to switch brick sizes — the palette highlight and hover preview update immediately
   - **Press C** to cycle through colors — the palette previews and hover preview change color
   - **Scroll wheel** over the grid to rotate non-square bricks (watch the preview change orientation)
   - **Click a palette item** or **click a color swatch** to select via mouse
   - **Press Delete** or click "Clear All" to remove all bricks
   - **Brick counter** at the bottom of the palette updates as you place bricks

---

## Challenges

**Easy:**
- Add a 6th brick template (e.g., `5x1` or `3x2`) to the `BRICK_TEMPLATES` array and see it appear in the palette.
- Change the palette highlight color from orange (`#ff7043`) to your favorite color.

**Medium:**
- Show the currently selected brick's dimensions in the top bar (e.g., "Selected: 3x1 Red").

**Hard:**
- Add keyboard shortcut numbers for colors too (e.g., Shift+1 through Shift+8 for direct color selection).

---

## What You Learned

- Building a side-panel UI with clickable items and visual selection indicators
- Hit-testing UI elements using bounding rectangle checks
- Mapping keyboard shortcuts to game actions with `parseInt` and key string comparison
- Using scroll wheel events with `preventDefault` for in-game rotation controls

**Next:** Final polish — help overlay, save/load, and production-ready entry point!
