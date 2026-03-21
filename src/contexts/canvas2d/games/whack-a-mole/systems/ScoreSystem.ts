import type { Updatable } from "@core/Updatable";
import type { WhackState } from "../types";
import { HS_KEY } from "../types";

export class ScoreSystem implements Updatable<WhackState> {
	update(state: WhackState, dt: number): void {
		if (state.phase !== "playing" || state.paused) return;

		// Count down timer
		state.timeRemaining -= dt / 1000;

		if (state.timeRemaining <= 0) {
			state.timeRemaining = 0;
			state.phase = "gameover";

			// Persist high score
			if (state.score > state.highScore) {
				state.highScore = state.score;

				try {
					localStorage.setItem(HS_KEY, String(state.highScore));
				} catch {
					/* noop */
				}
			}
		}

		// Update particles
		for (let i = state.particles.length - 1; i >= 0; i--) {
			const p = state.particles[i];

			p.life -= dt;

			if (p.life <= 0) {
				state.particles.splice(i, 1);
				continue;
			}

			p.x += p.vx * (dt / 1000);
			p.y += p.vy * (dt / 1000);
			p.vy += 200 * (dt / 1000); // gravity
		}

		// Update hammer effect
		if (state.hammerEffect) {
			state.hammerEffect.timer -= dt;

			if (state.hammerEffect.timer <= 0) {
				state.hammerEffect = null;
			}
		}
	}

	reset(): void {
		// No internal state to reset beyond WhackState
	}
}
