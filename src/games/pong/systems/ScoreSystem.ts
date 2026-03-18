import type { Updatable } from '@shared/Updatable';
import type { PongState } from '../types';
import { WINNING_SCORE, BALL_BASE_SPEED } from '../types';

/**
 * Detects when the ball exits left/right edge, awards points,
 * resets the ball, and detects a win at WINNING_SCORE.
 */
export class ScoreSystem implements Updatable<PongState> {
  update(state: PongState, _dt: number): void {
    const b = state.ball;

    // Ball past left edge -> right scores
    if (b.x + b.radius < 0) {
      state.rightScore++;
      this.checkWin(state, 'right');
      if (state.phase === 'playing') this.resetBall(state, -1);
      return;
    }

    // Ball past right edge -> left scores
    if (b.x - b.radius > state.canvasW) {
      state.leftScore++;
      this.checkWin(state, 'left');
      if (state.phase === 'playing') this.resetBall(state, 1);
      return;
    }
  }

  /** Reset ball to center, serve towards direction (-1 = left, 1 = right) */
  resetBall(state: PongState, direction: number): void {
    const b = state.ball;
    b.x = state.canvasW / 2;
    b.y = state.canvasH / 2;
    b.speed = BALL_BASE_SPEED;
    b.trail = [];
    state.rallyHits = 0;

    // Random Y angle between -30 and +30 degrees
    const angle = ((Math.random() - 0.5) * Math.PI) / 3;
    b.vx = direction * Math.cos(angle) * b.speed;
    b.vy = Math.sin(angle) * b.speed;
  }

  private checkWin(state: PongState, side: 'left' | 'right'): void {
    const score = side === 'left' ? state.leftScore : state.rightScore;
    if (score >= WINNING_SCORE) {
      state.winner = side;
      state.phase = 'win';
    }
  }
}
