# Step 1: Maze & Rendering

**Goal:** Parse a string-based maze definition and render walls, dots, and power pellets on canvas.

**Time:** ~15 minutes

---

## What You'll Build

The foundation of Pac-Man -- the maze itself:
- **28x31 tile grid** parsed from a string array (`#` = wall, `.` = dot, `o` = power pellet)
- **Dark-blue walls** with bright-blue edge borders for the classic Pac-Man look
- **Small cream-colored dots** at every `.` cell
- **Pulsing power pellets** at the four corners of the maze
- **Ghost house door** rendered as a pink bar
- **Responsive cell sizing** that fills the viewport

---

## Concepts

- **Tile Map Parsing**: Convert an array of strings into a 2D grid of typed cells. Each character maps to a cell type (`wall`, `dot`, `power`, `door`, `empty`).
- **Cell Size Calculation**: Divide available canvas space by grid dimensions to find the largest cell that fits.
- **Wall Border Detection**: Draw a blue border on wall edges that face non-wall cells, creating the classic outlined look.
- **Canvas Centering**: Compute `offsetX` / `offsetY` so the maze sits in the middle of any viewport.

---

## Code

### 1. Create Types

**File:** `src/games/pacman/types.ts`

Define all the types and constants the game will need. We set up the full state shape now so we can grow into it without restructuring later.

```typescript
export type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

export type GhostMode = 'scatter' | 'chase' | 'frightened';

export type GhostName = 'blinky' | 'pinky' | 'inky' | 'clyde';

export type CellType = 'wall' | 'dot' | 'power' | 'empty' | 'door';

export interface Cell {
  type: CellType;
}

export interface Position {
  x: number;
  y: number;
}

export interface PacMan {
  pos: Position;
  dir: Direction;
  nextDir: Direction;
  mouthAngle: number;
  mouthOpening: boolean;
}

export interface Ghost {
  name: GhostName;
  pos: Position;
  dir: Direction;
  mode: GhostMode;
  scatterTarget: Position;
  homePos: Position;
  color: string;
  active: boolean;
  releaseTimer: number;
  eaten: boolean;
}

export interface PacManState {
  grid: Cell[][];
  gridWidth: number;
  gridHeight: number;
  pacman: PacMan;
  ghosts: Ghost[];
  score: number;
  highScore: number;
  lives: number;
  level: number;
  totalDots: number;
  dotsEaten: number;
  frightenedTimer: number;
  frightenedGhostsEaten: number;
  modeTimer: number;
  modeIndex: number;
  globalMode: 'scatter' | 'chase';
  gameOver: boolean;
  paused: boolean;
  started: boolean;
  won: boolean;
  time: number;
  cellSize: number;
  offsetX: number;
  offsetY: number;
}

// Constants
export const MAZE_COLS = 28;
export const MAZE_ROWS = 31;
export const BASE_SPEED = 5.5;       // cells per second
export const GHOST_SPEED = 5.0;
export const GHOST_FRIGHTENED_SPEED = 2.5;
export const GHOST_EATEN_SPEED = 10;
export const FRIGHTENED_DURATION = 8; // seconds
export const DOT_SCORE = 10;
export const POWER_SCORE = 50;
export const GHOST_EAT_SCORES = [200, 400, 800, 1600];
export const INITIAL_LIVES = 3;

/** Scatter/chase mode durations in seconds: [scatter, chase, scatter, chase, ...] */
export const MODE_DURATIONS = [7, 20, 7, 20, 5, 20, 5, Infinity];
```

**What's happening:**
- `Direction` includes `'none'` for Pac-Man's initial idle state before the player presses a key.
- `Cell` is intentionally simple -- just a `type` string. We mutate `type` from `'dot'` to `'empty'` when Pac-Man eats it.
- `PacMan.nextDir` enables **direction queuing**: the player presses a key and the turn happens at the next valid intersection.
- `Ghost` tracks per-ghost state: its unique `scatterTarget` corner, its `homePos` inside the ghost house, and an `eaten` flag for when it's returning home as just a pair of eyes.
- We define the full `PacManState` up front even though this step only uses `grid`, `gridWidth`, `gridHeight`, `cellSize`, `offsetX`, `offsetY`, and `time`. This avoids restructuring in later steps.

---

### 2. Create the Maze Data

**File:** `src/games/pacman/data/maze.ts`

The classic 28x31 Pac-Man layout encoded as strings. Each character maps to a cell type.

```typescript
/**
 * 28x31 Pac-Man maze.
 * Legend:
 *   # = wall
 *   . = dot
 *   o = power pellet
 *   - = ghost door
 *   P = player start (treated as empty)
 *   G = ghost start (treated as empty)
 *   ' ' (space) = empty
 */
export const MAZE_DATA: string[] = [
  '############################',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#o####.#####.##.#####.####o#',
  '#.####.#####.##.#####.####.#',
  '#..........................#',
  '#.####.##.########.##.####.#',
  '#.####.##.########.##.####.#',
  '#......##....##....##......#',
  '######.##### ## #####.######',
  '     #.##### ## #####.#     ',
  '     #.##          ##.#     ',
  '     #.## ###--### ##.#     ',
  '######.## #GGGGGG# ##.######',
  '      .   #GGGGGG#   .      ',
  '######.## #GGGGGG# ##.######',
  '     #.## ######## ##.#     ',
  '     #.##          ##.#     ',
  '     #.## ######## ##.#     ',
  '######.## ######## ##.######',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#.####.#####.##.#####.####.#',
  '#o..##....... P.......##..o#',
  '###.##.##.########.##.##.###',
  '###.##.##.########.##.##.###',
  '#......##....##....##......#',
  '#.##########.##.##########.#',
  '#.##########.##.##########.#',
  '#..........................#',
  '############################',
];
```

**What's happening:**
- Row 0 and row 30 are solid walls forming the top and bottom borders.
- Rows 9-19 form the center area with the ghost house (`G` cells), the ghost door (`-`), and the side tunnels (spaces on the left and right edges of rows 9-18).
- `P` on row 23 marks Pac-Man's starting position. It becomes an `empty` cell in the grid.
- The four `o` characters (rows 3 and 23, near the left and right edges) are power pellets.
- Spaces outside the maze boundary (rows 9-18, columns 0-4 and 23-27) are empty -- this is where the tunnels let you wrap from left to right.

---

### 3. Create the Game Renderer

**File:** `src/games/pacman/renderers/GameRenderer.ts`

This renderer draws the maze walls, dots, and power pellets. We will add Pac-Man and ghost rendering in later steps.

```typescript
import type { PacManState } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: PacManState): void {
    const { cellSize: cs, offsetX: ox, offsetY: oy } = state;

    // Clear canvas to black
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    this.renderMaze(ctx, state, cs, ox, oy);
    this.renderDots(ctx, state, cs, ox, oy);
  }

  private renderMaze(
    ctx: CanvasRenderingContext2D,
    state: PacManState,
    cs: number,
    ox: number,
    oy: number,
  ): void {
    ctx.fillStyle = '#1a1a7e';
    ctx.strokeStyle = '#3333ff';
    ctx.lineWidth = 2;

    for (let y = 0; y < state.gridHeight; y++) {
      for (let x = 0; x < state.gridWidth; x++) {
        const cell = state.grid[y][x];
        if (cell.type === 'wall') {
          const px = ox + x * cs;
          const py = oy + y * cs;
          ctx.fillRect(px, py, cs, cs);

          // Draw blue border on sides adjacent to non-wall
          this.drawWallBorders(ctx, state, x, y, px, py, cs);
        } else if (cell.type === 'door') {
          const px = ox + x * cs;
          const py = oy + y * cs;
          ctx.fillStyle = '#ff88ff';
          ctx.fillRect(px, py + cs * 0.35, cs, cs * 0.3);
          ctx.fillStyle = '#1a1a7e';
        }
      }
    }
  }

  private drawWallBorders(
    ctx: CanvasRenderingContext2D,
    state: PacManState,
    x: number,
    y: number,
    px: number,
    py: number,
    cs: number,
  ): void {
    const isWall = (cx: number, cy: number) => {
      if (cx < 0 || cx >= state.gridWidth || cy < 0 || cy >= state.gridHeight) return true;
      return state.grid[cy][cx].type === 'wall';
    };

    ctx.strokeStyle = '#3333ff';
    ctx.lineWidth = 1.5;

    if (!isWall(x, y - 1)) {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + cs, py);
      ctx.stroke();
    }
    if (!isWall(x, y + 1)) {
      ctx.beginPath();
      ctx.moveTo(px, py + cs);
      ctx.lineTo(px + cs, py + cs);
      ctx.stroke();
    }
    if (!isWall(x - 1, y)) {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, py + cs);
      ctx.stroke();
    }
    if (!isWall(x + 1, y)) {
      ctx.beginPath();
      ctx.moveTo(px + cs, py);
      ctx.lineTo(px + cs, py + cs);
      ctx.stroke();
    }
  }

  private renderDots(
    ctx: CanvasRenderingContext2D,
    state: PacManState,
    cs: number,
    ox: number,
    oy: number,
  ): void {
    const time = state.time;

    for (let y = 0; y < state.gridHeight; y++) {
      for (let x = 0; x < state.gridWidth; x++) {
        const cell = state.grid[y][x];
        const cx = ox + x * cs + cs / 2;
        const cy = oy + y * cs + cs / 2;

        if (cell.type === 'dot') {
          ctx.fillStyle = '#ffcc99';
          ctx.beginPath();
          ctx.arc(cx, cy, cs * 0.12, 0, Math.PI * 2);
          ctx.fill();
        } else if (cell.type === 'power') {
          // Pulsing power pellet
          const pulse = 0.6 + 0.4 * Math.sin(time * 6);
          const radius = cs * 0.3 * pulse;
          ctx.fillStyle = '#ffcc99';
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}
```

**What's happening:**
- The maze renders in two passes: first fill dark-blue rectangles for every wall cell, then draw bright-blue border lines on any wall edge that faces a non-wall cell. This creates the outlined-wall aesthetic of the original game.
- `isWall()` treats out-of-bounds coordinates as walls. This prevents border lines from appearing along the outer edge of the maze.
- The ghost house door (`-`) draws as a thin pink bar at 35% from the top of the cell, 30% tall. This is a visual hint that ghosts exit here.
- Regular dots are small circles (`radius = cs * 0.12`). Power pellets are larger (`cs * 0.3`) and pulse using `Math.sin(time * 6)` so they catch the player's eye.

---

### 4. Create the Engine

**File:** `src/games/pacman/PacManEngine.ts`

Wire together maze parsing, state creation, and the render loop.

```typescript
import type { PacManState, Cell } from './types';
import { MAZE_COLS, MAZE_ROWS, INITIAL_LIVES } from './types';
import { MAZE_DATA } from './data/maze';
import { GameRenderer } from './renderers/GameRenderer';

export class PacManEngine {
  private ctx: CanvasRenderingContext2D;
  private state: PacManState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private gameRenderer: GameRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.buildInitialState(canvas);
    this.gameRenderer = new GameRenderer();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.updateCellSize(canvas);
    };

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
    window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    this.lastTime = now;
    this.state.time = now / 1000;

    this.gameRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private buildInitialState(canvas: HTMLCanvasElement): PacManState {
    const grid: Cell[][] = [];
    let totalDots = 0;
    let playerStart = { x: 13.5, y: 23 };

    for (let y = 0; y < MAZE_ROWS; y++) {
      const row: Cell[] = [];
      const line = MAZE_DATA[y] || '';
      for (let x = 0; x < MAZE_COLS; x++) {
        const ch = line[x] || ' ';
        let type: Cell['type'] = 'empty';
        switch (ch) {
          case '#': type = 'wall'; break;
          case '.': type = 'dot'; totalDots++; break;
          case 'o': type = 'power'; totalDots++; break;
          case '-': type = 'door'; break;
          case 'P':
            playerStart = { x, y };
            type = 'empty';
            break;
          case 'G':
            type = 'empty';
            break;
        }
        row.push({ type });
      }
      grid.push(row);
    }

    const cs = this.computeCellSize(canvas.width, canvas.height);
    const offsetX = (canvas.width - MAZE_COLS * cs) / 2;
    const offsetY = (canvas.height - MAZE_ROWS * cs) / 2 + 10;

    return {
      grid,
      gridWidth: MAZE_COLS,
      gridHeight: MAZE_ROWS,
      pacman: {
        pos: { ...playerStart },
        dir: 'none',
        nextDir: 'none',
        mouthAngle: 0.4,
        mouthOpening: true,
      },
      ghosts: [],
      score: 0,
      highScore: 0,
      lives: INITIAL_LIVES,
      level: 1,
      totalDots,
      dotsEaten: 0,
      frightenedTimer: 0,
      frightenedGhostsEaten: 0,
      modeTimer: 0,
      modeIndex: 0,
      globalMode: 'scatter',
      gameOver: false,
      paused: false,
      started: false,
      won: false,
      time: 0,
      cellSize: cs,
      offsetX,
      offsetY,
    };
  }

  private computeCellSize(w: number, h: number): number {
    const maxW = (w - 20) / MAZE_COLS;
    const maxH = (h - 60) / MAZE_ROWS;
    return Math.floor(Math.min(maxW, maxH));
  }

  private updateCellSize(canvas: HTMLCanvasElement): void {
    const cs = this.computeCellSize(canvas.width, canvas.height);
    this.state.cellSize = cs;
    this.state.offsetX = (canvas.width - MAZE_COLS * cs) / 2;
    this.state.offsetY = (canvas.height - MAZE_ROWS * cs) / 2 + 10;
  }
}
```

**What's happening:**
- `buildInitialState` iterates every row and column of `MAZE_DATA`, converting characters to `Cell` objects. It counts dots (including power pellets) into `totalDots` for the win condition later.
- `computeCellSize` finds the largest integer cell size that fits within the viewport with 20px horizontal and 60px vertical padding. `Math.floor` ensures pixel-perfect alignment.
- `offsetX` and `offsetY` center the maze. The extra `+10` on Y leaves room for the HUD bar at the top.
- The `ghosts` array is empty for now -- we add them in Step 4.
- The game loop is minimal: update `state.time` and render. No physics yet.

---

### 5. Create the Entry Point

**File:** `src/games/pacman/index.ts`

Export a factory function so the game menu can launch Pac-Man.

```typescript
import { PacManEngine } from './PacManEngine';

export function createPacMan(canvas: HTMLCanvasElement): { destroy: () => void } {
  const engine = new PacManEngine(canvas);
  engine.start();
  return { destroy: () => engine.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Pac-Man game
3. **Observe:**
   - Black background with the blue maze centered on screen
   - Small cream-colored dots filling the corridors
   - Four large pulsing power pellets near the corners
   - A pink ghost-house door near the center of the maze
   - Resize the browser window and the maze scales to fit

**Look closely at the walls.** Every wall edge that borders a corridor has a bright-blue line. Interior wall faces (wall-to-wall) have no border. This is what creates the classic Pac-Man outlined-wall look.

---

## Try It

- Change `'#1a1a7e'` to `'#004400'` in `renderMaze` for a green maze.
- Replace `cs * 0.12` with `cs * 0.25` to make the dots comically large.
- Comment out the `drawWallBorders` call to see the flat dark-blue rectangles without outlines -- notice how much the borders add.

---

## Challenges

**Easy:**
- Change the power pellet color from cream to bright white.
- Make dots render as small squares instead of circles.

**Medium:**
- Add a subtle glow (`shadowBlur`) behind the wall borders.
- Render a grid of faint lines across the entire canvas behind the maze for a retro CRT effect.

**Hard:**
- Parse a second maze layout string and toggle between layouts with a key press.
- Draw rounded corners on walls that have exactly two non-wall neighbors at a right angle.

---

## What You Learned

- Parsing a string-based tile map into a typed 2D grid
- Responsive cell-size calculation with `Math.floor(Math.min(maxW, maxH))`
- Conditional wall-border rendering based on neighbor cell types
- Pulsing animation with `Math.sin(time * frequency)`
- Canvas centering with computed offsets

**Next:** Move Pac-Man through the maze with arrow keys and direction queuing.
