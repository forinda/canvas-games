# Step 3: Move Validation & Legal Moves

> **Game:** Chess | **Step 3 of 6** | **Time:** ~25 minutes
> **Previous:** [Step 2](./step-2.md) | **Next:** [Step 4](./step-4.md)

## What You'll Learn

- Generating pseudo-legal moves for all six piece types
- Pawn movement: forward, double-push from start row, diagonal captures
- Sliding piece movement for bishops, rooks, and queens
- Knight L-shaped jumps
- King movement (one square in any direction)
- Filtering pseudo-legal moves to remove those that leave the king in check
- Rendering legal move indicators (dots and capture rings)

## Prerequisites

- Completed Step 2 (input handling and piece selection)

---

## Let's Code

### 3.1 -- Build the MoveSystem

The `MoveSystem` is the heart of chess logic. It generates all possible moves for a piece at a given position, then filters out any move that would leave the player's own king in check.

**File:** `src/contexts/canvas2d/games/chess/systems/MoveSystem.ts`

```typescript
import type {
  ChessState,
  Position,
  Move,
  Piece,
  PieceType,
  PieceColor,
  Cell,
} from "../types.ts";
import { BOARD_SIZE } from "../types.ts";

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function posEq(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export class MoveSystem {
  /** Get all pseudo-legal moves for a piece (ignoring check) */
  getPseudoLegalMoves(
    board: Cell[][],
    pos: Position,
    castlingRights: ChessState["castlingRights"],
    enPassantTarget: Position | null,
  ): Position[] {
    const piece = board[pos.row][pos.col];
    if (!piece) return [];

    switch (piece.type) {
      case "pawn":
        return this.getPawnMoves(board, pos, piece, enPassantTarget);
      case "knight":
        return this.getKnightMoves(board, pos, piece);
      case "bishop":
        return this.getSlidingMoves(board, pos, piece, [
          [-1, -1], [-1, 1], [1, -1], [1, 1],
        ]);
      case "rook":
        return this.getSlidingMoves(board, pos, piece, [
          [-1, 0], [1, 0], [0, -1], [0, 1],
        ]);
      case "queen":
        return this.getSlidingMoves(board, pos, piece, [
          [-1, -1], [-1, 1], [1, -1], [1, 1],
          [-1, 0], [1, 0], [0, -1], [0, 1],
        ]);
      case "king":
        return this.getKingMoves(board, pos, piece, castlingRights);
      default:
        return [];
    }
  }

  /** Get all legal moves for a piece (filtering out moves that leave king in check) */
  getLegalMoves(state: ChessState, pos: Position): Position[] {
    const piece = state.board[pos.row][pos.col];
    if (!piece) return [];

    const pseudoMoves = this.getPseudoLegalMoves(
      state.board, pos, state.castlingRights, state.enPassantTarget,
    );

    return pseudoMoves.filter((to) => {
      return !this.wouldBeInCheck(state, pos, to, piece.color);
    });
  }

  /** Check if making a move would leave the player's king in check */
  wouldBeInCheck(
    state: ChessState, from: Position, to: Position, color: PieceColor,
  ): boolean {
    const testBoard = cloneBoard(state.board);
    const piece = testBoard[from.row][from.col]!;

    // Handle en passant capture on the test board
    if (
      piece.type === "pawn" &&
      state.enPassantTarget &&
      posEq(to, state.enPassantTarget)
    ) {
      const capturedRow = color === "white" ? to.row + 1 : to.row - 1;
      testBoard[capturedRow][to.col] = null;
    }

    // Handle castling -- move the rook too
    if (piece.type === "king" && Math.abs(to.col - from.col) === 2) {
      if (to.col > from.col) {
        testBoard[from.row][5] = testBoard[from.row][7];
        testBoard[from.row][7] = null;
      } else {
        testBoard[from.row][3] = testBoard[from.row][0];
        testBoard[from.row][0] = null;
      }
    }

    testBoard[to.row][to.col] = piece;
    testBoard[from.row][from.col] = null;

    // Find king position after the move
    let kingPos: Position = { row: -1, col: -1 };
    if (piece.type === "king") {
      kingPos = to;
    } else {
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const p = testBoard[r][c];
          if (p && p.type === "king" && p.color === color) {
            kingPos = { row: r, col: c };
          }
        }
      }
    }

    return this.isSquareAttacked(
      testBoard, kingPos, color === "white" ? "black" : "white",
    );
  }

  /** Check if a square is attacked by the given color */
  isSquareAttacked(
    board: Cell[][], pos: Position, byColor: PieceColor,
  ): boolean {
    // Knight attacks
    const knightOffsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    for (const [dr, dc] of knightOffsets) {
      const r = pos.row + dr;
      const c = pos.col + dc;
      if (inBounds(r, c)) {
        const p = board[r][c];
        if (p && p.color === byColor && p.type === "knight") return true;
      }
    }

    // Straight-line attacks (rook/queen)
    const straightDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of straightDirs) {
      let r = pos.row + dr;
      let c = pos.col + dc;
      while (inBounds(r, c)) {
        const p = board[r][c];
        if (p) {
          if (p.color === byColor && (p.type === "rook" || p.type === "queen"))
            return true;
          break;
        }
        r += dr;
        c += dc;
      }
    }

    // Diagonal attacks (bishop/queen)
    const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of diagDirs) {
      let r = pos.row + dr;
      let c = pos.col + dc;
      while (inBounds(r, c)) {
        const p = board[r][c];
        if (p) {
          if (p.color === byColor && (p.type === "bishop" || p.type === "queen"))
            return true;
          break;
        }
        r += dr;
        c += dc;
      }
    }

    // Pawn attacks
    const pawnDir = byColor === "white" ? 1 : -1;
    for (const dc of [-1, 1]) {
      const r = pos.row + pawnDir;
      const c = pos.col + dc;
      if (inBounds(r, c)) {
        const p = board[r][c];
        if (p && p.color === byColor && p.type === "pawn") return true;
      }
    }

    // King attacks
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = pos.row + dr;
        const c = pos.col + dc;
        if (inBounds(r, c)) {
          const p = board[r][c];
          if (p && p.color === byColor && p.type === "king") return true;
        }
      }
    }

    return false;
  }

  /** Check if the given color is in check */
  isInCheck(board: Cell[][], color: PieceColor): boolean {
    let kingPos: Position | null = null;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const p = board[r][c];
        if (p && p.type === "king" && p.color === color) {
          kingPos = { row: r, col: c };
          break;
        }
      }
      if (kingPos) break;
    }
    if (!kingPos) return false;
    return this.isSquareAttacked(
      board, kingPos, color === "white" ? "black" : "white",
    );
  }

  // --- Piece-specific move generators ---

  private getPawnMoves(
    board: Cell[][], pos: Position, piece: Piece,
    enPassantTarget: Position | null,
  ): Position[] {
    const moves: Position[] = [];
    const dir = piece.color === "white" ? -1 : 1;
    const startRow = piece.color === "white" ? 6 : 1;

    // Forward one
    const fwd = pos.row + dir;
    if (inBounds(fwd, pos.col) && !board[fwd][pos.col]) {
      moves.push({ row: fwd, col: pos.col });
      // Forward two from starting position
      const fwd2 = pos.row + dir * 2;
      if (pos.row === startRow && !board[fwd2][pos.col]) {
        moves.push({ row: fwd2, col: pos.col });
      }
    }

    // Diagonal captures
    for (const dc of [-1, 1]) {
      const nr = pos.row + dir;
      const nc = pos.col + dc;
      if (inBounds(nr, nc)) {
        const target = board[nr][nc];
        if (target && target.color !== piece.color) {
          moves.push({ row: nr, col: nc });
        }
        // En passant
        if (enPassantTarget && enPassantTarget.row === nr && enPassantTarget.col === nc) {
          moves.push({ row: nr, col: nc });
        }
      }
    }

    return moves;
  }

  private getKnightMoves(
    board: Cell[][], pos: Position, piece: Piece,
  ): Position[] {
    const moves: Position[] = [];
    const offsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    for (const [dr, dc] of offsets) {
      const r = pos.row + dr;
      const c = pos.col + dc;
      if (inBounds(r, c)) {
        const target = board[r][c];
        if (!target || target.color !== piece.color) {
          moves.push({ row: r, col: c });
        }
      }
    }
    return moves;
  }

  private getSlidingMoves(
    board: Cell[][], pos: Position, piece: Piece, directions: number[][],
  ): Position[] {
    const moves: Position[] = [];
    for (const [dr, dc] of directions) {
      let r = pos.row + dr;
      let c = pos.col + dc;
      while (inBounds(r, c)) {
        const target = board[r][c];
        if (!target) {
          moves.push({ row: r, col: c });
        } else {
          if (target.color !== piece.color) {
            moves.push({ row: r, col: c });
          }
          break; // Cannot pass through any piece
        }
        r += dr;
        c += dc;
      }
    }
    return moves;
  }

  private getKingMoves(
    board: Cell[][], pos: Position, piece: Piece,
    castlingRights: ChessState["castlingRights"],
  ): Position[] {
    const moves: Position[] = [];

    // Normal one-square moves
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = pos.row + dr;
        const c = pos.col + dc;
        if (inBounds(r, c)) {
          const target = board[r][c];
          if (!target || target.color !== piece.color) {
            moves.push({ row: r, col: c });
          }
        }
      }
    }

    // Castling (pseudo-legal; check filtering happens in getLegalMoves)
    const opponent: PieceColor = piece.color === "white" ? "black" : "white";
    const row = piece.color === "white" ? 7 : 0;

    if (pos.row === row && pos.col === 4) {
      // Kingside
      const canKingside = piece.color === "white"
        ? castlingRights.whiteKingside
        : castlingRights.blackKingside;
      if (
        canKingside &&
        !board[row][5] && !board[row][6] &&
        board[row][7]?.type === "rook" &&
        board[row][7]?.color === piece.color &&
        !this.isSquareAttacked(board, { row, col: 4 }, opponent) &&
        !this.isSquareAttacked(board, { row, col: 5 }, opponent) &&
        !this.isSquareAttacked(board, { row, col: 6 }, opponent)
      ) {
        moves.push({ row, col: 6 });
      }

      // Queenside
      const canQueenside = piece.color === "white"
        ? castlingRights.whiteQueenside
        : castlingRights.blackQueenside;
      if (
        canQueenside &&
        !board[row][3] && !board[row][2] && !board[row][1] &&
        board[row][0]?.type === "rook" &&
        board[row][0]?.color === piece.color &&
        !this.isSquareAttacked(board, { row, col: 4 }, opponent) &&
        !this.isSquareAttacked(board, { row, col: 3 }, opponent) &&
        !this.isSquareAttacked(board, { row, col: 2 }, opponent)
      ) {
        moves.push({ row, col: 2 });
      }
    }

    return moves;
  }
}
```

**What's happening:**
- **Pawn moves** have four cases: forward one (if empty), forward two from the start row (if both squares empty), diagonal capture (if occupied by an opponent), and en passant capture (if the en passant target matches).
- **Knight moves** use the 8 L-shaped offsets. Each target is valid if it is in bounds and not occupied by a friendly piece.
- **Sliding moves** (bishop, rook, queen) iterate in a direction until hitting the board edge or a piece. If the piece is an opponent, the capture square is included; if friendly, the ray stops one square before.
- **King moves** check all 8 adjacent squares, plus castling. Castling requires: the castling right is still active, the squares between king and rook are empty, and the king does not pass through check.
- `getLegalMoves()` wraps `getPseudoLegalMoves()` with a filter: for each candidate move, clone the board, apply the move, and check if the king is in check afterward. Only moves that leave the king safe are returned.
- `isSquareAttacked()` checks all five attack patterns: knight jumps, straight-line sliding, diagonal sliding, pawn diagonals, and adjacent king squares.

---

### 3.2 -- Add Legal Move Indicators to the Renderer

Update `BoardRenderer.drawBoard()` to show legal move dots and capture rings.

Add the following constants at the top and the following code inside the cell loop (after the check highlight):

```typescript
const LEGAL_MOVE_COLOR = "rgba(0, 0, 0, 0.2)";
const LEGAL_CAPTURE_COLOR = "rgba(0, 0, 0, 0.2)";
```

Inside the cell loop, after the check highlight block:

```typescript
// Legal move indicators
const isLegalTarget = state.legalMoves.some(
  (m) => m.row === row && m.col === col,
);

if (isLegalTarget) {
  const piece = state.board[row][col];
  if (piece) {
    // Capture indicator: ring around the square
    ctx.strokeStyle = LEGAL_CAPTURE_COLOR;
    ctx.lineWidth = cellSize * 0.08;
    ctx.beginPath();
    ctx.arc(
      sx + cellSize / 2, sy + cellSize / 2,
      cellSize * 0.46, 0, Math.PI * 2,
    );
    ctx.stroke();
  } else {
    // Empty square: small dot
    ctx.fillStyle = LEGAL_MOVE_COLOR;
    ctx.beginPath();
    ctx.arc(
      sx + cellSize / 2, sy + cellSize / 2,
      cellSize * 0.15, 0, Math.PI * 2,
    );
    ctx.fill();
  }
}
```

**What's happening:**
- For each square, we check if it appears in `state.legalMoves`. If so, we draw a visual indicator.
- **Empty target squares** get a small filled dot (radius = 15% of cell size), matching the standard chess.com/Lichess convention.
- **Occupied target squares** (captures) get a circular ring outline instead, so the player can see the piece underneath.

---

### 3.3 -- Wire the MoveSystem into the Engine

Update `ChessEngine` to create a `MoveSystem` and populate legal moves when a piece is selected.

In the constructor, add:

```typescript
import { MoveSystem } from "./systems/MoveSystem.ts";

// In constructor:
this.moveSystem = new MoveSystem();
```

Update `selectPiece()`:

```typescript
private selectPiece(pos: Position): void {
  this.state.selectedPosition = pos;
  this.state.legalMoves = this.moveSystem.getLegalMoves(this.state, pos);
}
```

**What's happening:**
- When the player selects a piece, we immediately compute all legal moves for that piece and store them in `state.legalMoves`.
- The `BoardRenderer` reads `state.legalMoves` to draw the dot/ring indicators, so the player sees exactly where the piece can go.

---

## Try It

```bash
pnpm dev
```

Open http://localhost:3000 and verify:

1. **Click a white pawn** -- small dots appear on the one or two squares it can move to
2. **Click a white knight** -- dots appear on the L-shaped destinations (two squares available from the starting position)
3. **Click a white bishop** -- no dots appear (it is blocked by pawns in the starting position)
4. **Click the white queen** -- no dots appear (also blocked by pawns)
5. **Click a white rook** -- no dots appear (blocked by the knight)
6. **Click a different piece** -- the dots update to show the new piece's legal moves
7. **Click an empty square** -- dots disappear and no piece is selected

---

## What We Built

- A complete `MoveSystem` that generates legal moves for all six piece types
- Pseudo-legal move generation with piece-specific logic for pawns, knights, sliding pieces, and kings
- Check-aware filtering that rejects any move leaving the king in check
- An `isSquareAttacked()` utility that detects threats from all piece types
- Visual indicators (dots and rings) showing legal moves on the board

---

## Challenge

1. **Easy:** Change the legal move dot color to a green tint like `rgba(0, 180, 0, 0.3)`.
2. **Medium:** When a piece is selected, dim all other pieces slightly by drawing a semi-transparent overlay on squares that are not the selected square and not legal move targets.
3. **Hard:** Add move counting: display the number of legal moves available for the selected piece as text below the board.

---

## Next Step

In [Step 4: Executing Moves & Game Flow](./step-4.md), we'll make moves happen -- clicking a legal move target will move the piece, switch turns, and build a notation-based move history.

---
[<- Previous Step](./step-2.md) | [Back to Chess README](./README.md) | [Next Step ->](./step-4.md)
