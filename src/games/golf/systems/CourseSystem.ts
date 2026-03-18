import type { GolfState } from '../types';
import { BALL_RADIUS } from '../types';
import { COURSES } from '../data/courses';

export class CourseSystem {
  loadHole(state: GolfState): void {
    const course = COURSES[state.currentHole];
    state.ball.pos.x = course.ballStart.x;
    state.ball.pos.y = course.ballStart.y;
    state.ball.vel.x = 0;
    state.ball.vel.y = 0;
    state.ball.radius = BALL_RADIUS;
    state.strokes = 0;
    state.ballMoving = false;
    state.holeSunk = false;
    state.aiming = false;
    state.aimStart = null;
    state.aimEnd = null;
  }

  advanceHole(state: GolfState): void {
    state.strokesPerHole[state.currentHole] = state.strokes;
    state.parPerHole[state.currentHole] = COURSES[state.currentHole].par;

    // Calculate total score (strokes vs par)
    let totalStrokes = 0;
    let totalPar = 0;
    for (let i = 0; i <= state.currentHole; i++) {
      totalStrokes += state.strokesPerHole[i];
      totalPar += COURSES[i].par;
    }
    state.totalScore = totalStrokes - totalPar;

    if (state.currentHole < state.totalHoles - 1) {
      state.currentHole++;
      this.loadHole(state);
    } else {
      state.gameComplete = true;
    }
  }

  recordStroke(state: GolfState): void {
    state.strokes++;
  }

  getParLabel(strokes: number, par: number): string {
    const diff = strokes - par;
    if (diff <= -3) return 'Albatross!';
    if (diff === -2) return 'Eagle!';
    if (diff === -1) return 'Birdie!';
    if (diff === 0) return 'Par';
    if (diff === 1) return 'Bogey';
    if (diff === 2) return 'Double Bogey';
    return `+${diff}`;
  }
}
