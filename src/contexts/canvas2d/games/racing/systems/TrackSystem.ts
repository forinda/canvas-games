import type { Updatable } from "@core/Updatable";
import type { RacingState, Car, TrackDefinition } from "../types";
import { OFF_TRACK_FRICTION, OFF_TRACK_MAX_SPEED } from "../types";

export class TrackSystem implements Updatable<RacingState> {
	update(state: RacingState, dt: number): void {
		if (state.phase !== "racing" || state.paused) return;

		const secs = dt / 1000;
		const allCars = [state.player, ...state.aiCars];

		for (const car of allCars) {
			if (car.finished) continue;

			// Off-track slowdown
			if (!this.isOnTrack(car, state.track)) {
				car.speed -= OFF_TRACK_FRICTION * secs * Math.sign(car.speed || 1);

				if (Math.abs(car.speed) > OFF_TRACK_MAX_SPEED) {
					car.speed = OFF_TRACK_MAX_SPEED * Math.sign(car.speed);
				}
			}

			// Checkpoint / lap detection
			this.checkLap(car, state);
		}

		// Sort positions
		this.updatePositions(state);
	}

	/** Check if car is within road width of any track segment */
	isOnTrack(car: Car, track: TrackDefinition): boolean {
		const wp = track.waypoints;
		const halfW = track.roadWidth / 2;

		for (let i = 0; i < wp.length; i++) {
			const a = wp[i];
			const b = wp[(i + 1) % wp.length];
			const dist = this.pointToSegmentDist(car.x, car.y, a.x, a.y, b.x, b.y);

			if (dist < halfW) return true;
		}

		return false;
	}

	private checkLap(car: Car, state: RacingState): void {
		const wp = state.track.waypoints;
		const nextCP = (car.lastCheckpoint + 1) % wp.length;
		const target = wp[nextCP];
		const dx = car.x - target.x;
		const dy = car.y - target.y;
		const dist = Math.sqrt(dx * dx + dy * dy);

		if (dist < state.track.roadWidth * 0.8) {
			car.lastCheckpoint = nextCP;

			// If we've crossed checkpoint 0 and visited enough checkpoints, count a lap
			if (nextCP === 0 && car.laps >= 0) {
				car.laps++;

				if (car.laps >= state.totalLaps) {
					car.finished = true;
					car.finishTime = state.raceTime;
				}
			}
		}
	}

	private updatePositions(state: RacingState): void {
		const allCars = [state.player, ...state.aiCars];

		allCars.sort((a, b) => {
			// Finished cars first, by finish time
			if (a.finished && b.finished) return a.finishTime - b.finishTime;

			if (a.finished) return -1;

			if (b.finished) return 1;

			// More laps = better position
			if (b.laps !== a.laps) return b.laps - a.laps;

			// More checkpoints = better
			if (b.lastCheckpoint !== a.lastCheckpoint)
				return b.lastCheckpoint - a.lastCheckpoint;

			// Closer to next checkpoint = better
			const wp = state.track.waypoints;
			const aNext = wp[(a.lastCheckpoint + 1) % wp.length];
			const bNext = wp[(b.lastCheckpoint + 1) % wp.length];
			const aDist = Math.hypot(a.x - aNext.x, a.y - aNext.y);
			const bDist = Math.hypot(b.x - bNext.x, b.y - bNext.y);

			return aDist - bDist;
		});
		state.positions = allCars;

		// Check if player finished -> end race
		if (state.player.finished) {
			state.phase = "finished";
		}

		// Also end if all AI finished (player is last)
		if (state.aiCars.every((c) => c.finished) && !state.player.finished) {
			// Let player keep racing until they finish too
		}
	}

	private pointToSegmentDist(
		px: number,
		py: number,
		ax: number,
		ay: number,
		bx: number,
		by: number,
	): number {
		const abx = bx - ax;
		const aby = by - ay;
		const apx = px - ax;
		const apy = py - ay;
		const ab2 = abx * abx + aby * aby;

		if (ab2 === 0) return Math.hypot(apx, apy);

		let t = (apx * abx + apy * aby) / ab2;

		t = Math.max(0, Math.min(1, t));
		const cx = ax + t * abx;
		const cy = ay + t * aby;

		return Math.hypot(px - cx, py - cy);
	}

	/** Get closest waypoint index for a position */
	getClosestWaypoint(x: number, y: number, track: TrackDefinition): number {
		let best = 0;
		let bestDist = Infinity;

		for (let i = 0; i < track.waypoints.length; i++) {
			const w = track.waypoints[i];
			const d = Math.hypot(x - w.x, y - w.y);

			if (d < bestDist) {
				bestDist = d;
				best = i;
			}
		}

		return best;
	}
}
