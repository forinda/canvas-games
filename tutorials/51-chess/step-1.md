# Step 1: Board Setup & Rendering

**Goal:** Define the chess game types, create the initial board layout, and render an 8x8 board with alternating square colors and Unicode chess pieces.

**Time:** ~20 minutes

---

## What You'll Build

- **Type definitions** for pieces, board cells, positions, moves, and the full game state
- **Initial board setup** with all 32 pieces in their standard starting positions
- **Alternating-color board** with light and dark squares
- **Unicode piece rendering** with shadow effects for readability
- **Rank and file labels** (1-8 and a-h) drawn on the board edges
- **Responsive layout** that centers and scales the board to any viewport

---

## Concepts

- **Board Representation**: Chess uses an 8x8 grid. Each cell is either `null` (empty) or holds a `Piece` object with a `type` (king, queen, rook, bishop, knight, pawn) and a `color` (white or black). Row 0 is the top of the board (black's back rank), row 7 is the bottom (white's back rank).
- **Unicode Chess Symbols**: Unicode provides dedicated codepoints for all chess pieces (U+2654 through U+265F). We store them in a lookup table indexed by color and piece type, so rendering is a simple `fillText` call with no image loading required.
- **Piece-Square Tables**: Even in Step 1 we define piece values and positional bonuses. These will power the AI in Step 6, but defining them now means we never restructure the data layer.
- **Layout Calculation**: The board size is `Math.min(canvasWidth * 0.65, canvasHeight * 0.8)`, leaving room for a side panel and HUD. Each cell is `boardSize / 8` pixels wide.

---

## Code

### 1.1 Create Types

**File:** `src/games/chess/types.ts`

All the types we need across every step, defined up front so later files compile without changes.

```typescript
export const BOARD_SIZE = 8;

export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type PieceColor = 'white' | 'black';
export type GameMode = 'ai' | '2player';

export interface Piece {
  type: PieceType;
  color: PieceColor;
}

export type Cell = Piece | null;

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  captured: Piece | null;
  isEnPassant: boolean;
  isCastling: 'kingside' | 'queenside' | null;
  isPromotion: boolean;
  promotedTo: PieceType | null;
  notation: string;
}

export interface CastlingRights {
  whiteKingside: boolean;
  whiteQueenside: boolean;
  blackKingside: boolean;
  blackQueenside: boolean;
}

export interface ChessState {
  board: Cell[][];
  currentPlayer: PieceColor;
  mode: GameMode;
  selectedPosition: Position | null;
  legalMoves: Position[];
  lastMove: Move | null;
  moveHistory: Move[];
  capturedByWhite: Piece[];
  capturedByBlack: Piece[];
  castlingRights: CastlingRights;
  enPassantTarget: Position | null;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  gameOver: boolean;
  showModeSelect: boolean;
  canvasWidth: number;
  canvasHeight: number;
  aiThinking: boolean;
  halfMoveClock: number;
  fullMoveNumber: number;
  animationTime: number;
  kingPositions: { white: Position; black: Position };
  pendingPromotion: { row: number; col: number } | null;
}
```

**What's happening:**
- `Piece` is the fundamental unit: a `type` and a `color`. A `Cell` is either a `Piece` or `null` (empty square).
- `Position` uses `row` and `col` (0-based) to address any square. Row 0 is the top (black side), row 7 is the bottom (white side).
- `Move` captures everything about a move: the source and destination, the piece moved, any captured piece, and flags for special moves (en passant, castling, promotion).
- `CastlingRights` tracks four independent booleans. Once a king or rook moves, the relevant rights are revoked permanently.
- `ChessState` holds the entire game: the board grid, whose turn it is, selection state, move history, captured pieces, game-over conditions, and layout dimensions. Defining it all now means we never need to restructure later.

---

### 1.2 Create Piece Data and Initial Board

**File:** `src/games/chess/data/pieces.ts`

Unicode symbols, material values, piece-square tables, and the function that creates the starting position.

```typescript
import type { PieceType, PieceColor, Cell } from '../types.ts';

export const PIECE_UNICODE: Record<PieceColor, Record<PieceType, string>> = {
  white: {
    king: '\u2654',
    queen: '\u2655',
    rook: '\u2656',
    bishop: '\u2657',
    knight: '\u2658',
    pawn: '\u2659',
  },
  black: {
    king: '\u265A',
    queen: '\u265B',
    rook: '\u265C',
    bishop: '\u265D',
    knight: '\u265E',
    pawn: '\u265F',
  },
};

export const PIECE_VALUES: Record<PieceType, number> = {
  pawn: 100,
  knight: 320,
  bishop: 330,
  rook: 500,
  queen: 900,
  king: 20000,
};

// Piece-square tables (from white's perspective; mirror for black)
export const PST_PAWN: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

export const PST_KNIGHT: number[][] = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

export const PST_BISHOP: number[][] = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

export const PST_ROOK: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 0, 0, 0],
];

export const PST_QUEEN: number[][] = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

export const PST_KING: number[][] = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

export const PIECE_SQUARE_TABLES: Record<PieceType, number[][]> = {
  pawn: PST_PAWN,
  knight: PST_KNIGHT,
  bishop: PST_BISHOP,
  rook: PST_ROOK,
  queen: PST_QUEEN,
  king: PST_KING,
};

export function createInitialBoard(): Cell[][] {
  const board: Cell[][] = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => null),
  );

  const backRank: PieceType[] = [
    'rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook',
  ];

  for (let col = 0; col < 8; col++) {
    board[0][col] = { type: backRank[col], color: 'black' };
    board[1][col] = { type: 'pawn', color: 'black' };
    board[6][col] = { type: 'pawn', color: 'white' };
    board[7][col] = { type: backRank[col], color: 'white' };
  }

  return board;
}
```

**What's happening:**
- `PIECE_UNICODE` maps each color and type to the corresponding Unicode chess character. White pieces use U+2654..U+2659, black pieces use U+265A..U+265F.
- `PIECE_VALUES` assigns standard centipawn values: pawn = 100, knight = 320, bishop = 330, rook = 500, queen = 900, king = 20000. These drive the AI evaluation in Step 6.
- The piece-square tables (PST) add positional bonuses. For example, `PST_PAWN` rewards pawns that advance toward the center and penalizes edge pawns. These are defined from white's perspective; for black pieces we mirror the row index.
- `createInitialBoard()` builds the standard starting position: black back rank on row 0, black pawns on row 1, white pawns on row 6, white back rank on row 7. The `backRank` array defines the piece order: rook, knight, bishop, queen, king, bishop, knight, rook.

---

### 1.3 Create the Board Renderer

**File:** `src/games/chess/renderers/BoardRenderer.ts`

Draws the alternating-color board, coordinate labels, and all pieces.

```typescript
import type { ChessState } from "../types.ts";
import { BOARD_SIZE } from "../types.ts";
import { PIECE_UNICODE } from "../data/pieces.ts";

const LIGHT_SQUARE = "#f0d9b5";
const DARK_SQUARE = "#b58863";

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: ChessState): void {
    const layout = this.getLayout(state);
    this.drawBoard(ctx, state, layout);
    this.drawCoordinates(ctx, layout);
    this.drawPieces(ctx, state, layout);
  }

  getLayout(state: ChessState): {
    x: number; y: number; size: number; cellSize: number;
  } {
    const size = Math.min(state.canvasWidth * 0.65, state.canvasHeight * 0.8);
    const cellSize = size / BOARD_SIZE;
    const x = (state.canvasWidth - size) / 2 - state.canvasWidth * 0.08;
    const y = (state.canvasHeight - size) / 2;
    return { x, y, size, cellSize };
  }

  private drawBoard(
    ctx: CanvasRenderingContext2D,
    state: ChessState,
    layout: { x: number; y: number; size: number; cellSize: number },
  ): void {
    const { x, y, cellSize } = layout;

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const isLight = (row + col) % 2 === 0;
        const sx = x + col * cellSize;
        const sy = y + row * cellSize;

        ctx.fillStyle = isLight ? LIGHT_SQUARE : DARK_SQUARE;
        ctx.fillRect(sx, sy, cellSize, cellSize);
      }
    }

    // Board border
    ctx.strokeStyle = "#5d4037";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, layout.size, layout.size);
  }

  private drawCoordinates(
    ctx: CanvasRenderingContext2D,
    layout: { x: number; y: number; cellSize: number },
  ): void {
    const { x, y, cellSize } = layout;
    const fontSize = Math.max(10, cellSize * 0.18);
    ctx.font = `${fontSize}px monospace`;
    ctx.textBaseline = "top";

    for (let row = 0; row < BOARD_SIZE; row++) {
      const rank = String(BOARD_SIZE - row);
      const isLight = row % 2 === 0;
      ctx.fillStyle = isLight ? DARK_SQUARE : LIGHT_SQUARE;
      ctx.textAlign = "left";
      ctx.fillText(rank, x + 2, y + row * cellSize + 2);
    }

    for (let col = 0; col < BOARD_SIZE; col++) {
      const file = String.fromCharCode(97 + col);
      const isLight = (7 + col) % 2 === 0;
      ctx.fillStyle = isLight ? DARK_SQUARE : LIGHT_SQUARE;
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText(file, x + (col + 1) * cellSize - 2, y + BOARD_SIZE * cellSize - 2);
    }
  }

  private drawPieces(
    ctx: CanvasRenderingContext2D,
    state: ChessState,
    layout: { x: number; y: number; cellSize: number },
  ): void {
    const { x, y, cellSize } = layout;
    const fontSize = cellSize * 0.75;
    ctx.font = `${fontSize}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = state.board[row][col];
        if (!piece) continue;

        const char = PIECE_UNICODE[piece.color][piece.type];
        const px = x + col * cellSize + cellSize / 2;
        const py = y + row * cellSize + cellSize / 2;

        // Draw shadow for readability
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillText(char, px + 1, py + 1);

        // Draw piece
        ctx.fillStyle = piece.color === "white" ? "#ffffff" : "#1a1a1a";
        ctx.fillText(char, px, py);
      }
    }
  }
}
```

**What's happening:**
- `getLayout()` computes the board position and size. The board takes up 65% of the canvas width or 80% of the height (whichever is smaller), then is offset slightly left to leave room for a move history panel.
- `drawBoard()` loops over all 64 squares. The parity `(row + col) % 2` determines whether a square is light (`#f0d9b5`) or dark (`#b58863`) -- the classic wooden board palette.
- `drawCoordinates()` adds rank numbers (8 down to 1) on the left edge and file letters (a through h) on the bottom edge. Each label uses the opposite square color for contrast.
- `drawPieces()` renders each piece as a Unicode character centered in its cell. A 1-pixel offset shadow behind each character ensures readability on both light and dark squares.

---

### 1.4 Create the Engine Shell

**File:** `src/games/chess/ChessEngine.ts`

The engine creates the initial state, runs the game loop, and delegates rendering.

```typescript
import type { ChessState } from "./types.ts";
import { createInitialBoard } from "./data/pieces.ts";
import { BoardRenderer } from "./renderers/BoardRenderer.ts";

export class ChessEngine {
  private ctx: CanvasRenderingContext2D;
  private state: ChessState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;
  private boardRenderer: BoardRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.createInitialState(canvas.width, canvas.height);
    this.state.showModeSelect = false; // Skip mode select for now
    this.boardRenderer = new BoardRenderer();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasWidth = canvas.width;
      this.state.canvasHeight = canvas.height;
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
    window.removeEventListener("resize", this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;
    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    const ctx = this.ctx;
    const W = this.state.canvasWidth;
    const H = this.state.canvasHeight;

    // Dark background
    ctx.fillStyle = "#1a1210";
    ctx.fillRect(0, 0, W, H);

    this.boardRenderer.render(ctx, this.state);
  }

  private createInitialState(w: number, h: number): ChessState {
    return {
      board: createInitialBoard(),
      currentPlayer: "white",
      mode: "2player",
      selectedPosition: null,
      legalMoves: [],
      lastMove: null,
      moveHistory: [],
      capturedByWhite: [],
      capturedByBlack: [],
      castlingRights: {
        whiteKingside: true,
        whiteQueenside: true,
        blackKingside: true,
        blackQueenside: true,
      },
      enPassantTarget: null,
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      gameOver: false,
      showModeSelect: false,
      canvasWidth: w,
      canvasHeight: h,
      aiThinking: false,
      halfMoveClock: 0,
      fullMoveNumber: 1,
      animationTime: 0,
      kingPositions: {
        white: { row: 7, col: 4 },
        black: { row: 0, col: 4 },
      },
      pendingPromotion: null,
    };
  }
}
```

**What's happening:**
- The constructor sets up the canvas, creates the initial game state with all pieces in their starting positions, and registers a resize handler for responsive layout.
- `createInitialState()` builds the full `ChessState` object. The board comes from `createInitialBoard()`. All castling rights start as `true`. King positions are tracked explicitly for fast check detection later.
- The game loop is simple: clear the screen with a dark brown background (`#1a1210`), then call `boardRenderer.render()`. No update step yet -- we will add that when we add interaction.
- `start()` and `destroy()` manage the `requestAnimationFrame` lifecycle, and `destroy()` also cleans up the resize listener to prevent memory leaks.

---

### 1.5 Create the Platform Adapter and Entry Point

**File:** `src/games/chess/adapters/PlatformAdapter.ts`

```typescript
import { ChessEngine } from '../ChessEngine.ts';

export class PlatformAdapter {
  private engine: ChessEngine;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new ChessEngine(canvas);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

**File:** `src/games/chess/index.ts`

```typescript
import { PlatformAdapter } from "./adapters/PlatformAdapter.ts";

export function createChess(canvas: HTMLCanvasElement): { destroy: () => void } {
  const adapter = new PlatformAdapter(canvas);
  adapter.start();
  return { destroy: () => adapter.destroy() };
}
```

**What's happening:**
- `PlatformAdapter` is a thin wrapper that decouples the engine from any specific host environment. It implements a simple `start()`/`destroy()` lifecycle.
- The `index.ts` entry point exports a factory function that creates the adapter, starts the game, and returns a destroy handle.

---

## Test It

1. **Run:** `pnpm dev`
2. **Open:** the Chess game in your browser
3. **Observe:**
   - A dark brown background with a centered **8x8 chessboard**
   - **Alternating light and dark squares** in the classic tan/brown palette
   - **All 32 pieces** in their standard starting positions rendered as Unicode symbols
   - **White pieces** in white, **black pieces** in dark gray, each with a subtle shadow
   - **Rank numbers** (8 down to 1) along the left edge
   - **File letters** (a through h) along the bottom edge
   - **Resize the window** and watch the board scale and re-center

---

## Challenges

**Easy:**
- Change the board colors to a blue theme (try `#b3cde0` for light and `#5a7fa0` for dark).
- Increase the piece font size multiplier from `0.75` to `0.85` for larger pieces.

**Medium:**
- Add a dark outer glow around the board by drawing a larger rounded rectangle behind it with a shadow color.

**Hard:**
- Instead of Unicode characters, draw simple geometric shapes for each piece type (circle for pawn, cross for king, etc.) using Canvas path drawing.

---

## What You Learned

- Defining a comprehensive game state type with board, move, and UI fields
- Creating the standard chess starting position with a back-rank array pattern
- Drawing an alternating-color board using `(row + col) % 2` parity
- Rendering Unicode chess symbols with shadow effects for readability
- Computing a responsive centered layout that adapts to any viewport size

**Next:** [Step 2: Selection & Input Handling](./step-2.md) -- add click-to-select interaction so players can pick up pieces!

---
[Back to Chess README](./README.md) | [Next Step ->](./step-2.md)
