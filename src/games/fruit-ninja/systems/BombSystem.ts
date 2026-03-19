import type { Updatable } from "@shared/Updatable";
import type { FruitNinjaState } from "../types";
import { PARTICLE_COUNT } from "../types";

export class BombSystem implements Updatable<FruitNinjaState> {
	update(state: FruitNinjaState, _dt: number): void {
		for (const fruit of state.fruits) {
			if (!fruit.sliced || !fruit.isBomb) continue;

			// Bomb was sliced — game over
			state.gameOver = true;

			// Spawn explosion particles (dark/orange)
			this.spawnExplosion(state, fruit.x, fruit.y);

			// Remove the bomb from fruits
			break;
		}

		// Clean up sliced bombs
		state.fruits = state.fruits.filter((f) => !(f.sliced && f.isBomb));
	}

	private spawnExplosion(state: FruitNinjaState, x: number, y: number): void {
		const colors = ["#ff6600", "#ff3300", "#ffcc00", "#333", "#666"];

		for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
			const angle = Math.random() * Math.PI * 2;
			const speed = 100 + Math.random() * 400;
			const life = 0.6 + Math.random() * 1.0;

			state.particles.push({
				x,
				y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed - 150,
				radius: 3 + Math.random() * 8,
				color: colors[Math.floor(Math.random() * colors.length)],
				alpha: 1,
				life,
				maxLife: life,
			});
		}
	}
}
