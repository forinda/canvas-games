import type { Updatable } from "@shared/Updatable";
import type { SimonState, Color } from "../types";
import {
	COLORS,
	BASE_FLASH_DURATION,
	MIN_FLASH_DURATION,
	FLASH_REDUCTION_PER_ROUND,
	GAP_DURATION,
	LS_HIGH_SCORE_KEY,
} from "../types";

/**
 * Manages sequence generation, playback timing, and player input verification.
 */
export class SequenceSystem implements Updatable<SimonState> {
	/** Get flash duration for the current round */
	getFlashDuration(round: number): number {
		return Math.max(
			MIN_FLASH_DURATION,
			BASE_FLASH_DURATION - (round - 1) * FLASH_REDUCTION_PER_ROUND,
		);
	}

	/** Add a random color to the sequence and start showing phase */
	extendSequence(state: SimonState): void {
		const randomColor: Color =
			COLORS[Math.floor(Math.random() * COLORS.length)];

		state.sequence.push(randomColor);
		state.round = state.sequence.length;
		state.currentStep = 0;
		state.phase = "showing";
		state.showTimer = 0;
		state.inGap = false;
		state.activeColor = state.sequence[0];
	}

	/** Start a new game from round 1 */
	startNewGame(state: SimonState): void {
		state.sequence = [];
		state.round = 0;
		state.currentStep = 0;
		state.activeColor = null;
		state.showTimer = 0;
		state.inGap = false;
		state.inputFlashTimer = 0;
		state.started = true;
		this.extendSequence(state);
	}

	/** Check player input against the expected color in the sequence */
	verifyInput(state: SimonState, color: Color): boolean {
		if (state.phase !== "input") return false;

		const expected = state.sequence[state.currentStep];

		if (color !== expected) {
			// Wrong input - game over
			state.phase = "gameover";
			state.activeColor = null;
			this.saveHighScore(state);

			return false;
		}

		// Correct input
		state.currentStep++;

		if (state.currentStep >= state.sequence.length) {
			// Completed the full sequence - advance to next round
			state.activeColor = null;
			// Brief delay before showing next sequence, handled in update
			state.showTimer = -500; // negative = delay before next round starts
			state.currentStep = 0;
			state.inGap = false;
			this.extendSequence(state);

			return true;
		}

		return true;
	}

	/** Update showing phase timer */
	update(state: SimonState, dt: number): void {
		if (state.phase !== "showing") return;

		state.showTimer += dt;
		const flashDuration = this.getFlashDuration(state.round);

		if (state.inGap) {
			// In the gap between flashes
			if (state.showTimer >= GAP_DURATION) {
				state.showTimer = 0;
				state.inGap = false;
				state.currentStep++;

				if (state.currentStep >= state.sequence.length) {
					// Done showing - switch to input phase
					state.phase = "input";
					state.currentStep = 0;
					state.activeColor = null;

					return;
				}

				state.activeColor = state.sequence[state.currentStep];
			}
		} else {
			// Showing a color
			if (state.showTimer >= flashDuration) {
				state.showTimer = 0;
				state.inGap = true;
				state.activeColor = null;
			}
		}
	}

	/** Load high score from localStorage */
	loadHighScore(state: SimonState): void {
		try {
			const stored = localStorage.getItem(LS_HIGH_SCORE_KEY);

			state.highScore = stored ? parseInt(stored, 10) : 0;
		} catch {
			state.highScore = 0;
		}
	}

	/** Save high score to localStorage if current round beats it */
	saveHighScore(state: SimonState): void {
		const score = state.round - 1; // they failed on this round, so score is previous round

		if (score > state.highScore) {
			state.highScore = score;

			try {
				localStorage.setItem(LS_HIGH_SCORE_KEY, String(score));
			} catch {
				// localStorage unavailable
			}
		}
	}
}
