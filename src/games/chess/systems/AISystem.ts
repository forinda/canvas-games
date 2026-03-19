import type { Updatable } from '@shared/Updatable.ts';
import type { ChessState, PieceColor, Position, Cell } from '../types.ts';
import { BOARD_SIZE } from '../types.ts';
import { PIECE_VALUES, PIECE_SQUARE_TABLES } from '../data/pieces.ts';
import { MoveSystem } from './MoveSystem.ts';

function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function cloneState(state: ChessState): ChessState {
  return {
    ...state,
    board: cloneBoard(state.board),
    castlingRights: { ...state.castlingRights },
    enPassantTarget: state.enPassantTarget ? { ...state.enPassantTarget } : null,
    kingPositions: {
      white: { ...state.kingPositions.white },
      black: { ...state.kingPositions.black },
    },
    capturedByWhite: [...state.capturedByWhite],
    capturedByBlack: [...state.capturedByBlack],
    moveHistory: [...state.moveHistory],
    legalMoves: [],
    selectedPosition: null,
  };
}

export class AISystem implements Updatable<ChessState> {
  private moveSystem: MoveSystem;
  private thinkingDelay: number;
  private thinkTimer: number;
  private pendingMove: { from: Position; to: Position } | null;

  constructor(moveSystem: MoveSystem) {
    this.moveSystem = moveSystem;
    this.thinkingDelay = 400;
    this.thinkTimer = 0;
    this.pendingMove = null;
  }

  update(state: ChessState, dt: number): void {
    if (state.mode !== 'ai') return;
    if (state.gameOver) return;
    if (state.currentPlayer !== 'black') return;
    if (state.showModeSelect) return;

    if (!state.aiThinking) {
      state.aiThinking = true;
      this.thinkTimer = 0;
      this.pendingMove = null;
    }

    this.thinkTimer += dt;

    if (this.thinkTimer >= this.thinkingDelay && !this.pendingMove) {
      this.pendingMove = this.findBestMove(state);
    }

    if (this.pendingMove && this.thinkTimer >= this.thinkingDelay + 100) {
      // Emit the move via a callback-like pattern: set selected + legalMoves
      // The engine will pick this up
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
    const allMoves = this.moveSystem.getAllLegalMoves(state, 'black');
    if (allMoves.length === 0) return null;

    let bestScore = -Infinity;
    let bestMove = allMoves[0];

    for (const move of allMoves) {
      const testState = cloneState(state);
      this.moveSystem.executeMove(testState, move.from, move.to);
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

    const color: PieceColor = isMaximizing ? 'black' : 'white';
    const allMoves = this.moveSystem.getAllLegalMoves(state, color);

    if (allMoves.length === 0) {
      if (this.moveSystem.isInCheck(state.board, color)) {
        return isMaximizing ? -99999 + (3 - depth) : 99999 - (3 - depth);
      }
      return 0; // Stalemate
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of allMoves) {
        const testState = cloneState(state);
        this.moveSystem.executeMove(testState, move.from, move.to);
        const score = this.minimax(testState, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, score);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of allMoves) {
        const testState = cloneState(state);
        this.moveSystem.executeMove(testState, move.from, move.to);
        const score = this.minimax(testState, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, score);
        beta = Math.min(beta, score);
        if (beta <= alpha) break;
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
        const pstRow = piece.color === 'white' ? r : 7 - r;
        const positionalValue = pst[pstRow][c];

        if (piece.color === 'black') {
          score += value + positionalValue;
        } else {
          score -= value + positionalValue;
        }
      }
    }

    return score;
  }
}
