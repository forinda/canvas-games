import type { Updatable } from "@shared/Updatable";
import type { BasketballState } from "../types";
import { BALL_RADIUS, NET_HEIGHT } from "../types";

export class ScoreSystem implements Updatable<BasketballState> {
	update(state: BasketballState, dt: number): void {
		if (state.phase !== "playing") return;

		// Update shot clock
		state.shotClock -= dt;

		if (state.shotClock <= 0) {
			state.shotClock = 0;
			state.phase = "gameover";

			return;
		}

		// Detect scoring: ball passes through the hoop net zone
		this.detectScore(state);

		// Reset ball if it comes to rest on the floor
		this.checkBallReset(state);

		// Fade swish display
		if (state.showSwish && performance.now() - state.lastScoredTime > 1000) {
			state.showSwish = false;
		}
	}

	private detectScore(state: BasketballState): void {
		const ball = state.ball;
		const hoop = state.hoop;

		if (!ball.inFlight) return;

		if (state.madeShot) return;

		const rimLeft = hoop.x - hoop.rimWidth / 2 + BALL_RADIUS;
		const rimRight = hoop.x + hoop.rimWidth / 2 - BALL_RADIUS;
		const netTop = hoop.y;
		const netBottom = hoop.y + NET_HEIGHT;

		// Ball must be within rim horizontally
		if (ball.x < rimLeft || ball.x > rimRight) {
			// Track if ball passed the rim level for resetting purposes
			if (ball.y > netBottom && ball.vy > 0) {
				state.ballPassedRim = true;
			}

			return;
		}

		// Ball is passing through the net zone going downward
		if (ball.y > netTop && ball.y < netBottom && ball.vy > 0) {
			if (!state.ballPassedRim) {
				state.madeShot = true;
				state.ballPassedRim = true;

				// Score
				state.streak += 1;
				const streakBonus = Math.min(state.streak - 1, 5);
				const points = 2 + streakBonus;

				state.score += points;

				// Update best score
				if (state.score > state.bestScore) {
					state.bestScore = state.score;
				}

				// Add time bonus
				state.shotClock = Math.min(state.shotClock + 5, state.shotClockMax);

				// Swish effect
				state.showSwish = true;
				state.lastScoredTime = performance.now();

				// Create swish particles
				this.createParticles(state);
			}
		}

		// Track if ball went below rim without scoring
		if (ball.y > netBottom && ball.vy > 0 && !state.madeShot) {
			state.ballPassedRim = true;
		}
	}

	private createParticles(state: BasketballState): void {
		const hoop = state.hoop;

		for (let i = 0; i < 15; i++) {
			const angle = (Math.PI * 2 * i) / 15;
			const speed = 80 + Math.random() * 120;

			state.particles.push({
				x: hoop.x,
				y: hoop.y + NET_HEIGHT / 2,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed - 50,
				life: 1.0,
				maxLife: 1.0,
				color: Math.random() > 0.5 ? "#ff7043" : "#ffab91",
				size: 3 + Math.random() * 4,
			});
		}
	}

	private checkBallReset(state: BasketballState): void {
		const ball = state.ball;

		if (!ball.inFlight) return;

		const isResting =
			Math.abs(ball.vx) < 5 &&
			Math.abs(ball.vy) < 5 &&
			ball.y + BALL_RADIUS >= state.canvasH - 2;

		const fellOffScreen = ball.y > state.canvasH + 100;

		if (isResting || fellOffScreen) {
			// If didn't make the shot, reset streak
			if (!state.madeShot) {
				state.streak = 0;
			}

			// Reset ball
			this.resetBallAndHoop(state);
		}
	}

	resetBallAndHoop(state: BasketballState): void {
		const ball = state.ball;

		// Place ball at bottom center area
		ball.x = state.canvasW * 0.3 + Math.random() * state.canvasW * 0.4;
		ball.y = state.canvasH - BALL_RADIUS - 40;
		ball.vx = 0;
		ball.vy = 0;
		ball.rotation = 0;
		ball.inFlight = false;

		// Move hoop to new random position
		const minX = state.canvasW * 0.25;
		const maxX = state.canvasW * 0.75;
		const minY = state.canvasH * 0.15;
		const maxY = state.canvasH * 0.45;

		state.hoop.x = minX + Math.random() * (maxX - minX);
		state.hoop.y = minY + Math.random() * (maxY - minY);

		state.madeShot = false;
		state.ballPassedRim = false;
	}
}
