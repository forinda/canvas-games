import type { Updatable } from '../../../shared/Updatable';
import type { CityState } from '../types';

export class EconomySystem implements Updatable<CityState> {
  private lastEconTick = 0;
  private showMessage: (msg: string) => void;

  constructor(showMessage: (msg: string) => void) {
    this.showMessage = showMessage;
  }

  resetTick(now: number): void {
    this.lastEconTick = now;
  }

  update(state: CityState, _dt: number, now?: number): void {
    if (now === undefined) return;

    const econInterval = 3000 / state.speed;
    if (now - this.lastEconTick >= econInterval) {
      this.lastEconTick = now;
      state.tick++;

      // Income = population * happiness factor + factory income
      let factoryCount = 0;
      for (const row of state.grid) {
        for (const b of row) {
          if (b?.type === 'factory') factoryCount += b.level;
        }
      }
      const hapFactor = state.happiness / 50;
      const income = Math.round(state.population * 2 * hapFactor + factoryCount * 50);
      const upkeep = Math.round(state.population * 0.5);
      state.money += income - upkeep;

      // Food and power warnings
      if (state.food < 0) this.showMessage('Food shortage! Build farms!');
      if (state.power < 0) this.showMessage('Power shortage! Build power plants!');
    }
  }
}
