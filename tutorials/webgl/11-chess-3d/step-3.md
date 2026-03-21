# Step 3: Move Logic & Highlights

**Goal:** Implement chess move generation for all piece types, filter out illegal moves (those that leave the king in check), and highlight selected pieces and legal move targets on the board.

**Time:** ~15 minutes

---

## What You'll Build

- **Move generation** for all 6 piece types (pawn, knight, bishop, rook, queen, king)
- **Legal move filtering** that prevents moving into check
- **Check detection** by scanning opponent attacks on the king
- **Visual highlights** — yellow for selected cell, green for legal move targets, subtle highlight for last move

---

## Concepts

- **Pseudo-legal vs. legal moves**: A pseudo-legal move follows the piece's movement rules but might leave the king in check. A legal move is a pseudo-legal move that, when simulated on a cloned board, does NOT leave the own king in check.

- **Sliding pieces**: Bishops, rooks, and queens use "sliding" movement — they move in a direction until blocked by another piece or the board edge. A helper function `addSlidingMoves` takes direction vectors and iterates until stopped.

- **Board cloning**: To check if a move is legal, clone the board, apply the move, then call `isKingInCheck`. This is the simplest approach — more efficient algorithms exist but aren't needed for a playable game.

---

## Code

### 3.1 — Pseudo-Legal Move Generation

**File:** `src/contexts/webgl/games/chess-3d/chessLogic.ts`

```typescript
function getPseudoMoves(board: Cell[][], pos: Position, piece: Piece): Position[] {
    const moves: Position[] = [];
    const { row, col } = pos;

    switch (piece.type) {
        case "pawn": {
            const dir = piece.color === "white" ? -1 : 1;
            const startRow = piece.color === "white" ? 6 : 1;

            // Forward move
            if (inBounds(row + dir, col) && !board[row + dir][col]) {
                moves.push({ row: row + dir, col });

                // Double move from start
                if (row === startRow && !board[row + dir * 2][col]) {
                    moves.push({ row: row + dir * 2, col });
                }
            }

            // Diagonal captures
            for (const dc of [-1, 1]) {
                if (inBounds(row + dir, col + dc)) {
                    const target = board[row + dir][col + dc];
                    if (target && target.color !== piece.color) {
                        moves.push({ row: row + dir, col: col + dc });
                    }
                }
            }
            break;
        }

        case "knight":
            for (const [dr, dc] of [
                [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                [1, -2], [1, 2], [2, -1], [2, 1],
            ]) {
                addIfValid(board, moves, row + dr, col + dc, piece.color);
            }
            break;

        case "bishop":
            addSlidingMoves(board, moves, row, col, piece.color, [
                [-1, -1], [-1, 1], [1, -1], [1, 1],
            ]);
            break;

        case "rook":
            addSlidingMoves(board, moves, row, col, piece.color, [
                [-1, 0], [1, 0], [0, -1], [0, 1],
            ]);
            break;

        case "queen":
            addSlidingMoves(board, moves, row, col, piece.color, [
                [-1, -1], [-1, 0], [-1, 1], [0, -1],
                [0, 1], [1, -1], [1, 0], [1, 1],
            ]);
            break;

        case "king":
            for (const [dr, dc] of [
                [-1, -1], [-1, 0], [-1, 1], [0, -1],
                [0, 1], [1, -1], [1, 0], [1, 1],
            ]) {
                addIfValid(board, moves, row + dr, col + dc, piece.color);
            }
            break;
    }

    return moves;
}
```

**What's happening:**
- **Pawn**: moves forward 1 (or 2 from start row), captures diagonally. `dir = -1` for white (moving toward row 0), `+1` for black.
- **Knight**: checks all 8 L-shaped jumps. `addIfValid` ensures the target is in bounds and not occupied by a friendly piece.
- **Bishop/Rook/Queen**: use `addSlidingMoves` with direction vectors. Bishops slide diagonally, rooks slide orthogonally, queens slide in all 8 directions.
- **King**: moves 1 square in any of 8 directions, using the same `addIfValid` as knight.

---

### 3.2 — Sliding Move Helper

```typescript
function addSlidingMoves(
    board: Cell[][], moves: Position[],
    row: number, col: number, color: PieceColor,
    directions: [number, number][],
): void {
    for (const [dr, dc] of directions) {
        let r = row + dr;
        let c = col + dc;

        while (inBounds(r, c)) {
            const target = board[r][c];

            if (!target) {
                moves.push({ row: r, col: c });
            } else {
                if (target.color !== color) {
                    moves.push({ row: r, col: c }); // capture
                }
                break; // blocked
            }

            r += dr;
            c += dc;
        }
    }
}
```

**What's happening:**
- For each direction, walk step-by-step until hitting a wall or piece.
- Empty square: add as a move and continue.
- Enemy piece: add as a capture move and stop.
- Friendly piece: stop without adding (blocked).

---

### 3.3 — Legal Move Filtering

```typescript
export function getLegalMoves(
    board: Cell[][], pos: Position, currentPlayer: PieceColor,
): Position[] {
    const piece = board[pos.row][pos.col];
    if (!piece || piece.color !== currentPlayer) return [];

    const pseudo = getPseudoMoves(board, pos, piece);

    // Filter: only keep moves that don't leave own king in check
    return pseudo.filter((to) => {
        const testBoard = cloneBoard(board);
        testBoard[to.row][to.col] = testBoard[pos.row][pos.col];
        testBoard[pos.row][pos.col] = null;
        return !isKingInCheck(testBoard, currentPlayer);
    });
}
```

**What's happening:**
- For each pseudo-legal move, clone the board, simulate the move, and check if the own king is now in check.
- `cloneBoard` does a shallow copy of each cell: `board.map(row => row.map(cell => cell ? { ...cell } : null))`.
- `isKingInCheck` finds the king, then checks if any opponent piece has a pseudo-legal move that reaches the king's position.
- This `filter` can be expensive (up to ~1000 board clones per turn) but is fast enough for real-time play.

---

### 3.4 — Board Cell Highlighting

```typescript
// In render(), when drawing board cells:
for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
        // ... base color ...

        // Highlight selected piece
        if (s.selectedPos && s.selectedPos.row === r && s.selectedPos.col === c) {
            cr = 0.9; cg = 0.85; cb = 0.3; // yellow
        }

        // Highlight legal moves
        const isLegal = s.legalMoves.some((m) => m.row === r && m.col === c);
        if (isLegal) {
            cr = 0.3; cg = 0.7; cb = 0.3; // green
        }

        // Highlight last move
        if (s.lastMove) {
            if (
                (s.lastMove.from.row === r && s.lastMove.from.col === c) ||
                (s.lastMove.to.row === r && s.lastMove.to.col === c)
            ) {
                cr = Math.min(1, cr + 0.15);
                cg = Math.min(1, cg + 0.2);
                cb = Math.min(1, cb + 0.05);
            }
        }

        this.drawBox(cx, BOARD_Y - 0.05, cz, ...);
    }
}
```

**What's happening:**
- **Selected cell**: overrides color to bright yellow — clear visual feedback for which piece is active.
- **Legal moves**: override to green — shows all cells where the selected piece can move.
- **Last move**: adds a subtle brightness boost to both the origin and destination cells, so players can see what just happened.
- Color overrides are applied in priority order: last move < legal move < selected. The most specific highlight wins.

---

## Test It

```bash
pnpm dev
```

1. Select "Chess 3D" from the 3D category
2. The board renders with all pieces in starting positions
3. Highlights are not yet interactive — clicking is not wired up until step 4
4. To verify the logic works, you can temporarily add a hardcoded selection:
   ```typescript
   s.selectedPos = { row: 6, col: 4 }; // e2 pawn
   s.legalMoves = getLegalMoves(s.board, s.selectedPos, "white");
   ```
5. You should see the **e2 pawn highlighted yellow** and **e3 and e4 highlighted green**

---

## Challenges

**Easy:**
- Change the legal move highlight from green to blue. Which feels more intuitive?

**Medium:**
- Add a "check" indicator: when `isCheck` is true, highlight the king's cell in red instead of its normal color.

**Hard:**
- Implement pawn promotion: when a pawn reaches the far row, show 4 highlighted cells above the board representing queen, rook, bishop, knight choices.

---

## What You Learned

- Chess move generation uses piece-specific rules: jumps for knights/kings, sliding for bishops/rooks/queens
- `addSlidingMoves` walks in a direction until blocked by a piece or board edge
- Legal move filtering clones the board, simulates each move, and rejects those leaving the king in check
- Cell highlighting overrides base colors — yellow for selection, green for legal targets
- Last-move highlighting adds subtle brightness to track the game flow

**Next:** We'll add ray-plane intersection for click-to-cell mapping and an AI opponent.

---
[← Previous Step](./step-2.md) | [Back to README](./README.md) | [Next Step →](./step-4.md)
