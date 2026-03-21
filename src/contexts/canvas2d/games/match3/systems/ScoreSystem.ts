import type { Updatable } from "@core/Updatable";
import type { Match3State } from "../types";
import { HS_KEY } from "../types";

/**
 * Awards points when matches are found, applies combo multiplier,
 * and persists high score to localStorage.
 */
export class ScoreSystem implements Updatable<Match3State> {
	private lastMatchedCount = 0;

	update(state: Match3State, _dt: number): void {
		if (state.phase !== "removing") return;

		const count = state.matched.size;

		if (count === 0 || count === this.lastMatchedCount) return;

		this.lastMatchedCount = count;

		// Base 10 points per gem, times combo multiplier
		const points = count * 10 * Math.max(state.combo, 1);

		state.score += points;

		// Persist high score
		if (state.score > state.highScore) {
			state.highScore = state.score;

			try {
				localStorage.setItem(HS_KEY, String(state.highScore));
			} catch {
				/* storage unavailable */
			}
		}
	}

	/** Reset tracking between rounds */
	reset(): void {
		this.lastMatchedCount = 0;
	}
}
