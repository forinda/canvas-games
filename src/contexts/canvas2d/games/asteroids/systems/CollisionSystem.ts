import type { Updatable } from "@core/Updatable";
import type { AsteroidsState, Particle, AsteroidSize } from "../types";
import {
	SHIP_RADIUS,
	INVULN_DURATION,
	ASTEROID_SCORES,
	ASTEROID_SPEEDS,
	HS_KEY,
} from "../types";
import { AsteroidSystem } from "./AsteroidSystem";

export class CollisionSystem implements Updatable<AsteroidsState> {
	update(state: AsteroidsState, _dt: number): void {
		if (!state.started || state.paused || state.gameOver) return;

		this.checkBulletAsteroid(state);
		this.checkShipAsteroid(state);
	}

	private checkBulletAsteroid(state: AsteroidsState): void {
		for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
			const b = state.bullets[bi];

			for (let ai = state.asteroids.length - 1; ai >= 0; ai--) {
				const a = state.asteroids[ai];
				const dx = b.pos.x - a.pos.x;
				const dy = b.pos.y - a.pos.y;

				if (dx * dx + dy * dy < a.radius * a.radius) {
					// Remove bullet
					state.bullets.splice(bi, 1);
					// Score
					state.score += ASTEROID_SCORES[a.size];

					if (state.score > state.highScore) {
						state.highScore = state.score;

						try {
							localStorage.setItem(HS_KEY, String(state.highScore));
						} catch {
							/* noop */
						}
					}

					// Spawn particles
					this.spawnExplosion(state, a.pos.x, a.pos.y, a.radius);
					// Split asteroid
					this.splitAsteroid(state, ai);
					break; // bullet consumed
				}
			}
		}
	}

	private checkShipAsteroid(state: AsteroidsState): void {
		const now = performance.now();

		if (now < state.invulnUntil) return;

		const ship = state.ship;

		for (let ai = state.asteroids.length - 1; ai >= 0; ai--) {
			const a = state.asteroids[ai];
			const dx = ship.pos.x - a.pos.x;
			const dy = ship.pos.y - a.pos.y;
			const dist = Math.sqrt(dx * dx + dy * dy);

			if (dist < SHIP_RADIUS + a.radius * 0.7) {
				// Ship hit
				state.lives--;
				this.spawnExplosion(state, ship.pos.x, ship.pos.y, 20);

				if (state.lives <= 0) {
					state.gameOver = true;
				} else {
					// Respawn ship in center
					ship.pos.x = state.width / 2;
					ship.pos.y = state.height / 2;
					ship.vel.x = 0;
					ship.vel.y = 0;
					ship.angle = 0;
					state.invulnUntil = performance.now() + INVULN_DURATION;
				}

				return;
			}
		}
	}

	private splitAsteroid(state: AsteroidsState, index: number): void {
		const a = state.asteroids[index];

		state.asteroids.splice(index, 1);

		const nextSize: Record<AsteroidSize, AsteroidSize | null> = {
			large: "medium",
			medium: "small",
			small: null,
		};
		const ns = nextSize[a.size];

		if (!ns) return;

		for (let i = 0; i < 2; i++) {
			const angle = Math.random() * Math.PI * 2;
			const speed = ASTEROID_SPEEDS[ns] * (0.8 + Math.random() * 0.4);

			state.asteroids.push(
				AsteroidSystem.createAsteroid(
					a.pos.x,
					a.pos.y,
					Math.cos(angle) * speed,
					Math.sin(angle) * speed,
					ns,
				),
			);
		}
	}

	private spawnExplosion(
		state: AsteroidsState,
		x: number,
		y: number,
		size: number,
	): void {
		const count = Math.floor(size * 0.8);
		const colors = ["#fff", "#ffa", "#f84", "#f44", "#aaa"];

		for (let i = 0; i < count; i++) {
			const angle = Math.random() * Math.PI * 2;
			const speed = 0.5 + Math.random() * 3;
			const life = 15 + Math.floor(Math.random() * 25);
			const p: Particle = {
				pos: { x, y },
				vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
				life,
				maxLife: life,
				radius: 1 + Math.random() * 2,
				color: colors[Math.floor(Math.random() * colors.length)],
			};

			state.particles.push(p);
		}
	}
}
