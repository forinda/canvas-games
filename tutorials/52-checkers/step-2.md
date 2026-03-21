# Step 2: Piece Rendering & Selection

**Goal:** Render red and black pieces with radial gradients, shadows, and inner rings, then add click-to-select with cell highlighting.

**Time:** ~15 minutes

---

## What You'll Build

- **Gradient-shaded pieces** with radial gradients for a 3D look
- **Drop shadows** beneath each piece for depth
- **Inner ring detail** on every piece for the classic checkers look
- **Click detection** that converts pixel coordinates to board cells
- **Selection highlighting** with a cyan overlay and border on the selected cell
- **Keyboard input** for pause (H) and exit (ESC)

---

## Concepts

- **Radial Gradients**: `createRadialGradient()` takes an inner circle and outer circle. By offsetting the inner circle up-left from the center, we create a natural light-source effect -- brighter on the top-left, darker on the bottom-right.
- **Pixel-to-Cell Mapping**: When the user clicks at pixel `(mx, my)`, we subtract the board offset and divide by cell size: `col = floor((mx - boardX) / cellSize)`. This maps any click to the correct board cell.
- **Selection State**: We store `selectedCell: Cell | null` in the game state. When it is non-null, the renderer draws a highlight overlay on that cell. This separation keeps input handling and rendering independent.

---

## Code

### 2.1 -- Add Piece Drawing to the Board Renderer

**File:** `src/games/checkers/renderers/BoardRenderer.ts`

We extend the renderer from Step 1 with a `drawPieces()` method and add selection highlighting to `drawBoard()`.

```typescript
import type { CheckersState, Cell } from "../types";
import { BOARD_SIZE, cellsEqual } from "../types";

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: CheckersState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, W, H);

    if (state.showModeSelector) return;

    const layout = this.getBoardLayout(W, H);

    this.drawBoard(ctx, state, layout);
    this.drawPieces(ctx, state, layout);
  }

  private getBoardLayout(
    W: number,
    H: number,
  ): { x: number; y: number; size: number; cellSize: number } {
    const margin = 60;
    const size = Math.min(W - margin * 2, H - margin * 2 - 40);
    const cellSize = size / BOARD_SIZE;
    const x = (W - size) / 2;
    const y = (H - size) / 2 + 20;

    return { x, y, size, cellSize };
  }

  private drawBoard(
    ctx: CanvasRenderingContext2D,
    state: CheckersState,
    layout: { x: number; y: number; size: number; cellSize: number },
  ): void {
    const { x, y, cellSize } = layout;

    // Board border
    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = 4;
    ctx.strokeRect(
      x - 4,
      y - 4,
      BOARD_SIZE * cellSize + 8,
      BOARD_SIZE * cellSize + 8,
    );

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cx = x + c * cellSize;
        const cy = y + r * cellSize;
        const isDark = (r + c) % 2 === 1;

        // Base cell color
        ctx.fillStyle = isDark ? "#8B4513" : "#D2B48C";
        ctx.fillRect(cx, cy, cellSize, cellSize);

        // Selected cell highlight
        if (
          state.selectedCell &&
          state.selectedCell.row === r &&
          state.selectedCell.col === c
        ) {
          ctx.fillStyle = "rgba(0, 200, 255, 0.35)";
          ctx.fillRect(cx, cy, cellSize, cellSize);

          ctx.strokeStyle = "#00c8ff";
          ctx.lineWidth = 2;
          ctx.strokeRect(cx + 1, cy + 1, cellSize - 2, cellSize - 2);
        }
      }
    }

    // Row/column labels
    ctx.font = `${Math.max(10, cellSize * 0.22)}px monospace`;
    ctx.fillStyle = "#888";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < BOARD_SIZE; i++) {
      ctx.fillText(
        `${BOARD_SIZE - i}`,
        x - 16,
        y + i * cellSize + cellSize / 2,
      );
      ctx.fillText(
        String.fromCharCode(65 + i),
        x + i * cellSize + cellSize / 2,
        y + BOARD_SIZE * cellSize + 16,
      );
    }
  }

  private drawPieces(
    ctx: CanvasRenderingContext2D,
    state: CheckersState,
    layout: { x: number; y: number; size: number; cellSize: number },
  ): void {
    const { x, y, cellSize } = layout;
    const pieceRadius = cellSize * 0.38;

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = state.board[r][c];

        if (!piece) continue;

        const cx = x + c * cellSize + cellSize / 2;
        const cy = y + r * cellSize + cellSize / 2;

        // Shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.beginPath();
        ctx.arc(cx + 2, cy + 3, pieceRadius, 0, Math.PI * 2);
        ctx.fill();

        // Piece body with radial gradient
        const gradient = ctx.createRadialGradient(
          cx - pieceRadius * 0.3,
          cy - pieceRadius * 0.3,
          pieceRadius * 0.1,
          cx,
          cy,
          pieceRadius,
        );

        if (piece.color === "red") {
          gradient.addColorStop(0, "#ff4444");
          gradient.addColorStop(1, "#aa0000");
        } else {
          gradient.addColorStop(0, "#555555");
          gradient.addColorStop(1, "#111111");
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, pieceRadius, 0, Math.PI * 2);
        ctx.fill();

        // Piece border
        ctx.strokeStyle = piece.color === "red" ? "#cc0000" : "#333333";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, pieceRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner ring
        ctx.strokeStyle = piece.color === "red" ? "#ff6666" : "#444444";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, pieceRadius * 0.7, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
}
```

**What's happening:**
- **Shadow**: A semi-transparent black circle is drawn 2px right and 3px down from the piece center. This creates a drop shadow effect.
- **Radial gradient**: The inner circle of the gradient is offset `(-0.3 * radius, -0.3 * radius)` from center, simulating light coming from the upper left. Red pieces go from bright red to dark red; black pieces from gray to near-black.
- **Piece border**: A 2px stroke around each piece in a slightly different shade adds definition.
- **Inner ring**: A thinner ring at 70% of the radius gives the classic checkers piece look.
- **Selection highlight**: When `state.selectedCell` matches the current cell, we fill a cyan overlay (`rgba(0, 200, 255, 0.35)`) and draw a cyan border. This gives clear visual feedback for which piece is selected.

---

### 2.2 -- Create the Input System

**File:** `src/games/checkers/systems/InputSystem.ts`

Handles mouse clicks (converting pixels to board cells) and keyboard shortcuts. For now we only handle piece selection -- move execution comes in Step 3.

```typescript
import type { CheckersState, Cell } from "../types";
import { BOARD_SIZE } from "../types";

export class InputSystem {
  private state: CheckersState;
  private canvas: HTMLCanvasElement;
  private onExit: () => void;
  private onReset: () => void;
  private keyHandler: (e: KeyboardEvent) => void;
  private clickHandler: (e: MouseEvent) => void;

  constructor(
    state: CheckersState,
    canvas: HTMLCanvasElement,
    onExit: () => void,
    onReset: () => void,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.onExit = onExit;
    this.onReset = onReset;
    this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
    this.clickHandler = (e: MouseEvent) => this.handleClick(e);
  }

  attach(): void {
    window.addEventListener("keydown", this.keyHandler);
    this.canvas.addEventListener("click", this.clickHandler);
  }

  detach(): void {
    window.removeEventListener("keydown", this.keyHandler);
    this.canvas.removeEventListener("click", this.clickHandler);
  }

  private handleKey(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      this.onExit();
      return;
    }

    if (e.key === "h" || e.key === "H") {
      this.state.paused = !this.state.paused;
      return;
    }

    if (e.key === "r" || e.key === "R") {
      if (this.state.gameOver) {
        this.onReset();
      }
      return;
    }
  }

  private handleClick(e: MouseEvent): void {
    const s = this.state;

    if (s.paused || s.gameOver) return;

    const rect = this.canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    const W = this.canvas.width;
    const H = this.canvas.height;

    // Convert click to board cell
    const boardInfo = this.getBoardLayout(W, H);
    const cell = this.pixelToCell(mx, my, boardInfo);

    if (!cell) return;

    this.handleCellClick(cell);
  }

  private handleCellClick(cell: Cell): void {
    const s = this.state;
    const piece = s.board[cell.row][cell.col];

    // Select a piece of the current player's color
    if (piece && piece.color === s.currentTurn) {
      s.selectedCell = cell;
      return;
    }

    // Deselect if clicking elsewhere
    s.selectedCell = null;
  }

  private getBoardLayout(
    W: number,
    H: number,
  ): { x: number; y: number; size: number; cellSize: number } {
    const margin = 60;
    const size = Math.min(W - margin * 2, H - margin * 2 - 40);
    const cellSize = size / BOARD_SIZE;
    const x = (W - size) / 2;
    const y = (H - size) / 2 + 20;

    return { x, y, size, cellSize };
  }

  private pixelToCell(
    mx: number,
    my: number,
    board: { x: number; y: number; size: number; cellSize: number },
  ): Cell | null {
    const col = Math.floor((mx - board.x) / board.cellSize);
    const row = Math.floor((my - board.y) / board.cellSize);

    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE)
      return null;

    return { row, col };
  }
}
```

**What's happening:**
- **Click coordinate scaling**: `e.clientX - rect.left` gives the pixel position relative to the canvas element. We multiply by `canvas.width / rect.width` to handle CSS scaling (when the canvas is styled to a different size than its resolution).
- **`pixelToCell()`**: Subtracts the board offset, divides by cell size, and floors to get the grid column and row. Returns `null` if the click is outside the board.
- **`handleCellClick()`**: If the clicked cell contains a piece matching the current turn, it becomes selected. Otherwise, the selection is cleared. Move execution is added in Step 3.
- **Keyboard shortcuts**: ESC exits, H toggles pause, R restarts after game over.

---

### 2.3 -- Wire Input into the Engine

**File:** `src/games/checkers/CheckersEngine.ts`

Update the engine to create and attach the input system.

```typescript
import type { CheckersState } from "./types";
import { createInitialState } from "./types";
import { BoardRenderer } from "./renderers/BoardRenderer";
import { InputSystem } from "./systems/InputSystem";

export class CheckersEngine {
  private ctx: CanvasRenderingContext2D;
  private state: CheckersState;
  private running: boolean;
  private rafId: number;

  private boardRenderer: BoardRenderer;
  private inputSystem: InputSystem;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext("2d")!;
    this.running = false;
    this.rafId = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = createInitialState();

    // Skip mode selector for now
    this.state.showModeSelector = false;
    this.state.started = true;

    // Renderer
    this.boardRenderer = new BoardRenderer();

    // Input system
    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      onExit,
      () => this.reset(),
    );

    // Resize handler
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // Attach listeners
    this.inputSystem.attach();
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

    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    this.boardRenderer.render(this.ctx, this.state);
  }

  private reset(): void {
    const newState = createInitialState();
    newState.showModeSelector = false;
    newState.started = true;
    Object.assign(this.state, newState);
  }
}
```

**What's happening:**
- The `InputSystem` is created with references to the game state and canvas. It receives `onExit` and `onReset` callbacks.
- `inputSystem.attach()` registers the keyboard and click listeners. `inputSystem.detach()` in `destroy()` removes them.
- `reset()` creates a fresh state and copies it onto the existing state object (using `Object.assign`), so the InputSystem's reference to `this.state` stays valid.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Checkers game in your browser
3. **Observe:**
   - **12 red pieces** on the dark squares of rows 6-8 (bottom three rows)
   - **12 black pieces** on the dark squares of rows 1-3 (top three rows)
   - Each piece has a **3D gradient look** -- brighter top-left, darker bottom-right
   - **Shadows** appear beneath each piece
   - **Click a red piece** (it is red's turn) and see the **cyan highlight** appear on that cell
   - **Click another red piece** to move the selection
   - **Click an empty cell** or a black piece to deselect
   - **Press H** to toggle the pause state
   - **Press ESC** to exit

---

## Challenges

**Easy:**
- Change the piece radius from `0.38 * cellSize` to `0.42` for larger pieces that fill more of each square.
- Try different gradient colors -- make red pieces orange or black pieces navy blue.

**Medium:**
- Add a subtle pulsing animation to the selected piece by modifying the highlight alpha based on `Math.sin(Date.now() / 300)`.

**Hard:**
- Implement a hover effect: track `mousemove` events and draw a subtle highlight on whichever cell the cursor is over (but do not select it until clicked).

---

## What You Learned

- Drawing circles with radial gradients to create 3D-looking game pieces
- Adding drop shadows by drawing an offset, semi-transparent circle beneath each piece
- Converting mouse click pixel coordinates to board cell coordinates
- Managing selection state and rendering selection highlights
- Setting up an input system with attach/detach for clean listener lifecycle

**Next:** [Step 3: Move Validation & Jumps](./step-3.md) -- calculate legal diagonal moves, detect jump opportunities, and show legal move indicators on the board.

---
[<- Previous Step](./step-1.md) | [Back to Tutorial README](./README.md) | [Next Step ->](./step-3.md)
