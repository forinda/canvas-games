# Step 4: AI Opponent

**Goal:** Add an unbeatable AI opponent using the minimax algorithm.

**Time:** ~15 minutes

---

## What You'll Build

A computer player (O) that makes optimal moves using game tree search. The AI never loses!

---

## Concepts

- **Minimax Algorithm**: Recursive game tree exploration
- **Alpha-Beta Pruning**: Optimization to skip useless branches
- **Terminal States**: Win, loss, or draw evaluation
- **Depth Scoring**: Prefer faster wins, slower losses

---

## Code

### 1. Update Types

**File:** `src/games/tic-tac-toe/types.ts`

```typescript
export type GameMode = 'ai' | '2player';

export interface TicTacToeState {
  board: Cell[];
  currentPlayer: Player;
  mode: GameMode; // ← NEW
  gameOver: boolean;
  winner: Player | null;
  winLine: WinLine | null;
  isDraw: boolean;
  canvasWidth: number;
  canvasHeight: number;
  cellAnimations: CellAnimation[];
  aiThinking: boolean; // ← NEW: Show AI is computing
}
```

---

### 2. Create AI System

**File:** `src/games/tic-tac-toe/systems/AISystem.ts`

```typescript
import type { Cell, Player, TicTacToeState } from '../types';
import { WIN_LINES, TOTAL_CELLS } from '../types';

export class AISystem {
  /** Find the best move for O using minimax */
  findBestMove(board: Cell[]): number {
    let bestScore = -Infinity;
    let bestMove = -1;

    for (let i = 0; i < TOTAL_CELLS; i++) {
      if (board[i] === null) {
        // Try this move
        board[i] = 'O';
        const score = this.minimax(board, 0, false, -Infinity, Infinity);
        board[i] = null; // Undo

        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }

    return bestMove;
  }

  /** Minimax algorithm with alpha-beta pruning */
  private minimax(
    board: Cell[],
    depth: number,
    isMaximizing: boolean,
    alpha: number,
    beta: number
  ): number {
    // Check terminal states
    if (this.hasWon(board, 'O')) return 10 - depth; // AI wins (faster = better)
    if (this.hasWon(board, 'X')) return depth - 10; // Player wins (slower = better)
    if (this.isFull(board)) return 0; // Draw

    if (isMaximizing) {
      // AI's turn (maximize score)
      let maxScore = -Infinity;
      for (let i = 0; i < TOTAL_CELLS; i++) {
        if (board[i] === null) {
          board[i] = 'O';
          const score = this.minimax(board, depth + 1, false, alpha, beta);
          board[i] = null;

          maxScore = Math.max(maxScore, score);
          alpha = Math.max(alpha, score);
          if (beta <= alpha) break; // Alpha-beta pruning
        }
      }
      return maxScore;
    } else {
      // Player's turn (minimize score)
      let minScore = Infinity;
      for (let i = 0; i < TOTAL_CELLS; i++) {
        if (board[i] === null) {
          board[i] = 'X';
          const score = this.minimax(board, depth + 1, true, alpha, beta);
          board[i] = null;

          minScore = Math.min(minScore, score);
          beta = Math.min(beta, score);
          if (beta <= alpha) break; // Alpha-beta pruning
        }
      }
      return minScore;
    }
  }

  /** Check if a player has won */
  private hasWon(board: Cell[], player: Player): boolean {
    for (const [a, b, c] of WIN_LINES) {
      if (board[a] === player && board[b] === player && board[c] === player) {
        return true;
      }
    }
    return false;
  }

  /** Check if board is full */
  private isFull(board: Cell[]): boolean {
    return board.every(cell => cell !== null);
  }
}
```

**Key Concepts:**
- **Minimax**: Simulates all possible games, choosing the best outcome
- **Maximizing**: AI tries to maximize score
- **Minimizing**: Player tries to minimize score
- **Alpha-Beta**: Skips branches that can't improve the result
- **Depth Bonus**: Penalizes/rewards moves by depth (faster wins are better)

---

### 3. Integrate AI into Engine

**File:** `src/games/tic-tac-toe/TicTacToeEngine.ts`

```typescript
import { AISystem } from './systems/AISystem';

export class TicTacToeEngine {
  // ... existing properties ...
  private aiSystem: AISystem;
  private aiMoveTimer: number;
  private pendingAIMove: boolean;

  constructor(canvas: HTMLCanvasElement) {
    // ... existing setup ...

    this.aiSystem = new AISystem();
    this.aiMoveTimer = 0;
    this.pendingAIMove = false;

    this.state = {
      board: Array(TOTAL_CELLS).fill(null),
      currentPlayer: 'X',
      mode: 'ai', // ← Default to AI mode
      gameOver: false,
      winner: null,
      winLine: null,
      isDraw: false,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      cellAnimations: [],
      aiThinking: false, // ← Initialize
    };

    // ... rest of constructor ...
  }

  private loop(): void {
    if (!this.running) return;

    this.boardSystem.update(this.state, 16);
    this.handleAIMove(); // ← Check for AI turn
    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private handleAIMove(): void {
    // Only activate AI when:
    // 1. Mode is 'ai'
    // 2. It's O's turn
    // 3. Game is not over
    // 4. Not already computing
    if (
      this.state.mode === 'ai' &&
      this.state.currentPlayer === 'O' &&
      !this.state.gameOver &&
      !this.pendingAIMove
    ) {
      this.pendingAIMove = true;
      this.state.aiThinking = true;
      this.aiMoveTimer = 0;
    }

    // Add delay for natural feel (400ms)
    if (this.pendingAIMove) {
      this.aiMoveTimer += 16; // ~16ms per frame at 60fps

      if (this.aiMoveTimer >= 400) {
        const move = this.aiSystem.findBestMove(this.state.board);
        if (move !== -1) {
          this.boardSystem.placeMark(this.state, move);
        }
        this.pendingAIMove = false;
        this.state.aiThinking = false;
      }
    }
  }
}
```

**Why:**
- **AI Delay**: 400ms pause makes AI feel more natural
- **Think Indicator**: `aiThinking` flag shows AI is computing
- **Safety Checks**: Prevent AI from running at wrong times

---

### 4. Update HUD for AI Indicator

**File:** `src/games/tic-tac-toe/renderers/HUDRenderer.ts`

```typescript
export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: TicTacToeState): void {
    const W = state.canvasWidth;

    // Show current turn or AI thinking
    if (!state.gameOver) {
      ctx.fillStyle = 'white';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';

      if (state.aiThinking) {
        ctx.fillText('AI is thinking...', W / 2, 40);
      } else {
        const turnText = state.mode === 'ai' && state.currentPlayer === 'O'
          ? 'AI Turn (O)'
          : `Current Turn: ${state.currentPlayer}`;
        ctx.fillText(turnText, W / 2, 40);
      }
    }

    // Show game over overlay
    if (state.gameOver) {
      this.renderGameOver(ctx, state);
    }
  }

  // ... existing renderGameOver() method ...
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Make a move as X**: Click any cell
3. **Watch AI respond**: After ~0.4s, O appears in optimal position
4. **Try to beat the AI**: You won't! The minimax algorithm is unbeatable
5. **Test edge cases**:
   - Let AI move first (it picks center or corner)
   - Try forcing a draw (AI will defend perfectly)

---

## How Minimax Works

```
X's turn (minimizing):
├─ Try move A → minimax(depth+1, maximizing) → score: -5
├─ Try move B → minimax(depth+1, maximizing) → score: 0
└─ Try move C → minimax(depth+1, maximizing) → score: +10
   ↑ AI picks this (best for AI, worst for player)

Terminal states:
- AI wins: +10 - depth (faster win = higher score)
- Player wins: depth - 10 (slower loss = higher score)
- Draw: 0
```

The AI explores all possible games and picks the move that guarantees the best outcome.

---

## What You Learned

✅ Implement minimax algorithm from scratch  
✅ Add alpha-beta pruning optimization  
✅ Handle AI turn logic with delays  
✅ Display AI thinking indicator  
✅ Create an unbeatable opponent

---

## Next Step

→ [Step 5: Score Tracking & Polish](./step-5.md) — Add score tracking, mode selection, and final polish
