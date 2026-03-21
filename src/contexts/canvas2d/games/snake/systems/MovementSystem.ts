import type { Updatable } from "@core/Updatable";
import type { SnakeState } from "../types";

export class MovementSystem implements Updatable<SnakeState> {
	update(state: SnakeState, _dt: number): void {
		if (!state.started || state.paused || state.gameOver) return;

		state.dir = state.nextDir;

		const head = { ...state.snake[0] };

		switch (state.dir) {
			case "up":
				head.y--;
				break;
			case "down":
				head.y++;
				break;
			case "left":
				head.x--;
				break;
			case "right":
				head.x++;
				break;
		}

		state.snake.unshift(head);
	}
}
