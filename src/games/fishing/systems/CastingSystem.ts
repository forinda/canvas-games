import type { Updatable } from '@shared/Updatable';
import type { FishingState } from '../types';

export class CastingSystem implements Updatable<FishingState> {
  private readonly CHARGE_SPEED = 1.2; // full charge in ~0.83s

  update(state: FishingState, dt: number): void {
    if (state.phase !== 'casting') return;

    if (state.castCharging) {
      // Power oscillates 0 -> 1 -> 0 for skill-based casting
      state.castPower += this.CHARGE_SPEED * dt;
      if (state.castPower > 2) state.castPower -= 2;
    } else {
      // Cast released — compute landing point
      const power = state.castPower <= 1 ? state.castPower : 2 - state.castPower;
      state.castDistance = Math.max(0.1, power);

      // Position bobber based on cast distance
      const waterStartX = state.width * 0.25;
      const waterEndX = state.width * 0.95;
      state.bobberX = waterStartX + state.castDistance * (waterEndX - waterStartX);
      state.bobberY = state.height * 0.45 + state.castDistance * state.height * 0.15;
      state.bobberBobTime = 0;

      // Transition to waiting
      state.phase = 'waiting';
      state.waitElapsed = 0;
      state.waitTimer = 2 + Math.random() * 6; // 2-8 seconds
      state.fishBiting = false;
    }
  }
}
