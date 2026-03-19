import type { Updatable } from "@shared/Updatable";
import type { PongState } from "../types";
import {
	BALL_SPEED_INCREMENT,
	BALL_MAX_SPEED,
	PADDLE_HEIGHT,
	PADDLE_WIDTH,
} from "../types";

export class PhysicsSystem implements Updatable<PongState> {
	update(state: PongState, dt: number): void {
		this.movePaddles(state, dt);
		this.moveBall(state, dt);
		this.wallBounce(state);
		this.paddleCollision(state);
		this.updateTrail(state);
	}

	// ── Private ──────────────────────────────────────────────────────────────

	private movePaddles(s: PongState, dt: number): void {
		const minY = 0;
		const maxY = s.canvasH - PADDLE_HEIGHT;

		s.leftPaddle.y = Math.max(
			minY,
			Math.min(maxY, s.leftPaddle.y + s.leftPaddle.dy * dt),
		);
		s.rightPaddle.y = Math.max(
			minY,
			Math.min(maxY, s.rightPaddle.y + s.rightPaddle.dy * dt),
		);
	}

	private moveBall(s: PongState, dt: number): void {
		s.ball.x += s.ball.vx * dt;
		s.ball.y += s.ball.vy * dt;
	}

	private wallBounce(s: PongState): void {
		const b = s.ball;

		// Top wall
		if (b.y - b.radius <= 0) {
			b.y = b.radius;
			b.vy = Math.abs(b.vy);
		}

		// Bottom wall
		if (b.y + b.radius >= s.canvasH) {
			b.y = s.canvasH - b.radius;
			b.vy = -Math.abs(b.vy);
		}
	}

	private paddleCollision(s: PongState): void {
		const b = s.ball;

		// Left paddle
		const lp = s.leftPaddle;

		if (
			b.vx < 0 &&
			b.x - b.radius <= lp.x + lp.w &&
			b.x - b.radius >= lp.x &&
			b.y >= lp.y &&
			b.y <= lp.y + lp.h
		) {
			this.deflect(b, lp, 1, s);
		}

		// Right paddle
		const rp = s.rightPaddle;

		if (
			b.vx > 0 &&
			b.x + b.radius >= rp.x &&
			b.x + b.radius <= rp.x + PADDLE_WIDTH &&
			b.y >= rp.y &&
			b.y <= rp.y + rp.h
		) {
			this.deflect(b, rp, -1, s);
		}
	}

	/** Deflect ball off paddle with angle based on hit position */
	private deflect(
		b: PongState["ball"],
		paddle: PongState["leftPaddle"],
		dirX: number,
		s: PongState,
	): void {
		// Hit position: -1 (top) to +1 (bottom)
		const hitPos = ((b.y - paddle.y) / paddle.h) * 2 - 1;
		// Max bounce angle: 60 degrees
		const angle = hitPos * (Math.PI / 3);

		// Speed up after each rally hit
		s.rallyHits++;
		b.speed = Math.min(b.speed + BALL_SPEED_INCREMENT, BALL_MAX_SPEED);

		b.vx = dirX * Math.cos(angle) * b.speed;
		b.vy = Math.sin(angle) * b.speed;

		// Push ball out of paddle to avoid double-hit
		if (dirX > 0) {
			b.x = paddle.x + PADDLE_WIDTH + b.radius + 1;
		} else {
			b.x = paddle.x - b.radius - 1;
		}
	}

	private updateTrail(s: PongState): void {
		const b = s.ball;

		// Add current position to trail
		b.trail.unshift({ x: b.x, y: b.y, alpha: 0.6 });

		// Fade and trim
		for (let i = b.trail.length - 1; i >= 0; i--) {
			b.trail[i].alpha -= 0.06;

			if (b.trail[i].alpha <= 0) {
				b.trail.splice(i, 1);
			}
		}
	}
}
