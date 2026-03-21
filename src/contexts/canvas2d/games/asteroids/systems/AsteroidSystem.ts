import type { Updatable } from "@core/Updatable";
import type { AsteroidsState, Asteroid, AsteroidSize } from "../types";
import { ASTEROID_RADII, ASTEROID_SPEEDS } from "../types";

export class AsteroidSystem implements Updatable<AsteroidsState> {
	update(_state: AsteroidsState, _dt: number): void {
		// Asteroid movement is handled by PhysicsSystem.
		// This system provides static helpers for spawning/splitting.
	}

	/** Spawn asteroids at screen edges for a given wave */
	spawnWave(state: AsteroidsState, count: number): void {
		const { width, height } = state;

		for (let i = 0; i < count; i++) {
			// Pick a random edge position
			const edge = Math.floor(Math.random() * 4);
			let x: number, y: number;

			switch (edge) {
				case 0:
					x = 0;
					y = Math.random() * height;
					break; // left
				case 1:
					x = width;
					y = Math.random() * height;
					break; // right
				case 2:
					x = Math.random() * width;
					y = 0;
					break; // top
				default:
					x = Math.random() * width;
					y = height;
					break; // bottom
			}

			// Velocity aimed roughly toward center with randomness
			const angle =
				Math.atan2(height / 2 - y, width / 2 - x) + (Math.random() - 0.5) * 1.2;
			const speed = ASTEROID_SPEEDS.large * (0.6 + Math.random() * 0.6);

			state.asteroids.push(
				AsteroidSystem.createAsteroid(
					x,
					y,
					Math.cos(angle) * speed,
					Math.sin(angle) * speed,
					"large",
				),
			);
		}
	}

	static createAsteroid(
		x: number,
		y: number,
		vx: number,
		vy: number,
		size: AsteroidSize,
	): Asteroid {
		const vertices = 8 + Math.floor(Math.random() * 6);
		const offsets: number[] = [];

		for (let i = 0; i < vertices; i++) {
			offsets.push(0.7 + Math.random() * 0.6); // radius jitter 0.7-1.3
		}

		return {
			pos: { x, y },
			vel: { x: vx, y: vy },
			size,
			radius: ASTEROID_RADII[size],
			vertices,
			offsets,
		};
	}
}
