import type { Updatable } from '@shared/Updatable.ts';
import type { ConnectFourState, Cell, Player } from '../types.ts';
import { COLS, ROWS } from '../types.ts';

const MAX_DEPTH = 6;
const THINK_DELAY = 500; // ms

// Scoring constants for position evaluation
const SCORE_4 = 100000;
const SCORE_3 = 100;
const SCORE_2 = 10;
const SCORE_CENTER = 3;

export class AISystem implements Updatable<ConnectFourState> {
  private pendingCol: number | null = null;
  private thinkTimer: number = 0;

  update(state: ConnectFourState, dt: number): void {
    if (state.mode !== 'ai') return;
    if (state.gameOver) return;
    if (state.currentPlayer !== 'yellow') return;
    if (state.showModeSelect) return;
    if (state.activeDrop !== null) return;

    if (this.pendingCol === null) {
      state.aiThinking = true;
      this.pendingCol = this.findBestMove(state.board);
      this.thinkTimer = 0;
    }

    this.thinkTimer += dt;
    if (this.thinkTimer >= THINK_DELAY && this.pendingCol !== null) {
      state.aiThinking = false;
      // The engine will handle the actual drop via dropQueue
      state.dropQueue.push({ col: this.pendingCol, player: 'yellow' });
      this.pendingCol = null;
      this.thinkTimer = 0;
    }
  }

  reset(): void {
    this.pendingCol = null;
    this.thinkTimer = 0;
  }

  private findBestMove(board: Cell[][]): number {
    let bestScore = -Infinity;
    let bestCol = 3; // default to center

    // Try columns in center-first order for better pruning
    const colOrder = [3, 2, 4, 1, 5, 0, 6];

    for (const col of colOrder) {
      const row = this.getLowestEmptyRow(board, col);
      if (row < 0) continue;

      board[row][col] = 'yellow';
      const score = this.minimax(board, MAX_DEPTH - 1, false, -Infinity, Infinity);
      board[row][col] = null;

      if (score > bestScore) {
        bestScore = score;
        bestCol = col;
      }
    }

    return bestCol;
  }

  private minimax(
    board: Cell[][],
    depth: number,
    isMaximizing: boolean,
    alpha: number,
    beta: number,
  ): number {
    // Check terminal states
    if (this.hasWon(board, 'yellow')) return SCORE_4 + depth;
    if (this.hasWon(board, 'red')) return -(SCORE_4 + depth);
    if (this.isFull(board)) return 0;
    if (depth === 0) return this.evaluateBoard(board);

    const colOrder = [3, 2, 4, 1, 5, 0, 6];

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const col of colOrder) {
        const row = this.getLowestEmptyRow(board, col);
        if (row < 0) continue;
        board[row][col] = 'yellow';
        const evalScore = this.minimax(board, depth - 1, false, alpha, beta);
        board[row][col] = null;
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const col of colOrder) {
        const row = this.getLowestEmptyRow(board, col);
        if (row < 0) continue;
        board[row][col] = 'red';
        const evalScore = this.minimax(board, depth - 1, true, alpha, beta);
        board[row][col] = null;
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  private evaluateBoard(board: Cell[][]): number {
    let score = 0;

    // Center column preference
    for (let r = 0; r < ROWS; r++) {
      if (board[r][3] === 'yellow') score += SCORE_CENTER;
      else if (board[r][3] === 'red') score -= SCORE_CENTER;
    }

    // Evaluate all windows of 4
    // Horizontal
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        score += this.evaluateWindow(board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]);
      }
    }

    // Vertical
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r <= ROWS - 4; r++) {
        score += this.evaluateWindow(board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]);
      }
    }

    // Diagonal down-right
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        score += this.evaluateWindow(board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]);
      }
    }

    // Diagonal down-left
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 3; c < COLS; c++) {
        score += this.evaluateWindow(board[r][c], board[r + 1][c - 1], board[r + 2][c - 2], board[r + 3][c - 3]);
      }
    }

    return score;
  }

  private evaluateWindow(a: Cell, b: Cell, c: Cell, d: Cell): number {
    const cells = [a, b, c, d];
    const yellowCount = cells.filter(x => x === 'yellow').length;
    const redCount = cells.filter(x => x === 'red').length;

    if (yellowCount > 0 && redCount > 0) return 0; // mixed, no advantage

    if (yellowCount === 4) return SCORE_4;
    if (yellowCount === 3) return SCORE_3;
    if (yellowCount === 2) return SCORE_2;

    if (redCount === 4) return -SCORE_4;
    if (redCount === 3) return -SCORE_3;
    if (redCount === 2) return -SCORE_2;

    return 0;
  }

  private hasWon(board: Cell[][], player: Player): boolean {
    // Horizontal
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        if (board[r][c] === player && board[r][c + 1] === player &&
            board[r][c + 2] === player && board[r][c + 3] === player) {
          return true;
        }
      }
    }
    // Vertical
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r <= ROWS - 4; r++) {
        if (board[r][c] === player && board[r + 1][c] === player &&
            board[r + 2][c] === player && board[r + 3][c] === player) {
          return true;
        }
      }
    }
    // Diagonal down-right
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        if (board[r][c] === player && board[r + 1][c + 1] === player &&
            board[r + 2][c + 2] === player && board[r + 3][c + 3] === player) {
          return true;
        }
      }
    }
    // Diagonal down-left
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 3; c < COLS; c++) {
        if (board[r][c] === player && board[r + 1][c - 1] === player &&
            board[r + 2][c - 2] === player && board[r + 3][c - 3] === player) {
          return true;
        }
      }
    }
    return false;
  }

  private isFull(board: Cell[][]): boolean {
    for (let c = 0; c < COLS; c++) {
      if (board[0][c] === null) return false;
    }
    return true;
  }

  private getLowestEmptyRow(board: Cell[][], col: number): number {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][col] === null) return r;
    }
    return -1;
  }
}
