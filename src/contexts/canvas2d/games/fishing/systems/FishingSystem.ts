import type { Updatable } from "@core/Updatable";
import type { FishingState, CaughtFish } from "../types";
import { pickRandomFish, randomSize } from "../data/fish";

export class FishingSystem implements Updatable<FishingState> {
	private readonly HOOK_WINDOW = 1.5; // seconds to react
	private readonly REEL_SPEED = 0.12; // progress per second while holding
	private readonly TENSION_RISE = 0.6; // tension rise when holding
	private readonly TENSION_FALL = 0.45; // tension fall when releasing
	private readonly FISH_FIGHT_INTERVAL = 0.8; // seconds between direction changes

	update(state: FishingState, dt: number): void {
		switch (state.phase) {
			case "waiting":
				this.updateWaiting(state, dt);
				break;
			case "hooking":
				this.updateHooking(state, dt);
				break;
			case "reeling":
				this.updateReeling(state, dt);
				break;
		}
	}

	private updateWaiting(s: FishingState, dt: number): void {
		s.waitElapsed += dt;
		s.bobberBobTime += dt;

		if (s.waitElapsed >= s.waitTimer && !s.fishBiting) {
			// Fish bites!
			s.fishBiting = true;
			s.phase = "hooking";
			s.hookWindowTimer = this.HOOK_WINDOW;
			s.hookWindowDuration = this.HOOK_WINDOW;
			s.hookSuccess = false;

			// Pick the fish now
			s.currentFish = pickRandomFish(s.castDistance);
			s.currentFishSize = randomSize(s.currentFish);
		}
	}

	private updateHooking(s: FishingState, dt: number): void {
		s.hookWindowTimer -= dt;
		s.bobberBobTime += dt;

		if (s.hookSuccess) {
			// Successfully hooked — start reeling
			s.phase = "reeling";
			s.reelTension = 0.5;
			s.reelProgress = 0;
			s.reelHolding = false;
			s.fishFightTimer = 0;
			s.fishFightDir = 1;

			return;
		}

		if (s.hookWindowTimer <= 0) {
			// Missed the hook — fish escapes, go idle
			this.resetToIdle(s);
		}
	}

	private updateReeling(s: FishingState, dt: number): void {
		if (!s.currentFish) {
			this.resetToIdle(s);

			return;
		}

		const fight = s.currentFish.fight;

		// Fish fights — moves tension in random direction
		s.fishFightTimer += dt;

		if (s.fishFightTimer >= this.FISH_FIGHT_INTERVAL * (1 - fight * 0.5)) {
			s.fishFightTimer = 0;
			s.fishFightDir = Math.random() > 0.5 ? 1 : -1;
		}

		// Fish fight applies constant tension drift
		s.reelTension += s.fishFightDir * fight * 0.4 * dt;

		// Player holding = reel in + raise tension
		if (s.reelHolding) {
			s.reelTension += this.TENSION_RISE * dt;
			s.reelProgress += this.REEL_SPEED * (1 - fight * 0.5) * dt;
		} else {
			s.reelTension -= this.TENSION_FALL * dt;
		}

		// Clamp tension
		s.reelTension = Math.max(0, Math.min(1, s.reelTension));

		// Check tension failure (snap or slack)
		if (s.reelTension >= 1 || s.reelTension <= 0) {
			// Line snapped or went slack — fish escapes
			this.resetToIdle(s);

			return;
		}

		// Check catch success
		if (s.reelProgress >= 1) {
			this.catchFish(s);
		}
	}

	private catchFish(s: FishingState): void {
		if (!s.currentFish) return;

		const caught: CaughtFish = {
			fish: s.currentFish,
			size: s.currentFishSize,
			timestamp: Date.now(),
		};

		s.lastCatch = caught;
		s.catchPopupTimer = 3; // show popup for 3 seconds
		s.totalScore += s.currentFish.points;
		s.totalCaught += 1;

		this.resetToIdle(s);
	}

	private resetToIdle(s: FishingState): void {
		s.phase = "idle";
		s.castPower = 0;
		s.castCharging = false;
		s.castDistance = 0;
		s.fishBiting = false;
		s.hookSuccess = false;
		s.reelHolding = false;
		s.currentFish = null;
		s.currentFishSize = 0;
	}
}
