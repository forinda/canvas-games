# Step 1: Board Setup & Rendering

**Goal:** Draw an 8x8 checkerboard with alternating light and dark squares, a border, and row/column labels.

**Time:** ~15 minutes

---

## What You'll Build

- **8x8 checkerboard** with tan and brown alternating squares
- **Board border** in dark brown framing the playing area
- **Row and column labels** (1-8 and A-H) around the edges
- **Dark background** with the board centered on screen
- **Responsive layout** that scales and re-centers on window resize
- **Type definitions** for the entire game state

---

## Concepts

- **Checkers Board Structure**: A standard checkers board is 8x8 with alternating light and dark squares. Pieces only ever occupy the dark squares. The parity check `(row + col) % 2 === 1` identifies dark squares.
- **Cell and Piece Types**: Each cell can hold a piece (red or black, regular or king) or be empty (`null`). We model this with a 2D array of `Piece | null`.
- **Layout Calculation**: We compute `cellSize = boardSize / 8` where `boardSize` fits the viewport minus margins. The board is then centered with `offsetX = (W - boardSize) / 2`.
- **Responsive Rendering**: By recalculating the layout from `canvas.width` and `canvas.height` on every frame, the board stays centered after window resizes.

---

## Code

### 1.1 -- Create Types

**File:** `src/contexts/canvas2d/games/checkers/types.ts`

All the types needed across every step, defined up front so later files never need restructuring.

```typescript
export const BOARD_SIZE = 8;

export type PieceColor = "red" | "black";

export type GameMode = "ai" | "two-player";

export interface Piece {
  color: PieceColor;
  isKing: boolean;
}

export interface Cell {
  row: number;
  col: number;
}

export interface Move {
  from: Cell;
  to: Cell;
  captures: Cell[];
}

export interface HistoryEntry {
  board: (Piece | null)[][];
  currentTurn: PieceColor;
  capturedRed: number;
  capturedBlack: number;
  mustContinueJump: Cell | null;
  lastMove: Move | null;
}

export interface CheckersState {
  board: (Piece | null)[][];
  currentTurn: PieceColor;
  selectedCell: Cell | null;
  legalMoves: Move[];
  legalMovesForSelected: Move[];
  lastMove: Move | null;
  capturedRed: number;
  capturedBlack: number;
  gameOver: boolean;
  winner: PieceColor | "draw" | null;
  paused: boolean;
  started: boolean;
  mode: GameMode;
  aiThinking: boolean;
  mustContinueJump: Cell | null;
  showModeSelector: boolean;
  animatingMove: { move: Move; progress: number } | null;
  moveHistory: HistoryEntry[];
  legalMovesDirty: boolean;
}

export function createInitialBoard(): (Piece | null)[][] {
  const board: (Piece | null)[][] = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    board[r] = [];

    for (let c = 0; c < BOARD_SIZE; c++) {
      const isDark = (r + c) % 2 === 1;

      if (isDark && r < 3) {
        board[r][c] = { color: "black", isKing: false };
      } else if (isDark && r > 4) {
        board[r][c] = { color: "red", isKing: false };
      } else {
        board[r][c] = null;
      }
    }
  }

  return board;
}

export function createInitialState(): CheckersState {
  return {
    board: createInitialBoard(),
    currentTurn: "red",
    selectedCell: null,
    legalMoves: [],
    legalMovesForSelected: [],
    lastMove: null,
    capturedRed: 0,
    capturedBlack: 0,
    gameOver: false,
    winner: null,
    paused: false,
    started: false,
    mode: "ai",
    aiThinking: false,
    mustContinueJump: null,
    showModeSelector: true,
    animatingMove: null,
    moveHistory: [],
    legalMovesDirty: true,
  };
}

export function cellsEqual(a: Cell, b: Cell): boolean {
  return a.row === b.row && a.col === b.col;
}

export function cloneBoard(board: (Piece | null)[][]): (Piece | null)[][] {
  return board.map((row) =>
    row.map((cell) =>
      cell ? { color: cell.color, isKing: cell.isKing } : null,
    ),
  );
}
```

**What's happening:**
- `Piece` stores a color (`"red"` or `"black"`) and an `isKing` flag. We will use `isKing` in Step 5.
- `Cell` is a simple `{row, col}` pair used everywhere to reference board positions.
- `Move` links a `from` cell to a `to` cell and carries an array of `captures` -- the cells whose pieces get removed during a jump.
- `CheckersState` holds the entire game: the 2D board array, whose turn it is, selection state, legal moves, captured piece counts, game-over flags, and more. Defining it all now means we add features without restructuring.
- `createInitialBoard()` places 12 black pieces on dark squares in rows 0-2 and 12 red pieces on dark squares in rows 5-7. The middle two rows stay empty.
- `cellsEqual()` and `cloneBoard()` are small utilities we will use heavily later.

---

### 1.2 -- Create Constants

**File:** `src/contexts/canvas2d/games/checkers/data/constants.ts`

Rendering colors and AI tuning weights extracted into one place for easy adjustment.

```typescript
/** Board evaluation weights used by the AI system. */

export const AI_DEPTH = 4;

export const PIECE_VALUE = 1.0;
export const KING_VALUE = 1.5;

export const CENTER_BONUS = 0.05;
export const ADVANCE_BONUS = 0.05;
export const BACK_ROW_BONUS = 0.1;

/** Colors used for rendering */
export const COLORS = {
  lightSquare: '#D2B48C',
  darkSquare: '#8B4513',
  boardBorder: '#8B4513',
  redPieceLight: '#ff4444',
  redPieceDark: '#aa0000',
  blackPieceLight: '#555555',
  blackPieceDark: '#111111',
  selectedHighlight: 'rgba(0, 200, 255, 0.35)',
  selectedBorder: '#00c8ff',
  legalMoveDot: 'rgba(0, 255, 100, 0.5)',
  jumpHighlight: 'rgba(255, 80, 80, 0.35)',
  lastMoveHighlight: 'rgba(255, 255, 0, 0.2)',
  crownGold: '#FFD700',
  crownBorder: '#B8860B',
  background: '#1a1a2e',
} as const;
```

**What's happening:**
- AI constants (`AI_DEPTH`, `PIECE_VALUE`, etc.) are defined now but used in Step 6 when we build the minimax system.
- `COLORS` centralizes every rendering color. If you want a blue-themed board, you change it here and the entire game updates.
- Using `as const` gives us literal types so TypeScript catches typos in color keys.

---

### 1.3 -- Create the Board Renderer (squares only)

**File:** `src/contexts/canvas2d/games/checkers/renderers/BoardRenderer.ts`

For this step we draw just the board squares, border, and labels. Pieces come in Step 2.

```typescript
import type { CheckersState } from "../types";
import { BOARD_SIZE } from "../types";

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: CheckersState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, W, H);

    if (state.showModeSelector) return;

    const layout = this.getBoardLayout(W, H);
    this.drawBoard(ctx, layout);
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

    // Draw each square
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cx = x + c * cellSize;
        const cy = y + r * cellSize;
        const isDark = (r + c) % 2 === 1;

        // Base cell color
        ctx.fillStyle = isDark ? "#8B4513" : "#D2B48C";
        ctx.fillRect(cx, cy, cellSize, cellSize);
      }
    }

    // Row/column labels
    ctx.font = `${Math.max(10, cellSize * 0.22)}px monospace`;
    ctx.fillStyle = "#888";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < BOARD_SIZE; i++) {
      // Row numbers (8 at top, 1 at bottom)
      ctx.fillText(
        `${BOARD_SIZE - i}`,
        x - 16,
        y + i * cellSize + cellSize / 2,
      );
      // Column letters (A-H)
      ctx.fillText(
        String.fromCharCode(65 + i),
        x + i * cellSize + cellSize / 2,
        y + BOARD_SIZE * cellSize + 16,
      );
    }
  }
}
```

**What's happening:**
- `getBoardLayout()` computes the board position and size. It uses a 60px margin and picks the smaller of width and height so the board is always square and fits the viewport.
- The parity check `(r + c) % 2 === 1` determines dark vs. light squares. Dark squares get saddlebrown (`#8B4513`), light squares get tan (`#D2B48C`).
- A 4px dark-brown border frames the board.
- Labels use `String.fromCharCode(65 + i)` to produce A through H for columns and count down from 8 to 1 for rows, matching standard checkers notation.

---

### 1.4 -- Create the Engine

**File:** `src/contexts/canvas2d/games/checkers/CheckersEngine.ts`

The engine creates the initial state, wires up the renderer, and runs the game loop. For now it skips the mode selector so we can see the board immediately.

```typescript
import type { CheckersState } from "./types";
import { createInitialState } from "./types";
import { BoardRenderer } from "./renderers/BoardRenderer";

export class CheckersEngine {
  private ctx: CanvasRenderingContext2D;
  private state: CheckersState;
  private running: boolean;
  private rafId: number;

  private boardRenderer: BoardRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext("2d")!;
    this.running = false;
    this.rafId = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = createInitialState();

    // Skip mode selector for now so we see the board
    this.state.showModeSelector = false;
    this.state.started = true;

    // Renderer
    this.boardRenderer = new BoardRenderer();

    // Resize handler
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
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
}
```

**What's happening:**
- The constructor sizes the canvas to fill the window, creates the initial state via `createInitialState()`, and sets `showModeSelector = false` so the board renders immediately.
- The game loop calls `render()` on every animation frame using `requestAnimationFrame`.
- `destroy()` stops the loop and cleans up the resize listener -- important for avoiding memory leaks when the user leaves the game.

---

### 1.5 -- Create the Platform Adapter

**File:** `src/contexts/canvas2d/games/checkers/adapters/PlatformAdapter.ts`

A thin wrapper that implements the `GameInstance` interface so the game plugs into the host application.

```typescript
import { CheckersEngine } from '../CheckersEngine';

export class PlatformAdapter {
  private engine: CheckersEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new CheckersEngine(canvas, onExit);
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

### 1.6 -- Create the Entry Point

**File:** `src/contexts/canvas2d/games/checkers/index.ts`

```typescript
import type { GameDefinition } from "@core/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const CheckersGame: GameDefinition = {
  id: "checkers",
  category: "strategy" as const,
  name: "Checkers",
  description: "Classic board game of strategy and captures",
  icon: "\uD83D\uDD34",
  color: "#b71c1c",
  help: {
    goal: "Capture all opponent pieces or block them from moving.",
    controls: [
      { key: "Click", action: "Select piece / Move to square" },
      { key: "H", action: "Pause / Resume" },
      { key: "R", action: "Restart (after game over)" },
      { key: "ESC", action: "Back to mode select / Exit" },
    ],
    tips: [
      "Jumps are mandatory -- if you can capture, you must",
      "Reach the opposite row to crown a King (moves in all 4 diagonals)",
      "Control the center of the board for stronger positioning",
    ],
  },
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Checkers game in your browser
3. **Observe:**
   - Dark navy background (`#1a1a2e`) filling the entire screen
   - A centered **8x8 checkerboard** with alternating tan and brown squares
   - A **dark brown border** framing the board
   - **Row labels** (8 down to 1) on the left side
   - **Column labels** (A through H) along the bottom
   - **Resize the window** and watch the board scale and re-center automatically

---

## Challenges

**Easy:**
- Change the light square color from tan to a cream white (`#F5F5DC`) and see how it changes the look.
- Make the board border thicker (try `lineWidth = 6`) for a bolder frame.

**Medium:**
- Add coordinate labels on all four sides of the board (right side and top) in addition to left and bottom.

**Hard:**
- Draw subtle diagonal line patterns on the dark squares to give them a wood-grain texture effect.

---

## What You Learned

- Defining a complete game state type with board, piece, cell, and move interfaces
- Drawing an 8x8 checkerboard with alternating colors using the `(row + col) % 2` parity check
- Computing responsive layout that centers the board in any viewport size
- Rendering row/column labels with `String.fromCharCode()` for letters and descending numbers
- Setting up the engine-adapter-renderer architecture pattern

**Next:** [Step 2: Piece Rendering & Selection](./step-2.md) -- draw gradient pieces with shadows and add click-to-select highlighting.

---
[Back to Tutorial README](./README.md) | [Next Step ->](./step-2.md)
