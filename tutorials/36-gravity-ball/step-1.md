# Step 1: Project Setup & Level Rendering

**Goal:** Draw a tile-based level with walls and the ball, centered on a dark canvas.

**Time:** ~15 minutes

---

## What You'll Build

- **Type definitions** for the entire Gravity Ball game state
- **Tile-based level grid** with wall tiles drawn as 3D-shaded blocks
- **Ball rendering** with a radial gradient and shine highlight
- **Exit marker** drawn as a glowing green circle with a diamond shape
- **Responsive layout** that centers the grid on any screen size

---

## Concepts

- **Tile-Based Levels**: The play area is a grid of cells. Each cell is either empty (the ball can pass through) or a wall (blocks movement). Border walls form the outer frame, and interior walls create the puzzle.
- **Wall Set for Fast Lookup**: Walls are stored both as an array (for rendering) and as a `Set<string>` keyed by `"x,y"` (for O(1) collision checks later).
- **Level Definition**: A `LevelDef` describes the grid dimensions, ball start position, exit position, and wall positions. This data-driven approach means adding new levels requires zero code changes.
- **Centered Grid Layout**: `Math.min(maxW / gridWidth, maxH / gridHeight)` gives us the largest cell size that fits the viewport, then we offset to center it.

---

## Code

### 1. Create Types

**File:** `src/games/gravity-ball/types.ts`

All types for the entire game, defined up front so later steps never need to modify this file.

```typescript
/** Direction gravity can pull the ball */
export type GravityDir = 'down' | 'up' | 'left' | 'right';

/** Position on the grid */
export interface Pos {
  x: number;
  y: number;
}

/** Ball entity */
export interface Ball {
  /** Current grid position */
  pos: Pos;
  /** Previous positions for trail rendering */
  trail: Pos[];
}

/** Wall segment on the grid */
export interface Wall {
  x: number;
  y: number;
}

/** Exit marker */
export interface Exit {
  x: number;
  y: number;
}

/** Level definition */
export interface LevelDef {
  /** Grid width in cells */
  width: number;
  /** Grid height in cells */
  height: number;
  /** Ball starting position */
  ballStart: Pos;
  /** Exit position */
  exit: Exit;
  /** Wall positions */
  walls: Wall[];
}

/** Full game state */
export interface GravityState {
  /** Current gravity direction */
  gravity: GravityDir;
  /** The ball */
  ball: Ball;
  /** Exit marker */
  exit: Exit;
  /** Set of walls indexed as "x,y" for fast lookup */
  wallSet: Set<string>;
  /** Wall list for rendering */
  walls: Wall[];
  /** Grid dimensions */
  gridWidth: number;
  gridHeight: number;
  /** Current level index (0-based) */
  level: number;
  /** Number of gravity changes (moves) this level */
  moves: number;
  /** Whether the ball is currently sliding */
  sliding: boolean;
  /** Slide animation progress (0 to 1) */
  slideProgress: number;
  /** Slide start position */
  slideFrom: Pos;
  /** Slide target position */
  slideTo: Pos;
  /** Whether the current level is complete */
  levelComplete: boolean;
  /** Whether all levels are complete */
  gameWon: boolean;
  /** Canvas dimensions */
  canvasWidth: number;
  canvasHeight: number;
  /** Queued gravity direction from input */
  queuedGravity: GravityDir | null;
  /** Request to restart level */
  restartRequested: boolean;
  /** Request to advance to next level */
  advanceRequested: boolean;
  /** Level complete animation timer */
  completeTimer: number;
  /** Exit glow animation phase */
  glowPhase: number;
}

// Visual constants
export const COLORS = {
  background: '#1a1a2e',
  grid: 'rgba(255, 255, 255, 0.04)',
  wall: '#546e7a',
  wallHighlight: '#78909c',
  ball: '#e0e0e0',
  ballCore: '#ffffff',
  trail: 'rgba(120, 144, 156, 0.3)',
  exit: '#4caf50',
  exitGlow: 'rgba(76, 175, 80, 0.4)',
  hud: '#cfd8dc',
  hudDim: '#78909c',
  overlay: 'rgba(0, 0, 0, 0.75)',
  overlayText: '#ffffff',
  accent: '#78909c',
  arrowIndicator: '#78909c',
};

export const GAME_COLOR = '#78909c';

/** Slide speed: cells per second */
export const SLIDE_SPEED = 18;

/** Max trail length */
export const MAX_TRAIL = 12;
```

**What's happening:**
- `GravityDir` restricts gravity to four compass directions. The ball always slides in the current gravity direction until it hits a wall.
- `Ball` tracks its grid position and a trail of previous positions (used for a fading trail effect later).
- `GravityState` holds everything: the ball, walls, grid size, level index, sliding animation state, and completion flags. Defining it all now saves us from restructuring later.
- `COLORS` centralizes every color in the game so you can reskin it by editing one object.
- `SLIDE_SPEED` and `MAX_TRAIL` are tuning constants we will use in Step 2.

---

### 2. Create Level Data

**File:** `src/games/gravity-ball/data/levels.ts`

A single starter level so we can see the grid rendering. We will add more levels in Step 5.

```typescript
import type { LevelDef } from '../types';

/** Helper: generate border walls for a grid of given width x height */
function border(w: number, h: number): { x: number; y: number }[] {
  const result: { x: number; y: number }[] = [];

  for (let x = 0; x < w; x++) {
    result.push({ x, y: 0 });
    result.push({ x, y: h - 1 });
  }

  for (let y = 1; y < h - 1; y++) {
    result.push({ x: 0, y });
    result.push({ x: w - 1, y });
  }

  return result;
}

export const LEVELS: LevelDef[] = [
  // Level 1 — Tutorial: simple drop down to exit
  {
    width: 7,
    height: 7,
    ballStart: { x: 3, y: 1 },
    exit: { x: 3, y: 5 },
    walls: [
      ...border(7, 7),
      // Small platform
      { x: 2, y: 3 },
      { x: 4, y: 3 },
    ],
  },
];
```

**What's happening:**
- The `border()` helper generates wall tiles around the perimeter of any grid size, so every level is automatically enclosed.
- Level 1 is a simple 7x7 grid. The ball starts at (3,1) near the top, and the exit is at (3,5) near the bottom. Two interior walls at (2,3) and (4,3) act as small platforms.
- The `LEVELS` array is exported so both the engine and renderers can reference it. We will grow this array in Step 5.

---

### 3. Create the Game Renderer

**File:** `src/games/gravity-ball/renderers/GameRenderer.ts`

Draws the grid lines, walls, exit, and ball.

```typescript
import type { GravityState } from '../types';
import { COLORS } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: GravityState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Clear background
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, W, H);

    // Calculate cell size and offset to center the grid
    const maxGridW = W * 0.8;
    const maxGridH = H * 0.75;
    const cellSize = Math.floor(
      Math.min(maxGridW / state.gridWidth, maxGridH / state.gridHeight),
    );
    const gridW = cellSize * state.gridWidth;
    const gridH = cellSize * state.gridHeight;
    const offsetX = Math.floor((W - gridW) / 2);
    const offsetY = Math.floor((H - gridH) / 2) + 20;

    // Draw grid lines
    this.drawGrid(ctx, state, cellSize, offsetX, offsetY);

    // Draw walls
    this.drawWalls(ctx, state, cellSize, offsetX, offsetY);

    // Draw exit
    this.drawExit(ctx, state, cellSize, offsetX, offsetY);

    // Draw ball
    this.drawBall(ctx, state, cellSize, offsetX, offsetY);
  }

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    state: GravityState,
    cell: number,
    ox: number,
    oy: number,
  ): void {
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;

    for (let x = 0; x <= state.gridWidth; x++) {
      ctx.beginPath();
      ctx.moveTo(ox + x * cell, oy);
      ctx.lineTo(ox + x * cell, oy + state.gridHeight * cell);
      ctx.stroke();
    }

    for (let y = 0; y <= state.gridHeight; y++) {
      ctx.beginPath();
      ctx.moveTo(ox, oy + y * cell);
      ctx.lineTo(ox + state.gridWidth * cell, oy + y * cell);
      ctx.stroke();
    }
  }

  private drawWalls(
    ctx: CanvasRenderingContext2D,
    state: GravityState,
    cell: number,
    ox: number,
    oy: number,
  ): void {
    for (const wall of state.walls) {
      const wx = ox + wall.x * cell;
      const wy = oy + wall.y * cell;

      // Wall body
      ctx.fillStyle = COLORS.wall;
      ctx.fillRect(wx, wy, cell, cell);

      // Highlight on top/left edge (3D effect)
      ctx.fillStyle = COLORS.wallHighlight;
      ctx.fillRect(wx, wy, cell, 2);
      ctx.fillRect(wx, wy, 2, cell);

      // Dark edge on bottom/right
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(wx + cell - 2, wy, 2, cell);
      ctx.fillRect(wx, wy + cell - 2, cell, 2);
    }
  }

  private drawExit(
    ctx: CanvasRenderingContext2D,
    state: GravityState,
    cell: number,
    ox: number,
    oy: number,
  ): void {
    const ex = ox + state.exit.x * cell + cell / 2;
    const ey = oy + state.exit.y * cell + cell / 2;
    const radius = (cell / 2) * 0.7;

    // Outer glow
    ctx.fillStyle = COLORS.exitGlow;
    ctx.beginPath();
    ctx.arc(ex, ey, radius * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = COLORS.exit;
    ctx.beginPath();
    ctx.arc(ex, ey, radius, 0, Math.PI * 2);
    ctx.fill();

    // Diamond shape inside
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    const s = radius * 0.4;
    ctx.moveTo(ex, ey - s);
    ctx.lineTo(ex + s * 0.6, ey);
    ctx.lineTo(ex, ey + s);
    ctx.lineTo(ex - s * 0.6, ey);
    ctx.closePath();
    ctx.fill();
  }

  private drawBall(
    ctx: CanvasRenderingContext2D,
    state: GravityState,
    cell: number,
    ox: number,
    oy: number,
  ): void {
    const bx = state.ball.pos.x;
    const by = state.ball.pos.y;

    const px = ox + bx * cell + cell / 2;
    const py = oy + by * cell + cell / 2;
    const radius = (cell / 2) * 0.7;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(px + 2, py + 2, radius, 0, Math.PI * 2);
    ctx.fill();

    // Ball gradient
    const grad = ctx.createRadialGradient(
      px - radius * 0.3,
      py - radius * 0.3,
      radius * 0.1,
      px,
      py,
      radius,
    );
    grad.addColorStop(0, COLORS.ballCore);
    grad.addColorStop(1, COLORS.ball);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();

    // Shine highlight
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(
      px - radius * 0.25,
      py - radius * 0.25,
      radius * 0.25,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}
```

**What's happening:**
- Layout calculation uses 80% of canvas width and 75% of height as maximum grid area, then picks the largest cell size that fits both dimensions. The grid is centered horizontally and shifted down slightly for HUD space.
- Walls are drawn as filled rectangles with a 2px highlight on the top and left edges, and a dark strip on the bottom and right. This cheap trick gives every block a subtle 3D look.
- The exit is three concentric circles (glow, core, diamond) that clearly mark the goal in green.
- The ball uses a `createRadialGradient` to go from bright white in the upper-left to grey at the edges, plus a small shine circle. The 2px offset shadow grounds it visually.

---

### 4. Create the Engine

**File:** `src/games/gravity-ball/GravityEngine.ts`

The engine creates the state, loads the first level, and runs the render loop.

```typescript
import type { GravityState } from './types';
import { GameRenderer } from './renderers/GameRenderer';
import { LEVELS } from './data/levels';

export class GravityEngine {
  private ctx: CanvasRenderingContext2D;
  private state: GravityState;
  private running = false;
  private rafId = 0;

  private gameRenderer: GameRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize state with placeholder values — loadLevel fills them
    this.state = {
      gravity: 'down',
      ball: { pos: { x: 0, y: 0 }, trail: [] },
      exit: { x: 0, y: 0 },
      wallSet: new Set<string>(),
      walls: [],
      gridWidth: 0,
      gridHeight: 0,
      level: 0,
      moves: 0,
      sliding: false,
      slideProgress: 0,
      slideFrom: { x: 0, y: 0 },
      slideTo: { x: 0, y: 0 },
      levelComplete: false,
      gameWon: false,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      queuedGravity: null,
      restartRequested: false,
      advanceRequested: false,
      completeTimer: 0,
      glowPhase: 0,
    };

    this.gameRenderer = new GameRenderer();

    // Load first level
    this.loadLevel(0);

    // Resize handler
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasWidth = canvas.width;
      this.state.canvasHeight = canvas.height;
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

  private loadLevel(levelIndex: number): void {
    const level = LEVELS[levelIndex];
    this.state.level = levelIndex;
    this.state.gravity = 'down';
    this.state.moves = 0;
    this.state.sliding = false;
    this.state.levelComplete = false;
    this.state.gameWon = false;
    this.state.queuedGravity = null;

    this.state.gridWidth = level.width;
    this.state.gridHeight = level.height;

    this.state.ball = {
      pos: { x: level.ballStart.x, y: level.ballStart.y },
      trail: [],
    };

    this.state.exit = { x: level.exit.x, y: level.exit.y };

    this.state.walls = level.walls.map((w) => ({ x: w.x, y: w.y }));
    this.state.wallSet = new Set<string>();
    for (const w of level.walls) {
      this.state.wallSet.add(`${w.x},${w.y}`);
    }
  }
}
```

**What's happening:**
- The constructor creates a full `GravityState` with safe defaults, then immediately calls `loadLevel(0)` to populate it from the first level definition.
- `loadLevel()` copies data from the `LevelDef` into the state: grid dimensions, ball start position, exit, and walls. It also builds the `wallSet` for O(1) collision lookups.
- The game loop calls `gameRenderer.render()` on every animation frame. There is no physics yet -- the ball just sits at its start position.
- The resize handler keeps the canvas full-screen. The renderer recalculates layout every frame, so resizing is automatic.

---

### 5. Create the Platform Adapter

**File:** `src/games/gravity-ball/adapters/PlatformAdapter.ts`

A thin wrapper so the game plugs into any host page.

```typescript
import { GravityEngine } from '../GravityEngine';

export class PlatformAdapter {
  private engine: GravityEngine;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new GravityEngine(canvas);
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

### 6. Create the Entry Point

**File:** `src/games/gravity-ball/index.ts`

```typescript
import { PlatformAdapter } from './adapters/PlatformAdapter';

export function createGravityBall(canvas: HTMLCanvasElement): { destroy: () => void } {
  const adapter = new PlatformAdapter(canvas);
  adapter.start();
  return { destroy: () => adapter.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Gravity Ball game in your browser
3. **Observe:**
   - Dark navy background (`#1a1a2e`) filling the entire screen
   - A **7x7 grid** centered on screen with faint grid lines
   - **Grey wall blocks** forming a border around the grid, plus two interior walls
   - A **white ball** with gradient shading and a shine highlight at position (3,1)
   - A **green glowing exit** with a diamond marker at position (3,5)
   - **Resize the window** and watch the grid scale and re-center automatically

---

## Challenges

**Easy:**
- Change `COLORS.wall` to `'#8d6e63'` (brown) and see how the walls look with a warm palette.
- Increase the ball radius from `0.7` to `0.85` to make it fill more of its cell.

**Medium:**
- Add a second interior wall at `{ x: 3, y: 3 }` to create a wall column in the middle. How does it change the puzzle?

**Hard:**
- Add coordinate labels along the top (0-6) and left side (0-6) of the grid, drawn in `COLORS.hudDim` with a small monospace font.

---

## What You Learned

- Defining a complete game state type with ball, wall, grid, and animation fields
- Drawing a tile-based grid with centered layout that adapts to any viewport
- Rendering 3D-styled wall blocks using highlight and shadow edge strips
- Drawing a ball with radial gradient shading and a glowing exit marker

**Next:** Gravity & Ball Physics -- make the ball slide in the current gravity direction until it hits a wall!
