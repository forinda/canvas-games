import type { Updatable } from "@shared/Updatable";
import type { Ant, AntColonyState } from "../types";
import {
	BIRTH_COST,
	COLONY_RADIUS,
	FOOD_CONSUMPTION_RATE,
	MAX_ANTS,
	STARVATION_RATE,
} from "../types";

export class ColonySystem implements Updatable<AntColonyState> {
	update(state: AntColonyState, dt: number): void {
		const colony = state.colony;

		// ── Food consumption ──
		const consumption = colony.population * FOOD_CONSUMPTION_RATE * dt;

		colony.food -= consumption;

		// ── Starvation ──
		if (colony.food < 0) {
			colony.food = 0;
			// Kill ants proportional to deficit
			const deaths = Math.ceil(STARVATION_RATE * dt);

			for (let i = 0; i < deaths && state.ants.length > 0; i++) {
				state.ants.pop();
				colony.population = Math.max(0, colony.population - 1);
			}
		}

		// ── Population growth (queen births) ──
		if (colony.food > BIRTH_COST * 0.5 && colony.population < MAX_ANTS) {
			colony.birthProgress += dt;
			const birthTime = BIRTH_COST / Math.max(1, colony.food * 0.05);

			if (colony.birthProgress >= birthTime) {
				colony.birthProgress = 0;
				colony.food -= BIRTH_COST;

				if (colony.food < 0) colony.food = 0;

				this._spawnAnt(state);
			}
		}

		// ── Game over ──
		if (colony.population <= 0 && state.started) {
			state.gameOver = true;
		}

		// ── Max population grows with completed tunnels ──
		const completeTunnels = state.tunnels.filter((t) => t.complete).length;

		colony.maxPopulation = 30 + completeTunnels * 15;
	}

	private _spawnAnt(state: AntColonyState): void {
		const colony = state.colony;
		const angle = Math.random() * Math.PI * 2;
		const r = COLONY_RADIUS * 0.5;
		const ant: Ant = {
			x: colony.x + Math.cos(angle) * r,
			y: colony.y + Math.sin(angle) * r,
			angle: Math.random() * Math.PI * 2,
			carrying: false,
			task: "forage",
			targetX: 0,
			targetY: 0,
			returning: false,
			pheromoneTimer: 0,
		};

		state.ants.push(ant);
		colony.population = state.ants.length;
	}
}
