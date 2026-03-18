import type { Updatable } from '@shared/Updatable.ts';
import type { IdleState } from '../types.ts';
import { SAVE_KEY, AUTO_SAVE_INTERVAL } from '../types.ts';

/**
 * Calculates CPS from all upgrades and accumulates coins each frame.
 * Handles auto-saving to localStorage.
 */
export class IdleSystem implements Updatable<IdleState> {
  update(state: IdleState, dt: number): void {
    const dtSec = dt / 1000;

    // Recalculate CPS from all upgrades
    let totalCps = 0;
    for (const u of state.upgrades) {
      totalCps += u.cps * u.owned;
    }
    state.cps = totalCps;

    // Add passive income
    if (totalCps > 0) {
      const earned = totalCps * dtSec;
      state.coins += earned;
      state.totalCoinsEarned += earned;
    }

    // Update click power: base 1 + 1% of CPS as bonus
    state.clickPower = 1 + totalCps * 0.01;

    // Auto-save timer
    state.saveTimer += dtSec;
    if (state.saveTimer >= AUTO_SAVE_INTERVAL) {
      state.saveTimer = 0;
      this.save(state);
    }
  }

  /** Persist current progress to localStorage */
  save(state: IdleState): void {
    try {
      const data = {
        coins: state.coins,
        totalCoinsEarned: state.totalCoinsEarned,
        totalClicks: state.totalClicks,
        upgrades: state.upgrades.map((u) => ({ id: u.id, owned: u.owned })),
        timestamp: Date.now(),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // Storage may be full or unavailable — silently skip
    }
  }

  /** Load saved progress, applying offline earnings */
  load(state: IdleState): void {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as {
        coins: number;
        totalCoinsEarned: number;
        totalClicks: number;
        upgrades: { id: string; owned: number }[];
        timestamp: number;
      };

      state.totalClicks = data.totalClicks ?? 0;

      // Restore upgrade owned counts
      for (const saved of data.upgrades) {
        const upgrade = state.upgrades.find((u) => u.id === saved.id);
        if (upgrade) upgrade.owned = saved.owned;
      }

      // Calculate CPS to apply offline earnings
      let totalCps = 0;
      for (const u of state.upgrades) {
        totalCps += u.cps * u.owned;
      }

      // Offline earnings (capped at 8 hours)
      const elapsed = Math.min((Date.now() - data.timestamp) / 1000, 8 * 3600);
      const offlineEarnings = totalCps * elapsed;

      state.coins = data.coins + offlineEarnings;
      state.totalCoinsEarned = (data.totalCoinsEarned ?? 0) + offlineEarnings;
    } catch {
      // Corrupted save — start fresh
    }
  }
}
