import type { Updatable } from "@shared/Updatable";
import type { RacingState, Car } from "../types";
import {
	MAX_SPEED,
	ACCELERATION,
	FRICTION,
	AI_SPEED_FACTOR_MIN,
	AI_SPEED_FACTOR_MAX,
	AI_STEER_SMOOTHING,
	AI_WAYPOINT_RADIUS,
	AI_VARIATION,
	SKID_MARK_MAX,
} from "../types";

interface AIData {
	speedFactor: number;
	waypointOffsetX: number;
	waypointOffsetY: number;
}

export class AISystem implements Updatable<RacingState> {
	private aiData: Map<Car, AIData> = new Map();

	initCar(car: Car): void {
		this.aiData.set(car, {
			speedFactor:
				AI_SPEED_FACTOR_MIN +
				Math.random() * (AI_SPEED_FACTOR_MAX - AI_SPEED_FACTOR_MIN),
			waypointOffsetX: (Math.random() - 0.5) * AI_VARIATION * 2,
			waypointOffsetY: (Math.random() - 0.5) * AI_VARIATION * 2,
		});
	}

	update(state: RacingState, dt: number): void {
		if (state.phase !== "racing" || state.paused) return;

		const secs = dt / 1000;

		for (const car of state.aiCars) {
			if (car.finished) continue;

			this.updateAICar(car, state, secs);
		}
	}

	private updateAICar(car: Car, state: RacingState, secs: number): void {
		const data = this.aiData.get(car);

		if (!data) return;

		const wp = state.track.waypoints;
		const target = wp[car.waypointIndex % wp.length];
		const tx = target.x + data.waypointOffsetX;
		const ty = target.y + data.waypointOffsetY;

		// Distance to target waypoint
		const dx = tx - car.x;
		const dy = ty - car.y;
		const dist = Math.hypot(dx, dy);

		// If close enough, advance to next waypoint
		if (dist < AI_WAYPOINT_RADIUS) {
			car.waypointIndex = (car.waypointIndex + 1) % wp.length;
			// Randomize offset for next waypoint
			data.waypointOffsetX = (Math.random() - 0.5) * AI_VARIATION * 2;
			data.waypointOffsetY = (Math.random() - 0.5) * AI_VARIATION * 2;
		}

		// Steer toward target
		const desiredAngle = Math.atan2(dy, dx);
		let angleDiff = desiredAngle - car.angle;

		// Normalize angle diff to [-PI, PI]
		while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;

		while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

		car.angle += angleDiff * AI_STEER_SMOOTHING * secs;

		// Accelerate (but limited by speed factor)
		const maxAISpeed = MAX_SPEED * data.speedFactor;

		if (car.speed < maxAISpeed) {
			car.speed += ACCELERATION * secs * 0.8;
		} else {
			car.speed -= FRICTION * secs;
		}

		// Slow down on sharp turns
		if (Math.abs(angleDiff) > 0.5) {
			car.speed *= Math.pow(0.95, secs * 60);
		}

		// Clamp
		car.speed = Math.max(0, Math.min(maxAISpeed, car.speed));

		// Move
		car.x += Math.cos(car.angle) * car.speed * secs;
		car.y += Math.sin(car.angle) * car.speed * secs;

		// Skid marks on sharp turns at speed
		if (Math.abs(angleDiff) > 0.4 && car.speed > maxAISpeed * 0.5) {
			car.skidMarks.push({ x: car.x, y: car.y, alpha: 0.4 });

			if (car.skidMarks.length > SKID_MARK_MAX) car.skidMarks.shift();
		}

		// Fade skid marks
		for (let i = car.skidMarks.length - 1; i >= 0; i--) {
			car.skidMarks[i].alpha -= secs * 0.3;

			if (car.skidMarks[i].alpha <= 0) car.skidMarks.splice(i, 1);
		}
	}
}
