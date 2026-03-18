import type { Updatable } from '../../../shared/Updatable';
import type { PuzzleState } from '../types';
import { GRAVITY, DAMPING } from '../types';

export class PhysicsSystem implements Updatable<PuzzleState> {
  update(state: PuzzleState, dt: number): void {
    for (const b of state.bodies) {
      if (b.isStatic) continue;

      // Gravity
      b.vy += GRAVITY * dt;
      b.vx *= DAMPING;
      b.vy *= DAMPING;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
  }
}
