import type { Updatable } from "@shared/Updatable";
import type { GravityState } from "../types";
import { LEVELS } from "../data/levels";

export class LevelSystem implements Updatable<GravityState> {
	update(state: GravityState, dt: number): void {
		// Handle restart request
		if (state.restartRequested) {
			state.restartRequested = false;
			this.loadLevel(state, state.level);

			return;
		}

		// Handle advance request
		if (state.advanceRequested) {
			state.advanceRequested = false;

			if (state.gameWon) {
				// Restart from level 0
				this.loadLevel(state, 0);
			} else if (state.levelComplete) {
				this.loadLevel(state, state.level + 1);
			}

			return;
		}

		// Check if ball reached exit
		if (!state.levelComplete && !state.gameWon && !state.sliding) {
			if (
				state.ball.pos.x === state.exit.x &&
				state.ball.pos.y === state.exit.y
			) {
				if (state.level >= LEVELS.length - 1) {
					state.gameWon = true;
				} else {
					state.levelComplete = true;
				}

				state.completeTimer = 0;
			}
		}

		// Update complete animation timer
		if (state.levelComplete || state.gameWon) {
			state.completeTimer += dt;
		}

		// Update glow animation
		state.glowPhase += dt * 2;
	}

	loadLevel(state: GravityState, levelIndex: number): void {
		if (levelIndex >= LEVELS.length) {
			levelIndex = 0;
		}

		const level = LEVELS[levelIndex];

		state.level = levelIndex;
		state.gravity = "down";
		state.moves = 0;
		state.sliding = false;
		state.slideProgress = 0;
		state.slideFrom = { x: 0, y: 0 };
		state.slideTo = { x: 0, y: 0 };
		state.levelComplete = false;
		state.gameWon = false;
		state.queuedGravity = null;
		state.restartRequested = false;
		state.advanceRequested = false;
		state.completeTimer = 0;
		state.glowPhase = 0;

		state.gridWidth = level.width;
		state.gridHeight = level.height;

		state.ball = {
			pos: { x: level.ballStart.x, y: level.ballStart.y },
			trail: [],
		};

		state.exit = { x: level.exit.x, y: level.exit.y };

		state.walls = level.walls.map((w) => ({ x: w.x, y: w.y }));
		state.wallSet = new Set<string>();

		for (const w of level.walls) {
			state.wallSet.add(`${w.x},${w.y}`);
		}
	}
}
