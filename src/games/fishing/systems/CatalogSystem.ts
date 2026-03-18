import type { FishingState, CatalogEntry, CaughtFish } from '../types';
import { STORAGE_KEY } from '../types';

export class CatalogSystem {
  /** Load catalog from localStorage into state */
  load(state: FishingState): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const entries: Record<string, CatalogEntry> = JSON.parse(raw);
        state.catalog = new Map(Object.entries(entries));
        // Restore totals
        let score = 0;
        let count = 0;
        for (const entry of state.catalog.values()) {
          score += entry.totalPoints;
          count += entry.count;
        }
        state.totalScore = score;
        state.totalCaught = count;
      }
    } catch {
      // Corrupted data — start fresh
      state.catalog = new Map();
    }
  }

  /** Save catalog to localStorage */
  save(state: FishingState): void {
    try {
      const obj: Record<string, CatalogEntry> = {};
      for (const [key, val] of state.catalog) {
        obj[key] = val;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // Storage full or unavailable
    }
  }

  /** Record a caught fish in the catalog */
  recordCatch(state: FishingState, caught: CaughtFish): void {
    const key = caught.fish.name;
    const existing = state.catalog.get(key);

    if (existing) {
      existing.count += 1;
      existing.bestSize = Math.max(existing.bestSize, caught.size);
      existing.totalPoints += caught.fish.points;
    } else {
      state.catalog.set(key, {
        name: caught.fish.name,
        count: 1,
        bestSize: caught.size,
        totalPoints: caught.fish.points,
        firstCaught: caught.timestamp,
      });
    }

    this.save(state);
  }
}
