import type { TetrisState } from '../types';
import { HS_KEY } from '../types';

const LINE_SCORES = [0, 100, 300, 500, 800]; // 0, single, double, triple, tetris

export class ScoreSystem {
  /** Award score for cleared lines and update level */
  awardLines(state: TetrisState, linesCleared: number): void {
    if (linesCleared <= 0 || linesCleared > 4) return;

    const baseScore = LINE_SCORES[linesCleared];
    state.score += baseScore * (state.level + 1);
    state.lines += linesCleared;

    // Level up every 10 lines
    const newLevel = Math.floor(state.lines / 10);
    if (newLevel > state.level) {
      state.level = newLevel;
    }

    // High score
    if (state.score > state.highScore) {
      state.highScore = state.score;
      try {
        localStorage.setItem(HS_KEY, String(state.highScore));
      } catch {
        /* noop */
      }
    }
  }

  /** Award a small bonus for soft drops */
  awardSoftDrop(state: TetrisState, cells: number): void {
    state.score += cells;
  }

  /** Award bonus for hard drops */
  awardHardDrop(state: TetrisState, cells: number): void {
    state.score += cells * 2;
  }
}
