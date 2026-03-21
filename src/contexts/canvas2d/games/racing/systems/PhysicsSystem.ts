import type { Updatable } from "@core/Updatable";
import type { RacingState, Car } from "../types";
import {
	MAX_SPEED,
	ACCELERATION,
	BRAKE_FORCE,
	FRICTION,
	STEER_SPEED,
	MIN_STEER_SPEED_FACTOR,
	DRIFT_FACTOR,
	SKID_MARK_MAX,
} from "../types";
import type { RacingInput } from "./InputSystem";

export class PhysicsSystem implements Updatable<RacingState> {
	private input: RacingInput;

	constructor(input: RacingInput) {
		this.input = input;
	}

	update(state: RacingState, dt: number): void {
		if (state.phase !== "racing" || state.paused) return;

		this.updateCar(state.player, dt, true);
	}

	updateCar(car: Car, dt: number, useInput: boolean): void {
		const secs = dt / 1000;

		if (useInput) {
			// Acceleration / braking
			if (this.input.up) {
				car.speed += ACCELERATION * secs;
			} else if (this.input.down) {
				car.speed -= BRAKE_FORCE * secs;
			} else {
				// Natural friction
				car.speed -= FRICTION * secs;
			}

			// Steering (less effective at high speed)
			const speedRatio = Math.abs(car.speed) / MAX_SPEED;
			const steerFactor = 1 - speedRatio * (1 - MIN_STEER_SPEED_FACTOR);
			const steer = STEER_SPEED * steerFactor * secs;

			if (this.input.left) car.angle -= steer;

			if (this.input.right) car.angle += steer;

			// Drift: at high speed + turning, add skid marks
			if (
				Math.abs(car.speed) > MAX_SPEED * 0.5 &&
				(this.input.left || this.input.right)
			) {
				car.speed *= Math.pow(DRIFT_FACTOR, secs * 60);
				car.skidMarks.push({ x: car.x, y: car.y, alpha: 0.6 });

				if (car.skidMarks.length > SKID_MARK_MAX) {
					car.skidMarks.shift();
				}
			}
		}

		// Clamp speed
		car.speed = Math.max(-MAX_SPEED * 0.3, Math.min(MAX_SPEED, car.speed));

		if (Math.abs(car.speed) < 2) car.speed = 0;

		// Move
		car.x += Math.cos(car.angle) * car.speed * secs;
		car.y += Math.sin(car.angle) * car.speed * secs;

		// Fade skid marks
		for (let i = car.skidMarks.length - 1; i >= 0; i--) {
			car.skidMarks[i].alpha -= secs * 0.3;

			if (car.skidMarks[i].alpha <= 0) {
				car.skidMarks.splice(i, 1);
			}
		}
	}
}
