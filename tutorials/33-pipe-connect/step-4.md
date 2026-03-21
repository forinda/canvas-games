# Step 4: Water Flow Animation

**Goal:** Animate water gradually filling connected pipes with smooth color interpolation and a pulsing effect, plus add a HUD with timer, move counter, and win overlay.

**Time:** ~15 minutes

---

## What You'll Build

- **Water fill animation** -- connected pipes gradually fill with blue color over time
- **Water drain animation** -- disconnected pipes lose their blue color, fading back to gray
- **Color interpolation** (`lerpColor`) for smooth gray-to-blue transitions
- **Pulse effect** on fully filled pipes for a lively "flowing water" look
- **HUD renderer** showing level, moves, timer, and grid size
- **Win overlay** with completion stats and next-level prompt
- **Timer** that counts elapsed seconds while playing

---

## Concepts

- **Fill Animation**: Each pipe has a `waterFill` field (0 to 1). Connected pipes fill up at a constant rate; disconnected pipes drain at double speed. The renderer uses `waterFill` to interpolate the pipe color between gray and blue.
- **Color Lerp (Linear Interpolation)**: To smoothly blend between two hex colors, we parse each into RGB components, interpolate each channel by a factor `t` (0..1), and reassemble. `lerpColor("#555555", "#3498db", 0.5)` produces a color halfway between gray and blue.
- **Pulse Effect**: Fully connected pipes get a small semi-transparent overlay whose opacity oscillates using `Math.sin(Date.now() / 300)`. This creates a subtle "heartbeat" that makes the water feel alive.
- **Delta Time**: The engine passes `dt` (milliseconds since last frame) to the FlowSystem. Multiplying fill speed by `dt` ensures animation runs at the same visual speed regardless of frame rate.

---

## Code

### 1. Update the Flow System with Animation

**File:** `src/games/pipe-connect/systems/FlowSystem.ts`

Add water fill/drain animation and delta-time-based timer.

```typescript
import type { PipeState } from "../types";
import { getOpenings, DIR_OFFSETS, oppositeDir } from "../types";

/**
 * BFS from source to find all connected pipes.
 * Also animates water fill and detects win condition.
 */
export class FlowSystem {
  private readonly FILL_SPEED = 3; // fill units per second

  update(state: PipeState, dt: number): void {
    if (state.status === "won") return;

    // Update timer
    state.timer += dt / 1000;

    // Run connectivity BFS
    this.computeConnections(state);

    // Animate water fill
    this.animateWater(state, dt);

    // Check win: drain connected AND fully filled
    if (state.grid[state.drainRow]?.[state.drainCol]?.connected) {
      if (state.grid[state.drainRow][state.drainCol].waterFill >= 1) {
        state.status = "won";
      }
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

        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

        const neighbor = grid[nr][nc];
        if (neighbor.connected) continue;

        const neighborOpenings = getOpenings(neighbor);
        if (neighborOpenings.includes(oppositeDir(dir))) {
          neighbor.connected = true;
          queue.push([nr, nc]);
        }
      }
    }
  }

  private animateWater(state: PipeState, dt: number): void {
    const dtSec = dt / 1000;

    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const pipe = state.grid[r][c];

        if (pipe.connected) {
          // Fill up connected pipes
          pipe.waterFill = Math.min(1, pipe.waterFill + this.FILL_SPEED * dtSec);
        } else {
          // Drain disconnected pipes (twice as fast)
          pipe.waterFill = Math.max(0, pipe.waterFill - this.FILL_SPEED * 2 * dtSec);
        }
      }
    }
  }
}
```

**What's happening:**
- `FILL_SPEED = 3` means a pipe takes about 0.33 seconds to fill completely (1 / 3).
- Connected pipes increase `waterFill` toward 1; disconnected pipes decrease toward 0. The drain speed is doubled so broken connections visually clear faster than new connections form.
- The win condition now requires both connectivity AND `waterFill >= 1` at the drain. This gives the player a brief moment to see the water reach the drain before the win overlay appears.
- The timer increments by `dt / 1000` each frame, converting milliseconds to seconds.

---

### 2. Update the Board Renderer with Animation Effects

**File:** `src/games/pipe-connect/renderers/BoardRenderer.ts`

Add water fill color interpolation and pulse effect.

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

    // Determine color
    let pipeColor = "#555";
    if (pipe.isSource) {
      pipeColor = "#2ecc71";
    } else if (pipe.isDrain) {
      pipeColor = "#e74c3c";
    } else if (pipe.connected) {
      pipeColor = "#3498db";
    }

    // If water is filling, interpolate color from gray to blue
    if (pipe.waterFill > 0 && !pipe.isSource && !pipe.isDrain) {
      const t = pipe.waterFill;
      pipeColor = this.lerpColor("#555555", "#3498db", t);
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

    // Water flow animation: pulse effect on connected, filled pipes
    if (pipe.connected && pipe.waterFill > 0.5 && !pipe.isSource && !pipe.isDrain) {
      const pulse = 0.3 + 0.2 * Math.sin(Date.now() / 300);
      ctx.fillStyle = `rgba(52, 152, 219, ${pulse})`;
      ctx.fillRect(
        cx - halfPipe * 0.6,
        cy - halfPipe * 0.6,
        pipeWidth * 0.6,
        pipeWidth * 0.6,
      );
    }
  }

  private lerpColor(a: string, b: string, t: number): string {
    const ar = parseInt(a.slice(1, 3), 16);
    const ag = parseInt(a.slice(3, 5), 16);
    const ab = parseInt(a.slice(5, 7), 16);
    const br = parseInt(b.slice(1, 3), 16);
    const bg = parseInt(b.slice(3, 5), 16);
    const bb = parseInt(b.slice(5, 7), 16);
    const rr = Math.round(ar + (br - ar) * t);
    const rg = Math.round(ag + (bg - ag) * t);
    const rb = Math.round(ab + (bb - ab) * t);
    return `rgb(${rr},${rg},${rb})`;
  }
}
```

**What's happening:**
- When `waterFill > 0` on a non-source/non-drain pipe, we call `lerpColor("#555555", "#3498db", t)` where `t` is the fill progress. At `t=0` the pipe is fully gray; at `t=1` it is fully blue. Values in between produce a smooth blend.
- The pulse effect draws a small semi-transparent blue square over the center hub. Its opacity oscillates between 0.1 and 0.5 using `Math.sin(Date.now() / 300)`, creating a subtle breathing animation on flowing pipes.
- `lerpColor()` parses each hex color into its RGB channels, interpolates each channel linearly, and returns an `rgb()` CSS string. This is a general-purpose utility useful in many canvas games.

---

### 3. Create the HUD Renderer

**File:** `src/games/pipe-connect/renderers/HUDRenderer.ts`

Displays level, move counter, timer, grid size, and a win overlay.

```typescript
import type { PipeState } from "../types";
import { GAME_COLOR } from "../types";

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: PipeState): void {
    const W = ctx.canvas.width;
    const hudY = 12;

    // Top HUD bar
    ctx.fillStyle = "rgba(10, 10, 26, 0.9)";
    ctx.fillRect(0, 0, W, 44);

    ctx.font = "bold 14px monospace";
    ctx.textBaseline = "middle";
    const midY = hudY + 10;

    // Level
    ctx.fillStyle = GAME_COLOR;
    ctx.textAlign = "left";
    ctx.fillText(`Level: ${state.level}`, 16, midY);

    // Moves
    ctx.fillStyle = "#ccc";
    ctx.textAlign = "center";
    ctx.fillText(`Moves: ${state.moves}`, W / 2 - 60, midY);

    // Timer
    const mins = Math.floor(state.timer / 60);
    const secs = Math.floor(state.timer % 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;
    ctx.fillText(`Time: ${timeStr}`, W / 2 + 60, midY);

    // Grid size
    ctx.fillStyle = "#888";
    ctx.textAlign = "right";
    ctx.fillText(`${state.rows}x${state.cols}`, W - 16, midY);

    // Controls hint
    ctx.font = "11px monospace";
    ctx.fillStyle = "#555";
    ctx.textAlign = "center";
    ctx.fillText("[R] Restart  [ESC] Exit", W / 2, midY + 20);

    // Win overlay
    if (state.status === "won") {
      this.drawWinOverlay(ctx, state);
    }
  }

  private drawWinOverlay(ctx: CanvasRenderingContext2D, state: PipeState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Dim background
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, W, H);

    // Panel
    const panelW = 320;
    const panelH = 200;
    const px = (W - panelW) / 2;
    const py = (H - panelH) / 2;

    ctx.fillStyle = "#12121f";
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 12);
    ctx.fill();

    ctx.strokeStyle = GAME_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 12);
    ctx.stroke();

    // Title
    ctx.fillStyle = GAME_COLOR;
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Level Complete!", W / 2, py + 40);

    // Stats
    ctx.fillStyle = "#ccc";
    ctx.font = "14px monospace";
    ctx.fillText(`Moves: ${state.moves}`, W / 2, py + 80);

    const mins = Math.floor(state.timer / 60);
    const secs = Math.floor(state.timer % 60);
    ctx.fillText(`Time: ${mins}:${secs.toString().padStart(2, "0")}`, W / 2, py + 105);

    // Prompt
    ctx.fillStyle = "#888";
    ctx.font = "13px monospace";
    ctx.fillText("Press [N] for next level", W / 2, py + 150);
    ctx.fillText("Press [R] to replay", W / 2, py + 175);
  }
}
```

**What's happening:**
- The HUD bar draws a semi-transparent dark strip across the top 44 pixels, then renders level number (in the game's teal color), move count, formatted timer, and grid dimensions.
- A controls hint line below the HUD shows the available keyboard shortcuts.
- When `state.status === "won"`, the win overlay dims the entire screen and draws a centered panel with the level-complete message, final move count, elapsed time, and prompts for next level or replay.
- `roundRect()` creates panels with rounded corners for a polished look.

---

### 4. Update the Engine

**File:** `src/games/pipe-connect/PipeEngine.ts`

Add delta time tracking, HUD rendering, and the "next level" keyboard shortcut.

```typescript
import type { PipeState, Pipe } from "./types";
import { BoardRenderer } from "./renderers/BoardRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";
import { InputSystem } from "./systems/InputSystem";
import { FlowSystem } from "./systems/FlowSystem";

export class PipeEngine {
  private ctx: CanvasRenderingContext2D;
  private state: PipeState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private boardRenderer: BoardRenderer;
  private hudRenderer: HUDRenderer;
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
    this.hudRenderer = new HUDRenderer();
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
    this.lastTime = performance.now();
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

    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    // Update
    this.flowSystem.update(this.state, dt);

    // Render
    this.boardRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private reset(): void {
    this.initPlaceholderGrid();
    this.state.moves = 0;
    this.state.timer = 0;
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
- Delta time (`dt`) is now computed each frame: `now - lastTime`. This is passed to `flowSystem.update()` so water fill animation runs at consistent speed.
- `lastTime` is initialized in `start()` using `performance.now()` to avoid a large initial `dt`.
- The render phase now calls both `boardRenderer.render()` and `hudRenderer.render()`, layering the HUD on top of the board.
- `reset()` now also clears the timer and resets status.

---

## Test It

1. **Run:** `pnpm dev`
2. **Open:** the Pipe Connect game in your browser
3. **Observe:**
   - The **HUD bar** at the top shows Level, Moves, Time, and grid size
   - The **timer** counts up while you play
   - Click to rotate pipes and build a connection from source to drain
   - Watch connected pipes **gradually fill with blue** -- the color smoothly transitions from gray
   - Fully filled connected pipes show a **subtle blue pulse** in their center
   - Break a connection and watch the pipe **drain back to gray** (faster than the fill)
   - When water reaches the drain, a **win overlay** appears with your stats
   - Press **R** to restart (timer and moves reset)

---

## Challenges

**Easy:**
- Change the `FILL_SPEED` constant from 3 to 1 for a slower, more dramatic fill effect.

**Medium:**
- Add a "wave" effect where pipes further from the source fill with a slight delay, creating a ripple of color spreading outward. Hint: store the BFS depth for each cell and use it to offset the fill start time.

**Hard:**
- Add particle effects along the pipe openings of connected pipes: small blue dots that drift in the flow direction.

---

## What You Learned

- Animating properties over time using delta-time multiplication for frame-rate independence
- Linear color interpolation (lerp) between two hex colors via RGB channel blending
- Creating a pulsing effect with `Math.sin(Date.now() / speed)` for oscillating opacity
- Building a HUD renderer with formatted timer, move counter, and a modal win overlay

**Next:** [Step 5: Puzzle Generation & Polish](./step-5.md) -- generate solvable puzzles with guaranteed paths, add level progression, and finalize the game.

---
[<-- Previous Step](./step-3.md) | [Back to Game README](./README.md) | [Next Step -->](./step-5.md)
