import type { Updatable } from "@core/Updatable";
import type { MemoryState } from "../types";
import { LS_PREFIX } from "../types";

/**
 * Tracks elapsed time and persists best moves / best time
 * per difficulty to localStorage.
 */
export class ScoreSystem implements Updatable<MemoryState> {
	update(state: MemoryState, dt: number): void {
		if (
			state.timerRunning &&
			state.started &&
			!state.paused &&
			!state.gameOver
		) {
			state.elapsedTime += dt;
		}

		// Persist best scores when the game is won
		if (state.phase === "won") {
			this.persistBest(state);
		}
	}

	/** Load best scores from localStorage for the current difficulty */
	loadBest(state: MemoryState): void {
		const key = LS_PREFIX + state.difficulty;

		try {
			const raw = localStorage.getItem(key);

			if (raw) {
				const data = JSON.parse(raw) as { moves?: number; time?: number };

				state.bestMoves = data.moves ?? null;
				state.bestTime = data.time ?? null;
			} else {
				state.bestMoves = null;
				state.bestTime = null;
			}
		} catch {
			state.bestMoves = null;
			state.bestTime = null;
		}
	}

	/** Save best scores if current run is better */
	private persistBest(state: MemoryState): void {
		const key = LS_PREFIX + state.difficulty;
		const isBetterMoves =
			state.bestMoves === null || state.moves < state.bestMoves;
		const isBetterTime =
			state.bestTime === null || state.elapsedTime < state.bestTime;

		if (isBetterMoves || isBetterTime) {
			const newMoves = isBetterMoves ? state.moves : state.bestMoves!;
			const newTime = isBetterTime ? state.elapsedTime : state.bestTime!;

			state.bestMoves = newMoves;
			state.bestTime = newTime;

			try {
				localStorage.setItem(
					key,
					JSON.stringify({ moves: newMoves, time: newTime }),
				);
			} catch {
				/* storage unavailable */
			}
		}
	}
}
