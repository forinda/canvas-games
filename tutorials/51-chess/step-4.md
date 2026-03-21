# Step 4: Executing Moves & Game Flow

> **Game:** Chess | **Step 4 of 6** | **Time:** ~20 minutes
> **Previous:** [Step 3](./step-3.md) | **Next:** [Step 5](./step-5.md)

## What You'll Learn

- Executing a move by updating the board array
- Tracking captured pieces for display
- Switching turns between white and black
- Building algebraic notation strings for each move
- Creating a move history panel with scrolling
- Adding a HUD with turn indicator, captured pieces, and status bar
- Implementing undo by replaying move history

## Prerequisites

- Completed Step 3 (move validation and legal moves)

---

## Let's Code

### 4.1 -- Add Move Execution to MoveSystem

The `MoveSystem` needs an `executeMove()` method that physically moves a piece on the board, handles captures, and returns a `Move` object with algebraic notation.

**File:** `src/games/chess/systems/MoveSystem.ts` -- add these methods to the class

```typescript
// Add these helper functions at the top of the file (outside the class):
function colToFile(col: number): string {
  return String.fromCharCode(97 + col);
}

function rowToRank(row: number): string {
  return String(BOARD_SIZE - row);
}

const PIECE_NOTATION: Record<string, string> = {
  king: "K",
  queen: "Q",
  rook: "R",
  bishop: "B",
  knight: "N",
  pawn: "",
};

// Add these methods inside the MoveSystem class:

/** Check if a player has any legal moves */
hasLegalMoves(state: ChessState, color: PieceColor): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const piece = state.board[r][c];
      if (piece && piece.color === color) {
        const moves = this.getLegalMoves(state, { row: r, col: c });
        if (moves.length > 0) return true;
      }
    }
  }
  return false;
}

/** Execute a move on the state, returns the Move object */
executeMove(
  state: ChessState,
  from: Position,
  to: Position,
  promotionChoice?: PieceType,
): Move {
  const piece = state.board[from.row][from.col]!;
  const captured = state.board[to.row][to.col];
  let isEnPassant = false;
  let isCastling: Move["isCastling"] = null;
  let isPromotion = false;
  let promotedTo: Move["promotedTo"] = null;

  // En passant detection
  if (
    piece.type === "pawn" &&
    state.enPassantTarget &&
    posEq(to, state.enPassantTarget)
  ) {
    isEnPassant = true;
    const capturedRow = piece.color === "white" ? to.row + 1 : to.row - 1;
    const epCaptured = state.board[capturedRow][to.col]!;
    state.board[capturedRow][to.col] = null;

    if (piece.color === "white") {
      state.capturedByWhite.push(epCaptured);
    } else {
      state.capturedByBlack.push(epCaptured);
    }
  }

  // Castling detection
  if (piece.type === "king" && Math.abs(to.col - from.col) === 2) {
    if (to.col > from.col) {
      isCastling = "kingside";
      state.board[from.row][5] = state.board[from.row][7];
      state.board[from.row][7] = null;
    } else {
      isCastling = "queenside";
      state.board[from.row][3] = state.board[from.row][0];
      state.board[from.row][0] = null;
    }
  }

  // Pawn promotion
  const promotionRow = piece.color === "white" ? 0 : 7;
  if (piece.type === "pawn" && to.row === promotionRow) {
    isPromotion = true;
    promotedTo = promotionChoice ?? "queen"; // Default to queen for now
  }

  // Handle normal capture
  if (captured && !isEnPassant) {
    if (piece.color === "white") {
      state.capturedByWhite.push(captured);
    } else {
      state.capturedByBlack.push(captured);
    }
  }

  // Move the piece
  if (isPromotion && promotedTo) {
    state.board[to.row][to.col] = { type: promotedTo, color: piece.color };
  } else {
    state.board[to.row][to.col] = piece;
  }
  state.board[from.row][from.col] = null;

  // Update en passant target
  if (piece.type === "pawn" && Math.abs(to.row - from.row) === 2) {
    state.enPassantTarget = {
      row: (from.row + to.row) / 2,
      col: from.col,
    };
  } else {
    state.enPassantTarget = null;
  }

  // Update castling rights
  this.updateCastlingRights(state, from, to);

  // Update king position
  if (piece.type === "king") {
    state.kingPositions[piece.color] = { ...to };
  }

  // Build notation
  const notation = this.buildNotation(
    piece, from, to, captured !== null || isEnPassant,
    isCastling, isPromotion, promotedTo, state,
  );

  return {
    from, to, piece, captured: captured ||
      (isEnPassant
        ? { type: "pawn", color: piece.color === "white" ? "black" : "white" }
        : null),
    isEnPassant, isCastling, isPromotion, promotedTo, notation,
  };
}

/** Get all legal moves for a color */
getAllLegalMoves(
  state: ChessState, color: PieceColor,
): Array<{ from: Position; to: Position }> {
  const moves: Array<{ from: Position; to: Position }> = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const piece = state.board[r][c];
      if (piece && piece.color === color) {
        const from = { row: r, col: c };
        const legalMoves = this.getLegalMoves(state, from);
        for (const to of legalMoves) {
          moves.push({ from, to });
        }
      }
    }
  }
  return moves;
}

private updateCastlingRights(
  state: ChessState, from: Position, to: Position,
): void {
  const rights = state.castlingRights;
  const squares: Array<{ row: number; col: number; key: keyof typeof rights }> = [
    { row: 7, col: 0, key: "whiteQueenside" },
    { row: 7, col: 7, key: "whiteKingside" },
    { row: 0, col: 0, key: "blackQueenside" },
    { row: 0, col: 7, key: "blackKingside" },
  ];

  for (const sq of squares) {
    if (
      (from.row === sq.row && from.col === sq.col) ||
      (to.row === sq.row && to.col === sq.col)
    ) {
      rights[sq.key] = false;
    }
  }

  // King move revokes both sides
  if (from.row === 7 && from.col === 4) {
    rights.whiteKingside = false;
    rights.whiteQueenside = false;
  }
  if (from.row === 0 && from.col === 4) {
    rights.blackKingside = false;
    rights.blackQueenside = false;
  }
}

private buildNotation(
  piece: Piece, from: Position, to: Position,
  isCapture: boolean, isCastling: Move["isCastling"],
  isPromotion: boolean, promotedTo: Move["promotedTo"],
  state: ChessState,
): string {
  if (isCastling === "kingside") return "O-O";
  if (isCastling === "queenside") return "O-O-O";

  let notation = "";
  const pieceLetter = PIECE_NOTATION[piece.type];

  if (piece.type === "pawn") {
    if (isCapture) notation = colToFile(from.col) + "x";
  } else {
    notation = pieceLetter;
    if (isCapture) notation += "x";
  }

  notation += colToFile(to.col) + rowToRank(to.row);

  if (isPromotion && promotedTo) {
    notation += "=" + PIECE_NOTATION[promotedTo];
  }

  // Check / checkmate indicators
  const opponent: PieceColor = piece.color === "white" ? "black" : "white";
  if (this.isInCheck(state.board, opponent)) {
    if (!this.hasLegalMoves(state, opponent)) {
      notation += "#";
    } else {
      notation += "+";
    }
  }

  return notation;
}
```

**What's happening:**
- `executeMove()` is the core game logic method. It handles five cases: normal moves, captures, en passant, castling, and promotion. Each case updates the board array and tracking state.
- For castling, the king moves two squares, and the rook jumps to the other side of the king. We detect castling when a king moves 2 columns.
- En passant is detected when a pawn moves diagonally to the en passant target square. The captured pawn is one row behind the destination.
- After every move, `updateCastlingRights()` checks if a king or rook moved from its starting square, or if a rook was captured, and revokes the relevant rights.
- `buildNotation()` constructs standard algebraic notation: piece letter + capture symbol + destination square + promotion suffix + check/checkmate indicator. Castling uses the special "O-O" and "O-O-O" notation.

---

### 4.2 -- Create the GameSystem

The `GameSystem` handles turn switching and game-over detection after each move.

**File:** `src/games/chess/systems/GameSystem.ts`

```typescript
import type { ChessState, PieceColor } from "../types.ts";
import type { MoveSystem } from "./MoveSystem.ts";

export class GameSystem {
  private moveSystem: MoveSystem;

  constructor(moveSystem: MoveSystem) {
    this.moveSystem = moveSystem;
  }

  /** Update check / checkmate / stalemate after a move */
  updateGameStatus(state: ChessState): void {
    const opponent: PieceColor =
      state.currentPlayer === "white" ? "black" : "white";

    // Switch turns
    state.currentPlayer = opponent;

    // Check detection
    state.isCheck = this.moveSystem.isInCheck(state.board, opponent);

    // Legal move availability
    const hasLegal = this.moveSystem.hasLegalMoves(state, opponent);

    if (!hasLegal) {
      state.gameOver = true;
      if (state.isCheck) {
        state.isCheckmate = true;
      } else {
        state.isStalemate = true;
      }
    }

    // Update king positions
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = state.board[r][c];
        if (p && p.type === "king") {
          state.kingPositions[p.color] = { row: r, col: c };
        }
      }
    }
  }
}
```

**What's happening:**
- After each move, `updateGameStatus()` switches `currentPlayer` to the opponent, then checks if the opponent is in check.
- If the opponent has no legal moves, the game is over: checkmate if they are in check, stalemate if they are not.
- King positions are refreshed by scanning the board, ensuring the check highlight always renders on the correct square.

---

### 4.3 -- Create the HUD Renderer

The HUD shows whose turn it is, captured pieces, move history, and a status bar.

**File:** `src/games/chess/renderers/HUDRenderer.ts`

```typescript
import type { ChessState } from "../types.ts";
import { PIECE_UNICODE } from "../data/pieces.ts";

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: ChessState): void {
    this.drawTurnIndicator(ctx, state);
    this.drawCapturedPieces(ctx, state);
    this.drawMoveHistory(ctx, state);
    this.drawStatusBar(ctx, state);

    if (state.gameOver) {
      this.drawGameOverOverlay(ctx, state);
    }
  }

  private drawTurnIndicator(ctx: CanvasRenderingContext2D, state: ChessState): void {
    const boardLayout = this.getBoardLayout(state);
    const x = boardLayout.x;
    const y = boardLayout.y - 36;

    ctx.font = "bold 16px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    const turnText = `${state.currentPlayer === "white" ? "White" : "Black"} to move`;

    // Draw circle indicator
    ctx.fillStyle = state.currentPlayer === "white" ? "#fff" : "#1a1a1a";
    ctx.strokeStyle = "#5d4037";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 10, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ddd";
    ctx.fillText(turnText, x + 26, y);

    if (state.isCheck && !state.gameOver) {
      ctx.fillStyle = "#ff4444";
      ctx.font = "bold 14px monospace";
      ctx.fillText(" CHECK!", x + 26 + ctx.measureText(turnText).width, y);
    }
  }

  private drawCapturedPieces(ctx: CanvasRenderingContext2D, state: ChessState): void {
    const boardLayout = this.getBoardLayout(state);
    const x = boardLayout.x;
    const yTop = boardLayout.y + boardLayout.size + 12;
    const yBottom = boardLayout.y - 52;

    ctx.font = "18px serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#ccc";

    // Captured by white (black pieces taken)
    let px = x;
    for (const piece of state.capturedByWhite) {
      ctx.fillText(PIECE_UNICODE[piece.color][piece.type], px, yTop);
      px += 20;
    }

    // Captured by black (white pieces taken)
    px = x;
    for (const piece of state.capturedByBlack) {
      ctx.fillText(PIECE_UNICODE[piece.color][piece.type], px, yBottom);
      px += 20;
    }
  }

  private drawMoveHistory(ctx: CanvasRenderingContext2D, state: ChessState): void {
    const boardLayout = this.getBoardLayout(state);
    const panelX = boardLayout.x + boardLayout.size + 20;
    const panelY = boardLayout.y;
    const panelW = Math.min(200, state.canvasWidth - panelX - 10);
    const panelH = boardLayout.size;

    if (panelW < 60) return;

    // Background
    ctx.fillStyle = "rgba(30, 24, 18, 0.9)";
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 8);
    ctx.fill();

    ctx.strokeStyle = "#5d4037";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 8);
    ctx.stroke();

    // Title
    ctx.font = "bold 13px monospace";
    ctx.fillStyle = "#d4a76a";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Moves", panelX + panelW / 2, panelY + 8);

    // Move list
    ctx.font = "12px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    const lineHeight = 18;
    const startY = panelY + 30;
    const maxLines = Math.floor((panelH - 40) / lineHeight);

    // Build move pairs
    const pairs: string[] = [];
    for (let i = 0; i < state.moveHistory.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const white = state.moveHistory[i]?.notation ?? "";
      const black = state.moveHistory[i + 1]?.notation ?? "";
      pairs.push(`${moveNum}. ${white}  ${black}`);
    }

    const visiblePairs = pairs.slice(-maxLines);
    const scrollOffset = pairs.length > maxLines ? pairs.length - maxLines : 0;

    for (let i = 0; i < visiblePairs.length; i++) {
      const moveIdx = (i + scrollOffset) * 2;
      const isLatest =
        moveIdx === state.moveHistory.length - 1 ||
        moveIdx === state.moveHistory.length - 2;
      ctx.fillStyle = isLatest ? "#e0c080" : "#999";
      ctx.fillText(visiblePairs[i], panelX + 8, startY + i * lineHeight);
    }

    if (state.moveHistory.length === 0) {
      ctx.fillStyle = "#555";
      ctx.textAlign = "center";
      ctx.fillText("No moves yet", panelX + panelW / 2, startY + 20);
    }
  }

  private drawStatusBar(ctx: CanvasRenderingContext2D, state: ChessState): void {
    const y = state.canvasHeight - 28;
    ctx.font = "11px monospace";
    ctx.fillStyle = "#555";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      "[R] Restart  [U] Undo  [ESC] Exit",
      state.canvasWidth / 2, y,
    );
  }

  private drawGameOverOverlay(ctx: CanvasRenderingContext2D, state: ChessState): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;

    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, W, H);

    const panelW = 340;
    const panelH = 160;
    const px = (W - panelW) / 2;
    const py = (H - panelH) / 2;

    ctx.fillStyle = "#1e1812";
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 12);
    ctx.fill();

    ctx.strokeStyle = "#d4a76a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 12);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (state.isCheckmate) {
      const winner = state.currentPlayer === "white" ? "Black" : "White";
      ctx.font = "bold 28px serif";
      ctx.fillStyle = "#d4a76a";
      ctx.fillText("Checkmate!", W / 2, py + 50);

      ctx.font = "18px monospace";
      ctx.fillStyle = "#ccc";
      ctx.fillText(`${winner} wins`, W / 2, py + 85);
    } else if (state.isStalemate) {
      ctx.font = "bold 28px serif";
      ctx.fillStyle = "#d4a76a";
      ctx.fillText("Stalemate!", W / 2, py + 50);

      ctx.font = "18px monospace";
      ctx.fillStyle = "#ccc";
      ctx.fillText("Draw", W / 2, py + 85);
    }

    ctx.font = "14px monospace";
    ctx.fillStyle = "#888";
    ctx.fillText("Press [R] to play again", W / 2, py + 125);
  }

  private getBoardLayout(state: ChessState): { x: number; y: number; size: number } {
    const size = Math.min(state.canvasWidth * 0.65, state.canvasHeight * 0.8);
    const x = (state.canvasWidth - size) / 2 - state.canvasWidth * 0.08;
    const y = (state.canvasHeight - size) / 2;
    return { x, y, size };
  }
}
```

**What's happening:**
- `drawTurnIndicator()` shows a filled circle (white or black) and text indicating whose turn it is. If the current player is in check, a red "CHECK!" label appears.
- `drawCapturedPieces()` renders captured pieces as small Unicode symbols below (white's captures) and above (black's captures) the board.
- `drawMoveHistory()` creates a side panel with a scrolling list of moves in standard notation, paired by move number (e.g., "1. e4 e5"). The latest move is highlighted in gold.
- `drawGameOverOverlay()` draws a centered modal with "Checkmate!" or "Stalemate!" when the game ends.
- `drawStatusBar()` shows keyboard shortcut reminders at the bottom of the screen.

---

### 4.4 -- Update the Engine to Execute Moves

Wire everything together in `ChessEngine`: create the `GameSystem`, `HUDRenderer`, and update `onSquareClick` to execute moves.

```typescript
import { MoveSystem } from "./systems/MoveSystem.ts";
import { GameSystem } from "./systems/GameSystem.ts";
import { HUDRenderer } from "./renderers/HUDRenderer.ts";

// In constructor:
this.moveSystem = new MoveSystem();
this.gameSystem = new GameSystem(this.moveSystem);
this.hudRenderer = new HUDRenderer();

// Update onSquareClick:
private onSquareClick(pos: Position): void {
  if (this.state.gameOver) return;

  const clickedPiece = this.state.board[pos.row][pos.col];

  if (this.state.selectedPosition) {
    // Check if this is a legal move target
    const isLegal = this.state.legalMoves.some(
      (m) => m.row === pos.row && m.col === pos.col,
    );

    if (isLegal) {
      this.makeMove(this.state.selectedPosition, pos);
      return;
    }

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

private makeMove(from: Position, to: Position): void {
  const move = this.moveSystem.executeMove(this.state, from, to);

  this.state.moveHistory.push(move);
  this.state.lastMove = move;
  this.state.selectedPosition = null;
  this.state.legalMoves = [];

  this.gameSystem.updateGameStatus(this.state);
}

// Update render to include HUD:
private render(): void {
  const ctx = this.ctx;
  ctx.fillStyle = "#1a1210";
  ctx.fillRect(0, 0, this.state.canvasWidth, this.state.canvasHeight);

  this.boardRenderer.render(ctx, this.state);
  this.hudRenderer.render(ctx, this.state);
}
```

**What's happening:**
- `onSquareClick()` now checks whether the clicked square is a legal move target. If so, it calls `makeMove()` instead of reselecting.
- `makeMove()` calls `moveSystem.executeMove()` to update the board, pushes the resulting `Move` to the history, highlights the move as `lastMove`, clears the selection, and calls `gameSystem.updateGameStatus()` to switch turns and check for checkmate/stalemate.
- The render method now calls `hudRenderer.render()` after the board, so the HUD overlays appear on top.

---

## Try It

```bash
pnpm dev
```

Open http://localhost:3000 and play:

1. **Click a pawn, then click a legal move dot** -- the pawn moves to the new square
2. **The turn indicator switches** from "White to move" to "Black to move"
3. **Now click a black piece** -- it becomes selectable (it is black's turn)
4. **Make several moves** -- the move history panel fills with algebraic notation
5. **Capture a piece** -- the captured piece appears in the captured pieces area
6. **The last move** is highlighted in green on the board
7. **Press R** -- the game resets to the starting position

---

## What We Built

- A `MoveSystem.executeMove()` method that handles all move types including captures
- A `GameSystem` that switches turns, detects check, and detects checkmate/stalemate
- A `HUDRenderer` with turn indicator, captured pieces, move history panel, and game-over overlay
- Algebraic notation generation for every move
- A fully playable two-player chess game

---

## Challenge

1. **Easy:** Display the total number of moves made (e.g., "Move 12") in the turn indicator area.
2. **Medium:** Implement undo: when the player presses U, pop the last move from history and rebuild the board from the initial position by replaying all remaining moves.
3. **Hard:** Add move animation: when a piece moves, interpolate its position from source to destination over 200ms instead of teleporting.

---

## Next Step

In [Step 5: Check, Checkmate & Special Moves](./step-5.md), we'll add castling, en passant, pawn promotion with a piece picker, and polish the check/checkmate detection.

---
[<- Previous Step](./step-3.md) | [Back to Chess README](./README.md) | [Next Step ->](./step-5.md)
