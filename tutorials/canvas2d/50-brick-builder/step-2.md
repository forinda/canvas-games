# Step 2: Brick Rendering & 3D Studs

**Goal:** Draw LEGO-style bricks with 3D studs, highlights, and shadows so placed bricks look like real building blocks.

**Time:** ~10 minutes

---

## What You'll Build

- **Brick body rendering** with colored fill and a thin outline
- **3D highlight and shadow edges** that give bricks visual depth
- **Circular studs** on top of each grid cell within a brick, with highlight and shadow details
- **Test bricks** hardcoded onto the grid to verify the rendering pipeline

---

## Concepts

- **Faux 3D with Edge Highlights**: By drawing a bright strip along the top and left edges and a dark strip along the bottom and right, a flat rectangle looks raised. This is the same trick used in classic UI button rendering.
- **Stud Circles**: Real LEGO bricks have cylindrical studs on top. We simulate this with three overlapping circles per cell: a shadow circle offset down by 1px, the colored body, and a small highlight arc in the upper-left quadrant.
- **Inset Drawing**: Each brick is drawn 1px inset from its grid boundary (`px + 1, py + 1, pw - 2, ph - 2`). This creates a thin gap between adjacent bricks so they look like separate pieces rather than a merged blob.

---

## Code

### 1. Update GameRenderer — Add Brick Drawing

**File:** `src/contexts/canvas2d/games/brick-builder/renderers/GameRenderer.ts`

Add the `renderPlacedBricks` method and the `drawBrick` helper to the existing `GameRenderer`.

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
    this.renderPlacedBricks(ctx, state);
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

    // Ground line
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
    // Main brick body
    ctx.fillStyle = color;
    ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);

    // Top highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(px + 1, py + 1, pw - 2, 3);

    // Left highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(px + 1, py + 1, 3, ph - 2);

    // Bottom shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(px + 1, py + ph - 4, pw - 2, 3);

    // Right shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(px + pw - 4, py + 1, 3, ph - 2);

    // Outline
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);

    // 3D studs on top of each cell
    for (let cy = 0; cy < cellsH; cy++) {
      for (let cx = 0; cx < cellsW; cx++) {
        const studX = px + cx * CELL_SIZE + CELL_SIZE / 2;
        const studY = py + cy * CELL_SIZE + CELL_SIZE / 2;
        const studR = CELL_SIZE * 0.25;

        // Stud base (darker shadow)
        ctx.beginPath();
        ctx.arc(studX, studY + 1, studR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();

        // Stud body
        ctx.beginPath();
        ctx.arc(studX, studY, studR, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Stud highlight
        ctx.beginPath();
        ctx.arc(
          studX - studR * 0.25,
          studY - studR * 0.25,
          studR * 0.5,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fill();

        // Stud outline
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
- `renderPlacedBricks` iterates over `state.bricks`, converts each brick's grid coordinates to pixel coordinates using `gridOffsetX/Y` and `CELL_SIZE`, then calls `drawBrick`.
- The brick body is drawn 1px inset on all sides (`px + 1, py + 1, pw - 2, ph - 2`). This creates visible gaps between adjacent bricks.
- Four edge overlays create the 3D effect: a white strip on top (20% opacity) and left (10%), a dark strip on bottom (25%) and right (15%). The asymmetry mimics top-left light source.
- Each cell within the brick gets a stud. The stud has three layers: a shadow circle shifted down 1px, the colored body at true center, and a small white highlight circle offset to the upper-left. This gives each stud a raised, glossy look.
- The stud radius is `CELL_SIZE * 0.25` (8px with 32px cells), which leaves comfortable padding around each stud.

---

### 2. Add Test Bricks to the Engine

**File:** `src/contexts/canvas2d/games/brick-builder/BrickBuilderEngine.ts`

Add a few hardcoded bricks to `state.bricks` so we can see the rendering in action. We will remove these once input is working in Step 3.

```typescript
import type { BrickBuilderState } from './types';
import {
  CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
  HUD_HEIGHT,
  BRICK_COLORS,
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

    this.gameRenderer = new GameRenderer();

    // Add some test bricks to verify rendering
    this.addTestBricks();

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
    const availW = this.state.canvasWidth - 200;
    const availH = this.state.canvasHeight - HUD_HEIGHT;

    this.state.gridOffsetX = Math.max(16, (availW - gridW) / 2);
    this.state.gridOffsetY = HUD_HEIGHT + Math.max(16, (availH - gridH) / 2);
  }

  /** Temporary test bricks to verify rendering */
  private addTestBricks(): void {
    const s = this.state;

    // A red 4x1 at the bottom
    s.bricks.push({ x: 2, y: 17, w: 4, h: 1, color: BRICK_COLORS[0], id: s.nextBrickId++ });
    // A blue 2x2 stacked on top
    s.bricks.push({ x: 3, y: 15, w: 2, h: 2, color: BRICK_COLORS[4], id: s.nextBrickId++ });
    // A green 3x1 next to it
    s.bricks.push({ x: 8, y: 17, w: 3, h: 1, color: BRICK_COLORS[3], id: s.nextBrickId++ });
    // A yellow 1x1 on top
    s.bricks.push({ x: 9, y: 16, w: 1, h: 1, color: BRICK_COLORS[2], id: s.nextBrickId++ });
  }
}
```

**What's happening:**
- `addTestBricks` pushes four bricks directly into `state.bricks`. Each has a grid position, size, color (from `BRICK_COLORS`), and a unique `id`.
- The bricks are placed near the bottom of the grid so they sit on the "ground". This verifies that coordinates, colors, and studs all render correctly.
- We increment `nextBrickId` for each brick to keep IDs unique, which matters when we add removal in Step 4.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Brick Builder game in your browser
3. **Observe:**
   - **Four colored bricks** on the grid: a red 4x1 bar, a blue 2x2 square, a green 3x1 bar, and a yellow 1x1 dot
   - Each brick has **circular studs** with highlights and shadows
   - Bricks have **bright top/left edges** and **dark bottom/right edges**
   - A **thin gap** between adjacent bricks shows they are separate pieces
   - Studs have a **glossy highlight** in their upper-left

---

## Challenges

**Easy:**
- Add a 5th test brick with a different color and size to see how it renders.
- Change the stud radius from `CELL_SIZE * 0.25` to `0.3` for bigger studs.

**Medium:**
- Add a second highlight arc on the opposite side of each stud to create a double-reflection effect.

**Hard:**
- Replace the flat brick body with a linear gradient (lighter at top, darker at bottom) for even more realistic depth.

---

## What You Learned

- Drawing 3D-looking bricks using edge highlights and shadows on flat rectangles
- Rendering circular studs with layered shadow, body, and highlight arcs
- Using inset drawing (1px border gap) to visually separate adjacent bricks
- Placing test data directly into state to verify rendering before building input

**Next:** Making bricks interactive — click the grid to place bricks that snap to cells!
