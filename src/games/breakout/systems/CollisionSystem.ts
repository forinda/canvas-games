import type { Updatable } from "@shared/Updatable";
import type { BreakoutState, Ball, Brick } from "../types";
import { POWERUP_DROP_CHANCE, POWERUP_SIZE, POWERUP_SPEED } from "../types";
import type { PowerupType } from "../types";

export class CollisionSystem implements Updatable<BreakoutState> {
	update(state: BreakoutState, _dt: number): void {
		this.ballPaddleCollision(state);
		this.ballBrickCollision(state);
		this.powerupPaddleCollision(state);
	}

	private ballPaddleCollision(state: BreakoutState): void {
		const { paddle } = state;

		for (const ball of state.balls) {
			if (
				ball.vy > 0 &&
				ball.y + ball.r >= paddle.y &&
				ball.y + ball.r <= paddle.y + paddle.h + 4 &&
				ball.x >= paddle.x &&
				ball.x <= paddle.x + paddle.w
			) {
				// Reflect based on where ball hit the paddle (-1 left edge, +1 right edge)
				const hitPos = (ball.x - paddle.x) / paddle.w; // 0..1
				const angle = -Math.PI / 2 + (hitPos - 0.5) * (Math.PI * 0.7);
				const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

				ball.vx = Math.cos(angle) * speed;
				ball.vy = Math.sin(angle) * speed;
				ball.y = paddle.y - ball.r;
			}
		}
	}

	private ballBrickCollision(state: BreakoutState): void {
		for (const ball of state.balls) {
			for (const brick of state.bricks) {
				if (!brick.alive) continue;

				if (this.circleRectCollision(ball, brick)) {
					this.resolveBrickHit(ball, brick, state);
				}
			}
		}
	}

	private circleRectCollision(
		ball: Ball,
		rect: { x: number; y: number; w: number; h: number },
	): boolean {
		const closestX = Math.max(rect.x, Math.min(ball.x, rect.x + rect.w));
		const closestY = Math.max(rect.y, Math.min(ball.y, rect.y + rect.h));
		const dx = ball.x - closestX;
		const dy = ball.y - closestY;

		return dx * dx + dy * dy < ball.r * ball.r;
	}

	private resolveBrickHit(
		ball: Ball,
		brick: Brick,
		state: BreakoutState,
	): void {
		// Determine which side was hit
		const overlapLeft = ball.x + ball.r - brick.x;
		const overlapRight = brick.x + brick.w - (ball.x - ball.r);
		const overlapTop = ball.y + ball.r - brick.y;
		const overlapBottom = brick.y + brick.h - (ball.y - ball.r);

		const minOverlapX = Math.min(overlapLeft, overlapRight);
		const minOverlapY = Math.min(overlapTop, overlapBottom);

		if (minOverlapX < minOverlapY) {
			ball.vx = -ball.vx;
		} else {
			ball.vy = -ball.vy;
		}

		// Damage brick
		brick.hp--;

		if (brick.hp <= 0) {
			brick.alive = false;
			state.score += brick.maxHp * 10;
			this.maybeSpawnPowerup(brick, state);
		} else {
			state.score += 5;
		}
	}

	private maybeSpawnPowerup(brick: Brick, state: BreakoutState): void {
		if (Math.random() > POWERUP_DROP_CHANCE) return;

		const types: PowerupType[] = ["wide", "multiball", "slow"];
		const type = types[Math.floor(Math.random() * types.length)];

		state.powerups.push({
			x: brick.x + brick.w / 2 - POWERUP_SIZE / 2,
			y: brick.y + brick.h,
			w: POWERUP_SIZE,
			h: POWERUP_SIZE,
			vy: POWERUP_SPEED,
			type,
			alive: true,
		});
	}

	private powerupPaddleCollision(state: BreakoutState): void {
		const { paddle } = state;

		for (const p of state.powerups) {
			if (!p.alive) continue;

			if (
				p.x + p.w >= paddle.x &&
				p.x <= paddle.x + paddle.w &&
				p.y + p.h >= paddle.y &&
				p.y <= paddle.y + paddle.h
			) {
				p.alive = false;
				// Signal powerup collection — the PowerupSystem handles effects
				// We store collected type on the powerup system via state effects
				state.effects.push({ type: p.type, remaining: 8000 });
			}
		}
	}
}
