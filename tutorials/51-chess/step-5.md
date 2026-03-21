# Step 5: Check, Checkmate & Special Moves

> **Game:** Chess | **Step 5 of 6** | **Time:** ~20 minutes
> **Previous:** [Step 4](./step-4.md) | **Next:** [Step 6](./step-6.md)

## What You'll Learn

- Implementing castling (kingside and queenside) with proper validation
- Handling en passant captures
- Adding a pawn promotion picker UI
- Highlighting the king when in check
- Implementing undo by replaying move history
- Understanding how special moves interact with castling rights

## Prerequisites

- Completed Step 4 (move execution and game flow)

---

## Let's Code

### 5.1 -- Castling in Detail

Castling was partially implemented in Steps 3 and 4. Let's trace through the complete flow to understand how all the pieces fit together.

**How castling works in our code:**

1. **Move generation** (`MoveSystem.getKingMoves()`): When generating king moves, we check if castling is legal. The conditions are:
   - The relevant castling right is still `true`
   - The squares between king and rook are empty
   - The rook is present on its starting square
   - The king does not pass through or end on an attacked square

2. **Legality filtering** (`MoveSystem.wouldBeInCheck()`): The `wouldBeInCheck` method handles castling by moving the rook too when cloning the board for check detection.

3. **Execution** (`MoveSystem.executeMove()`): When the king moves 2 columns, we detect it as castling and move the rook to the other side of the king.

4. **Rights revocation** (`MoveSystem.updateCastlingRights()`): Any king move revokes both castling rights. Any move from or to a rook's starting corner revokes that side's right.

**The castling validation in `getKingMoves()` checks three attacked squares:**

```typescript
// Kingside: king must be safe on e1, f1, and g1
!this.isSquareAttacked(board, { row, col: 4 }, opponent) &&
!this.isSquareAttacked(board, { row, col: 5 }, opponent) &&
!this.isSquareAttacked(board, { row, col: 6 }, opponent)

// Queenside: king must be safe on e1, d1, and c1
// Note: b1 can be attacked -- only the king's path matters
!this.isSquareAttacked(board, { row, col: 4 }, opponent) &&
!this.isSquareAttacked(board, { row, col: 3 }, opponent) &&
!this.isSquareAttacked(board, { row, col: 2 }, opponent)
```

**What's happening:**
- The king cannot castle out of check, through check, or into check. We verify this by checking if any of the three squares in the king's path is attacked.
- For queenside castling, the b-file square (col 1) must be empty but does NOT need to be safe from attack -- only the king's path matters.

---

### 5.2 -- En Passant in Detail

En passant is a special pawn capture that occurs when an opponent's pawn advances two squares and lands beside your pawn. You can capture it as if it had only moved one square.

**The en passant flow:**

1. **Setting the target** (`executeMove()`): When a pawn moves two squares forward, we record the en passant target as the skipped square:

```typescript
if (piece.type === "pawn" && Math.abs(to.row - from.row) === 2) {
  state.enPassantTarget = {
    row: (from.row + to.row) / 2,  // The square the pawn "passed through"
    col: from.col,
  };
} else {
  state.enPassantTarget = null;  // Reset on any other move
}
```

2. **Generating the move** (`getPawnMoves()`): When checking diagonal captures, we also check if the diagonal matches the en passant target:

```typescript
if (enPassantTarget && enPassantTarget.row === nr && enPassantTarget.col === nc) {
  moves.push({ row: nr, col: nc });
}
```

3. **Executing the capture** (`executeMove()`): When a pawn moves diagonally to the en passant target, we remove the captured pawn from its actual position (one row behind the destination):

```typescript
if (piece.type === "pawn" && state.enPassantTarget && posEq(to, state.enPassantTarget)) {
  isEnPassant = true;
  const capturedRow = piece.color === "white" ? to.row + 1 : to.row - 1;
  state.board[capturedRow][to.col] = null;
}
```

**What's happening:**
- The en passant target is only valid for one turn. It is set when a pawn double-pushes and cleared on the very next move. This matches the official chess rules.
- The captured pawn is not on the destination square -- it is one row behind. That is why we need the special `isEnPassant` flag and the separate removal logic.

---

### 5.3 -- Add Pawn Promotion with a Picker UI

When a pawn reaches the opposite end of the board, the player must choose a piece to promote to. We will show a column of four piece options (queen, rook, bishop, knight) that the player clicks.

**Update `MoveSystem.executeMove()`** to support pending promotions:

When a pawn reaches the promotion row and no `promotionChoice` is provided, instead of auto-promoting to queen, we set `state.pendingPromotion` and return early:

```typescript
// In executeMove, replace the promotion section:
const promotionRow = piece.color === "white" ? 0 : 7;
if (piece.type === "pawn" && to.row === promotionRow) {
  isPromotion = true;

  if (promotionChoice) {
    promotedTo = promotionChoice;
  } else {
    // Place pawn on destination and show the picker
    state.board[to.row][to.col] = piece;
    state.board[from.row][from.col] = null;
    state.pendingPromotion = { row: to.row, col: to.col };

    if (captured && !isEnPassant) {
      if (piece.color === "white") {
        state.capturedByWhite.push(captured);
      } else {
        state.capturedByBlack.push(captured);
      }
    }

    state.enPassantTarget = null;
    this.updateCastlingRights(state, from, to);

    return {
      from, to, piece,
      captured: captured || null,
      isEnPassant, isCastling, isPromotion: true,
      promotedTo: null, notation: "",
    };
  }
}
```

**Add `completePromotion()` to `MoveSystem`:**

```typescript
/** Complete a pending pawn promotion */
completePromotion(state: ChessState, choice: PieceType): Move | null {
  const promo = state.pendingPromotion;
  if (!promo) return null;

  const piece = state.board[promo.row][promo.col];
  if (!piece) return null;

  // Replace the pawn with the chosen piece
  state.board[promo.row][promo.col] = { type: choice, color: piece.color };
  state.pendingPromotion = null;

  // Update the last move in history with the promotion choice
  const lastMove = state.moveHistory[state.moveHistory.length - 1];
  if (lastMove) {
    lastMove.promotedTo = choice;
    lastMove.notation = this.buildNotation(
      lastMove.piece, lastMove.from, lastMove.to,
      lastMove.captured !== null, lastMove.isCastling,
      true, choice, state,
    );
    return lastMove;
  }
  return null;
}
```

**What's happening:**
- When promotion is pending, the pawn is placed on the destination square (so the board looks correct), but the turn does not switch yet.
- `state.pendingPromotion` stores the row/col of the promoting pawn. The engine checks this flag to block further interaction until the player picks a piece.
- `completePromotion()` replaces the pawn with the chosen piece type, clears the pending flag, and updates the move notation.

---

### 5.4 -- Draw the Promotion Picker

**Add to `BoardRenderer`:**

```typescript
private drawPromotionPicker(
  ctx: CanvasRenderingContext2D,
  state: ChessState,
  layout: { x: number; y: number; size: number; cellSize: number },
): void {
  const promo = state.pendingPromotion;
  if (!promo) return;

  const { x, y, cellSize } = layout;
  const choices: PieceType[] = ["queen", "rook", "bishop", "knight"];
  const piece = state.board[promo.row][promo.col];
  const color: PieceColor = piece ? piece.color : "white";
  const goingDown = promo.row === 0;

  // Semi-transparent overlay behind the board
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(x, y, layout.size, layout.size);

  const pickerX = x + promo.col * cellSize;

  for (let i = 0; i < choices.length; i++) {
    const pickerY = goingDown
      ? y + i * cellSize
      : y + (BOARD_SIZE - 1 - i) * cellSize;

    // Background
    ctx.fillStyle = i % 2 === 0 ? "#f0f0f0" : "#d0d0d0";
    ctx.fillRect(pickerX, pickerY, cellSize, cellSize);

    // Border
    ctx.strokeStyle = "#5d4037";
    ctx.lineWidth = 2;
    ctx.strokeRect(pickerX, pickerY, cellSize, cellSize);

    // Piece icon
    const char = PIECE_UNICODE[color][choices[i]];
    const fontSize = cellSize * 0.75;
    ctx.font = `${fontSize}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillText(char, pickerX + cellSize / 2 + 1, pickerY + cellSize / 2 + 1);

    ctx.fillStyle = color === "white" ? "#ffffff" : "#1a1a1a";
    ctx.fillText(char, pickerX + cellSize / 2, pickerY + cellSize / 2);
  }
}
```

**Update `BoardRenderer.render()` to call it:**

```typescript
render(ctx: CanvasRenderingContext2D, state: ChessState): void {
  const layout = this.getLayout(state);
  this.drawBoard(ctx, state, layout);
  this.drawCoordinates(ctx, layout);
  this.drawPieces(ctx, state, layout);

  if (state.pendingPromotion) {
    this.drawPromotionPicker(ctx, state, layout);
  }
}
```

**What's happening:**
- The promotion picker draws a column of four squares on top of the board, aligned with the column where the pawn promoted.
- If the pawn promoted on row 0 (white pawn reaching the top), the picker extends downward. If on row 7 (black pawn reaching the bottom), it extends upward.
- A semi-transparent overlay dims the rest of the board so the picker stands out.
- Each choice is rendered with the same Unicode + shadow technique used for regular pieces.

---

### 5.5 -- Handle Promotion Clicks in InputSystem

**Update `InputSystem.handleClick()`** to intercept clicks when a promotion is pending:

```typescript
// Add this block before the board coordinate conversion:
if (s.pendingPromotion) {
  const boardInfo = this.getBoardLayout();
  const promoCol = s.pendingPromotion.col;
  const promoRow = s.pendingPromotion.row;
  const cellSize = boardInfo.cellSize;
  const pickerX = boardInfo.x + promoCol * cellSize;
  const goingDown = promoRow === 0;
  const choices: PieceType[] = ["queen", "rook", "bishop", "knight"];

  for (let i = 0; i < choices.length; i++) {
    const py = goingDown
      ? boardInfo.y + i * cellSize
      : boardInfo.y + (BOARD_SIZE - 1 - i) * cellSize;

    if (mx >= pickerX && mx <= pickerX + cellSize &&
        my >= py && my <= py + cellSize) {
      this.onPromotionChoice(choices[i]);
      return;
    }
  }
  return; // Block all other clicks while promotion is pending
}
```

---

### 5.6 -- Implement Undo

**Add to `ChessEngine`:**

```typescript
private undoMove(): void {
  if (this.state.moveHistory.length === 0) return;

  // Pop the last move
  this.state.moveHistory.pop();

  // Rebuild the board from scratch
  this.rebuildFromHistory();
}

private rebuildFromHistory(): void {
  const moves = [...this.state.moveHistory];
  const mode = this.state.mode;
  const w = this.state.canvasWidth;
  const h = this.state.canvasHeight;

  // Reset state
  const freshState = this.createInitialState(w, h);
  freshState.mode = mode;
  freshState.showModeSelect = false;
  Object.assign(this.state, freshState);
  this.state.moveHistory = [];

  // Replay all moves
  for (const move of moves) {
    const promoChoice = move.isPromotion
      ? (move.promotedTo ?? "queen")
      : undefined;
    this.moveSystem.executeMove(this.state, move.from, move.to, promoChoice);
    this.state.pendingPromotion = null;
    this.state.moveHistory.push(move);
    this.state.currentPlayer =
      this.state.currentPlayer === "white" ? "black" : "white";
  }

  // Re-evaluate game status
  this.state.isCheck = this.moveSystem.isInCheck(
    this.state.board, this.state.currentPlayer,
  );
  this.state.isCheckmate = false;
  this.state.isStalemate = false;
  this.state.gameOver = false;
  this.state.lastMove = moves.length > 0 ? moves[moves.length - 1] : null;
  this.state.selectedPosition = null;
  this.state.legalMoves = [];

  // Update king positions
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = this.state.board[r][c];
      if (p && p.type === "king") {
        this.state.kingPositions[p.color] = { row: r, col: c };
      }
    }
  }
}
```

**What's happening:**
- Undo works by replaying. We pop the last move from history, reset the entire board to the initial state, then replay every remaining move from scratch.
- This replay approach is simple and correct. It naturally handles all special moves (castling, en passant, promotion) because each replayed move goes through `executeMove()`.
- After replaying, we re-evaluate check status and scan for king positions to keep the rendering accurate.

---

### 5.7 -- Wire the Promotion and Undo Callbacks

**Update the `InputSystem` constructor call in `ChessEngine`:**

```typescript
this.inputSystem = new InputSystem(
  canvas,
  this.state,
  onExit,
  (pos: Position) => this.onSquareClick(pos),
  (mode: GameMode) => this.onModeSelect(mode),
  () => this.resetGame(),
  () => {},  // Help toggle
  () => this.undoMove(),
  (choice: PieceType) => this.onPromotionChoice(choice),
);

// Add:
private onPromotionChoice(choice: PieceType): void {
  if (!this.state.pendingPromotion) return;
  this.moveSystem.completePromotion(this.state, choice);
  this.gameSystem.updateGameStatus(this.state);
}
```

Also gate `onSquareClick` and `update` to block interaction during pending promotion:

```typescript
private onSquareClick(pos: Position): void {
  if (this.state.gameOver) return;
  if (this.state.pendingPromotion) return;
  // ... rest of existing logic
}
```

---

## Try It

```bash
pnpm dev
```

Open http://localhost:3000 and test these scenarios:

1. **Castling:** Move the white kingside knight and bishop out of the way, then click the king and you will see a legal move dot on g1. Click it -- the king slides to g1 and the rook jumps to f1.
2. **En passant:** Advance a white pawn to the 5th rank. Have black push an adjacent pawn two squares forward. On the next move, your pawn can capture diagonally behind the black pawn.
3. **Promotion:** Push a pawn all the way to the 8th rank. A picker appears with four piece options. Click one to promote.
4. **Check:** Move pieces to put the opponent's king in check. The king square turns red and "CHECK!" appears in the turn indicator.
5. **Undo:** Press U to undo the last move. The board reverts correctly, even after castling or en passant.

---

## What We Built

- Full castling support with proper path-safety validation
- En passant capture with single-turn target tracking
- Pawn promotion with a visual piece picker overlay
- Undo via move history replay
- Red check highlight on the king's square

---

## Challenge

1. **Easy:** Customize the promotion picker appearance -- try adding a hover effect or a title label like "Promote to:".
2. **Medium:** In AI mode (coming in Step 6), undo two moves at once (the player's move and the AI's response) so the player gets back to their own turn.
3. **Hard:** Implement the 50-move rule: if 50 full moves pass with no pawn move or capture, the game is automatically a draw. Use the `halfMoveClock` field.

---

## Next Step

In [Step 6: AI Opponent with Minimax](./step-6.md), we'll add a computer opponent that uses minimax with alpha-beta pruning and piece-square table evaluation to play a competitive game.

---
[<- Previous Step](./step-4.md) | [Back to Chess README](./README.md) | [Next Step ->](./step-6.md)
