import type { GameStateData } from '../types';

const HS_KEY = 'td_highscore';

export class EconomySystem {
  static spendGold(state: GameStateData, amount: number): void {
    state.gold = Math.max(0, state.gold - amount);
  }

  static earnGold(state: GameStateData, amount: number): void {
    state.gold += amount;
  }

  static addScore(state: GameStateData, points: number): void {
    state.score += points;
    if (state.score > state.highScore) {
      state.highScore = state.score;
      try { localStorage.setItem(HS_KEY, String(state.highScore)); } catch { /* noop */ }
    }
  }

  static loadHighScore(): number {
    try { return parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0; } catch { return 0; }
  }

  /** Bonus gold at end of each wave */
  static waveCompleteBonus(state: GameStateData): void {
    let bonus = Math.round(state.currentWave * 25);
    if (state.mode === 'challenge') {
      bonus = Math.round(bonus * 0.6);
    }
    EconomySystem.earnGold(state, bonus);
  }
}
