import type { CityState } from "../types";
import { BUILDING_DEFS } from "../data/buildings";

export class StatsSystem {
	recalcStats(state: CityState): void {
		let pop = 0,
			hap = 50,
			pow = 10,
			food = 20;

		for (const row of state.grid) {
			for (const b of row) {
				if (!b) continue;

				const def = BUILDING_DEFS[b.type];

				pop += def.pop * b.level;
				hap += def.happiness * b.level;
				pow += def.power * b.level;
				food += def.food * b.level;
			}
		}

		state.population = pop;
		state.happiness = Math.max(0, Math.min(100, hap));
		state.power = pow;
		state.food = food;
	}
}
