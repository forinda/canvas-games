import type { Updatable } from "@shared/Updatable";
import type { ShooterState } from "../types";
import type { EnemySystem } from "./EnemySystem";

const BETWEEN_WAVE_DELAY = 2.5; // seconds between waves

export class WaveSystem implements Updatable<ShooterState> {
	private enemySystem: EnemySystem;

	constructor(enemySystem: EnemySystem) {
		this.enemySystem = enemySystem;
	}

	update(state: ShooterState, dt: number): void {
		const wd = state.waveData;

		if (!wd.active) {
			// Waiting between waves
			wd.betweenWaveTimer -= dt;

			if (wd.betweenWaveTimer <= 0) {
				this.startWave(state);
			}

			return;
		}

		// ── Spawn enemies during active wave ─────────────────────────
		if (wd.enemiesRemaining > 0) {
			wd.spawnTimer -= dt;

			if (wd.spawnTimer <= 0) {
				wd.spawnTimer = wd.spawnInterval;
				wd.enemiesRemaining -= 1;
				this.enemySystem.spawnEnemy(state, wd.wave);
			}
		}

		// ── Wave complete when all spawned + all dead ────────────────
		if (wd.enemiesRemaining <= 0 && state.enemies.length === 0) {
			wd.active = false;
			wd.betweenWaveTimer = BETWEEN_WAVE_DELAY;
		}
	}

	private startWave(state: ShooterState): void {
		const wd = state.waveData;

		wd.wave += 1;
		wd.enemiesRemaining = this.enemyCountForWave(wd.wave);
		wd.spawnInterval = Math.max(0.25, 1.0 - wd.wave * 0.05);
		wd.spawnTimer = 0.3;
		wd.active = true;
	}

	private enemyCountForWave(wave: number): number {
		// Base 4, +3 per wave, capped at 40
		return Math.min(40, 4 + wave * 3);
	}
}
