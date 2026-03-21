# Step 3: Brick Placement & Snapping

**Goal:** Click on the grid to place bricks that snap to cell boundaries, with a semi-transparent hover preview showing where the brick will land.

**Time:** ~10 minutes

---

## What You'll Build

- **Mouse tracking** that converts pixel coordinates to grid cell positions
- **Hover preview** showing a ghost brick under the cursor, clamped within grid bounds
- **Left-click placement** that adds a new brick to `state.bricks`
- **Snap-to-grid** behavior so bricks always align perfectly to cell boundaries

---

## Concepts

- **Pixel-to-Grid Conversion**: To find which cell the mouse is over, subtract the grid offset and divide by `CELL_SIZE`. `Math.floor` rounds down to the nearest cell. This is the core of all grid-based game input.
- **Hover Preview**: Drawing the selected brick at 50% opacity under the cursor gives instant visual feedback. The preview is clamped so it never extends beyond the grid edges.
- **Dashed Outline**: A `setLineDash([4, 4])` outline around the preview distinguishes the ghost brick from placed bricks. Restoring `setLineDash([])` afterward prevents dashes from leaking into other draw calls.

---

## Code

### 1. Create the Input System

**File:** `src/contexts/canvas2d/games/brick-builder/systems/InputSystem.ts`

Handles mouse movement and clicks. Converts pixel positions to grid cells and delegates brick placement.

```typescript
import type { BrickBuilderState } from '../types';
import { CELL_SIZE, GRID_COLS, GRID_ROWS, BRICK_COLORS } from '../types';
import { BRICK_TEMPLATES } from '../data/bricks';

export class InputSystem {
  private state: BrickBuilderState;
  private canvas: HTMLCanvasElement;

  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;

  constructor(state: BrickBuilderState, canvas: HTMLCanvasElement) {
    this.state = state;
    this.canvas = canvas;

    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseDown = this.handleMouseDown.bind(this);
  }

  attach(): void {
    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    this.canvas.addEventListener('mousedown', this.boundMouseDown);
  }

  detach(): void {
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const s = this.state;

    s.mouseX = e.clientX - rect.left;
    s.mouseY = e.clientY - rect.top;

    // Convert pixel position to grid cell
    const gx = Math.floor((s.mouseX - s.gridOffsetX) / CELL_SIZE);
    const gy = Math.floor((s.mouseY - s.gridOffsetY) / CELL_SIZE);

    s.mouseOnGrid = gx >= 0 && gy >= 0 && gx < GRID_COLS && gy < GRID_ROWS;
    s.hoverGridX = Math.max(0, Math.min(gx, GRID_COLS - 1));
    s.hoverGridY = Math.max(0, Math.min(gy, GRID_ROWS - 1));
  }

  private handleMouseDown(e: MouseEvent): void {
    const s = this.state;

    // Left click — place brick
    if (e.button === 0 && s.mouseOnGrid) {
      const template = BRICK_TEMPLATES[s.selectedTemplateIndex];
      const bw = s.rotated ? template.h : template.w;
      const bh = s.rotated ? template.w : template.h;
      const color = BRICK_COLORS[s.selectedColorIndex];

      // Clamp so brick stays within grid
      const clampedX = Math.min(s.hoverGridX, GRID_COLS - bw);
      const clampedY = Math.min(s.hoverGridY, GRID_ROWS - bh);

      if (clampedX < 0 || clampedY < 0) return;

      // Check for overlap with existing bricks
      const overlaps = s.bricks.some(
        (b) =>
          clampedX < b.x + b.w &&
          clampedX + bw > b.x &&
          clampedY < b.y + b.h &&
          clampedY + bh > b.y,
      );

      if (overlaps) return;

      s.bricks.push({
        x: clampedX,
        y: clampedY,
        w: bw,
        h: bh,
        color: color,
        id: s.nextBrickId++,
      });
      s.totalPlaced++;
    }
  }
}
```

**What's happening:**
- `handleMouseMove` converts the mouse's pixel position to a grid cell. `(mouseX - gridOffsetX) / CELL_SIZE` gives the floating-point column, and `Math.floor` snaps it to the cell's left edge. The result is stored in `hoverGridX` and `hoverGridY`.
- `mouseOnGrid` is `true` only when the cursor is inside the grid bounds. This prevents placing bricks outside the grid or in the palette area.
- `handleMouseDown` reads the currently selected template and color, applies rotation (swapping `w` and `h` if `rotated` is true), clamps the position so the brick does not extend past the grid edges, checks for overlap with existing bricks using AABB collision, and pushes a new `Brick` into the state.
- Each new brick gets a unique `id` from `nextBrickId++`, which we will need for removal and gravity in Step 4.

---

### 2. Add Hover Preview to GameRenderer

**File:** `src/contexts/canvas2d/games/brick-builder/renderers/GameRenderer.ts`

Add the `renderHoverPreview` method and call it from `render`. The full updated file:

```typescript
import type { BrickBuilderState } from '../types';
import { CELL_SIZE, GRID_COLS, GRID_ROWS, BRICK_COLORS } from '../types';
import { BRICK_TEMPLATES } from '../data/bricks';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: BrickBuilderState): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    this.renderGrid(ctx, state);
    this.renderPlacedBricks(ctx, state);
    this.renderHoverPreview(ctx, state);
  }

  private renderGrid(
    ctx: CanvasRenderingContext2D,
    state: BrickBuilderState,
  ): void {
    const ox = state.gridOffsetX;
    const oy = state.gridOffsetY;
    const gridW = GRID_COLS * CELL_SIZE;
    const gridH = GRID_ROWS * CELL_SIZE;

    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(ox, oy, gridW, gridH);

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

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy, gridW, gridH);

    ctx.strokeStyle = '#4a4a5a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ox, oy + gridH);
    ctx.lineTo(ox + gridW, oy + gridH);
    ctx.stroke();
  }

  private renderPlacedBricks(
    ctx: CanvasRenderingContext2D,
    state: BrickBuilderState,
  ): void {
    const ox = state.gridOffsetX;
    const oy = state.gridOffsetY;

    for (const brick of state.bricks) {
      const px = ox + brick.x * CELL_SIZE;
      const py = oy + brick.y * CELL_SIZE;
      const pw = brick.w * CELL_SIZE;
      const ph = brick.h * CELL_SIZE;

      this.drawBrick(ctx, px, py, pw, ph, brick.color, brick.w, brick.h);
    }
  }

  private renderHoverPreview(
    ctx: CanvasRenderingContext2D,
    state: BrickBuilderState,
  ): void {
    if (!state.mouseOnGrid) return;

    const template = BRICK_TEMPLATES[state.selectedTemplateIndex];
    const bw = state.rotated ? template.h : template.w;
    const bh = state.rotated ? template.w : template.h;
    const color = BRICK_COLORS[state.selectedColorIndex];

    // Clamp preview to grid
    const gx = Math.min(state.hoverGridX, GRID_COLS - bw);
    const gy = Math.min(state.hoverGridY, GRID_ROWS - bh);

    if (gx < 0 || gy < 0) return;

    const ox = state.gridOffsetX;
    const oy = state.gridOffsetY;
    const px = ox + gx * CELL_SIZE;
    const py = oy + gy * CELL_SIZE;
    const pw = bw * CELL_SIZE;
    const ph = bh * CELL_SIZE;

    // Draw at half opacity
    ctx.globalAlpha = 0.5;
    this.drawBrick(ctx, px, py, pw, ph, color, bw, bh);
    ctx.globalAlpha = 1.0;

    // Dashed outline
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(px, py, pw, ph);
    ctx.setLineDash([]);
  }

  /** Draw a single brick with 3D studs */
  private drawBrick(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    pw: number,
    ph: number,
    color: string,
    cellsW: number,
    cellsH: number,
  ): void {
    ctx.fillStyle = color;
    ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(px + 1, py + 1, pw - 2, 3);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(px + 1, py + 1, 3, ph - 2);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(px + 1, py + ph - 4, pw - 2, 3);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(px + pw - 4, py + 1, 3, ph - 2);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);

    for (let cy = 0; cy < cellsH; cy++) {
      for (let cx = 0; cx < cellsW; cx++) {
        const studX = px + cx * CELL_SIZE + CELL_SIZE / 2;
        const studY = py + cy * CELL_SIZE + CELL_SIZE / 2;
        const studR = CELL_SIZE * 0.25;

        ctx.beginPath();
        ctx.arc(studX, studY + 1, studR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(studX, studY, studR, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(studX - studR * 0.25, studY - studR * 0.25, studR * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(studX, studY, studR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
}
```

**What's happening:**
- `renderHoverPreview` only draws when the mouse is on the grid. It reads the selected template and color, applies rotation, and clamps the preview position so the brick stays within bounds.
- `ctx.globalAlpha = 0.5` makes the preview semi-transparent. The same `drawBrick` method renders the ghost, so the preview looks exactly like a placed brick but faded.
- The dashed white outline (`setLineDash([4, 4])`) makes the preview boundary clearly visible. `setLineDash([])` resets to solid lines afterward.

---

### 3. Wire Input into the Engine

**File:** `src/contexts/canvas2d/games/brick-builder/BrickBuilderEngine.ts`

Update the engine to create and attach the `InputSystem`. Remove the test bricks from Step 2.

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
import { InputSystem } from './systems/InputSystem';

export class BrickBuilderEngine {
  private ctx: CanvasRenderingContext2D;
  private state: BrickBuilderState;
  private running: boolean;
  private rafId: number;
  private gameRenderer: GameRenderer;
  private inputSystem: InputSystem;
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

    this.gameRenderer = new GameRenderer();
    this.inputSystem = new InputSystem(this.state, canvas);

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
    this.gameRenderer.render(this.ctx, this.state);
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
- The `InputSystem` is created with a reference to `state` and the canvas, then `attach()` registers the mouse listeners.
- `destroy()` now calls `inputSystem.detach()` to clean up listeners.
- The test bricks from Step 2 are removed. Now the grid starts empty and bricks appear only when you click.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Brick Builder game in your browser
3. **Observe:**
   - **Move the mouse** over the grid and see a **semi-transparent preview** brick follow the cursor
   - The preview **snaps to grid cells** as you move
   - The preview **clamps to grid edges** so it never extends beyond the boundary
   - **Click** to place a brick. It appears at full opacity with studs
   - **Click multiple times** to place several bricks
   - Bricks **cannot overlap** — clicking on an occupied area does nothing

---

## Challenges

**Easy:**
- Change the hover preview opacity from 0.5 to 0.3 for a more ghostly look.
- Change the dashed outline from white to the brick's own color.

**Medium:**
- Add a visual indicator (red tint on the preview) when the cursor is over an invalid position where the brick would overlap an existing brick.

**Hard:**
- Add undo functionality: store each placement in an array and press Ctrl+Z to remove the last placed brick.

---

## What You Learned

- Converting mouse pixel coordinates to grid cell positions with `Math.floor((mouseX - offset) / cellSize)`
- Drawing a semi-transparent hover preview using `globalAlpha`
- Using AABB overlap detection to prevent bricks from overlapping
- Attaching and detaching event listeners cleanly with bound methods

**Next:** Adding gravity so bricks fall to the ground and stack on top of each other!
