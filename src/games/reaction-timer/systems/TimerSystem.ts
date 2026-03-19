import type { Updatable } from "@shared/Updatable";
import type { ReactionState } from "../types";

export class TimerSystem implements Updatable<ReactionState> {
	update(state: ReactionState, _dt: number): void {
		if (state.phase !== "waiting") return;

		const elapsed = performance.now() - state.waitStartedAt;

		if (elapsed >= state.scheduledDelay) {
			state.phase = "ready";
			state.greenAt = performance.now();
		}
	}
}
