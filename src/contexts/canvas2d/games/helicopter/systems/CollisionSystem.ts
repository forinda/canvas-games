import type { Updatable } from "@core/Updatable";
import type { HelicopterState } from "../types";
import { CAVE_SEGMENT_WIDTH, HS_KEY } from "../types";

export class CollisionSystem implements Updatable<HelicopterState> {
	update(state: HelicopterState, _dt: number): void {
		if (state.phase !== "playing") return;

		const heli = state.helicopter;
		const heliLeft = heli.x - heli.width / 2;
		const heliRight = heli.x + heli.width / 2;
		const heliTop = heli.y - heli.height / 2;
		const heliBottom = heli.y + heli.height / 2;

		// Cave wall collision — check segments that overlap helicopter horizontally
		for (const seg of state.cave) {
			const segLeft = seg.x;
			const segRight = seg.x + CAVE_SEGMENT_WIDTH;

			if (heliRight > segLeft && heliLeft < segRight) {
				// Helicopter overlaps this segment
				if (heliTop < seg.top || heliBottom > seg.bottom) {
					this.die(state);

					return;
				}
			}
		}

		// Obstacle collision (AABB)
		for (const obs of state.obstacles) {
			if (
				heliRight > obs.x &&
				heliLeft < obs.x + obs.width &&
				heliBottom > obs.y &&
				heliTop < obs.y + obs.height
			) {
				this.die(state);

				return;
			}
		}
	}

	private die(state: HelicopterState): void {
		state.phase = "dead";
		state.holding = false;
		state.flashTimer = 150;

		const score = Math.floor(state.distance);

		if (score > state.bestScore) {
			state.bestScore = score;

			try {
				localStorage.setItem(HS_KEY, String(state.bestScore));
			} catch {
				/* noop */
			}
		}
	}
}
