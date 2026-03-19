import type { Updatable } from '@shared/Updatable';
import type { CheckersState, PieceColor } from '../types';
import { BOARD_SIZE } from '../types';
import { MoveSystem } from './MoveSystem';

export class GameSystem implements Updatable<CheckersState> {
  private moveSystem: MoveSystem;

  constructor(moveSystem: MoveSystem) {
    this.moveSystem = moveSystem;
  }

  update(state: CheckersState, _dt: number): void {
    if (state.gameOver || !state.started) return;

    this.checkKingPromotion(state);
    this.checkWinCondition(state);
  }

  private checkKingPromotion(state: CheckersState): void {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const topPiece = state.board[0][c];
      if (topPiece && topPiece.color === 'red' && !topPiece.isKing) {
        topPiece.isKing = true;
      }
      const bottomPiece = state.board[BOARD_SIZE - 1][c];
      if (bottomPiece && bottomPiece.color === 'black' && !bottomPiece.isKing) {
        bottomPiece.isKing = true;
      }
    }
  }

  private checkWinCondition(state: CheckersState): void {
    const redCount = this.countPieces(state, 'red');
    const blackCount = this.countPieces(state, 'black');

    if (redCount === 0) {
      state.gameOver = true;
      state.winner = 'black';
      return;
    }
    if (blackCount === 0) {
      state.gameOver = true;
      state.winner = 'red';
      return;
    }

    // Check if current player has any legal moves
    const moves = this.moveSystem.getAllLegalMoves(state.board, state.currentTurn, null);
    if (moves.length === 0) {
      state.gameOver = true;
      state.winner = state.currentTurn === 'red' ? 'black' : 'red';
    }
  }

  private countPieces(state: CheckersState, color: PieceColor): number {
    let count = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (state.board[r][c]?.color === color) count++;
      }
    }
    return count;
  }

  switchTurn(state: CheckersState): void {
    state.currentTurn = state.currentTurn === 'red' ? 'black' : 'red';
    state.selectedCell = null;
    state.legalMovesForSelected = [];
    state.mustContinueJump = null;
  }
}
