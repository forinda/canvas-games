# Step 2: Tetrominoes & Spawning

**Goal:** Define all 7 tetromino shapes with their rotation matrices, spawn a random piece at the top of the board, and render it.

**Time:** ~15 minutes

---

## What You'll Build

- **7 piece definitions**: I, O, T, S, Z, J, L with distinct colors
- **Rotation matrices**: Each piece stores 4 rotations as arrays of `[row, col]` offsets
- **7-bag randomizer**: Every set of 7 pieces appears once before repeating, preventing long droughts
- **Spawn logic**: New piece appears centered at the top of the board
- **Piece rendering**: Current piece draws on the board using its color

---

## Concepts

- **Offset-based shapes**: Instead of storing a full grid for each piece, we store only the 4 occupied cell positions as `[row, col]` offsets from the piece origin. This makes collision checks a simple loop over 4 cells.
- **Rotation as data**: Each rotation state is a separate set of offsets. Rotating just means switching which offset array we read. No matrix math at runtime.
- **7-bag randomizer**: Shuffle the indices `[0..6]`, deal them one at a time. When the bag runs low, shuffle a fresh set. This guarantees you never go more than 12 pieces without seeing a specific shape.

---

## Code

### 1. Define Piece Data

**File:** `src/games/tetris/data/pieces.ts`

```typescript
import type { PieceDefinition } from '../types';

/**
 * All 7 standard Tetrominoes.
 * Each rotation is an array of [row, col] offsets from the piece origin.
 * Rotations are ordered: 0=spawn, 1=CW, 2=180, 3=CCW.
 */
export const PIECES: readonly PieceDefinition[] = [
  // I piece - cyan
  {
    id: 'I',
    color: '#00e5ff',
    rotations: [
      [[0, 0], [0, 1], [0, 2], [0, 3]],
      [[0, 2], [1, 2], [2, 2], [3, 2]],
      [[2, 0], [2, 1], [2, 2], [2, 3]],
      [[0, 1], [1, 1], [2, 1], [3, 1]],
    ],
  },
  // O piece - yellow
  {
    id: 'O',
    color: '#ffd600',
    rotations: [
      [[0, 0], [0, 1], [1, 0], [1, 1]],
      [[0, 0], [0, 1], [1, 0], [1, 1]],
      [[0, 0], [0, 1], [1, 0], [1, 1]],
      [[0, 0], [0, 1], [1, 0], [1, 1]],
    ],
  },
  // T piece - purple
  {
    id: 'T',
    color: '#aa00ff',
    rotations: [
      [[0, 0], [0, 1], [0, 2], [1, 1]],
      [[0, 0], [1, 0], [2, 0], [1, 1]],
      [[1, 0], [1, 1], [1, 2], [0, 1]],
      [[0, 1], [1, 1], [2, 1], [1, 0]],
    ],
  },
  // S piece - green
  {
    id: 'S',
    color: '#00e676',
    rotations: [
      [[0, 1], [0, 2], [1, 0], [1, 1]],
      [[0, 0], [1, 0], [1, 1], [2, 1]],
      [[0, 1], [0, 2], [1, 0], [1, 1]],
      [[0, 0], [1, 0], [1, 1], [2, 1]],
    ],
  },
  // Z piece - red
  {
    id: 'Z',
    color: '#ff1744',
    rotations: [
      [[0, 0], [0, 1], [1, 1], [1, 2]],
      [[0, 1], [1, 0], [1, 1], [2, 0]],
      [[0, 0], [0, 1], [1, 1], [1, 2]],
      [[0, 1], [1, 0], [1, 1], [2, 0]],
    ],
  },
  // J piece - blue
  {
    id: 'J',
    color: '#2979ff',
    rotations: [
      [[0, 0], [1, 0], [1, 1], [1, 2]],
      [[0, 0], [0, 1], [1, 0], [2, 0]],
      [[0, 0], [0, 1], [0, 2], [1, 2]],
      [[0, 1], [1, 1], [2, 0], [2, 1]],
    ],
  },
  // L piece - orange
  {
    id: 'L',
    color: '#ff9100',
    rotations: [
      [[0, 2], [1, 0], [1, 1], [1, 2]],
      [[0, 0], [1, 0], [2, 0], [2, 1]],
      [[0, 0], [0, 1], [0, 2], [1, 0]],
      [[0, 0], [0, 1], [1, 1], [2, 1]],
    ],
  },
];
```

**What's happening:**
- Each piece has an `id` (for display), a `color` (CSS string), and 4 `rotations`.
- Each rotation is an array of exactly 4 `[row, col]` offset pairs. For example, the I-piece in spawn rotation occupies `[0,0], [0,1], [0,2], [0,3]` -- a horizontal bar.
- The O-piece has identical rotations because a 2x2 square looks the same no matter how you rotate it.
- S and Z each have only 2 visually distinct rotations, so rotations 0 and 2 are the same, and 1 and 3 are the same.

---

### 2. Create the Board System

**File:** `src/games/tetris/systems/BoardSystem.ts`

We need collision detection so we can validate spawn positions:

```typescript
import type { TetrisState, CellColor } from '../types';
import { COLS, ROWS } from '../types';
import { PIECES } from '../data/pieces';

export class BoardSystem {
  /** Check if a piece at given position/rotation collides with walls or placed blocks */
  isColliding(
    board: CellColor[][],
    defIndex: number,
    rotation: number,
    x: number,
    y: number,
  ): boolean {
    const cells = PIECES[defIndex].rotations[rotation];
    for (const [row, col] of cells) {
      const bx = x + col;
      const by = y + row;
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by < 0) continue; // allow pieces above the board
      if (board[by][bx] !== null) return true;
    }
    return false;
  }
}
```

**What's happening:**
- For each of the 4 cells in a piece, we add the piece's `x`/`y` origin to the cell's `[row, col]` offset to get the absolute board position.
- A cell collides if it is outside the board on the left, right, or bottom. We skip the top check (`by < 0`) because pieces spawn above the board and slide down.
- A cell also collides if the board already has a block at that position.

---

### 3. Create the Piece System

**File:** `src/games/tetris/systems/PieceSystem.ts`

Handles the 7-bag randomizer and spawn logic:

```typescript
import type { TetrisState } from '../types';
import { COLS } from '../types';
import { PIECES } from '../data/pieces';
import { BoardSystem } from './BoardSystem';

export class PieceSystem {
  private boardSystem: BoardSystem;
  private bag: number[] = [];

  constructor(boardSystem: BoardSystem) {
    this.boardSystem = boardSystem;
  }

  /** 7-bag randomizer: each set of 7 pieces appears once before repeating */
  private refillBag(): void {
    const indices = [0, 1, 2, 3, 4, 5, 6];
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    this.bag.push(...indices);
  }

  private nextFromBag(): number {
    if (this.bag.length < 2) this.refillBag();
    return this.bag.shift()!;
  }

  /** Spawn a new piece at the top of the board */
  spawnPiece(state: TetrisState): void {
    const defIndex = state.nextPieceIndex;
    state.nextPieceIndex = this.nextFromBag();

    const def = PIECES[defIndex];
    const cells = def.rotations[0];
    // Center piece horizontally
    const maxCol = Math.max(...cells.map(([, c]) => c));
    const spawnX = Math.floor((COLS - maxCol - 1) / 2);

    state.currentPiece = {
      defIndex,
      rotation: 0,
      x: spawnX,
      y: -1, // start slightly above board
    };

    state.dropTimer = 0;
    state.lockTimer = 0;
    state.isLocking = false;

    // Check if new piece immediately collides = game over
    if (this.boardSystem.isColliding(state.board, defIndex, 0, spawnX, 0)) {
      state.gameOver = true;
    }
  }

  /** Initialize first pieces */
  init(state: TetrisState): void {
    this.bag = [];
    this.refillBag();
    state.nextPieceIndex = this.nextFromBag();
    this.spawnPiece(state);
  }
}
```

**What's happening:**
- `refillBag` creates indices `[0..6]`, shuffles them with Fisher-Yates, and appends them to the bag. We keep at least 2 in the bag so we always know the "next" piece for the preview.
- `spawnPiece` takes whatever `nextPieceIndex` is queued, calculates a centered X position by looking at the widest column in the spawn rotation, and places the piece at `y = -1` (one row above the visible board). This gives the player a brief moment before the piece enters view.
- If the spawn position already collides with existing blocks, the game is over.

---

### 4. Update the Board Renderer

**File:** `src/games/tetris/renderers/BoardRenderer.ts`

Add current piece drawing after the placed-blocks loop:

```typescript
import type { TetrisState } from '../types';
import { COLS, ROWS } from '../types';
import { PIECES } from '../data/pieces';

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: TetrisState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    const cellSize = Math.floor(Math.min((H - 40) / ROWS, (W * 0.5) / COLS));
    const boardW = cellSize * COLS;
    const boardH = cellSize * ROWS;
    const offsetX = Math.floor((W - boardW) / 2);
    const offsetY = Math.floor((H - boardH) / 2);

    // Background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    // Board background
    ctx.fillStyle = '#111122';
    ctx.fillRect(offsetX, offsetY, boardW, boardH);

    // Grid lines
    ctx.strokeStyle = '#1a1a33';
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + r * cellSize);
      ctx.lineTo(offsetX + boardW, offsetY + r * cellSize);
      ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(offsetX + c * cellSize, offsetY);
      ctx.lineTo(offsetX + c * cellSize, offsetY + boardH);
      ctx.stroke();
    }

    // Placed blocks
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const color = state.board[r][c];
        if (color) {
          this.drawCell(ctx, offsetX + c * cellSize, offsetY + r * cellSize, cellSize, color);
        }
      }
    }

    // Current piece
    if (state.currentPiece) {
      const piece = state.currentPiece;
      const def = PIECES[piece.defIndex];
      const cells = def.rotations[piece.rotation];
      for (const [row, col] of cells) {
        const bx = piece.x + col;
        const by = piece.y + row;
        if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
          this.drawCell(ctx, offsetX + bx * cellSize, offsetY + by * cellSize, cellSize, def.color);
        }
      }
    }

    // Board border
    ctx.strokeStyle = '#334';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX - 1, offsetY - 1, boardW + 2, boardH + 2);
  }

  drawCell(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
    const gap = 1;
    ctx.fillStyle = color;
    ctx.fillRect(x + gap, y + gap, size - gap * 2, size - gap * 2);

    // Highlight (top-left)
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x + gap, y + gap, size - gap * 2, 2);
    ctx.fillRect(x + gap, y + gap, 2, size - gap * 2);

    // Shadow (bottom-right)
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + gap, y + size - gap - 2, size - gap * 2, 2);
    ctx.fillRect(x + size - gap - 2, y + gap, 2, size - gap * 2);
  }
}
```

**What's happening:**
- After drawing placed blocks, we loop over the 4 cells of `currentPiece`, convert each offset to board coordinates, and draw a cell if it is inside the visible area.
- We skip cells where `by < 0` since they are above the board (the piece spawns at `y = -1`). The player sees the piece slide into view over the first gravity tick.

---

### 5. Update the Engine

**File:** `src/games/tetris/TetrisEngine.ts`

Wire in the board system and piece system, spawn the first piece:

```typescript
import type { TetrisState } from './types';
import { createEmptyBoard } from './types';
import { BoardSystem } from './systems/BoardSystem';
import { PieceSystem } from './systems/PieceSystem';
import { BoardRenderer } from './renderers/BoardRenderer';

export class TetrisEngine {
  private ctx: CanvasRenderingContext2D;
  private state: TetrisState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private boardSystem: BoardSystem;
  private pieceSystem: PieceSystem;
  private boardRenderer: BoardRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = {
      board: createEmptyBoard(),
      currentPiece: null,
      nextPieceIndex: 0,
      score: 0,
      highScore: 0,
      level: 0,
      lines: 0,
      gameOver: false,
      paused: false,
      started: true, // auto-start for now
      dropTimer: 0,
      lockTimer: 0,
      lockDelay: 500,
      isLocking: false,
      clearingLines: [],
      clearTimer: 0,
      clearDuration: 300,
      dasKey: null,
      dasTimer: 0,
      dasDelay: 170,
      dasInterval: 50,
      dasReady: false,
    };

    this.boardSystem = new BoardSystem();
    this.pieceSystem = new PieceSystem(this.boardSystem);
    this.boardRenderer = new BoardRenderer();

    // Spawn first piece
    this.pieceSystem.init(this.state);

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
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

    this.boardRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Tetris game
3. **Observe:**
   - A colored tetromino appears near the top-center of the board
   - The piece is made of 4 beveled blocks in one of the 7 piece colors
   - Refreshing the page shows a different random piece each time
   - The piece just sits there -- it does not move yet (that comes next step)

---

## Try It

- Log `PIECES[state.currentPiece!.defIndex].id` in the loop to see which piece spawned.
- Temporarily force `state.currentPiece!.defIndex = 0` to always spawn the I-piece and verify it is a horizontal bar of 4 cyan blocks.
- Change a piece color in `pieces.ts` and confirm the rendered block updates immediately.

---

## Challenges

**Easy:**
- Add a new color for each piece (e.g., make the T-piece pink instead of purple).
- Log the contents of the bag after each `refillBag` call to verify all 7 indices appear.

**Medium:**
- Draw each piece's `id` letter above the board for debugging.
- Add an 8th "bonus" piece shape (e.g., a plus sign) and define its rotations.

**Hard:**
- Implement a preview that draws the *next* piece in miniature to the right of the board (we will do this properly in step 7, but try it now for practice).

---

## What You Learned

- Defining tetromino shapes as offset arrays rather than bitmasks or full grids
- Pre-computing all 4 rotations as data so rotation is a simple index switch
- Fisher-Yates shuffle for the 7-bag randomizer
- Centering a piece horizontally by measuring its widest column
- Drawing a moving piece on top of the static board grid

**Next:** Add keyboard controls for left/right movement and rotation with wall kicks.
