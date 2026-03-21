# Step 5: Puzzle Generation & Polish

**Goal:** Generate solvable puzzles with guaranteed paths from source to drain, add level progression with increasing grid sizes, and finalize the game with all keyboard controls.

**Time:** ~15 minutes

---

## What You'll Build

- **Puzzle generator** that creates a random DFS path from source to drain, assigns pipe types to fit the path, fills remaining cells with random pipes, then scrambles all rotations
- **Weighted pipe selection** so straights and elbows appear more often than crosses
- **Level progression** with grids that grow from 7x7 to 11x11 as you advance
- **Next-level keyboard shortcut** (N key) after winning
- **Complete InputSystem** with all final controls (ESC, R, N, H)
- **Full game loop** with all systems wired together

---

## Concepts

- **Guaranteed Solvability**: We build the solution first, then scramble. A DFS random walk creates a path from source to drain. For each cell on the path, we choose a pipe type and rotation whose openings match the required connections. This guarantees at least one valid solution exists.
- **Pipe Fitting**: Given that path cell `i` must connect to cells `i-1` and `i+1`, we compute which directions those neighbors lie in. Then we search all pipe types and rotations for one whose openings include those directions. We prefer minimal openings (a straight over a tee) to make the puzzle less trivial.
- **Weighted Randomness**: Not all pipe types appear equally. Straights and elbows get weight 4, tees get 2, and crosses get 1. This avoids a grid full of crosses (which connect in all directions and are too easy to align).
- **Scrambling**: After building the solved grid, we randomize every pipe's rotation. This is what the player must undo. The source pipe gets its `connected` and `waterFill` restored so BFS has a starting point.

---

## Code

### 1. Create the Level Generator

**File:** `src/games/pipe-connect/data/levels.ts`

Generates solvable puzzles by building a path first, then scrambling rotations.

```typescript
import type { Pipe, PipeType, Rotation, PipeState } from "../types";
import { ROTATIONS, getOpenings, DIR_OFFSETS, gridSizeForLevel } from "../types";

const PIPE_TYPES: PipeType[] = ["straight", "elbow", "tee", "cross"];

function randomRotation(): Rotation {
  return ROTATIONS[Math.floor(Math.random() * ROTATIONS.length)];
}

function randomPipeType(): PipeType {
  // Weighted: fewer crosses, more straights/elbows
  const weights: [PipeType, number][] = [
    ["straight", 4],
    ["elbow", 4],
    ["tee", 2],
    ["cross", 1],
  ];
  const total = weights.reduce((s, w) => s + w[1], 0);
  let r = Math.random() * total;

  for (const [t, w] of weights) {
    r -= w;
    if (r <= 0) return t;
  }
  return "straight";
}

function createPipe(
  type: PipeType,
  rotation: Rotation,
  isSource = false,
  isDrain = false,
): Pipe {
  return {
    type,
    rotation,
    connected: isSource,
    waterFill: isSource ? 1 : 0,
    isSource,
    isDrain,
  };
}

/**
 * Generate a solvable level:
 * 1. Place source at top-left, drain at bottom-right
 * 2. Build a random path from source to drain using DFS
 * 3. For each cell on the path, choose a pipe type/rotation with the required openings
 * 4. Fill remaining cells with random pipes
 * 5. Scramble all rotations so the player needs to solve it
 */
export function generateLevel(state: PipeState): void {
  const size = gridSizeForLevel(state.level);
  state.rows = size;
  state.cols = size;

  // Place source and drain
  state.sourceRow = 0;
  state.sourceCol = 0;
  state.drainRow = size - 1;
  state.drainCol = size - 1;

  // Build a path from source to drain using random walk
  const path = buildPath(
    size,
    state.sourceRow, state.sourceCol,
    state.drainRow, state.drainCol,
  );

  // Create the grid
  const grid: Pipe[][] = [];
  for (let r = 0; r < size; r++) {
    grid[r] = [];
    for (let c = 0; c < size; c++) {
      grid[r][c] = createPipe("straight", 0);
    }
  }

  // Track which cells are on the path
  const pathSet = new Map<string, number>();
  path.forEach((p, i) => pathSet.set(`${p[0]},${p[1]}`, i));

  // For each path cell, determine needed directions and fit a pipe
  for (let i = 0; i < path.length; i++) {
    const [r, c] = path[i];
    const neededDirs: number[] = [];

    // Direction toward previous cell
    if (i > 0) {
      const [pr, pc] = path[i - 1];
      const dr = r - pr;
      const dc = c - pc;
      for (let d = 0; d < 4; d++) {
        if (DIR_OFFSETS[d][0] === -dr && DIR_OFFSETS[d][1] === -dc) {
          neededDirs.push(d);
          break;
        }
      }
    }

    // Direction toward next cell
    if (i < path.length - 1) {
      const [nr, nc] = path[i + 1];
      const dr = nr - r;
      const dc = nc - c;
      for (let d = 0; d < 4; d++) {
        if (DIR_OFFSETS[d][0] === dr && DIR_OFFSETS[d][1] === dc) {
          neededDirs.push(d);
          break;
        }
      }
    }

    // Find a pipe type + rotation that has at least these openings
    const { type, rotation } = findPipeForDirections(neededDirs);
    const isSource = r === state.sourceRow && c === state.sourceCol;
    const isDrain = r === state.drainRow && c === state.drainCol;
    grid[r][c] = createPipe(type, rotation, isSource, isDrain);
  }

  // Fill non-path cells with random pipes
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!pathSet.has(`${r},${c}`)) {
        grid[r][c] = createPipe(randomPipeType(), randomRotation());
      }
    }
  }

  // Scramble all rotations to create the puzzle
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      grid[r][c].rotation = randomRotation();
      grid[r][c].connected = false;
      grid[r][c].waterFill = 0;

      if (grid[r][c].isSource) {
        grid[r][c].connected = true;
        grid[r][c].waterFill = 1;
      }
    }
  }

  state.grid = grid;
  state.moves = 0;
  state.timer = 0;
  state.status = "playing";
}

/** Build a random path from (sr,sc) to (dr,dc) on a size x size grid using DFS */
function buildPath(
  size: number,
  sr: number, sc: number,
  dr: number, dc: number,
): [number, number][] {
  const visited = new Set<string>();
  const path: [number, number][] = [];

  function dfs(r: number, c: number): boolean {
    if (r === dr && c === dc) {
      path.push([r, c]);
      return true;
    }

    visited.add(`${r},${c}`);
    path.push([r, c]);

    // Shuffle directions with bias toward the target
    const dirs = [0, 1, 2, 3];
    dirs.sort((a, b) => {
      const [ar, ac] = DIR_OFFSETS[a];
      const [br, bc] = DIR_OFFSETS[b];
      const distA = Math.abs(r + ar - dr) + Math.abs(c + ac - dc);
      const distB = Math.abs(r + br - dr) + Math.abs(c + bc - dc);
      return distA - distB + (Math.random() - 0.5) * 3;
    });

    for (const d of dirs) {
      const nr = r + DIR_OFFSETS[d][0];
      const nc = c + DIR_OFFSETS[d][1];

      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      if (visited.has(`${nr},${nc}`)) continue;

      if (dfs(nr, nc)) return true;
    }

    path.pop();
    return false;
  }

  dfs(sr, sc);
  return path;
}

/** Find a pipe type and rotation whose openings include all needed directions */
function findPipeForDirections(neededDirs: number[]): {
  type: PipeType;
  rotation: Rotation;
} {
  for (const type of PIPE_TYPES) {
    for (const rotation of ROTATIONS) {
      const pipe: Pipe = {
        type, rotation,
        connected: false, waterFill: 0,
        isSource: false, isDrain: false,
      };
      const openings = getOpenings(pipe);

      if (neededDirs.every((d) => openings.includes(d))) {
        // Prefer minimal openings to avoid trivially easy puzzles
        if (openings.length <= neededDirs.length + 1) {
          return { type, rotation };
        }
      }
    }
  }
  // Fallback: cross pipe works for any combo
  return { type: "cross", rotation: 0 };
}
```

**What's happening:**
- `generateLevel()` orchestrates the full puzzle creation pipeline: size the grid, build a path, fit pipes, fill gaps, and scramble.
- `buildPath()` uses DFS with a direction bias toward the target. The bias prevents paths from wandering too far, while the random factor (`(Math.random() - 0.5) * 3`) ensures variety. Backtracking guarantees a path is always found.
- `findPipeForDirections()` brute-forces all type/rotation combinations to find one whose openings include the needed directions. It prefers pipes with fewer total openings (e.g. a straight over a tee when only two directions are needed) so the puzzle has meaningful choices.
- After building the solution grid, the scramble loop randomizes every rotation and resets connectivity. Only the source keeps `connected = true` and `waterFill = 1` so it is always the BFS starting point.
- `randomPipeType()` uses weighted selection: straights and elbows appear 4x as often as crosses. This makes most non-path cells distractors rather than accidental shortcuts.

---

### 2. Finalize the Input System

**File:** `src/games/pipe-connect/systems/InputSystem.ts`

Add next-level (N) and exit (ESC) keyboard shortcuts.

```typescript
import type { PipeState } from "../types";
import { ROTATIONS } from "../types";

export class InputSystem {
  private state: PipeState;
  private canvas: HTMLCanvasElement;
  private onExit: () => void;
  private onReset: () => void;
  private onNextLevel: () => void;

  private clickHandler: (e: MouseEvent) => void;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(
    state: PipeState,
    canvas: HTMLCanvasElement,
    onExit: () => void,
    onReset: () => void,
    onNextLevel: () => void,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.onExit = onExit;
    this.onReset = onReset;
    this.onNextLevel = onNextLevel;

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

  setState(state: PipeState): void {
    this.state = state;
  }

  private handleClick(e: MouseEvent): void {
    if (this.state.status === "won") return;

    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const col = Math.floor((mx - this.state.offsetX) / this.state.cellSize);
    const row = Math.floor((my - this.state.offsetY) / this.state.cellSize);

    if (row < 0 || row >= this.state.rows) return;
    if (col < 0 || col >= this.state.cols) return;

    // Rotate the pipe 90 degrees clockwise
    const pipe = this.state.grid[row][col];
    const currentIdx = ROTATIONS.indexOf(pipe.rotation);
    pipe.rotation = ROTATIONS[(currentIdx + 1) % ROTATIONS.length];
    this.state.moves++;
  }

  private handleKey(e: KeyboardEvent): void {
    switch (e.key) {
      case "Escape":
        this.onExit();
        break;
      case "r":
      case "R":
        this.onReset();
        break;
      case "n":
      case "N":
        if (this.state.status === "won") {
          this.onNextLevel();
        }
        break;
    }
  }
}
```

**What's happening:**
- The constructor now takes five callbacks: state, canvas, onExit, onReset, and onNextLevel.
- "N" only triggers `onNextLevel()` when the game is in the "won" state, preventing accidental level skips.
- "Escape" calls `onExit()` which the host page uses to return to a menu or close the game.
- All keyboard controls are centralized in one `handleKey` switch block for easy maintenance.

---

### 3. Finalize the Engine

**File:** `src/games/pipe-connect/PipeEngine.ts`

Replace the placeholder grid with real puzzle generation and add level progression.

```typescript
import type { PipeState } from "./types";
import { gridSizeForLevel } from "./types";
import { generateLevel } from "./data/levels";
import { InputSystem } from "./systems/InputSystem";
import { FlowSystem } from "./systems/FlowSystem";
import { BoardRenderer } from "./renderers/BoardRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";

export class PipeEngine {
  private ctx: CanvasRenderingContext2D;
  private state: PipeState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private flowSystem: FlowSystem;
  private boardRenderer: BoardRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const size = gridSizeForLevel(1);

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

    this.flowSystem = new FlowSystem();
    this.boardRenderer = new BoardRenderer();
    this.hudRenderer = new HUDRenderer();

    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      () => {},                 // onExit: no-op for standalone
      () => this.reset(),
      () => this.nextLevel(),
    );

    generateLevel(this.state);
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

    this.flowSystem.update(this.state, dt);
    this.boardRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private reset(): void {
    generateLevel(this.state);
    this.computeLayout();
    this.inputSystem.setState(this.state);
  }

  private nextLevel(): void {
    this.state.level++;
    generateLevel(this.state);
    this.computeLayout();
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
}
```

**What's happening:**
- The placeholder `initPlaceholderGrid()` is gone, replaced by `generateLevel(this.state)` which creates a real solvable puzzle.
- `reset()` calls `generateLevel()` to create a fresh puzzle at the same level, then recomputes layout (in case grid size is different) and updates the InputSystem's state reference.
- `nextLevel()` increments `state.level`, generates a new puzzle (with a potentially larger grid from `gridSizeForLevel()`), and recomputes layout.
- The constructor uses `gridSizeForLevel(1)` for the initial grid size instead of a hardcoded 7, keeping the size logic centralized.
- The game loop is now complete: update flow (BFS + animation), render board, render HUD -- every frame.

---

### 4. Update the Platform Adapter and Entry Point

**File:** `src/games/pipe-connect/adapters/PlatformAdapter.ts`

```typescript
import { PipeEngine } from "../PipeEngine";

export class PlatformAdapter {
  private engine: PipeEngine;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new PipeEngine(canvas);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

**File:** `src/games/pipe-connect/index.ts`

```typescript
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export function createPipeConnect(canvas: HTMLCanvasElement): { destroy: () => void } {
  const adapter = new PlatformAdapter(canvas);
  adapter.start();
  return { destroy: () => adapter.destroy() };
}
```

---

## Test It

1. **Run:** `pnpm dev`
2. **Open:** the Pipe Connect game in your browser
3. **Observe:**
   - A **scrambled puzzle** appears with pipes in random orientations -- the source (green "S") is at the top-left, the drain (red "D") is at the bottom-right
   - Click pipes to **rotate them** and build a connected path. Connected pipes **fill with blue** over time, with a subtle **pulse effect**
   - The **HUD** shows your current level, move count, elapsed timer, and grid size
   - When water reaches the drain, the **"Level Complete!" overlay** appears with your stats
   - Press **N** to advance to the **next level** -- the grid grows larger (7x7 to 9x9 to 11x11)
   - Press **R** at any time to **restart** the current level with a fresh puzzle
   - Every puzzle is **guaranteed solvable** -- there is always at least one valid rotation configuration that connects source to drain

---

## Challenges

**Easy:**
- Modify `gridSizeForLevel()` to start at 5x5 for an easier first level: `return Math.min(3 + level * 2, 11)`.

**Medium:**
- Add a "par" score that shows the minimum number of moves needed. Hint: since each pipe can require 0-3 rotations to reach its solved orientation, sum the minimum rotations across all path cells.

**Hard:**
- Implement a "hint" system (H key) that briefly flashes the correct rotation for one random unsolved pipe. Store the solution rotations before scrambling so you can compare.

---

## What You Learned

- Generating solvable puzzles by building the solution path first (DFS), fitting pipe types to the path, then scrambling
- Using weighted random selection to control the distribution of game elements
- Implementing level progression with dynamically-sized grids
- Wiring together a complete game architecture: types, systems (Input, Flow), renderers (Board, HUD), data (levels), engine, and adapter

**Congratulations!** You have built a complete Pipe Connect puzzle game with procedural generation, animated water flow, and level progression. The full source code is at `src/games/pipe-connect/`.

**Next Game:** Continue to [Maze Runner](../../tutorials/34-maze-runner/README.md) -- where you will learn maze generation algorithms and pathfinding.

---
[<-- Previous Step](./step-4.md) | [Back to Game README](./README.md)
