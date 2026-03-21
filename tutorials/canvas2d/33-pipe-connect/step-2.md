# Step 2: Click to Rotate Tiles

**Goal:** Click a tile to rotate its pipe 90 degrees clockwise, adding interactive input handling with mouse coordinate-to-grid mapping.

**Time:** ~15 minutes

---

## What You'll Build

- **InputSystem class** that listens for mouse clicks and keyboard shortcuts
- **Coordinate mapping** from canvas pixel position to grid row/column
- **90-degree clockwise rotation** on each click using the `ROTATIONS` array
- **Move counter** that increments with each rotation
- **Keyboard controls** for restart and exit

---

## Concepts

- **Pixel-to-Grid Mapping**: To find which tile the user clicked, subtract the board offset from the mouse position and divide by cell size: `col = floor((mouseX - offsetX) / cellSize)`. This is the same pattern used in Minesweeper and Sudoku.
- **Rotation Cycling**: The `ROTATIONS` array is `[0, 90, 180, 270]`. To rotate clockwise, find the current index and advance by 1 (wrapping with modulo). This avoids ever storing invalid angles.
- **Attach/Detach Pattern**: The InputSystem registers event listeners in `attach()` and removes them in `detach()`. This prevents memory leaks when the game is destroyed and ensures clean lifecycle management.
- **Bounds Checking**: After converting pixel coordinates to grid indices, we must verify `row` and `col` are within bounds before accessing the grid array. Clicks outside the board are silently ignored.

---

## Code

### 1. Create the Input System

**File:** `src/contexts/canvas2d/games/pipe-connect/systems/InputSystem.ts`

Handles mouse clicks to rotate pipes and keyboard shortcuts.

```typescript
import type { PipeState } from "../types";
import { ROTATIONS } from "../types";

export class InputSystem {
  private state: PipeState;
  private canvas: HTMLCanvasElement;
  private onReset: () => void;

  private clickHandler: (e: MouseEvent) => void;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(
    state: PipeState,
    canvas: HTMLCanvasElement,
    onReset: () => void,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.onReset = onReset;

    this.clickHandler = this.handleClick.bind(this);
    this.keyHandler = this.handleKey.bind(this);
  }

  attach(): void {
    this.canvas.addEventListener("click", this.clickHandler);
    window.addEventListener("keydown", this.keyHandler);
  }

  detach(): void {
    this.canvas.removeEventListener("click", this.clickHandler);
    window.removeEventListener("keydown", this.keyHandler);
  }

  /** Update reference when state is replaced (e.g. on reset) */
  setState(state: PipeState): void {
    this.state = state;
  }

  private handleClick(e: MouseEvent): void {
    if (this.state.status === "won") return;

    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Convert pixel position to grid coordinates
    const col = Math.floor((mx - this.state.offsetX) / this.state.cellSize);
    const row = Math.floor((my - this.state.offsetY) / this.state.cellSize);

    // Bounds check
    if (row < 0 || row >= this.state.rows) return;
    if (col < 0 || col >= this.state.cols) return;

    // Rotate the pipe 90 degrees clockwise
    const pipe = this.state.grid[row][col];
    const currentIdx = ROTATIONS.indexOf(pipe.rotation);
    pipe.rotation = ROTATIONS[(currentIdx + 1) % ROTATIONS.length];

    // Count the move
    this.state.moves++;
  }

  private handleKey(e: KeyboardEvent): void {
    switch (e.key) {
      case "r":
      case "R":
        this.onReset();
        break;
    }
  }
}
```

**What's happening:**
- `handleClick()` converts the mouse event's client coordinates to canvas-relative coordinates using `getBoundingClientRect()`, then maps to grid row/col by subtracting the board offset and dividing by cell size.
- The bounds check ensures we only act on clicks inside the grid. Clicks on the HUD area or outside the board are ignored.
- Rotation works by finding the current angle's index in `ROTATIONS = [0, 90, 180, 270]` and advancing by one position. Modulo 4 wraps 270 back to 0.
- `setState()` lets the engine swap in a fresh state object (e.g. on reset) without rebuilding the InputSystem.
- The "R" key triggers a reset callback -- the engine will handle the actual reset logic.

---

### 2. Update the Engine

**File:** `src/contexts/canvas2d/games/pipe-connect/PipeEngine.ts`

Wire up the InputSystem so clicks actually rotate pipes.

```typescript
import type { PipeState, Pipe } from "./types";
import { BoardRenderer } from "./renderers/BoardRenderer";
import { InputSystem } from "./systems/InputSystem";

export class PipeEngine {
  private ctx: CanvasRenderingContext2D;
  private state: PipeState;
  private running = false;
  private rafId = 0;

  private boardRenderer: BoardRenderer;
  private inputSystem: InputSystem;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const size = 7;

    this.state = {
      grid: [],
      cols: size,
      rows: size,
      level: 1,
      moves: 0,
      timer: 0,
      status: "playing",
      offsetX: 0,
      offsetY: 0,
      cellSize: 0,
      sourceRow: 0,
      sourceCol: 0,
      drainRow: size - 1,
      drainCol: size - 1,
    };

    this.boardRenderer = new BoardRenderer();
    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      () => this.reset(),
    );

    this.initPlaceholderGrid();
    this.computeLayout();

    this.inputSystem.attach();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.computeLayout();
    };
    window.addEventListener("resize", this.resizeHandler);
  }

  start(): void {
    this.running = true;
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
    window.removeEventListener("resize", this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;
    this.boardRenderer.render(this.ctx, this.state);
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private reset(): void {
    this.initPlaceholderGrid();
    this.state.moves = 0;
    this.inputSystem.setState(this.state);
  }

  private computeLayout(): void {
    const W = this.ctx.canvas.width;
    const H = this.ctx.canvas.height;
    const hudHeight = 50;
    const padding = 20;

    const availW = W - padding * 2;
    const availH = H - hudHeight - padding * 2;

    const cellW = Math.floor(availW / this.state.cols);
    const cellH = Math.floor(availH / this.state.rows);

    this.state.cellSize = Math.max(16, Math.min(cellW, cellH, 60));

    const boardW = this.state.cols * this.state.cellSize;
    const boardH = this.state.rows * this.state.cellSize;

    this.state.offsetX = Math.floor((W - boardW) / 2);
    this.state.offsetY = Math.floor(hudHeight + (H - hudHeight - boardH) / 2);
  }

  private initPlaceholderGrid(): void {
    const { rows, cols } = this.state;
    const types: Array<Pipe["type"]> = ["straight", "elbow", "tee", "cross"];

    this.state.grid = [];
    for (let r = 0; r < rows; r++) {
      const row: Pipe[] = [];
      for (let c = 0; c < cols; c++) {
        const isSource = r === 0 && c === 0;
        const isDrain = r === rows - 1 && c === cols - 1;
        row.push({
          type: types[(r + c) % types.length],
          rotation: 0,
          connected: false,
          waterFill: 0,
          isSource,
          isDrain,
        });
      }
      this.state.grid.push(row);
    }
  }
}
```

**What's happening:**
- The engine now creates an `InputSystem`, passing the state, canvas, and a reset callback.
- `inputSystem.attach()` registers click and keyboard listeners during construction.
- `destroy()` calls `inputSystem.detach()` to cleanly remove all event listeners.
- `reset()` rebuilds the placeholder grid and resets the move counter, then updates the InputSystem's state reference via `setState()`.

---

## Test It

1. **Run:** `pnpm dev`
2. **Open:** the Pipe Connect game in your browser
3. **Observe:**
   - **Click any tile** -- the pipe rotates 90 degrees clockwise. Click again to see it rotate through all four orientations.
   - Watch how a **straight pipe** flips between vertical and horizontal, while an **elbow** sweeps through all four corners.
   - A **cross pipe** looks the same at every rotation (all four directions are always open).
   - Press **R** to reset all tiles back to their original orientations.
   - Click outside the grid boundary -- nothing happens (bounds checking works).

---

## Challenges

**Easy:**
- Add a visual indication of the move count by temporarily logging `state.moves` to the console after each click.

**Medium:**
- Add right-click support that rotates the pipe counter-clockwise (subtract 1 from the rotation index instead of adding 1). Remember to call `e.preventDefault()` to suppress the context menu.

**Hard:**
- Add a brief rotation animation: instead of snapping instantly, interpolate the pipe's visual rotation over 150ms using a `rotationProgress` field on each pipe.

---

## What You Learned

- Converting mouse pixel coordinates to grid row/column using offset subtraction and floor division
- Cycling through rotation values with modular arithmetic on an array index
- Using the attach/detach pattern for clean event listener lifecycle
- Wiring an InputSystem into the engine with callback-based communication

**Next:** [Step 3: Connectivity Checking](./step-3.md) -- use BFS to determine which pipes form a connected path from source to drain.

---
[<-- Previous Step](./step-1.md) | [Back to Game README](./README.md) | [Next Step -->](./step-3.md)
