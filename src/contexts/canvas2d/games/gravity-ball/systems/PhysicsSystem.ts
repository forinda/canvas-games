import type { Updatable } from "@core/Updatable";
import type { GravityState, GravityDir, Pos } from "../types";
import { SLIDE_SPEED, MAX_TRAIL } from "../types";

export class PhysicsSystem implements Updatable<GravityState> {
	update(state: GravityState, dt: number): void {
		// If level is complete or game won, skip physics
		if (state.levelComplete || state.gameWon) return;

		// Process queued gravity change
		if (state.queuedGravity !== null && !state.sliding) {
			state.gravity = state.queuedGravity;
			state.queuedGravity = null;
			state.moves += 1;

			// Calculate slide target
			const target = this.findSlideTarget(state, state.ball.pos, state.gravity);

			if (target.x !== state.ball.pos.x || target.y !== state.ball.pos.y) {
				state.sliding = true;
				state.slideProgress = 0;
				state.slideFrom = { x: state.ball.pos.x, y: state.ball.pos.y };
				state.slideTo = { x: target.x, y: target.y };
			}
		}

		// Animate slide
		if (state.sliding) {
			const dx = state.slideTo.x - state.slideFrom.x;
			const dy = state.slideTo.y - state.slideFrom.y;
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (distance === 0) {
				state.sliding = false;

				return;
			}

			const duration = distance / SLIDE_SPEED;

			state.slideProgress += dt / duration;

			if (state.slideProgress >= 1) {
				state.slideProgress = 1;
				state.sliding = false;

				// Add trail positions along the path
				this.addTrailAlongPath(state);

				// Snap ball to final position
				state.ball.pos.x = state.slideTo.x;
				state.ball.pos.y = state.slideTo.y;
			}
		}
	}

	private findSlideTarget(
		state: GravityState,
		from: Pos,
		dir: GravityDir,
	): Pos {
		let dx = 0;
		let dy = 0;

		switch (dir) {
			case "up":
				dy = -1;
				break;
			case "down":
				dy = 1;
				break;
			case "left":
				dx = -1;
				break;
			case "right":
				dx = 1;
				break;
		}

		let cx = from.x;
		let cy = from.y;

		while (true) {
			const nx = cx + dx;
			const ny = cy + dy;

			// Check bounds
			if (nx < 0 || nx >= state.gridWidth || ny < 0 || ny >= state.gridHeight) {
				break;
			}

			// Check wall collision
			if (state.wallSet.has(`${nx},${ny}`)) {
				break;
			}

			cx = nx;
			cy = ny;
		}

		return { x: cx, y: cy };
	}

	private addTrailAlongPath(state: GravityState): void {
		const sx = state.slideFrom.x;
		const sy = state.slideFrom.y;
		const ex = state.slideTo.x;
		const ey = state.slideTo.y;

		const dx = Math.sign(ex - sx);
		const dy = Math.sign(ey - sy);

		let cx = sx;
		let cy = sy;

		while (cx !== ex || cy !== ey) {
			state.ball.trail.push({ x: cx, y: cy });
			cx += dx;
			cy += dy;
		}

		// Trim trail
		while (state.ball.trail.length > MAX_TRAIL) {
			state.ball.trail.shift();
		}
	}
}
