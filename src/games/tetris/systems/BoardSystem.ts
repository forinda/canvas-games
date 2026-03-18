import type { TetrisState, CellColor } from '../types';
import { COLS, ROWS } from '../types';
import { PIECES } from '../data/pieces';

export class BoardSystem {
  /** Check if a piece at given position/rotation collides with walls or placed blocks */
  isColliding(
    board: CellColor[][],
    defIndex: number,
    rotation: number,
    x: number,
    y: number,
  ): boolean {
    const cells = PIECES[defIndex].rotations[rotation];
    for (const [row, col] of cells) {
      const bx = x + col;
      const by = y + row;
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by < 0) continue; // allow pieces above the board
      if (board[by][bx] !== null) return true;
    }
    return false;
  }

  /** Place the current piece onto the board */
  lockPiece(state: TetrisState): void {
    const piece = state.currentPiece;
    if (!piece) return;
    const def = PIECES[piece.defIndex];
    const cells = def.rotations[piece.rotation];
    for (const [row, col] of cells) {
      const bx = piece.x + col;
      const by = piece.y + row;
      if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
        state.board[by][bx] = def.color;
      }
    }
  }

  /** Find all full lines and begin clear animation, returns number of lines */
  detectAndClearLines(state: TetrisState): number {
    const fullRows: number[] = [];
    for (let r = 0; r < ROWS; r++) {
      if (state.board[r].every((cell) => cell !== null)) {
        fullRows.push(r);
      }
    }
    if (fullRows.length > 0) {
      state.clearingLines = fullRows;
      state.clearTimer = 0;
    }
    return fullRows.length;
  }

  /** Actually remove cleared lines and shift rows down */
  removeClearedLines(state: TetrisState): void {
    const rows = state.clearingLines.sort((a, b) => a - b);
    for (const row of rows) {
      state.board.splice(row, 1);
      state.board.unshift(Array(COLS).fill(null));
    }
    state.clearingLines = [];
    state.clearTimer = 0;
  }

  /** Calculate the ghost piece Y position (where piece would land) */
  getGhostY(state: TetrisState): number {
    const piece = state.currentPiece;
    if (!piece) return 0;
    let ghostY = piece.y;
    while (!this.isColliding(state.board, piece.defIndex, piece.rotation, piece.x, ghostY + 1)) {
      ghostY++;
    }
    return ghostY;
  }
}
