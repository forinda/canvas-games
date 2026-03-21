# Step 4: Gravity & Brick Removal

**Goal:** Add a gravity system so bricks fall to the lowest available position, and add right-click to remove bricks (causing above bricks to collapse).

**Time:** ~10 minutes

---

## What You'll Build

- **BuildSystem** that applies gravity every frame, settling floating bricks downward
- **Gravity-aware placement** that drops bricks to the lowest valid row in their column
- **Right-click removal** that deletes a brick and triggers gravity on remaining bricks
- **Context menu suppression** so the browser's right-click menu does not interfere

---

## Concepts

- **Gravity Loop**: Each frame, we sort bricks bottom-to-top and try moving each one down by one row. If nothing moved, gravity is done. If something moved, we loop again. A maximum iteration cap prevents infinite loops.
- **Bottom-Up Settling**: Sorting bricks by Y descending ensures that bottom bricks settle first. This prevents a lower brick from blocking an upper brick that should fall past it.
- **AABB Collision for Overlap**: Two axis-aligned rectangles overlap when `x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2`. This simple test is used for both placement validation and gravity collision.

---

## Code

### 1. Create the Build System

**File:** `src/contexts/canvas2d/games/brick-builder/systems/BuildSystem.ts`

Handles brick placement with gravity, removal, and per-frame gravity settling.

```typescript
import type { BrickBuilderState, Brick } from '../types';
import { GRID_COLS, GRID_ROWS } from '../types';

export class BuildSystem {
  /** Place a brick with gravity (falls to the lowest valid position) */
  placeBrick(
    state: BrickBuilderState,
    gridX: number,
    gridY: number,
    bw: number,
    bh: number,
    color: string,
  ): void {
    // Clamp so brick stays within grid
    const clampedX = Math.min(gridX, GRID_COLS - bw);
    const clampedY = Math.min(gridY, GRID_ROWS - bh);

    if (clampedX < 0 || clampedY < 0) return;

    // Walk upward from the bottom to find the lowest open spot
    let finalY = GRID_ROWS - bh;

    for (let testY = GRID_ROWS - bh; testY >= 0; testY--) {
      if (!this.overlapsAny(state.bricks, clampedX, testY, bw, bh)) {
        finalY = testY;
      } else {
        break;
      }
    }

    // If finalY still overlaps, walk upward
    while (
      finalY > 0 &&
      this.overlapsAny(state.bricks, clampedX, finalY, bw, bh)
    ) {
      finalY--;
    }

    // Final overlap check
    if (this.overlapsAny(state.bricks, clampedX, finalY, bw, bh)) {
      return;
    }

    const brick: Brick = {
      x: clampedX,
      y: finalY,
      w: bw,
      h: bh,
      color: color,
      id: state.nextBrickId,
    };

    state.nextBrickId++;
    state.totalPlaced++;
    state.bricks.push(brick);
  }

  /** Remove a brick at the given grid position */
  removeBrickAt(state: BrickBuilderState, gridX: number, gridY: number): void {
    const index = state.bricks.findIndex(
      (b) =>
        gridX >= b.x && gridX < b.x + b.w && gridY >= b.y && gridY < b.y + b.h,
    );

    if (index !== -1) {
      state.bricks.splice(index, 1);
      // Apply gravity to remaining bricks above the removed one
      this.applyGravity(state);
    }
  }

  /** Frame update: apply gravity to floating bricks */
  update(state: BrickBuilderState, _dt: number): void {
    this.applyGravity(state);
  }

  /** Apply gravity: settle all floating bricks downward */
  private applyGravity(state: BrickBuilderState): void {
    // Sort bricks by Y descending so bottom bricks settle first
    const sorted = state.bricks.slice().sort((a, b) => b.y - a.y);

    let changed = true;
    let iterations = 0;
    const maxIterations = GRID_ROWS;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      for (const brick of sorted) {
        const newY = brick.y + 1;

        // Check if brick can move down
        if (newY + brick.h > GRID_ROWS) continue;

        // Check overlap with other bricks
        const others = state.bricks.filter((b) => b.id !== brick.id);

        if (!this.overlapsAnyBricks(others, brick.x, newY, brick.w, brick.h)) {
          brick.y = newY;
          changed = true;
        }
      }
    }
  }

  /** Check if a rectangle overlaps any existing brick */
  private overlapsAny(
    bricks: readonly Brick[],
    x: number,
    y: number,
    w: number,
    h: number,
  ): boolean {
    return this.overlapsAnyBricks(bricks, x, y, w, h);
  }

  /** Check rectangle overlap against a list of bricks */
  private overlapsAnyBricks(
    bricks: readonly Brick[],
    x: number,
    y: number,
    w: number,
    h: number,
  ): boolean {
    for (const b of bricks) {
      if (x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y) {
        return true;
      }
    }
    return false;
  }
}
```

**What's happening:**
- `placeBrick` does not place the brick where you clicked. Instead, it finds the **lowest valid Y** in the clicked column by scanning upward from the grid bottom. The first non-overlapping row becomes `finalY`. This is "gravity on placement."
- `removeBrickAt` finds the first brick whose bounding box contains the clicked cell, removes it with `splice`, then immediately calls `applyGravity` so bricks above the gap fall down.
- `applyGravity` sorts all bricks bottom-to-top, then repeatedly tries to move each brick down by 1 row. It loops until no brick moved (stable) or hits `maxIterations` (safety cap). Filtering by `b.id !== brick.id` ensures a brick does not collide with itself.
- The AABB overlap check is the standard formula: two rectangles overlap when all four edge conditions are true simultaneously.

---

### 2. Update InputSystem — Add Right-Click and Wire BuildSystem

**File:** `src/contexts/canvas2d/games/brick-builder/systems/InputSystem.ts`

Update the input system to use `BuildSystem` for placement, add right-click removal, and suppress the context menu.

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
  }

  attach(): void {
    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    this.canvas.addEventListener('contextmenu', this.boundContextMenu);
  }

  detach(): void {
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    this.canvas.removeEventListener('contextmenu', this.boundContextMenu);
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

    // Left click — place brick via BuildSystem
    if (e.button === 0 && s.mouseOnGrid) {
      const template = BRICK_TEMPLATES[s.selectedTemplateIndex];
      const bw = s.rotated ? template.h : template.w;
      const bh = s.rotated ? template.w : template.h;
      const color = BRICK_COLORS[s.selectedColorIndex];

      this.buildSystem.placeBrick(s, s.hoverGridX, s.hoverGridY, bw, bh, color);
    }

    // Right click — remove brick
    if (e.button === 2 && s.mouseOnGrid) {
      this.buildSystem.removeBrickAt(s, s.hoverGridX, s.hoverGridY);
    }
  }

  private handleContextMenu(e: MouseEvent): void {
    e.preventDefault();
  }
}
```

**What's happening:**
- Left-click now delegates to `buildSystem.placeBrick` instead of pushing directly into the array. This gives us gravity-on-placement for free.
- Right-click (`e.button === 2`) calls `buildSystem.removeBrickAt`, which removes the clicked brick and triggers gravity.
- `handleContextMenu` calls `preventDefault()` to suppress the browser's default right-click menu, which would otherwise cover the game.

---

### 3. Update the Engine — Add BuildSystem and Game Loop Update

**File:** `src/contexts/canvas2d/games/brick-builder/BrickBuilderEngine.ts`

Wire the `BuildSystem` into the engine, adding a `dt`-based update call and passing it to `InputSystem`.

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

export class BrickBuilderEngine {
  private ctx: CanvasRenderingContext2D;
  private state: BrickBuilderState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;

  private buildSystem: BuildSystem;
  private inputSystem: InputSystem;
  private gameRenderer: GameRenderer;
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

    // Renderer
    this.gameRenderer = new GameRenderer();

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
- The game loop now tracks `lastTime` and computes `dt` (delta time in milliseconds) each frame, passing it to `buildSystem.update()`.
- `BuildSystem` runs `applyGravity` every frame, so if a brick is somehow floating (e.g., after removal), it immediately falls.
- The `InputSystem` receives a reference to `BuildSystem` so clicks delegate to the gravity-aware placement and removal methods.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Brick Builder game in your browser
3. **Observe:**
   - **Click anywhere on the grid** — the brick falls to the **bottom row** regardless of where you clicked
   - **Click above an existing brick** — the new brick stacks **on top of it**
   - Place a row of bricks, then **right-click** one in the middle — it disappears and bricks above it **fall down**
   - Try placing bricks in a column — they stack from the ground up, like real building blocks
   - Bricks never float in mid-air

---

## Challenges

**Easy:**
- Add a `console.log` in `applyGravity` to count how many iterations it takes to settle all bricks after a removal.

**Medium:**
- Animate the gravity: instead of instantly settling, move bricks down by 1 cell per frame so you can see them fall.

**Hard:**
- Add a "freeze" mode toggle that disables gravity, allowing bricks to float freely. This enables building overhangs and bridges.

---

## What You Learned

- Implementing gravity by iteratively moving bricks downward until stable
- Sorting bricks bottom-to-top so lower bricks settle before upper ones
- Using AABB rectangle overlap for both placement validation and collision detection
- Suppressing the browser context menu for right-click game actions

**Next:** Adding a color picker, brick template palette, and keyboard shortcuts!
