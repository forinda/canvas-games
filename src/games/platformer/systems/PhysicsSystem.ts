import type { Updatable } from '@shared/Updatable';
import type { PlatState } from '../types';
import { GRAVITY } from '../types';

export class PhysicsSystem implements Updatable<PlatState> {
  update(state: PlatState, dt: number): void {
    state.vy += GRAVITY * dt;
    state.px += state.vx * dt;
    state.py += state.vy * dt;
  }
}
