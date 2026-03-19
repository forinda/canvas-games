import type { Updatable } from "@shared/Updatable";
import type { FlappyState } from "../types";
import { GAP_SIZE, HS_KEY } from "../types";

export class CollisionSystem implements Updatable<FlappyState> {
	update(state: FlappyState, _dt: number): void {
		if (state.phase !== "playing") return;

		const bird = state.bird;
		const r = bird.radius;

		// Ground collision
		if (bird.y + r >= state.groundY) {
			bird.y = state.groundY - r;
			this.die(state);

			return;
		}

		// Ceiling collision
		if (bird.y - r <= 0) {
			bird.y = r;
			bird.velocity = 0;
		}

		// Pipe collision
		for (const pipe of state.pipes) {
			const pipeLeft = pipe.x;
			const pipeRight = pipe.x + pipe.width;

			// Check horizontal overlap (with bird radius)
			if (bird.x + r > pipeLeft && bird.x - r < pipeRight) {
				const gapTop = pipe.gapY - GAP_SIZE / 2;
				const gapBottom = pipe.gapY + GAP_SIZE / 2;

				// Check if bird is outside the gap
				if (bird.y - r < gapTop || bird.y + r > gapBottom) {
					this.die(state);

					return;
				}
			}
		}
	}

	private die(state: FlappyState): void {
		state.phase = "dead";
		state.flashTimer = 150;

		// Update high score
		if (state.score > state.highScore) {
			state.highScore = state.score;

			try {
				localStorage.setItem(HS_KEY, String(state.highScore));
			} catch {
				/* noop */
			}
		}
	}
}
