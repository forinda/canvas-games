import type { Updatable } from "@core/Updatable";
import type { PongState } from "../types";
import { PADDLE_HEIGHT, PADDLE_SPEED } from "../types";

/**
 * AI opponent that tracks the ball's Y position with slight delay and error.
 * Only active when mode === 'ai'.
 */
export class AISystem implements Updatable<PongState> {
	/** Reaction delay factor (0 = instant, higher = slower reaction) */
	private readonly reactionSpeed = 0.07;
	/** Random offset to simulate imperfect play (-1 to 1) */
	private targetOffset = 0;
	/** Time accumulator for refreshing random offset */
	private offsetTimer = 0;

	update(state: PongState, dt: number): void {
		if (state.mode !== "ai") return;

		const paddle = state.rightPaddle;
		const ball = state.ball;

		// Refresh random error every ~0.5 seconds
		this.offsetTimer += dt;

		if (this.offsetTimer > 0.5) {
			this.offsetTimer = 0;
			this.targetOffset = (Math.random() - 0.5) * PADDLE_HEIGHT * 0.35;
		}

		// Target: ball Y + offset, centered on paddle
		const paddleCenter = paddle.y + PADDLE_HEIGHT / 2;
		const target = ball.y + this.targetOffset;
		const diff = target - paddleCenter;

		// Smooth tracking with clamped speed
		const ease = this.reactionSpeed;
		const desiredDy = diff / (dt + ease);

		paddle.dy = Math.max(-PADDLE_SPEED, Math.min(PADDLE_SPEED, desiredDy));
	}
}
