import type { Updatable } from "@core/Updatable";
import type { PacManState, Direction, Position } from "../types";
import {
	BASE_SPEED,
	DOT_SCORE,
	POWER_SCORE,
	FRIGHTENED_DURATION,
} from "../types";

export class PlayerSystem implements Updatable<PacManState> {
	update(state: PacManState, dt: number): void {
		if (state.paused || state.gameOver || !state.started || state.won) return;

		const pac = state.pacman;
		const speed = BASE_SPEED * dt;

		// Try next direction first
		if (pac.nextDir !== "none" && pac.nextDir !== pac.dir) {
			if (this.canMove(state, pac.pos, pac.nextDir)) {
				pac.dir = pac.nextDir;
			}
		}

		// Move in current direction
		if (pac.dir !== "none" && this.canMove(state, pac.pos, pac.dir)) {
			const delta = this.dirToDelta(pac.dir);

			pac.pos.x += delta.x * speed;
			pac.pos.y += delta.y * speed;

			// Tunnel wrap
			if (pac.pos.x < -0.5) pac.pos.x = state.gridWidth - 0.5;

			if (pac.pos.x > state.gridWidth - 0.5) pac.pos.x = -0.5;
		}

		// Snap to grid when close to center of cell
		this.snapToGrid(pac);

		// Animate mouth
		const mouthSpeed = 8 * dt;

		if (pac.mouthOpening) {
			pac.mouthAngle += mouthSpeed;

			if (pac.mouthAngle >= 0.8) pac.mouthOpening = false;
		} else {
			pac.mouthAngle -= mouthSpeed;

			if (pac.mouthAngle <= 0.05) pac.mouthOpening = true;
		}

		pac.mouthAngle = Math.max(0.05, Math.min(0.8, pac.mouthAngle));

		// Eat dots / power pellets at current cell
		const cx = Math.round(pac.pos.x);
		const cy = Math.round(pac.pos.y);

		if (cx >= 0 && cx < state.gridWidth && cy >= 0 && cy < state.gridHeight) {
			const cell = state.grid[cy][cx];

			if (cell.type === "dot") {
				cell.type = "empty";
				state.score += DOT_SCORE;
				state.dotsEaten++;
			} else if (cell.type === "power") {
				cell.type = "empty";
				state.score += POWER_SCORE;
				state.dotsEaten++;
				state.frightenedTimer = FRIGHTENED_DURATION;
				state.frightenedGhostsEaten = 0;

				// Set all active ghosts to frightened
				for (const ghost of state.ghosts) {
					if (ghost.active && !ghost.eaten) {
						ghost.mode = "frightened";
						// Reverse direction
						ghost.dir = this.reverseDir(ghost.dir);
					}
				}
			}

			// Check win condition
			if (state.dotsEaten >= state.totalDots) {
				state.won = true;
			}
		}
	}

	private canMove(state: PacManState, pos: Position, dir: Direction): boolean {
		const delta = this.dirToDelta(dir);
		const nextX = Math.round(pos.x + delta.x * 0.55);
		const nextY = Math.round(pos.y + delta.y * 0.55);

		// Allow tunnel
		if (nextX < 0 || nextX >= state.gridWidth) return true;

		if (nextY < 0 || nextY >= state.gridHeight) return false;

		const cell = state.grid[nextY][nextX];

		return cell.type !== "wall" && cell.type !== "door";
	}

	private dirToDelta(dir: Direction): Position {
		switch (dir) {
			case "up":
				return { x: 0, y: -1 };
			case "down":
				return { x: 0, y: 1 };
			case "left":
				return { x: -1, y: 0 };
			case "right":
				return { x: 1, y: 0 };
			default:
				return { x: 0, y: 0 };
		}
	}

	private reverseDir(dir: Direction): Direction {
		switch (dir) {
			case "up":
				return "down";
			case "down":
				return "up";
			case "left":
				return "right";
			case "right":
				return "left";
			default:
				return dir;
		}
	}

	private snapToGrid(pac: { pos: Position; dir: Direction }): void {
		const threshold = 0.15;
		const cx = Math.round(pac.pos.x);
		const cy = Math.round(pac.pos.y);

		if (pac.dir === "left" || pac.dir === "right") {
			if (Math.abs(pac.pos.y - cy) < threshold) pac.pos.y = cy;
		}

		if (pac.dir === "up" || pac.dir === "down") {
			if (Math.abs(pac.pos.x - cx) < threshold) pac.pos.x = cx;
		}
	}
}
