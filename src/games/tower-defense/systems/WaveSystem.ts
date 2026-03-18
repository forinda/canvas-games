import type { GameStateData, SpawnQueueItem } from '../types';
import { CLASSIC_WAVES, CHALLENGE_WAVES, generateEndlessWave } from '../data/waves';
import { EnemySystem } from './EnemySystem';
import { EconomySystem } from './EconomySystem';

const BETWEEN_WAVE_DELAY = 5000; // ms

export class WaveSystem {
  /**
   * Called once per frame. Handles:
   * 1. Between-wave countdown → auto-start next wave
   * 2. Processing spawn queue
   */
  static update(state: GameStateData): void {
    if (state.screen !== 'playing') return;

    const now = performance.now();

    // Process spawn queue
    if (state.spawnQueue.length > 0) {
      state.waveInProgress = true;
      const item = state.spawnQueue[0];
      if (now >= item.scheduledAt) {
        state.spawnQueue.shift();
        EnemySystem.spawnEnemy(
          state,
          item.enemyType,
          item.hpMultiplier,
          item.speedMultiplier,
        );
      }
    } else if (state.waveInProgress && state.enemies.length === 0) {
      // All enemies cleared → wave complete
      state.waveInProgress = false;
      EconomySystem.waveCompleteBonus(state);

      // Check win condition
      if (state.mode !== 'endless' && state.currentWave >= state.totalWaves) {
        state.screen = 'win';
        return;
      }

      // Begin between-wave countdown
      state.betweenWaveCountdown = BETWEEN_WAVE_DELAY;
    }

    // Between-wave countdown
    if (
      !state.waveInProgress &&
      state.spawnQueue.length === 0 &&
      state.betweenWaveCountdown > 0 &&
      state.currentWave > 0
    ) {
      state.betweenWaveCountdown -= 16; // approx 1 frame at 60fps
      if (state.betweenWaveCountdown <= 0) {
        state.betweenWaveCountdown = 0;
        WaveSystem.startNextWave(state);
      }
    }
  }

  /** Manually start the next wave (player presses "Start Wave" button) */
  static startNextWave(state: GameStateData): void {
    if (state.waveInProgress || state.spawnQueue.length > 0) return;
    if (state.screen !== 'playing') return;

    state.currentWave++;
    const waveDef = WaveSystem.getWaveDef(state);
    if (!waveDef) return;

    const now = performance.now();
    let scheduleAt = now + 500; // slight delay before first spawn

    for (const group of waveDef.groups) {
      const hpMul = group.hpMultiplier ?? 1;
      const speedMul = group.speedMultiplier ?? 1;
      for (let i = 0; i < group.count; i++) {
        const item: SpawnQueueItem = {
          enemyType: group.enemyType,
          scheduledAt: scheduleAt,
          hpMultiplier: hpMul,
          speedMultiplier: speedMul,
        };
        state.spawnQueue.push(item);
        scheduleAt += group.interval;
      }
    }

    state.waveInProgress = true;
    state.betweenWaveCountdown = 0;

    // Boss wave announcement
    if (waveDef.preBossAnnounce) {
      state.bossAnnounceUntil = performance.now() + 3000;
    }
  }

  private static getWaveDef(state: GameStateData) {
    const waveIdx = state.currentWave - 1;
    if (state.mode === 'endless') {
      return generateEndlessWave(state.currentWave);
    }
    const waves = state.mode === 'challenge' ? CHALLENGE_WAVES : CLASSIC_WAVES;
    return waves[waveIdx] ?? null;
  }

  static isFirstWave(state: GameStateData): boolean {
    return state.currentWave === 0;
  }
}
