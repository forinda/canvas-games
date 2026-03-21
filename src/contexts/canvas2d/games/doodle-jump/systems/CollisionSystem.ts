import type { Updatable } from "@core/Updatable";
import type { DoodleState } from "../types";
import { JUMP_FORCE, SPRING_FORCE, HS_KEY } from "../types";

export class CollisionSystem implements Updatable<DoodleState> {
	update(state: DoodleState, _dt: number): void {
		if (state.phase !== "playing") return;

		const p = state.player;

		// Only check collisions when falling
		if (p.vy <= 0) return;

		const playerBottom = p.y + p.height;
		const playerLeft = p.x;
		const playerRight = p.x + p.width;

		for (const plat of state.platforms) {
			if (plat.broken) continue;

			const platTop = plat.y;
			const platBottom = plat.y + plat.height;
			const platLeft = plat.x;
			const platRight = plat.x + plat.width;

			// Check if player feet are within platform vertical range
			const verticalOverlap =
				playerBottom >= platTop && playerBottom <= platBottom + p.vy * 16;

			// Check horizontal overlap
			const horizontalOverlap =
				playerRight > platLeft && playerLeft < platRight;

			if (verticalOverlap && horizontalOverlap) {
				// Land on platform
				p.y = platTop - p.height;

				if (plat.type === "breaking") {
					plat.broken = true;
					plat.breakVy = 0.05;
					// No bounce on breaking platforms
					continue;
				}

				if (plat.type === "spring") {
					p.vy = SPRING_FORCE;
					plat.springTimer = 300;
				} else {
					p.vy = JUMP_FORCE;
				}

				// Only land on one platform per frame
				return;
			}
		}

		// Check if player fell below camera view -> game over
		const deathLine = state.cameraY + state.canvasH + 50;

		if (p.y > deathLine) {
			state.phase = "dead";

			// Save high score
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
}
