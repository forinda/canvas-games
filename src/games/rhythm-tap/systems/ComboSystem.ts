import type { RhythmState, TimingGrade } from "../types";
import { COMBO_MULTIPLIER_TIERS } from "../types";

/**
 * Tracks combo counter, multiplier, and streak.
 * Called by CircleSystem when a circle is hit or missed.
 */
export class ComboSystem {
	/** Register a successful hit — increment combo and recalculate multiplier */
	registerHit(state: RhythmState, _grade: TimingGrade): void {
		state.combo += 1;

		if (state.combo > state.maxCombo) {
			state.maxCombo = state.combo;
		}

		this.updateMultiplier(state);
	}

	/** Register a miss — reset combo and multiplier */
	registerMiss(state: RhythmState): void {
		state.combo = 0;
		this.updateMultiplier(state);
	}

	private updateMultiplier(state: RhythmState): void {
		for (const [threshold, mult] of COMBO_MULTIPLIER_TIERS) {
			if (state.combo >= threshold) {
				state.multiplier = mult;

				return;
			}
		}

		state.multiplier = 1;
	}
}
