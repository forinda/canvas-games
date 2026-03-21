import type { Updatable } from "@core/Updatable";
import type { WhackState } from "../types";
import {
	HOLE_COUNT,
	RISE_DURATION,
	UP_DURATION_BASE,
	SINK_DURATION,
	SPAWN_INTERVAL_BASE,
	SPAWN_INTERVAL_MIN,
	ROUND_DURATION,
} from "../types";

export class MoleSystem implements Updatable<WhackState> {
	update(state: WhackState, dt: number): void {
		if (state.phase !== "playing" || state.paused) return;

		// Update hole timers
		for (const hole of state.holes) {
			if (hole.state === "empty") continue;

			hole.timer += dt;

			if (hole.state === "rising" && hole.timer >= RISE_DURATION) {
				hole.state = "up";
				hole.timer = 0;
			} else if (hole.state === "up") {
				// Up duration shortens as time progresses
				const elapsed = ROUND_DURATION - state.timeRemaining;
				const upDuration = UP_DURATION_BASE - elapsed * 10;
				const clampedUp = Math.max(400, upDuration);

				if (hole.timer >= clampedUp) {
					hole.state = "sinking";
					hole.timer = 0;
				}
			} else if (hole.state === "sinking" && hole.timer >= SINK_DURATION) {
				hole.state = "empty";
				hole.timer = 0;
				hole.isBomb = false;
				hole.hit = false;
			}
		}

		// Update spawn interval — gets faster over time
		const elapsed = ROUND_DURATION - state.timeRemaining;
		const progress = elapsed / ROUND_DURATION;

		state.spawnInterval =
			SPAWN_INTERVAL_BASE -
			(SPAWN_INTERVAL_BASE - SPAWN_INTERVAL_MIN) * progress;

		// Spawn new moles
		state.spawnTimer += dt;

		if (state.spawnTimer >= state.spawnInterval) {
			state.spawnTimer = 0;
			this.spawnMole(state);
		}
	}

	private spawnMole(state: WhackState): void {
		// Collect empty holes
		const empties: number[] = [];

		for (let i = 0; i < HOLE_COUNT; i++) {
			if (state.holes[i].state === "empty") empties.push(i);
		}

		if (empties.length === 0) return;

		const idx = empties[Math.floor(Math.random() * empties.length)];
		const hole = state.holes[idx];

		hole.state = "rising";
		hole.timer = 0;
		hole.hit = false;

		// Bombs appear from round 2 onwards, 20% chance
		hole.isBomb = state.round >= 2 && Math.random() < 0.2;
	}
}
