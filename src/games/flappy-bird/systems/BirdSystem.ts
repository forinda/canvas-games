import type { Updatable } from "@shared/Updatable";
import type { FlappyState } from "../types";
import { GRAVITY, TERMINAL_VELOCITY } from "../types";

export class BirdSystem implements Updatable<FlappyState> {
	update(state: FlappyState, dt: number): void {
		if (state.phase !== "playing") {
			// Idle bobbing animation
			if (state.phase === "idle") {
				state.bird.y =
					state.canvasH * 0.42 + Math.sin(performance.now() * 0.003) * 8;
				state.bird.rotation = 0;
			}

			// Animate wing even when idle
			this.animateWing(state, dt);

			return;
		}

		const bird = state.bird;

		// Apply gravity
		bird.velocity += GRAVITY * dt;

		if (bird.velocity > TERMINAL_VELOCITY) {
			bird.velocity = TERMINAL_VELOCITY;
		}

		// Update position
		bird.y += bird.velocity * dt;

		// Rotation: map velocity to angle
		// Flapping up → nose up (negative angle), falling → nose down (positive)
		const targetRotation = this.velocityToRotation(bird.velocity);

		// Smooth rotation interpolation
		bird.rotation += (targetRotation - bird.rotation) * 0.1;

		// Wing animation
		this.animateWing(state, dt);
	}

	private velocityToRotation(velocity: number): number {
		// Map velocity range [-0.42, 0.7] to rotation range [-30deg, 90deg]
		if (velocity < 0) {
			// Going up: rotate nose up (max -30 degrees)
			return Math.max(velocity * 70, -30) * (Math.PI / 180);
		}

		// Going down: rotate nose down (max 90 degrees)
		return Math.min(velocity * 130, 90) * (Math.PI / 180);
	}

	private animateWing(state: FlappyState, _dt: number): void {
		const bird = state.bird;

		bird.wingAngle += bird.wingDir * 0.15;

		if (bird.wingAngle > 1) bird.wingDir = -1;

		if (bird.wingAngle < -1) bird.wingDir = 1;
	}
}
