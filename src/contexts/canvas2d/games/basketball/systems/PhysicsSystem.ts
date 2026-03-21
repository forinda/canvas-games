import type { Updatable } from "@core/Updatable";
import type { BasketballState } from "../types";
import {
	GRAVITY,
	BALL_RADIUS,
	BOUNCE_DAMPING,
	ROTATION_SPEED,
	RIM_THICKNESS,
} from "../types";

export class PhysicsSystem implements Updatable<BasketballState> {
	update(state: BasketballState, dt: number): void {
		const ball = state.ball;

		if (!ball.inFlight) return;

		// Apply gravity
		ball.vy += GRAVITY * dt;

		// Update position
		ball.x += ball.vx * dt;
		ball.y += ball.vy * dt;

		// Rotation based on horizontal velocity
		ball.rotation += ball.vx * ROTATION_SPEED * dt;

		// Wall bounces
		if (ball.x - BALL_RADIUS < 0) {
			ball.x = BALL_RADIUS;
			ball.vx = Math.abs(ball.vx) * BOUNCE_DAMPING;
		}

		if (ball.x + BALL_RADIUS > state.canvasW) {
			ball.x = state.canvasW - BALL_RADIUS;
			ball.vx = -Math.abs(ball.vx) * BOUNCE_DAMPING;
		}

		// Ceiling bounce
		if (ball.y - BALL_RADIUS < 0) {
			ball.y = BALL_RADIUS;
			ball.vy = Math.abs(ball.vy) * BOUNCE_DAMPING;
		}

		// Floor bounce and stop
		if (ball.y + BALL_RADIUS > state.canvasH) {
			ball.y = state.canvasH - BALL_RADIUS;
			ball.vy = -Math.abs(ball.vy) * BOUNCE_DAMPING;
			ball.vx *= 0.85;

			// Stop if barely bouncing
			if (Math.abs(ball.vy) < 30) {
				ball.vy = 0;
				ball.vx *= 0.9;
			}

			// Ball has come to rest
			if (Math.abs(ball.vx) < 5 && Math.abs(ball.vy) < 5) {
				ball.vx = 0;
				ball.vy = 0;
			}
		}

		// Backboard collision
		this.checkBackboardCollision(state);

		// Rim collision
		this.checkRimCollision(state);
	}

	private checkBackboardCollision(state: BasketballState): void {
		const ball = state.ball;
		const hoop = state.hoop;

		const bbLeft = hoop.x + hoop.rimWidth / 2;
		const bbRight = bbLeft + hoop.backboardWidth;
		const bbTop = hoop.y - hoop.backboardHeight / 2;
		const bbBottom = hoop.y + hoop.backboardHeight / 2;

		// Check if ball hits the backboard
		if (
			ball.x + BALL_RADIUS > bbLeft &&
			ball.x - BALL_RADIUS < bbRight &&
			ball.y + BALL_RADIUS > bbTop &&
			ball.y - BALL_RADIUS < bbBottom
		) {
			// Bounce off left face of backboard
			if (ball.vx > 0) {
				ball.x = bbLeft - BALL_RADIUS;
				ball.vx = -Math.abs(ball.vx) * BOUNCE_DAMPING;
			}
		}
	}

	private checkRimCollision(state: BasketballState): void {
		const ball = state.ball;
		const hoop = state.hoop;

		// Left rim point
		const leftRimX = hoop.x - hoop.rimWidth / 2;
		const leftRimY = hoop.y;

		// Right rim point
		const rightRimX = hoop.x + hoop.rimWidth / 2;
		const rightRimY = hoop.y;

		this.bounceOffPoint(ball, leftRimX, leftRimY, RIM_THICKNESS);
		this.bounceOffPoint(ball, rightRimX, rightRimY, RIM_THICKNESS);
	}

	private bounceOffPoint(
		ball: BasketballState["ball"],
		px: number,
		py: number,
		radius: number,
	): void {
		const dx = ball.x - px;
		const dy = ball.y - py;
		const dist = Math.sqrt(dx * dx + dy * dy);
		const minDist = BALL_RADIUS + radius;

		if (dist < minDist && dist > 0) {
			// Normalize
			const nx = dx / dist;
			const ny = dy / dist;

			// Push ball out
			ball.x = px + nx * minDist;
			ball.y = py + ny * minDist;

			// Reflect velocity
			const dot = ball.vx * nx + ball.vy * ny;

			ball.vx -= 2 * dot * nx;
			ball.vy -= 2 * dot * ny;

			// Dampen
			ball.vx *= BOUNCE_DAMPING;
			ball.vy *= BOUNCE_DAMPING;
		}
	}
}
