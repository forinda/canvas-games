import type { Updatable } from '../../../shared/Updatable';
import type { PuzzleState } from '../types';
import { boxOverlap } from './CollisionSystem';

export class GoalSystem implements Updatable<PuzzleState> {
  private canvasHeight: number;

  constructor(canvasHeight: number) {
    this.canvasHeight = canvasHeight;
  }

  setCanvasHeight(h: number): void {
    this.canvasHeight = h;
  }

  update(state: PuzzleState, _dt: number): void {
    for (const b of state.bodies) {
      if (b.type !== 'ball') continue;

      const goal = state.bodies.find(g => g.type === 'goal');
      if (goal && boxOverlap(b, goal)) {
        state.solved = true;
        state.score += 100 * state.level;
      }

      // Fall off screen
      if (b.y > this.canvasHeight + 100) {
        state.simulating = false;
        state.message = 'Ball fell! Press R to reset, or SPACE to retry.';
      }
    }
  }
}
