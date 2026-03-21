# Step 3: Connectivity Checking

**Goal:** Check if pipes form a connected path from source to drain using BFS graph traversal, and visually highlight connected pipes in blue.

**Time:** ~15 minutes

---

## What You'll Build

- **FlowSystem class** that runs BFS from the source each frame to find all connected pipes
- **Bidirectional connection check** -- two adjacent pipes connect only if both have openings facing each other
- **Visual feedback** -- connected pipes turn blue, disconnected pipes stay gray
- **Win detection** -- the game detects when the drain is connected to the source

---

## Concepts

- **Pipes as a Graph**: Each pipe cell is a node. Two adjacent nodes are connected if the current pipe has an opening toward the neighbor AND the neighbor has an opening back. This bidirectional check is what makes the puzzle interesting -- rotating one pipe can break or create a connection.
- **BFS (Breadth-First Search)**: Starting from the source cell, we explore neighbors level by level. BFS guarantees we find all reachable cells. We mark each visited cell as `connected = true`.
- **Opposite Directions**: If pipe A opens toward direction 1 (right), the neighbor to the right must open toward direction 3 (left) to complete the connection. The formula `(dir + 2) % 4` gives the opposite direction.
- **Per-Frame Recomputation**: We reset all `connected` flags and re-run BFS every frame. This is fast enough for small grids (under 11x11) and means connectivity always reflects the current state after any rotation.

---

## Code

### 1. Create the Flow System

**File:** `src/games/pipe-connect/systems/FlowSystem.ts`

Runs BFS from the source to find all connected pipes and detects the win condition.

```typescript
import type { PipeState } from "../types";
import { getOpenings, DIR_OFFSETS, oppositeDir } from "../types";

/**
 * BFS from source to find all connected pipes.
 * A pipe connects to its neighbor if:
 * - The current pipe has an opening toward the neighbor
 * - The neighbor pipe has an opening back toward the current pipe
 */
export class FlowSystem {
  update(state: PipeState): void {
    if (state.status === "won") return;

    // Run connectivity BFS
    this.computeConnections(state);

    // Check win: drain is connected
    if (state.grid[state.drainRow]?.[state.drainCol]?.connected) {
      state.status = "won";
    }
  }

  private computeConnections(state: PipeState): void {
    const { grid, rows, cols, sourceRow, sourceCol } = state;

    // Reset all connections
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        grid[r][c].connected = false;
      }
    }

    // BFS from source
    const queue: [number, number][] = [[sourceRow, sourceCol]];
    grid[sourceRow][sourceCol].connected = true;

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      const pipe = grid[r][c];
      const openings = getOpenings(pipe);

      for (const dir of openings) {
        const nr = r + DIR_OFFSETS[dir][0];
        const nc = c + DIR_OFFSETS[dir][1];

        // Out of bounds
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

        const neighbor = grid[nr][nc];

        // Already visited
        if (neighbor.connected) continue;

        // Check if neighbor has an opening back toward us
        const neighborOpenings = getOpenings(neighbor);
        if (neighborOpenings.includes(oppositeDir(dir))) {
          neighbor.connected = true;
          queue.push([nr, nc]);
        }
      }
    }
  }
}
```

**What's happening:**
- `computeConnections()` first resets every cell's `connected` flag to `false`, giving us a clean slate.
- BFS begins at the source cell. For each cell we dequeue, we check its openings (adjusted for rotation) and look at each neighbor in that direction.
- The critical check: `neighborOpenings.includes(oppositeDir(dir))`. If we are looking rightward (dir=1), the neighbor must open leftward (dir=3). Without this, a pipe pointing away would incorrectly count as connected.
- When the drain cell becomes connected, `update()` sets `state.status = "won"`.

---

### 2. Update the Board Renderer

**File:** `src/games/pipe-connect/renderers/BoardRenderer.ts`

Add blue coloring for connected pipes so the player can see the flow path.

```typescript
import type { PipeState, Pipe } from "../types";
import { getOpenings } from "../types";

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: PipeState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Clear
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, W, H);

    const { grid, rows, cols, offsetX, offsetY, cellSize } = state;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = offsetX + c * cellSize;
        const y = offsetY + r * cellSize;
        const pipe = grid[r][c];
        this.drawCell(ctx, x, y, cellSize, pipe);
      }
    }
  }

  private drawCell(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    pipe: Pipe,
  ): void {
    const pad = 2;

    // Cell background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(x + pad, y + pad, size - pad * 2, size - pad * 2);

    // Cell border
    ctx.strokeStyle = "#2a2a4a";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + pad, y + pad, size - pad * 2, size - pad * 2);

    // Pipe dimensions
    const cx = x + size / 2;
    const cy = y + size / 2;
    const openings = getOpenings(pipe);
    const pipeWidth = size * 0.3;
    const halfPipe = pipeWidth / 2;

    // Determine color: green=source, red=drain, blue=connected, gray=disconnected
    let pipeColor = "#555";
    if (pipe.isSource) {
      pipeColor = "#2ecc71";
    } else if (pipe.isDrain) {
      pipeColor = "#e74c3c";
    } else if (pipe.connected) {
      pipeColor = "#3498db";
    }

    // Draw center hub
    ctx.fillStyle = pipeColor;
    ctx.fillRect(cx - halfPipe, cy - halfPipe, pipeWidth, pipeWidth);

    // Draw each opening as a rectangle from center to edge
    for (const dir of openings) {
      ctx.fillStyle = pipeColor;
      switch (dir) {
        case 0: // up
          ctx.fillRect(cx - halfPipe, y + pad, pipeWidth,
                       size / 2 - pad - halfPipe + halfPipe);
          break;
        case 1: // right
          ctx.fillRect(cx + halfPipe, cy - halfPipe,
                       size / 2 - pad, pipeWidth);
          break;
        case 2: // down
          ctx.fillRect(cx - halfPipe, cy + halfPipe,
                       pipeWidth, size / 2 - pad);
          break;
        case 3: // left
          ctx.fillRect(x + pad, cy - halfPipe,
                       size / 2 - pad - halfPipe + halfPipe, pipeWidth);
          break;
      }
    }

    // Draw source/drain indicator
    if (pipe.isSource) {
      ctx.fillStyle = "#2ecc71";
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.floor(size * 0.25)}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("S", cx, cy);
    } else if (pipe.isDrain) {
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.floor(size * 0.25)}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("D", cx, cy);
    }
  }
}
```

**What's happening:**
- The color logic now has four branches: green for source, red for drain, blue (`#3498db`) for connected pipes, and gray (`#555`) for disconnected pipes.
- As the player rotates tiles, the FlowSystem recomputes connectivity each frame, and the renderer immediately reflects the new state. Pipes that join the connected path turn blue; pipes that break away turn gray.

---

### 3. Update the Engine

**File:** `src/games/pipe-connect/PipeEngine.ts`

Add the FlowSystem to the game loop so connectivity is checked every frame.

```typescript
import type { PipeState, Pipe } from "./types";
import { BoardRenderer } from "./renderers/BoardRenderer";
import { InputSystem } from "./systems/InputSystem";
import { FlowSystem } from "./systems/FlowSystem";

export class PipeEngine {
  private ctx: CanvasRenderingContext2D;
  private state: PipeState;
  private running = false;
  private rafId = 0;

  private boardRenderer: BoardRenderer;
  private inputSystem: InputSystem;
  private flowSystem: FlowSystem;
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
    this.flowSystem = new FlowSystem();
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

    // Update connectivity
    this.flowSystem.update(this.state);

    // Render
    this.boardRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private reset(): void {
    this.initPlaceholderGrid();
    this.state.moves = 0;
    this.state.status = "playing";
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
- The game loop now calls `this.flowSystem.update(this.state)` before rendering. This means connectivity is recomputed every single frame.
- `reset()` now also resets `state.status` back to `"playing"` so the game can be replayed after winning.
- The flow of each frame is: update connectivity (FlowSystem) then draw (BoardRenderer). Input is event-driven and modifies state between frames.

---

## Test It

1. **Run:** `pnpm dev`
2. **Open:** the Pipe Connect game in your browser
3. **Observe:**
   - The **source tile** (top-left, green "S") is always connected
   - Click tiles adjacent to the source to **rotate them** -- when a pipe's opening aligns with the source's opening, it turns **blue** (connected)
   - Build a chain of blue pipes: each new pipe must have matching openings with the previous connected pipe AND the next one
   - If you rotate a pipe to **break the chain**, all downstream pipes instantly revert to **gray**
   - Try to connect a path all the way to the **drain** (bottom-right, red "D") -- the game status changes to `"won"`
   - Press **R** to reset and try again

---

## Challenges

**Easy:**
- Add a console log that prints the number of connected pipes after each BFS run.

**Medium:**
- Highlight the drain tile in blue (like connected pipes) once it becomes reachable, instead of keeping it red.

**Hard:**
- Implement DFS instead of BFS for the connectivity check. Verify that the results are identical. Think about why BFS and DFS produce the same connected set for an undirected graph.

---

## What You Learned

- Using BFS to find all cells reachable from a starting point in a grid
- Checking bidirectional connectivity: both pipes must have openings facing each other
- Computing opposite directions with `(dir + 2) % 4`
- Separating update logic (FlowSystem) from rendering (BoardRenderer) in the game loop

**Next:** [Step 4: Water Flow Animation](./step-4.md) -- animate water gradually filling connected pipes with color interpolation and pulse effects.

---
[<-- Previous Step](./step-2.md) | [Back to Game README](./README.md) | [Next Step -->](./step-4.md)
