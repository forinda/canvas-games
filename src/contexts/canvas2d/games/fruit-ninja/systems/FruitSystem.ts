import type { Updatable } from "@core/Updatable";
import type { FruitNinjaState, Fruit } from "../types";
import {
	GRAVITY,
	LAUNCH_INTERVAL_MIN,
	LAUNCH_INTERVAL_MAX,
	BOMB_RADIUS,
} from "../types";
import { randomFruitType } from "../data/fruits";

export class FruitSystem implements Updatable<FruitNinjaState> {
	update(state: FruitNinjaState, dt: number): void {
		const dtSec = dt / 1000;

		// Update launch timer and spawn fruits
		state.launchTimer -= dtSec;

		if (state.launchTimer <= 0) {
			this.launchWave(state);
			state.launchTimer =
				LAUNCH_INTERVAL_MIN +
				Math.random() * (LAUNCH_INTERVAL_MAX - LAUNCH_INTERVAL_MIN);
			// Speed up launches as wave increases
			state.launchTimer /= 1 + state.wave * 0.05;
		}

		// Update fruit physics
		for (const fruit of state.fruits) {
			fruit.x += fruit.vx * dtSec;
			fruit.vy += GRAVITY * dtSec;
			fruit.y += fruit.vy * dtSec;
			fruit.rotation += fruit.rotationSpeed * dtSec;
		}

		// Update halves physics
		for (const half of state.halves) {
			half.x += half.vx * dtSec;
			half.vy += GRAVITY * dtSec;
			half.y += half.vy * dtSec;
			half.rotation += half.rotationSpeed * dtSec;
			half.alpha -= dtSec * 0.5;
		}

		// Remove off-screen fruits (fell below) — lose a life if unsliced
		const toRemove: Fruit[] = [];

		for (const fruit of state.fruits) {
			if (fruit.y > state.height + 100) {
				toRemove.push(fruit);
			}
		}

		for (const fruit of toRemove) {
			if (!fruit.sliced && !fruit.isBomb) {
				state.lives -= 1;

				if (state.lives <= 0) {
					state.gameOver = true;
				}
			}
		}

		state.fruits = state.fruits.filter((f) => f.y <= state.height + 100);

		// Remove faded halves
		state.halves = state.halves.filter(
			(h) => h.alpha > 0 && h.y < state.height + 200,
		);

		// Increment wave periodically (every ~10 seconds based on score)
		state.wave = Math.floor(state.score / 15);
	}

	private launchWave(state: FruitNinjaState): void {
		const count = 1 + Math.floor(Math.random() * (2 + Math.min(state.wave, 4)));

		for (let i = 0; i < count; i++) {
			this.launchFruit(state, Math.random() < 0.12 + state.wave * 0.005);
		}
	}

	private launchFruit(state: FruitNinjaState, isBomb: boolean): void {
		const W = state.width;
		const H = state.height;

		// Random horizontal position in middle 80%
		const x = W * 0.1 + Math.random() * W * 0.8;
		const y = H + 40;

		// Upward velocity — aim toward upper portion of screen
		const targetX = W * 0.2 + Math.random() * W * 0.6;
		const flightTime = 1.2 + Math.random() * 0.6;

		const vx = (targetX - x) / flightTime;
		// Need to reach top 30-60% of screen
		const peakY = H * (0.15 + Math.random() * 0.3);
		const vy = -(Math.sqrt(2 * GRAVITY * (y - peakY)) || 600);

		const fruitType = randomFruitType();

		const fruit: Fruit = {
			type: fruitType,
			x,
			y,
			vx,
			vy,
			rotation: Math.random() * Math.PI * 2,
			rotationSpeed: (Math.random() - 0.5) * 6,
			sliced: false,
			isBomb,
			id: state.nextId++,
		};

		if (isBomb) {
			fruit.type = {
				name: "bomb",
				color: "#333",
				innerColor: "#111",
				icon: "💣",
				radius: BOMB_RADIUS,
				points: 0,
			};
		}

		state.fruits.push(fruit);
	}
}
