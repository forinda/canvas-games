# Step 6: AI Opponent & Polish

**Goal:** Build a minimax AI with alpha-beta pruning that evaluates board positions, handles multi-jump chains, and provides a challenging opponent.

**Time:** ~15 minutes

---

## What You'll Build

- **AISystem** with minimax search and alpha-beta pruning at depth 4
- **Board evaluation function** that scores piece values, king bonuses, center control, advancement, and back-row protection
- **AI multi-jump handling** that continues jump chains automatically
- **Non-blocking AI** using `setTimeout` to avoid freezing the render loop
- **"AI is thinking..." overlay** with animated dots
- **Complete game loop** that triggers AI moves on black's turn

---

## Concepts

- **Minimax Algorithm**: A decision-making algorithm for two-player games. It builds a tree of all possible moves to a fixed depth, then picks the move that maximizes the AI's score while assuming the opponent plays optimally (minimizes the AI's score).
- **Alpha-Beta Pruning**: An optimization that cuts off branches of the search tree that cannot influence the final decision. It tracks the best score the maximizer can guarantee (alpha) and the best score the minimizer can guarantee (beta). When beta <= alpha, we prune.
- **Board Evaluation**: When the search reaches its depth limit, we evaluate the board position by summing piece values (1.0 for regular, 1.5 for kings) with positional bonuses for center control, advancement toward promotion, and back-row protection.
- **Non-Blocking Computation**: The minimax search can take tens of milliseconds. Wrapping it in `setTimeout` lets the render loop continue showing the "AI thinking" animation while the AI computes its move.

---

## Code

### 6.1 -- Create the AI System

**File:** `src/contexts/canvas2d/games/checkers/systems/AISystem.ts`

The complete AI with minimax, alpha-beta pruning, positional evaluation, and multi-jump simulation.

```typescript
import type {
  CheckersState,
  Piece,
  Move,
  PieceColor,
  Cell,
} from "../types";
import { BOARD_SIZE, cloneBoard } from "../types";
import type { MoveSystem } from "./MoveSystem";

export class AISystem {
  private moveSystem: MoveSystem;
  private maxDepth: number;

  constructor(moveSystem: MoveSystem) {
    this.moveSystem = moveSystem;
    this.maxDepth = 4;
  }

  getBestMove(state: CheckersState): Move | null {
    const moves = this.moveSystem.getAllLegalMoves(
      state.board,
      state.currentTurn,
      state.mustContinueJump,
    );

    if (moves.length === 0) return null;

    // If only one move, take it immediately
    if (moves.length === 1) return moves[0];

    let bestMove: Move = moves[0];
    let bestScore = -Infinity;
    const aiColor = state.currentTurn;

    for (const move of moves) {
      const simState = this.simulateMove(state, move);
      const score = this.minimax(
        simState,
        this.maxDepth - 1,
        -Infinity,
        Infinity,
        false,
        aiColor,
      );

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  private minimax(
    state: CheckersState,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    aiColor: PieceColor,
  ): number {
    if (depth === 0 || state.gameOver) {
      return this.evaluate(state, aiColor);
    }

    const currentColor = isMaximizing
      ? aiColor
      : aiColor === "red"
        ? "black"
        : "red";
    const moves = this.moveSystem.getAllLegalMoves(
      state.board,
      currentColor,
      null,
    );

    if (moves.length === 0) {
      // Current player has no moves -- they lose
      return isMaximizing ? -1000 : 1000;
    }

    if (isMaximizing) {
      let maxEval = -Infinity;

      for (const move of moves) {
        const simState = this.simulateMove(state, move);

        simState.currentTurn =
          aiColor === "red" ? "black" : "red";
        const evalScore = this.minimax(
          simState,
          depth - 1,
          alpha,
          beta,
          false,
          aiColor,
        );

        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);

        if (beta <= alpha) break; // Beta cutoff
      }

      return maxEval;
    } else {
      let minEval = Infinity;

      for (const move of moves) {
        const simState = this.simulateMove(state, move);

        simState.currentTurn = aiColor;
        const evalScore = this.minimax(
          simState,
          depth - 1,
          alpha,
          beta,
          true,
          aiColor,
        );

        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);

        if (beta <= alpha) break; // Alpha cutoff
      }

      return minEval;
    }
  }

  private evaluate(
    state: CheckersState,
    aiColor: PieceColor,
  ): number {
    let score = 0;

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = state.board[r][c];

        if (!piece) continue;

        const value = this.pieceValue(piece, r, c);

        if (piece.color === aiColor) {
          score += value;
        } else {
          score -= value;
        }
      }
    }

    return score;
  }

  private pieceValue(
    piece: Piece,
    row: number,
    col: number,
  ): number {
    // Base value: kings are worth 1.5x regular pieces
    let value = piece.isKing ? 1.5 : 1.0;

    // Center control bonus: pieces closer to the center
    // control more of the board
    const centerDist =
      Math.abs(col - 3.5) + Math.abs(row - 3.5);
    value += (4 - centerDist) * 0.05;

    // Advancement bonus: non-king pieces closer to promotion
    // are more valuable
    if (!piece.isKing) {
      if (piece.color === "red") {
        value += (BOARD_SIZE - 1 - row) * 0.05;
      } else {
        value += row * 0.05;
      }
    }

    // Back row protection: pieces on the back row cannot be
    // jumped from behind
    if (piece.color === "red" && row === BOARD_SIZE - 1) {
      value += 0.1;
    } else if (piece.color === "black" && row === 0) {
      value += 0.1;
    }

    return value;
  }

  private simulateMove(
    state: CheckersState,
    move: Move,
  ): CheckersState {
    const simBoard = cloneBoard(state.board);
    const piece = simBoard[move.from.row][move.from.col];

    if (!piece) return state;

    simBoard[move.from.row][move.from.col] = null;

    for (const cap of move.captures) {
      simBoard[cap.row][cap.col] = null;
    }

    simBoard[move.to.row][move.to.col] = piece;

    // King promotion
    if (piece.color === "red" && move.to.row === 0) {
      piece.isKing = true;
    } else if (
      piece.color === "black" &&
      move.to.row === BOARD_SIZE - 1
    ) {
      piece.isKing = true;
    }

    let simState: CheckersState = {
      ...state,
      board: simBoard,
      capturedRed:
        state.capturedRed +
        move.captures.filter(
          (cap) =>
            state.board[cap.row][cap.col]?.color === "red",
        ).length,
      capturedBlack:
        state.capturedBlack +
        move.captures.filter(
          (cap) =>
            state.board[cap.row][cap.col]?.color === "black",
        ).length,
      gameOver: false,
      winner: null,
    };

    // If this was a jump, check for continuation jumps
    if (move.captures.length > 0) {
      simState = this.simulateContinuationJumps(
        simState,
        move.to,
        piece,
      );
    }

    return simState;
  }

  private simulateContinuationJumps(
    state: CheckersState,
    landingCell: Cell,
    piece: Piece,
  ): CheckersState {
    const jumps = this.moveSystem.getJumpMoves(
      state.board,
      landingCell,
      piece,
    );

    if (jumps.length === 0) return state;

    // Pick the jump that captures the most pieces
    let bestJump = jumps[0];

    for (const jump of jumps) {
      if (jump.captures.length > bestJump.captures.length) {
        bestJump = jump;
      }
    }

    const nextBoard = cloneBoard(state.board);
    const movingPiece =
      nextBoard[bestJump.from.row][bestJump.from.col];

    if (!movingPiece) return state;

    nextBoard[bestJump.from.row][bestJump.from.col] = null;

    for (const cap of bestJump.captures) {
      nextBoard[cap.row][cap.col] = null;
    }

    nextBoard[bestJump.to.row][bestJump.to.col] = movingPiece;

    if (movingPiece.color === "red" && bestJump.to.row === 0) {
      movingPiece.isKing = true;
    } else if (
      movingPiece.color === "black" &&
      bestJump.to.row === BOARD_SIZE - 1
    ) {
      movingPiece.isKing = true;
    }

    const nextState: CheckersState = {
      ...state,
      board: nextBoard,
      capturedRed:
        state.capturedRed +
        bestJump.captures.filter(
          (cap) =>
            state.board[cap.row][cap.col]?.color === "red",
        ).length,
      capturedBlack:
        state.capturedBlack +
        bestJump.captures.filter(
          (cap) =>
            state.board[cap.row][cap.col]?.color === "black",
        ).length,
    };

    // Recurse for further continuations
    return this.simulateContinuationJumps(
      nextState,
      bestJump.to,
      movingPiece,
    );
  }
}
```

**What's happening:**
- **`getBestMove()`**: The entry point. It gets all legal moves, then runs minimax on each one to find the highest-scoring move. If only one move exists, it takes it immediately (no need to search).
- **`minimax()`**: Alternates between maximizing (AI's turn) and minimizing (opponent's turn). At each level, it tries all legal moves, simulates each on a cloned board, and recurses. Alpha-beta pruning cuts off branches where `beta <= alpha`, which can reduce computation by 50-90%.
- **`evaluate()`**: Scores the board from the AI's perspective. Positive means the AI is winning. It sums the value of AI pieces and subtracts opponent piece values.
- **`pieceValue()`**: Kings are worth 1.5, regulars 1.0. Three positional bonuses: (1) center control (+0.05 per unit closer to center), (2) advancement toward promotion (+0.05 per row), (3) back-row protection (+0.1 for pieces that cannot be jumped from behind).
- **`simulateMove()`**: Creates a copy of the board, applies a move, handles promotions, and if the move was a jump, calls `simulateContinuationJumps()` to simulate the full chain.
- **`simulateContinuationJumps()`**: Recursively picks the best continuation jump (most captures) and applies it, so the minimax evaluation accounts for complete jump chains.

---

### 6.2 -- Wire AI into the Engine

**File:** `src/contexts/canvas2d/games/checkers/CheckersEngine.ts`

The final, complete engine with all systems and renderers wired together.

```typescript
import type { CheckersState } from "./types";
import { createInitialState, cloneBoard } from "./types";
import { MoveSystem } from "./systems/MoveSystem";
import { GameSystem } from "./systems/GameSystem";
import { AISystem } from "./systems/AISystem";
import { InputSystem } from "./systems/InputSystem";
import { BoardRenderer } from "./renderers/BoardRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";

export class CheckersEngine {
  private ctx: CanvasRenderingContext2D;
  private state: CheckersState;
  private running: boolean;
  private rafId: number;

  private moveSystem: MoveSystem;
  private gameSystem: GameSystem;
  private aiSystem: AISystem;
  private inputSystem: InputSystem;
  private boardRenderer: BoardRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext("2d")!;
    this.running = false;
    this.rafId = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = createInitialState();

    // Systems
    this.moveSystem = new MoveSystem();
    this.gameSystem = new GameSystem(this.moveSystem);
    this.aiSystem = new AISystem(this.moveSystem);

    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      onExit,
      () => this.reset(),
      this.moveSystem,
      this.gameSystem,
      () => this.onMoveComplete(),
    );

    // Renderers
    this.boardRenderer = new BoardRenderer();
    this.hudRenderer = new HUDRenderer();

    // Resize handler
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // Initialize legal moves
    this.state.legalMovesDirty = true;
    this.moveSystem.update(this.state, 0);

    // Attach listeners
    this.inputSystem.attach();
    window.addEventListener("resize", this.resizeHandler);
  }

  start(): void {
    this.running = true;
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

    this.update();
    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private update(): void {
    if (!this.state.started || this.state.showModeSelector)
      return;

    this.moveSystem.update(this.state, 0);
    this.gameSystem.update(this.state, 0);

    // AI turn
    if (
      this.state.mode === "ai" &&
      this.state.currentTurn === "black" &&
      !this.state.gameOver &&
      !this.state.aiThinking
    ) {
      this.triggerAI();
    }
  }

  private render(): void {
    this.boardRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }

  private onMoveComplete(): void {
    this.state.legalMovesDirty = true;
    this.moveSystem.update(this.state, 0);
    this.gameSystem.update(this.state, 0);
  }

  private triggerAI(): void {
    this.state.aiThinking = true;

    // Use setTimeout to avoid blocking the render loop
    setTimeout(() => {
      if (!this.running || this.state.gameOver) {
        this.state.aiThinking = false;
        return;
      }

      const s = this.state;
      const move = this.aiSystem.getBestMove(s);

      if (move) {
        // Push snapshot to history before applying the move
        s.moveHistory.push({
          board: cloneBoard(s.board),
          currentTurn: s.currentTurn,
          capturedRed: s.capturedRed,
          capturedBlack: s.capturedBlack,
          mustContinueJump: s.mustContinueJump,
          lastMove: s.lastMove,
        });

        this.moveSystem.applyMove(s, move);
        s.mustContinueJump = null;

        // Check for multi-jump continuation
        if (move.captures.length > 0) {
          const continuationJumps =
            this.moveSystem.getJumpMoves(
              s.board,
              move.to,
              s.board[move.to.row][move.to.col]!,
            );

          if (continuationJumps.length > 0) {
            s.mustContinueJump = move.to;
            s.legalMovesDirty = true;
            this.moveSystem.update(s, 0);
            // Keep AI thinking -- schedule another AI move
            this.state.aiThinking = false;

            return;
          }
        }

        this.gameSystem.switchTurn(s);
        s.legalMovesDirty = true;
        this.moveSystem.update(s, 0);
        this.gameSystem.update(s, 0);
      }

      this.state.aiThinking = false;
    }, 300);
  }

  private reset(): void {
    const mode = this.state.mode;
    const newState = createInitialState();

    newState.mode = mode;
    newState.showModeSelector = false;
    newState.started = true;

    Object.assign(this.state, newState);
    this.moveSystem.update(this.state, 0);
  }
}
```

**What's happening:**
- **`triggerAI()`**: Called from the update loop when it is the AI's turn (black in AI mode). It sets `aiThinking = true` (which shows the thinking overlay), then uses `setTimeout` with a 300ms delay.
- **setTimeout for non-blocking**: The minimax search runs inside the timeout callback. This lets the render loop continue executing, so the "AI is thinking..." animation keeps playing. Without this, the browser would freeze during the search.
- **AI multi-jumps**: After the AI makes a jump, it checks for continuation jumps. If found, it sets `mustContinueJump` and returns, which causes `triggerAI()` to be called again on the next update cycle for the continuation.
- **History tracking**: The AI pushes a history snapshot before each move, so the player can undo AI moves too.
- **Guard checks**: The callback checks `this.running` and `this.state.gameOver` before proceeding, in case the game was destroyed or ended while the AI was "thinking."

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Checkers game
3. **Select "vs AI"** from the mode selector
4. **Play as Red:**
   - Make your move by clicking a red piece, then clicking a legal destination
   - After your move, "**AI is thinking...**" appears with animated dots
   - After ~300ms, the AI makes its move and the turn returns to you
5. **Test AI captures:**
   - Set up a position where the AI can capture your piece -- it should take the jump
   - Watch the AI perform **multi-jump chains** when available
6. **Test AI strength:**
   - The AI uses depth-4 minimax with alpha-beta pruning -- it plays a competent game
   - It prioritizes: (a) capturing pieces, (b) promoting to kings, (c) controlling the center
7. **Test undo against AI:**
   - Press **U** to undo moves, including AI moves
8. **Test 2 Player mode:**
   - Go back to mode selector (ESC) and choose **"2 Player"** -- no AI interference, two humans take turns

---

## Challenges

**Easy:**
- Change the AI search depth from 4 to 2 (easier opponent) or 6 (harder but slower). Observe how it affects play strength and thinking time.
- Adjust the king value from 1.5 to 2.0 to make the AI value kings even more highly.

**Medium:**
- Add difficulty levels: "Easy" (depth 2), "Medium" (depth 4), "Hard" (depth 6). Show three buttons on the mode selector when "vs AI" is chosen.
- Add a move counter to the HUD that shows how many moves have been played.

**Hard:**
- Implement iterative deepening: start the search at depth 1 and increment until a time limit (e.g., 500ms) is reached. This gives the AI the best move possible within the time budget.
- Add an opening book: for the first 3-4 moves, use a table of known good openings instead of searching. This makes the AI play instantly in the opening.

---

## What You Learned

- Implementing the minimax algorithm for two-player zero-sum games
- Adding alpha-beta pruning to dramatically reduce the search space
- Designing a board evaluation function with piece values and positional bonuses
- Simulating moves on cloned boards for lookahead without modifying game state
- Handling multi-jump chains in AI move simulation
- Using `setTimeout` for non-blocking computation in a render loop
- Building a complete game with mode selection, AI, undo, pause, and game-over flows

---

## Congratulations!

You have built a complete Checkers game from scratch. Here is a summary of everything you created across all six steps:

| Step | What You Built |
|------|---------------|
| 1 | Types, constants, 8x8 board rendering with labels |
| 2 | Gradient pieces with shadows, click-to-select, input system |
| 3 | MoveSystem with diagonal moves and jumps, legal move indicators |
| 4 | Recursive multi-jump chains, forced captures, GameSystem, undo |
| 5 | Crown rendering for kings, HUD, overlays (mode select, game over, pause) |
| 6 | Minimax AI with alpha-beta pruning, non-blocking computation, polish |

The complete source code is at [`src/contexts/canvas2d/games/checkers/`](../../src/contexts/canvas2d/games/checkers/).

---
[<- Previous Step](./step-5.md) | [Back to Tutorial README](./README.md)
