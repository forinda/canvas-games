import type { Updatable } from "@core/Updatable";
import type { HangmanState } from "../types";
import { MAX_WRONG } from "../types";

export class GameSystem implements Updatable<HangmanState> {
	processGuess(state: HangmanState, letter: string): void {
		if (state.phase !== "playing") return;

		if (state.guessedLetters.has(letter)) return;

		state.guessedLetters.add(letter);

		if (!state.word.includes(letter)) {
			state.wrongGuesses.push(letter);
		}

		// Check lose
		if (state.wrongGuesses.length >= MAX_WRONG) {
			state.phase = "lost";
			state.losses++;

			return;
		}

		// Check win
		const allRevealed = state.word
			.split("")
			.every((ch) => state.guessedLetters.has(ch));

		if (allRevealed) {
			state.phase = "won";
			state.wins++;
		}
	}

	update(_state: HangmanState, _dt: number): void {
		// No per-frame logic needed; guesses are event-driven
	}
}
