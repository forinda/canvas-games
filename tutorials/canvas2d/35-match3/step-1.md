# Step 1: Project Setup & Gem Grid

**Goal:** Draw an 8x8 grid of colorful gems on the canvas with a dark background and responsive layout.

**Time:** ~15 minutes

---

## What You'll Build

- **8x8 gem grid** with 6 distinct gem colours rendered as glowing circles
- **Dark background** with the board centered on screen
- **Responsive layout** that scales and re-centers on window resize
- **Type definitions** for the entire game state (gems, board, phases)

---

## Concepts

- **Gem Grid Structure**: A Match-3 board is an 8x8 grid where each cell holds a gem of one of 6 colour types. The board is stored as a 2D array of `Gem | null` (null cells represent empty spaces waiting to be filled).
- **Gem Representation**: Each gem tracks its type (colour), grid position (`row`, `col`), pixel position (`x`, `y`) for animation, and visual properties (`scale`, `opacity`).
- **Match-Free Initialisation**: When placing gems randomly, we must ensure no 3-in-a-row matches exist on the starting board. We check the two gems to the left and two above each new gem and re-roll if they would form a run.
- **Layout Calculation**: `Math.min((canvasW - 80) / COLS, (canvasH - 120) / ROWS)` produces square cells that fit the viewport with padding for the HUD.

---

## Code

### 1. Create Types

**File:** `src/contexts/canvas2d/games/match3/types.ts`

All the types we will need across every step, defined up front so later files never need modification.

```typescript
/** All gem type identifiers — 6 distinct colors */
export const GEM_TYPES = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'] as const;
export type GemType = (typeof GEM_TYPES)[number];

/** Map gem type to its display colour */
export const GEM_COLORS: Record<GemType, string> = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7',
};

/** Map gem type to its glow colour */
export const GEM_GLOW: Record<GemType, string> = {
  red: '#fca5a5',
  orange: '#fdba74',
  yellow: '#fde047',
  green: '#86efac',
  blue: '#93c5fd',
  purple: '#d8b4fe',
};

export interface Gem {
  type: GemType;
  row: number;
  col: number;
  /** Pixel x position (animated) */
  x: number;
  /** Pixel y position (animated) */
  y: number;
  /** Whether the gem is currently falling */
  falling: boolean;
  /** Scale factor for match flash animation (1 = normal) */
  scale: number;
  /** Opacity (0-1), used for match removal fade */
  opacity: number;
}

export type Phase =
  | 'idle'
  | 'swapping'
  | 'swap-back'
  | 'matching'
  | 'removing'
  | 'falling'
  | 'game-over';

export interface Match3State {
  /** 8x8 board; null cells are empty (waiting for gravity fill) */
  board: (Gem | null)[][];
  rows: number;
  cols: number;
  cellSize: number;
  boardOffsetX: number;
  boardOffsetY: number;

  /** Currently selected gem coordinates */
  selected: { row: number; col: number } | null;
  /** Swap source & target for animation */
  swapA: { row: number; col: number } | null;
  swapB: { row: number; col: number } | null;

  phase: Phase;
  phaseTimer: number;

  score: number;
  highScore: number;
  combo: number;
  movesLeft: number;
  maxMoves: number;

  /** Matched gems awaiting removal */
  matched: Set<string>;

  paused: boolean;
  started: boolean;
  gameOver: boolean;

  canvasW: number;
  canvasH: number;
}

export const ROWS = 8;
export const COLS = 8;
export const MAX_MOVES = 30;
export const HS_KEY = 'match3_highscore';

/** Duration constants in ms */
export const SWAP_DURATION = 180;
export const REMOVE_DURATION = 200;
export const FALL_SPEED = 800; // pixels per second
```

**What's happening:**
- `GEM_TYPES` defines the 6 gem colours as a const tuple so TypeScript can narrow the type to a union of string literals.
- `GEM_COLORS` and `GEM_GLOW` map each gem type to a fill colour and a lighter glow colour for the radial gradient.
- `Gem` stores both logical position (`row`, `col`) and pixel position (`x`, `y`). Having separate pixel coordinates lets us animate gems smoothly between grid positions.
- `Match3State` holds everything: the board, selection state, current phase, score, and layout offsets. Defining it all now means we never need to restructure later.
- `Phase` is a string union that drives the game's state machine. We start with `'idle'` and will add transitions in later steps.

---

### 2. Create the Board Renderer

**File:** `src/contexts/canvas2d/games/match3/renderers/BoardRenderer.ts`

Draws the board background, subtle grid lines, and each gem as a glowing circle with a specular highlight.

```typescript
import type { Match3State } from '../types';
import { GEM_COLORS, GEM_GLOW, ROWS, COLS } from '../types';

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: Match3State): void {
    const { board, cellSize, boardOffsetX, boardOffsetY } = state;

    // Board background
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.roundRect(
      boardOffsetX - 4,
      boardOffsetY - 4,
      COLS * cellSize + 8,
      ROWS * cellSize + 8,
      12,
    );
    ctx.fill();

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;

    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(boardOffsetX, boardOffsetY + r * cellSize);
      ctx.lineTo(boardOffsetX + COLS * cellSize, boardOffsetY + r * cellSize);
      ctx.stroke();
    }

    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(boardOffsetX + c * cellSize, boardOffsetY);
      ctx.lineTo(boardOffsetX + c * cellSize, boardOffsetY + ROWS * cellSize);
      ctx.stroke();
    }

    // Gems
    const radius = cellSize * 0.38;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gem = board[r][c];
        if (!gem) continue;

        ctx.save();
        ctx.globalAlpha = gem.opacity;

        const cx = gem.x;
        const cy = gem.y;
        const drawRadius = radius * gem.scale;

        // Glow
        ctx.shadowColor = GEM_GLOW[gem.type];
        ctx.shadowBlur = 8;

        // Main circle with radial gradient
        const gradient = ctx.createRadialGradient(
          cx - drawRadius * 0.3,
          cy - drawRadius * 0.3,
          drawRadius * 0.1,
          cx,
          cy,
          drawRadius,
        );
        gradient.addColorStop(0, GEM_GLOW[gem.type]);
        gradient.addColorStop(1, GEM_COLORS[gem.type]);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, drawRadius, 0, Math.PI * 2);
        ctx.fill();

        // Specular highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.ellipse(
          cx - drawRadius * 0.2,
          cy - drawRadius * 0.25,
          drawRadius * 0.35,
          drawRadius * 0.2,
          -0.5,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        ctx.restore();
      }
    }
  }
}
```

**What's happening:**
- The board background is a rounded dark rectangle drawn slightly larger than the grid.
- Grid lines are drawn at 5% white opacity so they are barely visible -- just enough to hint at cell boundaries.
- Each gem is drawn as a circle at its pixel position (`gem.x`, `gem.y`). A radial gradient runs from the lighter glow colour (top-left offset) to the solid colour, giving a 3D sphere effect.
- A small white ellipse is drawn offset from the gem centre to simulate a specular highlight (the shiny spot on a sphere).
- `ctx.save()` / `ctx.restore()` isolates each gem's opacity and shadow settings.

---

### 3. Create the Board System

**File:** `src/contexts/canvas2d/games/match3/systems/BoardSystem.ts`

For now, the board system only handles initialisation: filling the grid with random gems while avoiding any starting matches.

```typescript
import type { Gem, GemType, Match3State } from '../types';
import { GEM_TYPES, ROWS, COLS } from '../types';

export class BoardSystem {
  /** Create a board with no initial matches */
  initBoard(state: Match3State): void {
    const board: (Gem | null)[][] = [];

    for (let r = 0; r < ROWS; r++) {
      board[r] = [];
      for (let c = 0; c < COLS; c++) {
        board[r][c] = this.createGem(r, c, state, board);
      }
    }

    state.board = board;
  }

  update(_state: Match3State, _dt: number): void {
    // No-op for now — we will add phase logic in later steps
  }

  private createGem(
    row: number,
    col: number,
    state: Match3State,
    board: (Gem | null)[][],
  ): Gem {
    const { cellSize, boardOffsetX, boardOffsetY } = state;
    let type: GemType;

    // Avoid initial matches of 3
    do {
      type = GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
    } while (this.causesMatch(board, row, col, type));

    return {
      type,
      row,
      col,
      x: boardOffsetX + col * cellSize + cellSize / 2,
      y: boardOffsetY + row * cellSize + cellSize / 2,
      falling: false,
      scale: 1,
      opacity: 1,
    };
  }

  private causesMatch(
    board: (Gem | null)[][],
    row: number,
    col: number,
    type: GemType,
  ): boolean {
    // Check horizontal (left 2)
    if (
      col >= 2 &&
      board[row][col - 1]?.type === type &&
      board[row][col - 2]?.type === type
    )
      return true;

    // Check vertical (up 2)
    if (
      row >= 2 &&
      board[row - 1]?.[col]?.type === type &&
      board[row - 2]?.[col]?.type === type
    )
      return true;

    return false;
  }
}
```

**What's happening:**
- `initBoard` fills the board left-to-right, top-to-bottom. For each cell, it picks a random gem type and re-rolls if placing it would create a run of 3.
- `causesMatch` only checks leftward and upward because those are the only directions already filled at generation time. If the two gems to the left (or above) are the same type, we reject.
- Each gem's pixel position is set to the centre of its grid cell using `boardOffsetX + col * cellSize + cellSize / 2`.

---

### 4. Create the Engine

**File:** `src/contexts/canvas2d/games/match3/Match3Engine.ts`

The engine creates the initial state, computes layout, and runs the render loop.

```typescript
import type { Match3State } from './types';
import { ROWS, COLS, MAX_MOVES } from './types';
import { BoardSystem } from './systems/BoardSystem';
import { BoardRenderer } from './renderers/BoardRenderer';

export class Match3Engine {
  private ctx: CanvasRenderingContext2D;
  private state: Match3State;
  private running = false;
  private rafId = 0;

  private boardSystem: BoardSystem;
  private boardRenderer: BoardRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cellSize = Math.floor(
      Math.min((canvas.width - 80) / COLS, (canvas.height - 120) / ROWS),
    );
    const boardW = COLS * cellSize;
    const boardH = ROWS * cellSize;

    this.state = {
      board: [],
      rows: ROWS,
      cols: COLS,
      cellSize,
      boardOffsetX: (canvas.width - boardW) / 2,
      boardOffsetY: (canvas.height - boardH) / 2 + 24,
      selected: null,
      swapA: null,
      swapB: null,
      phase: 'idle',
      phaseTimer: 0,
      score: 0,
      highScore: 0,
      combo: 0,
      movesLeft: MAX_MOVES,
      maxMoves: MAX_MOVES,
      matched: new Set(),
      paused: false,
      started: true,
      gameOver: false,
      canvasW: canvas.width,
      canvasH: canvas.height,
    };

    this.boardSystem = new BoardSystem();
    this.boardRenderer = new BoardRenderer();

    // Init board (must happen after state is set up with cellSize/offsets)
    this.boardSystem.initBoard(this.state);

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.recalcLayout(canvas);
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
    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    const { ctx, state } = this;

    // Clear
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, state.canvasW, state.canvasH);

    this.boardRenderer.render(ctx, state);
  }

  private recalcLayout(canvas: HTMLCanvasElement): void {
    const s = this.state;
    s.canvasW = canvas.width;
    s.canvasH = canvas.height;
    s.cellSize = Math.floor(
      Math.min((canvas.width - 80) / COLS, (canvas.height - 120) / ROWS),
    );
    const boardW = COLS * s.cellSize;
    const boardH = ROWS * s.cellSize;

    s.boardOffsetX = (canvas.width - boardW) / 2;
    s.boardOffsetY = (canvas.height - boardH) / 2 + 24;

    // Snap all gems to new positions
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gem = s.board[r]?.[c];
        if (gem) {
          gem.x = s.boardOffsetX + c * s.cellSize + s.cellSize / 2;
          gem.y = s.boardOffsetY + r * s.cellSize + s.cellSize / 2;
        }
      }
    }
  }
}
```

**What's happening:**
- The constructor sizes the canvas to fill the window, creates the full state object, and computes the responsive layout.
- `cellSize` is calculated so the board fits with 80px horizontal padding and 120px vertical padding (room for a HUD).
- `recalcLayout` fires on window resize and snaps every gem to its new pixel position so the board re-centres instantly.
- The game loop simply calls `render()` each frame. We will add `update()` calls in later steps.

---

### 5. Create the Platform Adapter & Entry Point

**File:** `src/contexts/canvas2d/games/match3/adapters/PlatformAdapter.ts`

```typescript
import { Match3Engine } from '../Match3Engine';

export class PlatformAdapter {
  private engine: Match3Engine;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Match3Engine(canvas);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

**File:** `src/contexts/canvas2d/games/match3/index.ts`

```typescript
import { PlatformAdapter } from './adapters/PlatformAdapter';

export function createMatch3(canvas: HTMLCanvasElement): { destroy: () => void } {
  const adapter = new PlatformAdapter(canvas);
  adapter.start();
  return { destroy: () => adapter.destroy() };
}
```

---

## Test It

1. **Run:** `pnpm dev`
2. **Open:** the Match-3 game in your browser
3. **Observe:**
   - Dark background with a centred **8x8 grid** of colourful gems
   - Each gem is a **glowing circle** with a radial gradient and specular highlight
   - **6 distinct colours** (red, orange, yellow, green, blue, purple) distributed randomly
   - **No 3-in-a-row matches** anywhere on the starting board
   - **Resize the window** and watch the board scale and re-centre

---

## Challenges

**Easy:**
- Change `GEM_TYPES` to use only 4 colours and observe how the board looks with fewer gem varieties.
- Increase the gem radius from `0.38` to `0.45` for larger, more tightly packed gems.

**Medium:**
- Add a thin border (`ctx.strokeStyle`, `ctx.arc`, `ctx.stroke`) around each gem to make them stand out more against the dark background.

**Hard:**
- Draw gems as rounded squares instead of circles using `ctx.roundRect`, keeping the gradient and highlight effects.

---

## What You Learned

- Defining a complete game state type with gem, board, phase, and layout fields
- Drawing gems as glowing circles with radial gradients and specular highlights
- Generating a random match-free board by checking leftward and upward neighbours
- Computing responsive layout that centres and scales the board to any viewport

**Next:** Gem swapping -- click two adjacent gems to swap their positions on the board!

---
[Back to Game README](./README.md) | [Next Step ->](./step-2.md)
