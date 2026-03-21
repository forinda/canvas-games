# Step 6: Polish, Help Overlay & Final Integration

**Goal:** Add a help overlay, save/load builds with JSON, finalize the entry point, and polish the complete Brick Builder game.

**Time:** ~10 minutes

---

## What You'll Build

- **Help overlay** toggled with H key, showing controls and tips
- **Save and load** constructions using JSON serialization to `localStorage`
- **ESC key** handling for closing the help overlay or exiting the game
- **Final entry point** and platform adapter wiring everything together
- **Production-ready** game with all systems, renderers, and input fully integrated

---

## Concepts

- **Help Overlay Pattern**: A full-screen semi-transparent overlay that renders on top of everything. Pressing H toggles `state.helpVisible`, and clicking anywhere on the overlay dismisses it. This pattern is reusable across all games.
- **JSON Serialization**: `Brick` objects are plain data (no methods, no circular references), so `JSON.stringify(state.bricks)` serializes the entire construction. `JSON.parse` restores it. `localStorage` persists data across browser sessions.
- **Layered Input Priority**: When the help overlay is visible, clicks dismiss it instead of placing bricks. The input handler checks `helpVisible` first, creating a priority chain: help overlay > palette clicks > grid clicks.

---

## Code

### 1. Add Help Overlay and Save/Load to HUDRenderer

**File:** `src/contexts/canvas2d/games/brick-builder/renderers/HUDRenderer.ts`

Add the help overlay rendering and save/load status display.

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
    this.renderHelp(ctx, state);
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
      '[H] Help  [ESC] Exit  [Scroll] Rotate  [Right-click] Remove',
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

  private renderHelp(
    ctx: CanvasRenderingContext2D,
    state: BrickBuilderState,
  ): void {
    if (!state.helpVisible) return;

    const W = state.canvasWidth;
    const H = state.canvasHeight;

    // Dim background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, W, H);

    // Help panel
    const panelW = 420;
    const panelH = 380;
    const px = (W - panelW) / 2;
    const py = (H - panelH) / 2;

    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 12);
    ctx.fill();

    ctx.strokeStyle = '#ff7043';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 12);
    ctx.stroke();

    // Title
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#ff7043';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Brick Builder — Help', W / 2, py + 20);

    // Goal
    ctx.font = '13px monospace';
    ctx.fillStyle = '#ccc';
    ctx.textAlign = 'left';
    ctx.fillText(
      'Build anything you want! Stack bricks on a grid',
      px + 24,
      py + 56,
    );
    ctx.fillText('in this creative sandbox.', px + 24, py + 74);

    // Controls
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#ff7043';
    ctx.fillText('Controls:', px + 24, py + 104);

    const controls = [
      ['Left Click', 'Place selected brick on grid'],
      ['Right Click', 'Remove a brick'],
      ['Scroll Wheel', 'Rotate brick (swap width/height)'],
      ['1-5', 'Select brick size'],
      ['C', 'Cycle through colors'],
      ['Delete', 'Clear all bricks'],
      ['S', 'Save build to browser storage'],
      ['L', 'Load saved build'],
      ['H', 'Toggle this help overlay'],
      ['ESC', 'Close help / Exit game'],
    ];

    ctx.font = '11px monospace';
    for (let i = 0; i < controls.length; i++) {
      const y = py + 126 + i * 20;

      ctx.fillStyle = '#888';
      ctx.textAlign = 'right';
      ctx.fillText(controls[i][0], px + 140, y);

      ctx.fillStyle = '#ccc';
      ctx.textAlign = 'left';
      ctx.fillText(controls[i][1], px + 152, y);
    }

    // Dismiss hint
    ctx.font = '11px monospace';
    ctx.fillStyle = '#555';
    ctx.textAlign = 'center';
    ctx.fillText('Click anywhere or press H / ESC to close', W / 2, py + panelH - 20);
  }
}
```

**What's happening:**
- `renderHelp` only draws when `state.helpVisible` is true. It covers the screen with a 75% opaque black overlay, then draws a centered panel with the game title, goal description, and a formatted controls list.
- Controls are laid out in two columns: key labels right-aligned in gray, descriptions left-aligned in light gray. The 12px gap between columns keeps them visually connected.
- A dismiss hint at the bottom tells the player how to close the overlay.

---

### 2. Add Save/Load and Help Toggle to InputSystem

**File:** `src/contexts/canvas2d/games/brick-builder/systems/InputSystem.ts`

Add S/L keys for save/load and H/ESC for help overlay handling.

```typescript
import type { BrickBuilderState } from '../types';
import { CELL_SIZE, GRID_COLS, GRID_ROWS, BRICK_COLORS } from '../types';
import { BRICK_TEMPLATES } from '../data/bricks';
import type { BuildSystem } from './BuildSystem';

const SAVE_KEY = 'brick-builder-save';

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

    // If help is visible, dismiss it on any click
    if (s.helpVisible) {
      s.helpVisible = false;
      return;
    }

    // Left click
    if (e.button === 0) {
      if (this.handlePaletteClick(s.mouseX, s.mouseY)) return;
      if (this.handleColorPickerClick(s.mouseX, s.mouseY)) return;
      if (this.handleClearButtonClick(s.mouseX, s.mouseY)) return;

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

    if (template.w !== template.h) {
      s.rotated = !s.rotated;
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const s = this.state;

    // ESC — close help or exit
    if (e.key === 'Escape') {
      if (s.helpVisible) {
        s.helpVisible = false;
      }
      return;
    }

    // H — toggle help
    if (e.key === 'h' || e.key === 'H') {
      s.helpVisible = !s.helpVisible;
      return;
    }

    // S — save build
    if (e.key === 's' || e.key === 'S') {
      this.saveBuild();
      return;
    }

    // L — load build
    if (e.key === 'l' || e.key === 'L') {
      this.loadBuild();
      return;
    }

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

  /** Save the current build to localStorage */
  private saveBuild(): void {
    const s = this.state;

    const saveData = {
      bricks: s.bricks,
      nextBrickId: s.nextBrickId,
      totalPlaced: s.totalPlaced,
    };

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
      console.log(`Saved ${s.bricks.length} bricks to browser storage.`);
    } catch (err) {
      console.warn('Failed to save build:', err);
    }
  }

  /** Load a saved build from localStorage */
  private loadBuild(): void {
    const s = this.state;

    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        console.log('No saved build found.');
        return;
      }

      const saveData = JSON.parse(raw);
      if (Array.isArray(saveData.bricks)) {
        s.bricks = saveData.bricks;
        s.nextBrickId = saveData.nextBrickId || s.bricks.length + 1;
        s.totalPlaced = saveData.totalPlaced || s.bricks.length;
        console.log(`Loaded ${s.bricks.length} bricks from browser storage.`);
      }
    } catch (err) {
      console.warn('Failed to load build:', err);
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
- `saveBuild` serializes `state.bricks`, `nextBrickId`, and `totalPlaced` to JSON and stores it in `localStorage` under the key `'brick-builder-save'`. A try/catch handles cases where storage is full or disabled.
- `loadBuild` reads the saved JSON, parses it, and replaces the current bricks array. It falls back gracefully if no save exists or the data is corrupt.
- The help overlay check in `handleMouseDown` comes first. When `helpVisible` is true, any click dismisses the overlay and returns immediately, blocking all other interactions.
- ESC closes the help overlay if it is open. If the overlay is already closed, ESC does nothing here (in the full game, it would call an `onExit` callback).

---

### 3. Final Engine — Complete Integration

**File:** `src/contexts/canvas2d/games/brick-builder/BrickBuilderEngine.ts`

The final engine with all systems and renderers wired together.

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

    // Resize handler
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

---

### 4. Final Platform Adapter

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

### 5. Final Entry Point

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
3. **Full Feature Checklist:**
   - **Grid**: Dark 20x18 grid with subtle lines and a ground line
   - **Brick placement**: Left-click places bricks that fall to the lowest position
   - **Brick removal**: Right-click removes a brick; above bricks collapse
   - **Hover preview**: Semi-transparent ghost brick with dashed outline follows the cursor
   - **Palette**: Click or press 1-5 to select brick templates
   - **Colors**: Click swatches or press C to cycle through 8 colors
   - **Rotation**: Scroll wheel rotates non-square bricks
   - **Clear**: Delete key or "Clear All" button removes all bricks
   - **Help**: Press H to toggle the help overlay; click or ESC to dismiss
   - **Save/Load**: Press S to save, L to load (check the browser console for confirmation)
   - **Resize**: Window resize re-centers the grid and palette
   - **Counters**: Brick count and total placed update in real time

---

## Challenges

**Easy:**
- Change the help overlay border color from orange to a color that matches your favorite brick color.
- Add a "tip of the day" line to the help overlay chosen randomly from a tips array.

**Medium:**
- Add an export feature: press E to copy the JSON save data to the clipboard using `navigator.clipboard.writeText`, so players can share builds.

**Hard:**
- Add an undo system: store each placement and removal as an action, and press Ctrl+Z to reverse the last action (restoring removed bricks to their exact positions).

---

## What You Learned

- Building a full-screen help overlay that blocks input when visible
- Serializing and deserializing game state with JSON and localStorage
- Implementing layered input priority (overlay > UI > game)
- Wiring systems and renderers into a complete game engine
- Structuring a game with clean separation: types, data, systems, renderers, engine, adapter, entry point

**Congratulations!** You have built a complete Brick Builder game from scratch. The architecture you used — state object, systems, renderers, and an engine loop — scales to much larger games. Go back to the [tutorials overview](../README.md) and try remixing your favorites!
