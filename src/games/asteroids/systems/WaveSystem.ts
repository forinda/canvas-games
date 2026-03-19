import type { Updatable } from "@shared/Updatable";
import type { AsteroidsState } from "../types";
import { INITIAL_ASTEROIDS } from "../types";
import type { AsteroidSystem } from "./AsteroidSystem";

export class WaveSystem implements Updatable<AsteroidsState> {
	private asteroidSystem: AsteroidSystem;

	constructor(asteroidSystem: AsteroidSystem) {
		this.asteroidSystem = asteroidSystem;
	}

	update(state: AsteroidsState, _dt: number): void {
		if (!state.started || state.paused || state.gameOver) return;

		// When all asteroids are destroyed, advance to the next wave
		if (state.asteroids.length === 0) {
			state.wave++;
			const count = INITIAL_ASTEROIDS + (state.wave - 1) * 2;

			this.asteroidSystem.spawnWave(state, count);
		}
	}

	/** Start the first wave */
	startFirstWave(state: AsteroidsState): void {
		state.wave = 1;
		this.asteroidSystem.spawnWave(state, INITIAL_ASTEROIDS);
	}
}
