import type { Updatable } from "@core/Updatable";
import type { SnakeState, Coord } from "../types";
import { HS_KEY } from "../types";

export class ScoreSystem implements Updatable<SnakeState> {
	private prevFood: Coord | null = null;

	update(state: SnakeState, _dt: number): void {
		if (!state.started || state.paused || state.gameOver) return;

		// Detect food consumption by checking if the food position changed
		// (FoodSystem spawns new food when eaten)
		if (
			this.prevFood &&
			(this.prevFood.x !== state.food.x || this.prevFood.y !== state.food.y)
		) {
			state.score += 10;

			if (state.score > state.highScore) {
				state.highScore = state.score;

				try {
					localStorage.setItem(HS_KEY, String(state.highScore));
				} catch {
					/* noop */
				}
			}

			state.speed = Math.max(50, state.speed - 2);
		}

		this.prevFood = { ...state.food };
	}

	reset(): void {
		this.prevFood = null;
	}
}
