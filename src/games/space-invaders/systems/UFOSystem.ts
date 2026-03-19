import type { Updatable } from "@shared/Updatable";
import {
	type InvadersState,
	UFO_W,
	UFO_H,
	UFO_SPEED,
	UFO_SPAWN_INTERVAL_MIN,
	UFO_SPAWN_INTERVAL_MAX,
	UFO_POINTS,
	HUD_HEIGHT,
} from "../types";

function randomInterval(): number {
	return (
		UFO_SPAWN_INTERVAL_MIN +
		Math.random() * (UFO_SPAWN_INTERVAL_MAX - UFO_SPAWN_INTERVAL_MIN)
	);
}

export class UFOSystem implements Updatable<InvadersState> {
	update(state: InvadersState, dt: number): void {
		if (state.phase !== "playing") return;

		// ── Move active UFO ─────────────────────────────────────────────────
		if (state.ufo?.active) {
			state.ufo.x += state.ufo.vx * dt;

			// Off-screen?
			if (state.ufo.x > state.canvasW + UFO_W || state.ufo.x + UFO_W < 0) {
				state.ufo.active = false;
				state.ufo = null;
			}

			return; // only one UFO at a time
		}

		// ── Spawn timer ─────────────────────────────────────────────────────
		state.ufoTimer -= dt;

		if (state.ufoTimer <= 0) {
			const goingRight = Math.random() > 0.5;

			state.ufo = {
				x: goingRight ? -UFO_W : state.canvasW,
				y: HUD_HEIGHT + 6,
				w: UFO_W,
				h: UFO_H,
				vx: goingRight ? UFO_SPEED : -UFO_SPEED,
				active: true,
				points: UFO_POINTS,
			};
			state.ufoTimer = randomInterval();
		}
	}
}

export { randomInterval as resetUfoTimer };
