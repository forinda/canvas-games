# Step 2: Selection & Input Handling

> **Game:** Chess | **Step 2 of 6** | **Time:** ~20 minutes
> **Previous:** [Step 1](./step-1.md) | **Next:** [Step 3](./step-3.md)

## What You'll Learn

- Converting mouse click coordinates to board positions
- Selecting and deselecting pieces with click interaction
- Highlighting the selected square with a translucent overlay
- Separating input handling into its own system class
- Adding keyboard shortcuts for restart and help

## Prerequisites

- Completed Step 1 (board rendering with pieces)

---

## Let's Code

### 2.1 -- Add Visual Highlights to the Board Renderer

We need to show the player which square is selected. Update `BoardRenderer` to overlay a yellow highlight on the selected cell.

**File:** `src/games/chess/renderers/BoardRenderer.ts` -- updated `drawBoard` method

```typescript
import type { ChessState } from "../types.ts";
import { BOARD_SIZE } from "../types.ts";
import { PIECE_UNICODE } from "../data/pieces.ts";

const LIGHT_SQUARE = "#f0d9b5";
const DARK_SQUARE = "#b58863";
const SELECTED_COLOR = "rgba(255, 255, 0, 0.4)";
const LAST_MOVE_COLOR = "rgba(155, 199, 0, 0.41)";
const CHECK_COLOR = "rgba(255, 0, 0, 0.5)";

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

        // Base square color
        ctx.fillStyle = isLight ? LIGHT_SQUARE : DARK_SQUARE;
        ctx.fillRect(sx, sy, cellSize, cellSize);

        // Last move highlight
        if (state.lastMove) {
          const { from, to } = state.lastMove;
          if (
            (row === from.row && col === from.col) ||
            (row === to.row && col === to.col)
          ) {
            ctx.fillStyle = LAST_MOVE_COLOR;
            ctx.fillRect(sx, sy, cellSize, cellSize);
          }
        }

        // Selected piece highlight
        if (
          state.selectedPosition &&
          state.selectedPosition.row === row &&
          state.selectedPosition.col === col
        ) {
          ctx.fillStyle = SELECTED_COLOR;
          ctx.fillRect(sx, sy, cellSize, cellSize);
        }

        // Check highlight on king
        if (state.isCheck) {
          const kingPos = state.kingPositions[state.currentPlayer];
          if (kingPos && kingPos.row === row && kingPos.col === col) {
            ctx.fillStyle = CHECK_COLOR;
            ctx.fillRect(sx, sy, cellSize, cellSize);
          }
        }
      }
    }

    // Board border
    ctx.strokeStyle = "#5d4037";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, layout.size, layout.size);
  }

  // drawCoordinates and drawPieces remain the same as Step 1
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

        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillText(char, px + 1, py + 1);

        ctx.fillStyle = piece.color === "white" ? "#ffffff" : "#1a1a1a";
        ctx.fillText(char, px, py);
      }
    }
  }
}
```

**What's happening:**
- We added three new highlight constants: `SELECTED_COLOR` (yellow), `LAST_MOVE_COLOR` (green), and `CHECK_COLOR` (red). Each is a semi-transparent RGBA so the underlying square color bleeds through.
- Inside the cell loop, after drawing the base color, we layer on highlights: first the last-move highlight (both source and destination squares), then the selected-piece highlight, then the check highlight on the current player's king.
- The highlight order matters: selection renders on top of last-move, and check renders on top of both.

---

### 2.2 -- Create the Input System

The `InputSystem` listens for mouse clicks and keyboard presses, converts pixel coordinates to board positions, and calls back into the engine.

**File:** `src/games/chess/systems/InputSystem.ts`

```typescript
import type { ChessState, Position, GameMode, PieceType } from "../types.ts";
import { BOARD_SIZE } from "../types.ts";

export class InputSystem {
  private canvas: HTMLCanvasElement;
  private state: ChessState;
  private onExit: () => void;
  private onSquareClick: (pos: Position) => void;
  private onModeSelect: (mode: GameMode) => void;
  private onRestart: () => void;
  private onToggleHelp: () => void;
  private onUndo: () => void;
  private onPromotionChoice: (choice: PieceType) => void;

  private clickHandler: (e: MouseEvent) => void;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(
    canvas: HTMLCanvasElement,
    state: ChessState,
    onExit: () => void,
    onSquareClick: (pos: Position) => void,
    onModeSelect: (mode: GameMode) => void,
    onRestart: () => void,
    onToggleHelp: () => void,
    onUndo: () => void,
    onPromotionChoice: (choice: PieceType) => void,
  ) {
    this.canvas = canvas;
    this.state = state;
    this.onExit = onExit;
    this.onSquareClick = onSquareClick;
    this.onModeSelect = onModeSelect;
    this.onRestart = onRestart;
    this.onToggleHelp = onToggleHelp;
    this.onUndo = onUndo;
    this.onPromotionChoice = onPromotionChoice;

    this.clickHandler = (e: MouseEvent) => this.handleClick(e);
    this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
  }

  attach(): void {
    this.canvas.addEventListener("click", this.clickHandler);
    window.addEventListener("keydown", this.keyHandler);
  }

  detach(): void {
    this.canvas.removeEventListener("click", this.clickHandler);
    window.removeEventListener("keydown", this.keyHandler);
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Convert pixel coordinates to board position
    const boardInfo = this.getBoardLayout();
    const col = Math.floor((mx - boardInfo.x) / boardInfo.cellSize);
    const row = Math.floor((my - boardInfo.y) / boardInfo.cellSize);

    if (col >= 0 && col < 8 && row >= 0 && row < 8) {
      this.onSquareClick({ row, col });
    }
  }

  private handleKey(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      this.onExit();
    } else if (e.key === "r" || e.key === "R") {
      this.onRestart();
    } else if (e.key === "u" || e.key === "U") {
      this.onUndo();
    }
  }

  private getBoardLayout(): { x: number; y: number; cellSize: number } {
    const s = this.state;
    const size = Math.min(s.canvasWidth * 0.65, s.canvasHeight * 0.8);
    const cellSize = size / 8;
    const x = (s.canvasWidth - size) / 2 - s.canvasWidth * 0.08;
    const y = (s.canvasHeight - size) / 2;
    return { x, y, cellSize };
  }
}
```

**What's happening:**
- The `InputSystem` stores callbacks for every user action: clicking a square, selecting a mode, restarting, undoing, and choosing a promotion piece. This keeps input logic decoupled from game logic.
- `handleClick()` converts mouse coordinates from screen space to board space. It subtracts the board's offset, divides by cell size, and floors to get the row and column. If the result is within the 0-7 range, it fires the `onSquareClick` callback.
- `getBoardLayout()` duplicates the same layout math as `BoardRenderer.getLayout()`. This ensures clicks map to exactly the same squares that are visually rendered.
- `attach()` and `detach()` manage event listener lifecycles, preventing memory leaks when the game is destroyed.

---

### 2.3 -- Wire Input into the Engine

Update `ChessEngine` to use the `InputSystem` and handle piece selection.

**File:** `src/games/chess/ChessEngine.ts` -- updated

```typescript
import type { ChessState, GameMode, Position, PieceType } from "./types.ts";
import { createInitialBoard } from "./data/pieces.ts";
import { InputSystem } from "./systems/InputSystem.ts";
import { BoardRenderer } from "./renderers/BoardRenderer.ts";

export class ChessEngine {
  private ctx: CanvasRenderingContext2D;
  private state: ChessState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;
  private inputSystem: InputSystem;
  private boardRenderer: BoardRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext("2d")!;
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.createInitialState(canvas.width, canvas.height);
    this.boardRenderer = new BoardRenderer();

    this.inputSystem = new InputSystem(
      canvas,
      this.state,
      onExit,
      (pos: Position) => this.onSquareClick(pos),
      (mode: GameMode) => {},       // Mode select -- Step 6
      () => this.resetGame(),
      () => {},                      // Help toggle -- later
      () => {},                      // Undo -- Step 4
      (choice: PieceType) => {},     // Promotion -- Step 5
    );

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasWidth = canvas.width;
      this.state.canvasHeight = canvas.height;
    };

    this.inputSystem.attach();
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
    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#1a1210";
    ctx.fillRect(0, 0, this.state.canvasWidth, this.state.canvasHeight);
    this.boardRenderer.render(ctx, this.state);
  }

  private onSquareClick(pos: Position): void {
    if (this.state.gameOver) return;

    const clickedPiece = this.state.board[pos.row][pos.col];

    // If we already have a piece selected
    if (this.state.selectedPosition) {
      // Click on own piece -> reselect
      if (clickedPiece && clickedPiece.color === this.state.currentPlayer) {
        this.selectPiece(pos);
        return;
      }
      // Click elsewhere -> deselect
      this.state.selectedPosition = null;
      this.state.legalMoves = [];
      return;
    }

    // No piece selected -> select own piece
    if (clickedPiece && clickedPiece.color === this.state.currentPlayer) {
      this.selectPiece(pos);
    }
  }

  private selectPiece(pos: Position): void {
    this.state.selectedPosition = pos;
    this.state.legalMoves = []; // No legal move generation yet
  }

  private resetGame(): void {
    const w = this.state.canvasWidth;
    const h = this.state.canvasHeight;
    Object.assign(this.state, this.createInitialState(w, h));
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
- The constructor now accepts an `onExit` callback and creates an `InputSystem` with placeholder callbacks for features we haven't built yet (mode select, undo, promotion).
- `onSquareClick()` implements the selection logic. If no piece is selected and the player clicks their own piece, it becomes selected. If a piece is already selected and the player clicks another of their own pieces, it reselects. Clicking an empty square or an opponent's piece deselects.
- `selectPiece()` sets `selectedPosition` on the state. The `BoardRenderer` already knows how to highlight it (the yellow overlay we added in 2.1). Legal moves are empty for now -- Step 3 will populate them.
- `resetGame()` uses `Object.assign` to overwrite the state in place. This is important because `InputSystem` holds a reference to the state object, so we cannot replace it entirely.
- `destroy()` now also calls `inputSystem.detach()` to clean up click and keyboard listeners.

---

## Try It

```bash
pnpm dev
```

Open http://localhost:3000 and try these interactions:

1. **Click a white piece** -- a yellow highlight appears on that square
2. **Click a different white piece** -- the highlight moves to the new piece
3. **Click an empty square** -- the highlight disappears (deselect)
4. **Click a black piece** -- nothing happens (it is not white's turn)
5. **Press R** -- the board resets to the starting position
6. **Resize the window** -- everything adapts smoothly

---

## What We Built

- An `InputSystem` that converts mouse clicks to board coordinates
- Piece selection with visual feedback (yellow highlight)
- Reselection by clicking a different own piece
- Deselection by clicking empty squares or opponent pieces
- Keyboard shortcut to restart the game

---

## Challenge

1. **Easy:** Add a hover effect that changes the cursor to `pointer` when hovering over a piece of the current player's color.
2. **Medium:** Show the piece type and color in a text label below the board when a piece is selected (e.g., "White Knight selected").
3. **Hard:** Implement drag-and-drop selection: mousedown on a piece starts dragging, mouseup on a square releases it.

---

## Next Step

In [Step 3: Move Validation & Legal Moves](./step-3.md), we'll generate legal moves for every piece type and show them as dot indicators on the board.

---
[<- Previous Step](./step-1.md) | [Back to Chess README](./README.md) | [Next Step ->](./step-3.md)
