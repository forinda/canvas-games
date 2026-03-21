import type { Updatable } from "@core/Updatable";
import type { PlatState } from "../types";

export class CoinSystem implements Updatable<PlatState> {
	update(state: PlatState, _dt: number): void {
		const s = state;

		for (const c of s.coins) {
			if (c.collected) continue;

			const dx = s.px + s.pw / 2 - c.x;
			const dy = s.py + s.ph / 2 - c.y;

			if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
				c.collected = true;
				s.score += 50;
			}
		}
	}
}
