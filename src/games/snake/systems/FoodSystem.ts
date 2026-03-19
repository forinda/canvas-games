import type { Updatable } from "@shared/Updatable";
import type { SnakeState } from "../types";

export class FoodSystem implements Updatable<SnakeState> {
	update(state: SnakeState, _dt: number): void {
		if (!state.started || state.paused || state.gameOver) return;

		const head = state.snake[0];

		if (head.x === state.food.x && head.y === state.food.y) {
			// Keep the tail (don't pop) so snake grows
			this.spawnFood(state);
		} else {
			// Remove tail so snake stays same length
			state.snake.pop();
		}
	}

	spawnFood(state: SnakeState): void {
		let x: number, y: number;

		do {
			x = Math.floor(Math.random() * state.gridW);
			y = Math.floor(Math.random() * state.gridH);
		} while (state.snake.some((seg) => seg.x === x && seg.y === y));
		state.food = { x, y };
	}
}
