import type { ChessState, PieceColor } from '../types.ts';
import { MoveSystem } from './MoveSystem.ts';

export class GameSystem {
  private moveSystem: MoveSystem;

  constructor(moveSystem: MoveSystem) {
    this.moveSystem = moveSystem;
  }

  /** Update check / checkmate / stalemate after a move */
  updateGameStatus(state: ChessState): void {
    const opponent: PieceColor =
      state.currentPlayer === 'white' ? 'black' : 'white';

    // Switch turns
    state.currentPlayer = opponent;

    // Check detection
    state.isCheck = this.moveSystem.isInCheck(state.board, opponent);

    // Legal move availability
    const hasLegal = this.moveSystem.hasLegalMoves(state, opponent);

    if (!hasLegal) {
      state.gameOver = true;
      if (state.isCheck) {
        state.isCheckmate = true;
      } else {
        state.isStalemate = true;
      }
    }

    // Update king positions
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = state.board[r][c];
        if (p && p.type === 'king') {
          state.kingPositions[p.color] = { row: r, col: c };
        }
      }
    }
  }
}
