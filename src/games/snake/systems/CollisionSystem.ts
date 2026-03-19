import type { Updatable } from "@shared/Updatable";
import type { SnakeState } from "../types";

export class CollisionSystem implements Updatable<SnakeState> {
	update(state: SnakeState, _dt: number): void {
		if (!state.started || state.paused || state.gameOver) return;

		const head = state.snake[0];

		// Wall collision
		if (
			head.x < 0 ||
			head.x >= state.gridW ||
			head.y < 0 ||
			head.y >= state.gridH
		) {
			state.gameOver = true;
			// Remove the invalid head that was just added by MovementSystem
			state.snake.shift();

			return;
		}

		// Self collision (check against body, skip index 0 which is the new head)
		for (let i = 1; i < state.snake.length; i++) {
			if (state.snake[i].x === head.x && state.snake[i].y === head.y) {
				state.gameOver = true;

				return;
			}
		}
	}
}
