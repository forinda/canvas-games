import type { Updatable } from "@shared/Updatable";
import type { BalloonState } from "../types";
import { HS_KEY } from "../types";

export class ScoreSystem implements Updatable<BalloonState> {
	update(state: BalloonState, dt: number): void {
		// Always update particles regardless of phase
		this.updateParticles(state, dt);

		if (state.phase !== "playing" || state.paused) return;

		// Count down game timer
		state.timeRemaining -= dt / 1000;
		state.elapsed += dt / 1000;

		if (state.timeRemaining <= 0) {
			state.timeRemaining = 0;
			state.phase = "gameover";
			this.persistHighScore(state);
		}

		// Decay combo timer
		if (state.comboTimer > 0) {
			state.comboTimer -= dt;

			if (state.comboTimer <= 0) {
				state.comboTimer = 0;
				state.combo = 0;
			}
		}
	}

	private updateParticles(state: BalloonState, dt: number): void {
		const dtSec = dt / 1000;

		for (let i = state.particles.length - 1; i >= 0; i--) {
			const p = state.particles[i];

			p.life -= dt;

			if (p.life <= 0) {
				state.particles.splice(i, 1);
				continue;
			}

			p.x += p.vx * dtSec;
			p.y += p.vy * dtSec;
			p.vy += 300 * dtSec; // gravity
		}
	}

	private persistHighScore(state: BalloonState): void {
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
