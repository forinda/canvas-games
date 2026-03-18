import type { Updatable } from '@shared/Updatable.ts';
import type { ConnectFourState, Cell, Player, WinCell } from '../types.ts';
import { COLS, ROWS } from '../types.ts';

const DROP_SPEED = 18; // rows per second

export class BoardSystem implements Updatable<ConnectFourState> {
  update(state: ConnectFourState, dt: number): void {
    state.animationTime += dt;

    // Animate active disc drop
    if (state.activeDrop && !state.activeDrop.done) {
      const drop = state.activeDrop;
      drop.currentY += DROP_SPEED * (dt / 1000);

      if (drop.currentY >= drop.targetRow) {
        drop.currentY = drop.targetRow;
        drop.done = true;
        // Place the disc on the board
        state.board[drop.targetRow][drop.col] = drop.player;

        // Check win / draw after placement
        const winCells = this.checkWin(state.board, drop.player, drop.targetRow, drop.col);
        if (winCells) {
          state.winner = drop.player;
          state.winLine = { cells: winCells, progress: 0 };
          state.gameOver = true;
          this.updateScore(state);
        } else if (this.checkDraw(state.board)) {
          state.isDraw = true;
          state.gameOver = true;
          state.draws++;
        } else {
          state.currentPlayer = drop.player === 'red' ? 'yellow' : 'red';
        }
        state.activeDrop = null;

        // Process queued drops
        if (state.dropQueue.length > 0) {
          const next = state.dropQueue.shift()!;
          this.startDrop(state, next.col, next.player);
        }
      }
    }

    // Animate win line glow
    if (state.winLine && state.winLine.progress < 1) {
      state.winLine.progress = Math.min(1, state.winLine.progress + 0.03);
    }
  }

  /** Try to drop a disc in the given column. Returns true if the move was accepted. */
  dropDisc(state: ConnectFourState, col: number, player: Player): boolean {
    if (state.gameOver) return false;
    if (col < 0 || col >= COLS) return false;

    // Find the lowest empty row
    const row = this.getLowestEmptyRow(state.board, col);
    if (row < 0) return false;

    // If an animation is in progress, queue the drop
    if (state.activeDrop && !state.activeDrop.done) {
      state.dropQueue.push({ col, player });
      return true;
    }

    this.startDrop(state, col, player);
    return true;
  }

  getLowestEmptyRow(board: Cell[][], col: number): number {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][col] === null) return r;
    }
    return -1;
  }

  private startDrop(state: ConnectFourState, col: number, player: Player): void {
    const row = this.getLowestEmptyRow(state.board, col);
    if (row < 0) return;

    state.activeDrop = {
      col,
      targetRow: row,
      currentY: -1,
      player,
      done: false,
    };
  }

  checkWin(board: Cell[][], player: Player, row: number, col: number): WinCell[] | null {
    const directions: [number, number][] = [
      [0, 1],  // horizontal
      [1, 0],  // vertical
      [1, 1],  // diagonal down-right
      [1, -1], // diagonal down-left
    ];

    for (const [dr, dc] of directions) {
      const cells: WinCell[] = [{ row, col }];

      // Count in positive direction
      for (let i = 1; i < 4; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;
        if (board[r][c] !== player) break;
        cells.push({ row: r, col: c });
      }

      // Count in negative direction
      for (let i = 1; i < 4; i++) {
        const r = row - dr * i;
        const c = col - dc * i;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;
        if (board[r][c] !== player) break;
        cells.push({ row: r, col: c });
      }

      if (cells.length >= 4) return cells.slice(0, 4);
    }

    return null;
  }

  checkDraw(board: Cell[][]): boolean {
    for (let c = 0; c < COLS; c++) {
      if (board[0][c] === null) return false;
    }
    return true;
  }

  private updateScore(state: ConnectFourState): void {
    if (state.winner === 'red') {
      state.scoreRed++;
    } else if (state.winner === 'yellow') {
      state.scoreYellow++;
    }
  }
}
