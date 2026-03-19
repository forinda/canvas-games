import type { Updatable } from "@shared/Updatable";
import type { DoodleState, Platform, PlatformType } from "../types";
import {
	PLATFORM_COUNT,
	PLATFORM_WIDTH,
	PLATFORM_HEIGHT,
	MOVING_SPEED,
} from "../types";

export class PlatformSystem implements Updatable<DoodleState> {
	update(state: DoodleState, dt: number): void {
		if (state.phase !== "playing") return;

		const p = state.player;

		// Scroll camera up when player rises above mid-screen
		const midY = state.cameraY + state.canvasH * 0.4;

		if (p.y < midY) {
			const diff = midY - p.y;

			state.cameraY -= diff;

			// Track max height for score
			const height = -state.cameraY;

			if (height > state.maxHeight) {
				state.maxHeight = height;
				state.score = Math.floor(state.maxHeight / 10);
			}
		}

		// Update moving platforms
		for (const plat of state.platforms) {
			if (plat.type === "moving") {
				plat.x += plat.moveVx * dt;

				if (plat.x <= plat.moveMinX || plat.x + plat.width >= plat.moveMaxX) {
					plat.moveVx = -plat.moveVx;
				}
			}

			// Animate broken platforms falling
			if (plat.broken) {
				plat.breakVy += 0.001 * dt;
				plat.y += plat.breakVy * dt;
			}

			// Decay spring timer
			if (plat.springTimer > 0) {
				plat.springTimer = Math.max(0, plat.springTimer - dt);
			}
		}

		// Remove platforms that fall below camera
		const bottomEdge = state.cameraY + state.canvasH + 50;

		state.platforms = state.platforms.filter((pl) => pl.y < bottomEdge);

		// Generate new platforms above camera
		while (state.platforms.length < PLATFORM_COUNT) {
			const highestY = this.getHighestPlatformY(state);
			const gap = 40 + Math.random() * (state.canvasH / (PLATFORM_COUNT * 0.8));
			const newY = highestY - gap;
			const newPlat = this.createPlatform(newY, state.canvasW, state.score);

			state.platforms.push(newPlat);
		}
	}

	/** Generate the initial set of platforms for a new game */
	generateInitial(canvasW: number, canvasH: number): Platform[] {
		const platforms: Platform[] = [];
		const gap = canvasH / PLATFORM_COUNT;

		for (let i = 0; i < PLATFORM_COUNT; i++) {
			const y = canvasH - (i + 1) * gap;

			// First platform is always normal and centered under the player
			if (i === 0) {
				platforms.push({
					x: canvasW / 2 - PLATFORM_WIDTH / 2,
					y: canvasH - 80,
					width: PLATFORM_WIDTH,
					height: PLATFORM_HEIGHT,
					type: "normal",
					moveVx: 0,
					moveMinX: 0,
					moveMaxX: canvasW,
					broken: false,
					breakVy: 0,
					springTimer: 0,
				});
			} else {
				platforms.push(this.createPlatform(y, canvasW, 0));
			}
		}

		return platforms;
	}

	private getHighestPlatformY(state: DoodleState): number {
		let highest = state.cameraY + state.canvasH;

		for (const p of state.platforms) {
			if (p.y < highest) {
				highest = p.y;
			}
		}

		return highest;
	}

	private createPlatform(y: number, canvasW: number, score: number): Platform {
		const x = Math.random() * (canvasW - PLATFORM_WIDTH);
		const type = this.randomType(score);

		const moveVx =
			type === "moving"
				? Math.random() > 0.5
					? MOVING_SPEED
					: -MOVING_SPEED
				: 0;
		const moveMinX = 0;
		const moveMaxX = canvasW;

		return {
			x,
			y,
			width: PLATFORM_WIDTH,
			height: PLATFORM_HEIGHT,
			type,
			moveVx,
			moveMinX,
			moveMaxX,
			broken: false,
			breakVy: 0,
			springTimer: 0,
		};
	}

	private randomType(score: number): PlatformType {
		const r = Math.random();
		// As score increases, more special platforms
		const difficulty = Math.min(score / 500, 1);

		if (r < 0.55 - difficulty * 0.2) return "normal";

		if (r < 0.75) return "moving";

		if (r < 0.9) return "breaking";

		return "spring";
	}
}
