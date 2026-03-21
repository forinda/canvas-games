import type { Updatable } from "@core/Updatable";
import type { ColorSwitchState } from "../types";
import { GRAVITY, TERMINAL_VELOCITY } from "../types";

export class PhysicsSystem implements Updatable<ColorSwitchState> {
	update(state: ColorSwitchState, dt: number): void {
		if (state.phase !== "playing") return;

		const ball = state.ball;

		// Apply gravity
		ball.velocity += GRAVITY * dt;

		if (ball.velocity > TERMINAL_VELOCITY) {
			ball.velocity = TERMINAL_VELOCITY;
		}

		// Update ball position
		ball.y += ball.velocity * dt;

		// Camera follows ball when it goes above center screen
		const targetCameraY = Math.min(0, state.canvasH * 0.5 - ball.y);

		// Smoothly follow
		state.cameraY += (targetCameraY - state.cameraY) * 0.08;

		// Scroll gates and switchers downward relative to camera
		// (They stay in world space; camera offset handles the view)

		// Death if ball falls below screen
		const screenBallY = ball.y + state.cameraY;

		if (screenBallY > state.canvasH + 50) {
			state.phase = "dead";
			state.flashTimer = 200;
			this.saveBest(state);
		}
	}

	private saveBest(state: ColorSwitchState): void {
		if (state.score > state.bestScore) {
			state.bestScore = state.score;

			try {
				localStorage.setItem("color_switch_highscore", String(state.bestScore));
			} catch {
				/* noop */
			}
		}
	}
}
