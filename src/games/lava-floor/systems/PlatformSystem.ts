import type { Updatable } from "@shared/Updatable";
import type { LavaState, Platform } from "../types";
import {
	SINK_SPEED,
	SINK_DELAY,
	PLATFORM_MIN_W,
	PLATFORM_MAX_W,
	BASE_SPAWN_INTERVAL,
	MIN_SPAWN_INTERVAL,
	SPEED_INCREASE_RATE,
} from "../types";

export class PlatformSystem implements Updatable<LavaState> {
	update(state: LavaState, dt: number): void {
		if (state.phase !== "playing") return;

		// Increase difficulty over time
		state.scrollSpeed = Math.min(
			0.12,
			0.02 + state.survivalTime * SPEED_INCREASE_RATE,
		);

		// Update platform sink timers
		for (const plat of state.platforms) {
			if (plat.sinking && !plat.sunk) {
				plat.sinkTimer -= dt;

				if (plat.sinkTimer <= 0) {
					plat.sunk = true;
				}

				// Visual: reduce opacity as timer runs out
				plat.opacity = Math.max(0.3, plat.sinkTimer / SINK_DELAY);
			}

			// Sunk platforms sink into lava
			if (plat.sunk) {
				plat.y += SINK_SPEED * dt;
				plat.opacity = Math.max(0, plat.opacity - 0.001 * dt);
			}
		}

		// Remove fully sunk platforms (below lava + buffer)
		state.platforms = state.platforms.filter(
			(p) => p.y < state.lavaY + 100 && p.opacity > 0,
		);

		// Spawn new platforms from sides
		state.spawnTimer -= dt;
		const currentInterval = Math.max(
			MIN_SPAWN_INTERVAL,
			BASE_SPAWN_INTERVAL - state.survivalTime * 0.05,
		);

		if (state.spawnTimer <= 0) {
			state.spawnTimer = currentInterval;
			this.spawnPlatform(state);
		}
	}

	initPlatforms(state: LavaState): void {
		state.platforms = [];

		// Starting platform under the player
		state.platforms.push({
			x: state.canvasW / 2 - 60,
			y: state.canvasH * 0.6,
			w: 120,
			sinkTimer: SINK_DELAY,
			sunk: false,
			sinking: false,
			opacity: 1,
		});

		// Several initial platforms scattered around
		const count = 6;

		for (let i = 0; i < count; i++) {
			const w =
				PLATFORM_MIN_W + Math.random() * (PLATFORM_MAX_W - PLATFORM_MIN_W);
			const x = Math.random() * (state.canvasW - w);
			const y = state.canvasH * 0.3 + Math.random() * (state.canvasH * 0.4);

			state.platforms.push({
				x,
				y,
				w,
				sinkTimer: SINK_DELAY,
				sunk: false,
				sinking: false,
				opacity: 1,
			});
		}
	}

	private spawnPlatform(state: LavaState): void {
		const w =
			PLATFORM_MIN_W + Math.random() * (PLATFORM_MAX_W - PLATFORM_MIN_W);
		const fromLeft = Math.random() < 0.5;
		const x = fromLeft ? -w - 10 : state.canvasW + 10;
		// Platforms spawn in the upper 60% of the screen
		const minY = state.canvasH * 0.15;
		const maxY = state.lavaY - 60;
		const y = minY + Math.random() * (maxY - minY);

		const plat: Platform = {
			x,
			y,
			w,
			sinkTimer: SINK_DELAY,
			sunk: false,
			sinking: false,
			opacity: 1,
		};

		state.platforms.push(plat);

		// Slide platform in from the side
		const targetX = fromLeft
			? 20 + Math.random() * (state.canvasW * 0.4)
			: state.canvasW * 0.4 + Math.random() * (state.canvasW * 0.5 - w);

		this.animatePlatformIn(plat, targetX, fromLeft);
	}

	private animatePlatformIn(
		plat: Platform,
		targetX: number,
		fromLeft: boolean,
	): void {
		const speed = 0.15;
		const step = () => {
			if (fromLeft) {
				plat.x += speed * 16;

				if (plat.x < targetX) {
					requestAnimationFrame(step);
				} else {
					plat.x = targetX;
				}
			} else {
				plat.x -= speed * 16;

				if (plat.x > targetX) {
					requestAnimationFrame(step);
				} else {
					plat.x = targetX;
				}
			}
		};

		requestAnimationFrame(step);
	}
}
