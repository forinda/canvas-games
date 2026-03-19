import type { CheckersState, Piece, Move, PieceColor, Cell } from '../types';
import { BOARD_SIZE, cloneBoard } from '../types';
import { MoveSystem } from './MoveSystem';

export class AISystem {
  private moveSystem: MoveSystem;
  private maxDepth: number;

  constructor(moveSystem: MoveSystem) {
    this.moveSystem = moveSystem;
    this.maxDepth = 4;
  }

  getBestMove(state: CheckersState): Move | null {
    const moves = this.moveSystem.getAllLegalMoves(state.board, state.currentTurn, state.mustContinueJump);
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    let bestMove: Move = moves[0];
    let bestScore = -Infinity;
    const aiColor = state.currentTurn;

    for (const move of moves) {
      const simState = this.simulateMove(state, move);
      const score = this.minimax(simState, this.maxDepth - 1, -Infinity, Infinity, false, aiColor);
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
    aiColor: PieceColor
  ): number {
    if (depth === 0 || state.gameOver) {
      return this.evaluate(state, aiColor);
    }

    const currentColor = isMaximizing ? aiColor : (aiColor === 'red' ? 'black' : 'red');
    const moves = this.moveSystem.getAllLegalMoves(state.board, currentColor, null);

    if (moves.length === 0) {
      // Current player has no moves; they lose
      return isMaximizing ? -1000 : 1000;
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        const simState = this.simulateMove(state, move);
        // Fix turn for sim
        simState.currentTurn = aiColor === 'red' ? 'black' : 'red';
        const evalScore = this.minimax(simState, depth - 1, alpha, beta, false, aiColor);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        const simState = this.simulateMove(state, move);
        simState.currentTurn = aiColor;
        const evalScore = this.minimax(simState, depth - 1, alpha, beta, true, aiColor);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  private evaluate(state: CheckersState, aiColor: PieceColor): number {
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

  private pieceValue(piece: Piece, row: number, col: number): number {
    let value = piece.isKing ? 1.5 : 1.0;

    // Position bonus: center squares are more valuable
    const centerDist = Math.abs(col - 3.5) + Math.abs(row - 3.5);
    value += (4 - centerDist) * 0.05;

    // Advancement bonus for non-king pieces
    if (!piece.isKing) {
      if (piece.color === 'red') {
        value += (BOARD_SIZE - 1 - row) * 0.05; // closer to row 0
      } else {
        value += row * 0.05; // closer to row 7
      }
    }

    // Edge protection bonus (back row)
    if (piece.color === 'red' && row === BOARD_SIZE - 1) {
      value += 0.1;
    } else if (piece.color === 'black' && row === 0) {
      value += 0.1;
    }

    return value;
  }

  private simulateMove(state: CheckersState, move: Move): CheckersState {
    const simBoard = cloneBoard(state.board);
    const piece = simBoard[move.from.row][move.from.col];
    if (!piece) return state;

    simBoard[move.from.row][move.from.col] = null;

    for (const cap of move.captures) {
      simBoard[cap.row][cap.col] = null;
    }

    simBoard[move.to.row][move.to.col] = piece;

    // King promotion
    if (piece.color === 'red' && move.to.row === 0) {
      piece.isKing = true;
    } else if (piece.color === 'black' && move.to.row === BOARD_SIZE - 1) {
      piece.isKing = true;
    }

    let simState: CheckersState = {
      ...state,
      board: simBoard,
      capturedRed: state.capturedRed + move.captures.filter(cap => state.board[cap.row][cap.col]?.color === 'red').length,
      capturedBlack: state.capturedBlack + move.captures.filter(cap => state.board[cap.row][cap.col]?.color === 'black').length,
      gameOver: false,
      winner: null,
    };

    // If this was a jump, check for continuation jumps and simulate the best one
    if (move.captures.length > 0) {
      simState = this.simulateContinuationJumps(simState, move.to, piece);
    }

    return simState;
  }

  private simulateContinuationJumps(
    state: CheckersState,
    landingCell: Cell,
    piece: Piece
  ): CheckersState {
    const jumps = this.moveSystem.getJumpMoves(state.board, landingCell, piece);
    if (jumps.length === 0) return state;

    // Pick the jump that captures the most pieces
    let bestJump = jumps[0];
    for (const jump of jumps) {
      if (jump.captures.length > bestJump.captures.length) {
        bestJump = jump;
      }
    }

    const nextBoard = cloneBoard(state.board);
    const movingPiece = nextBoard[bestJump.from.row][bestJump.from.col];
    if (!movingPiece) return state;

    nextBoard[bestJump.from.row][bestJump.from.col] = null;
    for (const cap of bestJump.captures) {
      nextBoard[cap.row][cap.col] = null;
    }
    nextBoard[bestJump.to.row][bestJump.to.col] = movingPiece;

    if (movingPiece.color === 'red' && bestJump.to.row === 0) {
      movingPiece.isKing = true;
    } else if (movingPiece.color === 'black' && bestJump.to.row === BOARD_SIZE - 1) {
      movingPiece.isKing = true;
    }

    const nextState: CheckersState = {
      ...state,
      board: nextBoard,
      capturedRed: state.capturedRed + bestJump.captures.filter(cap => state.board[cap.row][cap.col]?.color === 'red').length,
      capturedBlack: state.capturedBlack + bestJump.captures.filter(cap => state.board[cap.row][cap.col]?.color === 'black').length,
    };

    // Recurse for further continuations
    return this.simulateContinuationJumps(nextState, bestJump.to, movingPiece);
  }
}
