import type { Updatable } from '@shared/Updatable';
import type { DoodleState } from '../types';
import { GRAVITY, FRICTION } from '../types';

export class PhysicsSystem implements Updatable<DoodleState> {
  update(state: DoodleState, dt: number): void {
    if (state.phase !== 'playing') return;

    const p = state.player;

    // Apply gravity
    p.vy += GRAVITY * dt;

    // Apply horizontal friction
    p.vx *= FRICTION;

    // Update position
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Screen wrap horizontally
    if (p.x + p.width < 0) {
      p.x = state.canvasW;
    } else if (p.x > state.canvasW) {
      p.x = -p.width;
    }
  }
}
