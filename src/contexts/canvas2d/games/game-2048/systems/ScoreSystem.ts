import type { Updatable } from "@core/Updatable";
import type { Game2048State } from "../types";
import { HS_KEY } from "../types";

export class ScoreSystem implements Updatable<Game2048State> {
	private lastSavedHighScore = 0;

	constructor(initialHighScore: number) {
		this.lastSavedHighScore = initialHighScore;
	}

	update(state: Game2048State, _dt: number): void {
		// Persist high score when it changes
		if (state.highScore > this.lastSavedHighScore) {
			this.lastSavedHighScore = state.highScore;

			try {
				localStorage.setItem(HS_KEY, String(state.highScore));
			} catch {
				/* storage full or blocked */
			}
		}
	}

	/** Load high score from localStorage */
	static loadHighScore(): number {
		try {
			return parseInt(localStorage.getItem(HS_KEY) ?? "0", 10) || 0;
		} catch {
			return 0;
		}
	}
}
