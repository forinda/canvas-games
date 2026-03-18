import type { Updatable } from '@shared/Updatable';
import type { MinesweeperState, Cell } from '../types';
import { DIFFICULTY_PRESETS } from '../types';

export class BoardSystem implements Updatable<MinesweeperState> {
  /** Accumulates fractional seconds between frames */
  private timerAccum = 0;

  /** Initialize a blank board for the given difficulty */
  initBoard(state: MinesweeperState): void {
    const preset = DIFFICULTY_PRESETS[state.difficulty];
    state.cols = preset.cols;
    state.rows = preset.rows;
    state.totalMines = preset.mines;
    state.flagCount = 0;
    state.status = 'idle';
    state.timer = 0;
    state.firstClick = false;
    this.timerAccum = 0;

    state.board = [];
    for (let r = 0; r < state.rows; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < state.cols; c++) {
        row.push({ revealed: false, flagged: false, mine: false, adjacentMines: 0 });
      }
      state.board.push(row);
    }
  }

  /** Place mines randomly, ensuring the first-click cell (and its neighbours) are safe */
  placeMines(state: MinesweeperState, safeRow: number, safeCol: number): void {
    const { rows, cols, totalMines, board } = state;

    // Build set of safe positions (the clicked cell + its 8 neighbours)
    const safeSet = new Set<string>();
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = safeRow + dr;
        const nc = safeCol + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          safeSet.add(`${nr},${nc}`);
        }
      }
    }

    let placed = 0;
    while (placed < totalMines) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (board[r][c].mine || safeSet.has(`${r},${c}`)) continue;
      board[r][c].mine = true;
      placed++;
    }

    // Calculate adjacent mine counts
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c].mine) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) {
              count++;
            }
          }
        }
        board[r][c].adjacentMines = count;
      }
    }
  }

  /** Reveal a cell; flood-fill if adjacentMines === 0. Returns false if a mine was hit. */
  reveal(state: MinesweeperState, row: number, col: number): boolean {
    const cell = state.board[row][col];
    if (cell.revealed || cell.flagged) return true;

    cell.revealed = true;

    if (cell.mine) {
      state.status = 'lost';
      this.revealAllMines(state);
      return false;
    }

    if (cell.adjacentMines === 0) {
      this.floodFill(state, row, col);
    }

    this.checkWin(state);
    return true;
  }

  /** Chord reveal: if the cell is revealed and has the right number of surrounding flags, reveal remaining neighbours */
  chordReveal(state: MinesweeperState, row: number, col: number): void {
    const cell = state.board[row][col];
    if (!cell.revealed || cell.adjacentMines === 0) return;

    let flagCount = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < state.rows && nc >= 0 && nc < state.cols) {
          if (state.board[nr][nc].flagged) flagCount++;
        }
      }
    }

    if (flagCount !== cell.adjacentMines) return;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < state.rows && nc >= 0 && nc < state.cols) {
          this.reveal(state, nr, nc);
        }
      }
    }
  }

  /** Toggle flag on a cell */
  toggleFlag(state: MinesweeperState, row: number, col: number): void {
    const cell = state.board[row][col];
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
    state.flagCount += cell.flagged ? 1 : -1;
  }

  /** Tick the timer — called every frame with dt in ms */
  update(state: MinesweeperState, dt: number): void {
    if (state.status !== 'playing') return;
    this.timerAccum += dt;
    if (this.timerAccum >= 1000) {
      const seconds = Math.floor(this.timerAccum / 1000);
      state.timer += seconds;
      this.timerAccum -= seconds * 1000;
    }
  }

  resetTimer(): void {
    this.timerAccum = 0;
  }

  private floodFill(state: MinesweeperState, row: number, col: number): void {
    const stack: [number, number][] = [[row, col]];
    while (stack.length > 0) {
      const [r, c] = stack.pop()!;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= state.rows || nc < 0 || nc >= state.cols) continue;
          const neighbour = state.board[nr][nc];
          if (neighbour.revealed || neighbour.flagged || neighbour.mine) continue;
          neighbour.revealed = true;
          if (neighbour.adjacentMines === 0) {
            stack.push([nr, nc]);
          }
        }
      }
    }
  }

  private revealAllMines(state: MinesweeperState): void {
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        if (state.board[r][c].mine) {
          state.board[r][c].revealed = true;
        }
      }
    }
  }

  private checkWin(state: MinesweeperState): void {
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const cell = state.board[r][c];
        if (!cell.mine && !cell.revealed) return;
      }
    }
    state.status = 'won';
  }
}
