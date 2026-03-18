import type { Updatable } from '@shared/Updatable';
import type { LightsOutState, Cell } from '../types';
import { GRID_SIZE } from '../types';
import { LEVELS } from '../data/levels';

export class BoardSystem implements Updatable<LightsOutState> {
  /** Load a level into the state board */
  loadLevel(state: LightsOutState, levelIndex: number): void {
    const pattern = LEVELS[levelIndex];
    state.board = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        row.push({ on: pattern[r][c] === 1 });
      }
      state.board.push(row);
    }
    state.moves = 0;
    state.level = levelIndex;
    state.status = 'playing';
    state.ripples = [];
    state.levelCompleteTime = 0;
  }

  /** Toggle the clicked cell and its 4 orthogonal neighbours */
  toggle(state: LightsOutState, row: number, col: number): void {
    if (state.status !== 'playing') return;

    const directions = [
      [0, 0],
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];

    for (const [dr, dc] of directions) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        state.board[nr][nc].on = !state.board[nr][nc].on;
      }
    }

    state.moves++;

    // Add ripple effect
    state.ripples.push({
      row,
      col,
      startTime: performance.now(),
      duration: 400,
    });

    // Check win
    if (this.isWin(state)) {
      if (state.level >= LEVELS.length - 1) {
        state.status = 'all-done';
      } else {
        state.status = 'level-complete';
        state.levelCompleteTime = performance.now();
      }
    }
  }

  /** Check whether all lights are off */
  isWin(state: LightsOutState): boolean {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (state.board[r][c].on) return false;
      }
    }
    return true;
  }

  /** Advance to the next level */
  nextLevel(state: LightsOutState): void {
    if (state.level < LEVELS.length - 1) {
      this.loadLevel(state, state.level + 1);
    }
  }

  /** Frame update — clean up expired ripple effects */
  update(state: LightsOutState, _dt: number): void {
    const now = performance.now();
    state.ripples = state.ripples.filter(
      (r) => now - r.startTime < r.duration,
    );
  }
}
