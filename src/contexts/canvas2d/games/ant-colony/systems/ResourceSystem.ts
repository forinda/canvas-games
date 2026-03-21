import type { Updatable } from "@core/Updatable";
import type { AntColonyState, Season } from "../types";
import {
	AUTO_FOOD_AMOUNT,
	AUTO_FOOD_INTERVAL,
	COLONY_RADIUS,
	SEASON_DURATION,
	SEASONAL_FOOD_MULT,
} from "../types";

const SEASON_ORDER: Season[] = ["spring", "summer", "autumn", "winter"];

export class ResourceSystem implements Updatable<AntColonyState> {
	private autoFoodTimer = 0;

	update(state: AntColonyState, dt: number): void {
		// ── Season progression ──
		state.seasonTimer += dt;

		if (state.seasonTimer >= SEASON_DURATION) {
			state.seasonTimer = 0;
			const idx = SEASON_ORDER.indexOf(state.season);
			const nextIdx = (idx + 1) % SEASON_ORDER.length;

			state.season = SEASON_ORDER[nextIdx];

			if (nextIdx === 0) state.year++;
		}

		// ── Remove depleted food sources ──
		for (let i = state.foodSources.length - 1; i >= 0; i--) {
			if (state.foodSources[i].amount <= 0) {
				state.foodSources.splice(i, 1);
			}
		}

		// ── Seasonal auto-spawn of food ──
		const mult = SEASONAL_FOOD_MULT[state.season];

		if (mult > 0) {
			this.autoFoodTimer += dt;
			const interval = AUTO_FOOD_INTERVAL / mult;

			if (this.autoFoodTimer >= interval) {
				this.autoFoodTimer = 0;
				this._spawnRandomFood(state, mult);
			}
		}
	}

	private _spawnRandomFood(state: AntColonyState, mult: number): void {
		const margin = 60;
		let x: number;
		let y: number;

		// Avoid spawning on colony
		do {
			x = margin + Math.random() * (state.width - margin * 2);
			y = margin + Math.random() * (state.height - margin * 2);
		} while (
			Math.sqrt((x - state.colony.x) ** 2 + (y - state.colony.y) ** 2) <
			COLONY_RADIUS * 3
		);

		const amount = Math.round(AUTO_FOOD_AMOUNT * mult);

		state.foodSources.push({
			x,
			y,
			amount,
			maxAmount: amount,
			radius: 10 + Math.random() * 8,
		});
	}
}
