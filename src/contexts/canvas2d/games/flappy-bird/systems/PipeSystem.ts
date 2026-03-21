import type { Updatable } from "@core/Updatable";
import type { FlappyState, Pipe } from "../types";
import {
	PIPE_SPEED,
	GAP_SIZE,
	PIPE_WIDTH,
	PIPE_SPAWN_INTERVAL,
	PIPE_MIN_TOP,
} from "../types";

export class PipeSystem implements Updatable<FlappyState> {
	update(state: FlappyState, dt: number): void {
		if (state.phase !== "playing") return;

		// Update pipe timer
		state.pipeTimer += dt;

		// Spawn new pipes
		if (state.pipeTimer >= PIPE_SPAWN_INTERVAL) {
			state.pipeTimer = 0;
			this.spawnPipe(state);
		}

		// Move pipes left
		for (const pipe of state.pipes) {
			pipe.x -= PIPE_SPEED * dt;
		}

		// Score when bird passes pipe center
		for (const pipe of state.pipes) {
			if (!pipe.scored && pipe.x + pipe.width < state.bird.x) {
				pipe.scored = true;
				state.score++;
			}
		}

		// Remove off-screen pipes
		state.pipes = state.pipes.filter((p) => p.x + p.width > -10);
	}

	private spawnPipe(state: FlappyState): void {
		const maxGapY = state.groundY - PIPE_MIN_TOP - GAP_SIZE;
		const minGapY = PIPE_MIN_TOP + GAP_SIZE / 2;
		const gapY = minGapY + Math.random() * (maxGapY - minGapY);

		const pipe: Pipe = {
			x: state.canvasW + 10,
			gapY,
			width: PIPE_WIDTH,
			scored: false,
		};

		state.pipes.push(pipe);
	}

	spawnInitialPipe(state: FlappyState): void {
		state.pipeTimer = PIPE_SPAWN_INTERVAL * 0.6;
	}
}
