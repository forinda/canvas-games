import type { Updatable } from "@core/Updatable";
import type { FroggerState } from "../types";
import { COLS, GOAL_SLOTS } from "../types";

const DEATH_DURATION = 0.6;

export class CollisionSystem implements Updatable<FroggerState> {
	update(state: FroggerState, dt: number): void {
		const frog = state.frog;

		// Handle death timer
		if (state.dying) {
			state.deathTimer -= dt;

			if (state.deathTimer <= 0) {
				this.respawn(state);
			}

			return;
		}

		// Skip checks while hopping
		if (frog.hopping) return;

		const lane = state.lanes[frog.row];

		if (!lane) return;

		// ── Vehicle collision ──────────────────────────────────────────
		if (lane.kind === "road") {
			const frogLeft = frog.col * state.cellW + 2;
			const frogRight = (frog.col + 1) * state.cellW - 2;

			for (const v of state.vehicles) {
				if (v.row !== frog.row) continue;

				if (frogRight > v.x && frogLeft < v.x + v.width) {
					this.killFrog(state);

					return;
				}
			}
		}

		// ── River: drowning is set by RiverSystem, we just initiate death ─
		// (RiverSystem sets state.dying = true if not on a log)
		if (state.dying) {
			this.killFrog(state);

			return;
		}

		// ── Frog drifted off screen on a log ──────────────────────────
		if (lane.kind === "river") {
			if (frog.col < 0 || frog.col >= COLS) {
				this.killFrog(state);

				return;
			}
		}

		// ── Goal row — lily pad landing ───────────────────────────────
		if (lane.kind === "goal") {
			const pad = state.lilyPads.find((p) => p.col === frog.col);

			if (pad && !pad.occupied) {
				pad.occupied = true;
				state.goalsReached++;
				state.score += 100 + state.level * 50;

				if (state.score > state.highScore) {
					state.highScore = state.score;
				}

				if (state.goalsReached >= GOAL_SLOTS) {
					// Level complete
					state.levelComplete = true;
					state.levelCompleteTimer = 1.5;
				} else {
					this.respawnToStart(state);
				}
			} else {
				// Landed on an already-occupied pad or empty space — die
				this.killFrog(state);
			}
		}
	}

	private killFrog(state: FroggerState): void {
		state.dying = true;
		state.deathTimer = DEATH_DURATION;
	}

	private respawn(state: FroggerState): void {
		state.lives--;
		state.dying = false;
		state.deathTimer = 0;

		if (state.lives <= 0) {
			state.gameOver = true;

			try {
				const prev =
					parseInt(localStorage.getItem("frogger_highscore") ?? "0", 10) || 0;

				if (state.highScore > prev) {
					localStorage.setItem("frogger_highscore", String(state.highScore));
				}
			} catch {
				/* noop */
			}

			return;
		}

		this.respawnToStart(state);
	}

	private respawnToStart(state: FroggerState): void {
		state.frog.col = Math.floor(COLS / 2);
		state.frog.row = state.lanes.length - 1; // start row
		state.frog.offsetX = 0;
		state.frog.offsetY = 0;
		state.frog.hopping = false;
		state.frog.hopTimer = 0;
	}
}
