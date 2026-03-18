import type { Updatable } from '@shared/Updatable';
import type { HelicopterState } from '../types';
import { GRAVITY, LIFT, MAX_VELOCITY, MIN_VELOCITY } from '../types';

export class PhysicsSystem implements Updatable<HelicopterState> {
  update(state: HelicopterState, dt: number): void {
    if (state.phase !== 'playing') {
      // Idle bobbing
      if (state.phase === 'idle') {
        state.helicopter.y =
          state.canvasH * 0.45 + Math.sin(performance.now() * 0.003) * 8;
        state.helicopter.velocity = 0;
      }
      return;
    }

    const heli = state.helicopter;

    // Apply gravity or lift
    if (state.holding) {
      heli.velocity += LIFT * dt;
    } else {
      heli.velocity += GRAVITY * dt;
    }

    // Clamp velocity
    if (heli.velocity > MAX_VELOCITY) {
      heli.velocity = MAX_VELOCITY;
    }
    if (heli.velocity < MIN_VELOCITY) {
      heli.velocity = MIN_VELOCITY;
    }

    // Update position
    heli.y += heli.velocity * dt;

    // Animate rotor
    heli.rotorAngle += dt * 0.03;
    if (heli.rotorAngle > Math.PI * 2) {
      heli.rotorAngle -= Math.PI * 2;
    }
  }
}
