import type { Updatable } from "@core/Updatable";
import type { PlatState } from "../types";

export class GoalSystem implements Updatable<PlatState> {
	update(state: PlatState, _dt: number): void {
		if (state.px > state.goalX) {
			state.won = true;
		}
	}
}
