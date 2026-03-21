# Step 6: AI Opponent with Minimax

> **Game:** Chess | **Step 6 of 6** | **Time:** ~20 minutes
> **Previous:** [Step 5](./step-5.md)

## What You'll Learn

- Building a game tree search with the minimax algorithm
- Pruning the search tree with alpha-beta cutoffs
- Evaluating board positions using material values and piece-square tables
- Lightweight state cloning for performant AI search
- Adding a mode selection screen (AI vs. 2-player)
- Handling AI thinking delay for natural-feeling gameplay

## Prerequisites

- Completed Step 5 (all chess rules and special moves working)

---

## Let's Code

### 6.1 -- Understand the Minimax Algorithm

Minimax is a decision-making algorithm for two-player zero-sum games. The AI ("maximizer") tries to maximize the board evaluation score, while the human ("minimizer") tries to minimize it.

**The algorithm works by building a tree of possible future positions:**

1. At the root, it is the AI's turn. The AI tries each of its legal moves.
2. For each move, it simulates the opponent's response (all of the opponent's legal moves).
3. This continues to a fixed depth (we use depth 2, meaning the AI looks 2 moves ahead).
4. At the leaves, the board is evaluated numerically.
5. Scores propagate back up: maximizing nodes pick the highest child, minimizing nodes pick the lowest.

**Alpha-beta pruning** dramatically reduces the search space. It maintains two bounds:
- **Alpha**: the best score the maximizer can guarantee so far
- **Beta**: the best score the minimizer can guarantee so far

If at any point `beta <= alpha`, we can stop searching that branch ("prune" it) because the opponent would never allow the AI to reach that position.

---

### 6.2 -- Build the AI System

**File:** `src/games/chess/systems/AISystem.ts`

```typescript
import type { ChessState, PieceColor, Position, Cell } from "../types.ts";
import { BOARD_SIZE } from "../types.ts";
import { PIECE_VALUES, PIECE_SQUARE_TABLES } from "../data/pieces.ts";
import type { MoveSystem } from "./MoveSystem.ts";

/** Lightweight clone for AI search -- skips UI fields */
function cloneForAI(state: ChessState): ChessState {
  const board: Cell[][] = new Array(BOARD_SIZE);

  for (let r = 0; r < BOARD_SIZE; r++) {
    const srcRow = state.board[r];
    const newRow: Cell[] = new Array(BOARD_SIZE);
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = srcRow[c];
      newRow[c] = cell ? { type: cell.type, color: cell.color } : null;
    }
    board[r] = newRow;
  }

  return {
    board,
    currentPlayer: state.currentPlayer,
    mode: state.mode,
    castlingRights: {
      whiteKingside: state.castlingRights.whiteKingside,
      whiteQueenside: state.castlingRights.whiteQueenside,
      blackKingside: state.castlingRights.blackKingside,
      blackQueenside: state.castlingRights.blackQueenside,
    },
    enPassantTarget: state.enPassantTarget
      ? { row: state.enPassantTarget.row, col: state.enPassantTarget.col }
      : null,
    kingPositions: {
      white: { row: state.kingPositions.white.row, col: state.kingPositions.white.col },
      black: { row: state.kingPositions.black.row, col: state.kingPositions.black.col },
    },
    // UI fields -- not used by move generation
    selectedPosition: null,
    legalMoves: [],
    lastMove: null,
    moveHistory: [],
    capturedByWhite: [],
    capturedByBlack: [],
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    gameOver: false,
    showModeSelect: false,
    canvasWidth: 0,
    canvasHeight: 0,
    aiThinking: false,
    halfMoveClock: 0,
    fullMoveNumber: 0,
    animationTime: 0,
    pendingPromotion: null,
  };
}

export class AISystem {
  private moveSystem: MoveSystem;
  private thinkingDelay: number;
  private thinkTimer: number;
  private pendingMove: { from: Position; to: Position } | null;

  constructor(moveSystem: MoveSystem) {
    this.moveSystem = moveSystem;
    this.thinkingDelay = 400; // ms before the AI "decides"
    this.thinkTimer = 0;
    this.pendingMove = null;
  }

  update(state: ChessState, dt: number): void {
    if (state.mode !== "ai") return;
    if (state.gameOver) return;
    if (state.currentPlayer !== "black") return;
    if (state.showModeSelect) return;

    if (!state.aiThinking) {
      state.aiThinking = true;
      this.thinkTimer = 0;
      this.pendingMove = null;
    }

    this.thinkTimer += dt;

    // Compute the best move after the thinking delay
    if (this.thinkTimer >= this.thinkingDelay && !this.pendingMove) {
      this.pendingMove = this.findBestMove(state);
    }

    // Execute after a brief additional pause (100ms)
    if (this.pendingMove && this.thinkTimer >= this.thinkingDelay + 100) {
      state.selectedPosition = this.pendingMove.from;
      state.legalMoves = [this.pendingMove.to];
      this.pendingMove = null;
    }
  }

  reset(): void {
    this.thinkTimer = 0;
    this.pendingMove = null;
  }

  private findBestMove(state: ChessState): { from: Position; to: Position } | null {
    const allMoves = this.moveSystem.getAllLegalMoves(state, "black");
    if (allMoves.length === 0) return null;

    let bestScore = -Infinity;
    let bestMove = allMoves[0];

    for (const move of allMoves) {
      const testState = cloneForAI(state);
      this.moveSystem.executeMove(testState, move.from, move.to, "queen");
      const score = this.minimax(testState, 2, -Infinity, Infinity, false);

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  private minimax(
    state: ChessState,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
  ): number {
    if (depth === 0) {
      return this.evaluate(state);
    }

    const color: PieceColor = isMaximizing ? "black" : "white";
    const allMoves = this.moveSystem.getAllLegalMoves(state, color);

    if (allMoves.length === 0) {
      if (this.moveSystem.isInCheck(state.board, color)) {
        // Checkmate: worst for the side with no moves
        return isMaximizing ? -99999 + (3 - depth) : 99999 - (3 - depth);
      }
      return 0; // Stalemate is a draw
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of allMoves) {
        const testState = cloneForAI(state);
        this.moveSystem.executeMove(testState, move.from, move.to, "queen");
        const score = this.minimax(testState, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, score);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break; // Beta cutoff
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of allMoves) {
        const testState = cloneForAI(state);
        this.moveSystem.executeMove(testState, move.from, move.to, "queen");
        const score = this.minimax(testState, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, score);
        beta = Math.min(beta, score);
        if (beta <= alpha) break; // Alpha cutoff
      }
      return minEval;
    }
  }

  private evaluate(state: ChessState): number {
    let score = 0;

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = state.board[r][c];
        if (!piece) continue;

        const value = PIECE_VALUES[piece.type];
        const pst = PIECE_SQUARE_TABLES[piece.type];

        // PST is from white's perspective; mirror for black
        const pstRow = piece.color === "white" ? r : 7 - r;
        const positionalValue = pst[pstRow][c];

        if (piece.color === "black") {
          score += value + positionalValue;
        } else {
          score -= value + positionalValue;
        }
      }
    }

    return score;
  }
}
```

**What's happening:**
- `cloneForAI()` creates a lightweight copy of the game state that only includes fields needed for move generation and evaluation. It skips move history, captured lists, and UI state. This makes the AI search much faster since each node in the search tree allocates less memory.
- `findBestMove()` iterates over all legal moves for black, tries each one on a cloned state, and evaluates using minimax. The move with the highest score is chosen.
- `minimax()` recurses to `depth` levels. At depth 0, it calls `evaluate()`. At intermediate nodes, it alternates between maximizing (black's turn) and minimizing (white's turn). Alpha-beta pruning skips branches that cannot improve the best known result.
- The checkmate score uses `99999` offset by depth so the AI prefers faster checkmates and delays longer checkmates.
- `evaluate()` sums material values and positional bonuses for all pieces. Black pieces add to the score, white pieces subtract. This means a higher score is better for black (the AI).
- The piece-square tables add strategic knowledge: pawns are worth more in the center, knights prefer central squares, the king is safest in the corners during the opening.
- `update()` runs on every frame but only acts when it is AI's turn. It waits `thinkingDelay` milliseconds before computing the move, then emits it by setting `selectedPosition` and `legalMoves` on the state. The engine picks this up and executes the move.

---

### 6.3 -- Add Mode Selection Screen

**Update `HUDRenderer`** to draw a mode selection screen when `state.showModeSelect` is true:

```typescript
// At the top of the render method:
render(ctx: CanvasRenderingContext2D, state: ChessState): void {
  if (state.showModeSelect) {
    this.drawModeSelect(ctx, state);
    return;
  }
  // ... rest of existing render logic
}

private drawModeSelect(ctx: CanvasRenderingContext2D, state: ChessState): void {
  const W = state.canvasWidth;
  const H = state.canvasHeight;

  ctx.fillStyle = "#1a1210";
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.font = "bold 48px serif";
  ctx.fillStyle = "#d4a76a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("\u265A Chess \u2654", W / 2, H / 2 - 120);

  ctx.font = "18px monospace";
  ctx.fillStyle = "#888";
  ctx.fillText("Select Game Mode", W / 2, H / 2 - 70);

  const btnW = 220;
  const btnH = 50;
  const centerX = W / 2;
  const centerY = H / 2;

  // AI button
  ctx.fillStyle = "#5d4037";
  ctx.beginPath();
  ctx.roundRect(centerX - btnW / 2, centerY - 10 - btnH, btnW, btnH, 10);
  ctx.fill();
  ctx.font = "bold 18px monospace";
  ctx.fillStyle = "#fff";
  ctx.fillText("vs Computer (AI)", centerX, centerY - 10 - btnH / 2);

  // 2-player button
  ctx.fillStyle = "#37474f";
  ctx.beginPath();
  ctx.roundRect(centerX - btnW / 2, centerY + 10, btnW, btnH, 10);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText("2 Players (Local)", centerX, centerY + 10 + btnH / 2);
}
```

**What's happening:**
- The mode select screen renders before the game starts, showing a title and two buttons.
- The AI button uses the chess accent color (`#5d4037`), and the 2-player button uses a blue-grey (`#37474f`).
- `roundRect` creates buttons with rounded corners for a polished look.

---

### 6.4 -- Handle Mode Selection Clicks

**Update `InputSystem.handleClick()`** to detect clicks on the mode selection buttons:

```typescript
// At the top of handleClick, before board coordinate conversion:
if (s.showModeSelect) {
  const cw = s.canvasWidth;
  const ch = s.canvasHeight;
  const btnW = 220;
  const btnH = 50;
  const centerX = cw / 2;
  const centerY = ch / 2;

  const aiX = centerX - btnW / 2;
  const aiY = centerY - 10 - btnH;
  if (mx >= aiX && mx <= aiX + btnW && my >= aiY && my <= aiY + btnH) {
    this.onModeSelect("ai");
    return;
  }

  const twoX = centerX - btnW / 2;
  const twoY = centerY + 10;
  if (mx >= twoX && mx <= twoX + btnW && my >= twoY && my <= twoY + btnH) {
    this.onModeSelect("2player");
    return;
  }
  return;
}
```

---

### 6.5 -- Wire the AI into the Engine

**Update `ChessEngine`:**

```typescript
import { AISystem } from "./systems/AISystem.ts";

// In constructor:
this.aiSystem = new AISystem(this.moveSystem);

// Set initial state to show mode select:
this.state.showModeSelect = true;

// Add update method:
private update(dt: number): void {
  if (this.state.showModeSelect) return;
  if (this.state.gameOver) return;
  if (this.state.pendingPromotion) return;

  this.aiSystem.update(this.state, dt);

  // Check if AI has set a move target
  if (
    this.state.aiThinking &&
    this.state.selectedPosition &&
    this.state.legalMoves.length === 1 &&
    this.state.currentPlayer === "black" &&
    this.state.mode === "ai"
  ) {
    const from = this.state.selectedPosition;
    const to = this.state.legalMoves[0];
    // AI always promotes to queen
    const pawn = this.state.board[from.row][from.col];
    const promotionRow = pawn?.color === "white" ? 0 : 7;
    const isPromotion = pawn?.type === "pawn" && to.row === promotionRow;

    this.makeMove(from, to, isPromotion ? "queen" : undefined);
    this.state.aiThinking = false;
  }
}

// Update the loop to include update:
private loop(): void {
  if (!this.running) return;
  const now = performance.now();
  const dt = now - this.lastTime;
  this.lastTime = now;
  this.update(dt);
  this.render();
  this.rafId = requestAnimationFrame(() => this.loop());
}

// Block clicks during AI turn:
private onSquareClick(pos: Position): void {
  if (this.state.showModeSelect) return;
  if (this.state.gameOver) return;
  if (this.state.aiThinking) return;
  if (this.state.pendingPromotion) return;
  if (this.state.mode === "ai" && this.state.currentPlayer === "black") return;
  // ... rest of existing logic
}

// Add mode select handler:
private onModeSelect(mode: GameMode): void {
  this.state.mode = mode;
  this.state.showModeSelect = false;
  this.resetGame();
}

// Update undo for AI mode (undo two moves):
private undoMove(): void {
  if (this.state.moveHistory.length === 0) return;
  if (this.state.aiThinking) return;

  const undoCount =
    this.state.mode === "ai" && this.state.moveHistory.length >= 2 ? 2 : 1;

  for (let i = 0; i < undoCount; i++) {
    if (this.state.moveHistory.length === 0) break;
    this.state.moveHistory.pop();
  }

  this.rebuildFromHistory();
}

// Update resetGame:
private resetGame(): void {
  const mode = this.state.mode;
  const w = this.state.canvasWidth;
  const h = this.state.canvasHeight;
  const freshState = this.createInitialState(w, h);
  freshState.mode = mode;
  freshState.showModeSelect = false;
  Object.assign(this.state, freshState);
  this.aiSystem.reset();
}

// Update HUD turn indicator to show AI thinking:
// (This is already handled in HUDRenderer -- the turnText shows "AI thinking..."
// when state.aiThinking is true)
```

**What's happening:**
- The game loop now calls `update(dt)` before `render()`. The update step delegates to `aiSystem.update()` which manages the AI's thinking timer and move selection.
- When the AI finishes thinking, it sets `selectedPosition` and `legalMoves` on the state. The engine's `update()` detects this pattern and calls `makeMove()`.
- `onSquareClick()` now blocks interaction when it is the AI's turn (`state.aiThinking` or `currentPlayer === "black"` in AI mode).
- In AI mode, undo removes two moves (the AI's response and the player's move) so the player returns to their own turn.
- `onModeSelect()` stores the chosen mode, hides the mode select screen, and resets the game.

---

### 6.6 -- Update the HUD for AI Mode

**Add to `HUDRenderer.drawTurnIndicator()`:**

```typescript
const turnText = state.aiThinking
  ? "AI thinking..."
  : `${state.currentPlayer === "white" ? "White" : "Black"} to move`;

// Mode indicator (right-aligned):
ctx.font = "12px monospace";
ctx.fillStyle = "#666";
ctx.textAlign = "right";
ctx.fillText(
  state.mode === "ai" ? "vs AI" : "2 Player",
  boardLayout.x + boardLayout.size,
  y,
);
```

**Update the status bar to show the M key:**

```typescript
ctx.fillText(
  "[R] Restart  [M] Mode  [U] Undo  [H] Help  [ESC] Exit",
  state.canvasWidth / 2, y,
);
```

**Add M key to `InputSystem.handleKey()`:**

```typescript
else if (e.key === "m" || e.key === "M") {
  this.state.showModeSelect = true;
}
```

---

## Try It

```bash
pnpm dev
```

Open http://localhost:3000 and enjoy the full game:

1. **Mode select** -- choose "vs Computer (AI)" or "2 Players (Local)"
2. **Play against the AI** -- make your move as white, then watch "AI thinking..." appear while the computer calculates its response
3. **The AI plays competitively** -- it controls the center, develops pieces, captures undefended material, and avoids blunders
4. **Undo in AI mode** -- press U to take back your last move (both your move and the AI's response are undone)
5. **Switch modes** -- press M to return to the mode select screen
6. **Try to checkmate the AI** -- or see if it checkmates you!
7. **2-player mode** -- play against a friend on the same screen

---

## What We Built

In this final step, we added:

- A **minimax AI** with alpha-beta pruning that searches 2 moves ahead
- **Board evaluation** using material values (pawn=100, knight=320, bishop=330, rook=500, queen=900) and piece-square tables for positional awareness
- **Lightweight state cloning** that only copies data needed for move generation, keeping the AI fast
- A **mode selection screen** with AI and 2-player options
- **AI thinking delay** (400ms + 100ms) for natural-feeling gameplay
- **Smart undo** that removes both the player's move and the AI's response in AI mode

---

## Challenge

1. **Easy:** Change the AI search depth from 2 to 3. Notice how it plays stronger but takes longer to respond.
2. **Medium:** Add move ordering to the AI: sort captures before quiet moves in `findBestMove()`. This helps alpha-beta prune more branches, making depth 3 faster.
3. **Hard:** Add an opening book: for the first 5 moves, have the AI play from a small list of known good openings (Italian Game, Sicilian Defense, etc.) instead of computing with minimax.

---

## What You Learned (Full Tutorial)

Across all 6 steps, you built a complete chess game from scratch:

1. **Board Setup & Rendering** -- types, initial board, alternating colors, Unicode pieces
2. **Selection & Input** -- mouse-to-board coordinate conversion, selection highlighting
3. **Move Validation** -- pseudo-legal and legal move generation for all piece types
4. **Move Execution** -- captures, notation, move history, turn switching, checkmate detection
5. **Special Moves** -- castling, en passant, promotion with picker UI, undo
6. **AI Opponent** -- minimax with alpha-beta pruning, piece-square table evaluation

The complete source code is at `src/games/chess/`. You now have a deep understanding of board game state management, tree search algorithms, and Canvas-based game UI.

---
[<- Previous Step](./step-5.md) | [Back to Chess README](./README.md)
