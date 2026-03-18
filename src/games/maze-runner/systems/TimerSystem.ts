import type { Updatable } from '@shared/Updatable.ts';
import type { MazeState } from '../types.ts';

/**
 * Countdown timer. Ticks down each frame; sets state.lost when time runs out.
 */
export class TimerSystem implements Updatable<MazeState> {
  update(state: MazeState, dt: number): void {
    if (state.paused || state.won || state.lost || !state.started) return;

    state.timeLeft -= dt / 1000;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      state.lost = true;
    }
  }
}
