import type { Updatable } from "@shared/Updatable";
import type { PacManState } from "../types";
import { GHOST_EAT_SCORES } from "../types";

export class CollisionSystem implements Updatable<PacManState> {
	private onDeath: () => void;

	constructor(onDeath: () => void) {
		this.onDeath = onDeath;
	}

	update(state: PacManState, _dt: number): void {
		if (state.paused || state.gameOver || !state.started || state.won) return;

		const px = state.pacman.pos.x;
		const py = state.pacman.pos.y;

		for (const ghost of state.ghosts) {
			if (!ghost.active || ghost.eaten) continue;

			const dx = ghost.pos.x - px;
			const dy = ghost.pos.y - py;
			const dist = Math.sqrt(dx * dx + dy * dy);

			if (dist < 0.8) {
				if (ghost.mode === "frightened") {
					// Eat the ghost
					ghost.eaten = true;
					ghost.mode = "chase"; // Will be overridden when it reaches home
					const scoreIdx = Math.min(
						state.frightenedGhostsEaten,
						GHOST_EAT_SCORES.length - 1,
					);

					state.score += GHOST_EAT_SCORES[scoreIdx];
					state.frightenedGhostsEaten++;
				} else {
					// Pac-Man dies
					this.onDeath();

					return;
				}
			}
		}
	}
}
