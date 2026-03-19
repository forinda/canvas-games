import type { Updatable } from "@shared/Updatable";
import type { BrickBuilderState, Brick } from "../types";
import { GRID_COLS, GRID_ROWS } from "../types";

export class BuildSystem implements Updatable<BrickBuilderState> {
	/** Place a brick with gravity (falls to the lowest valid position) */
	placeBrick(
		state: BrickBuilderState,
		gridX: number,
		gridY: number,
		bw: number,
		bh: number,
		color: string,
	): void {
		// Clamp so brick stays within grid
		const clampedX = Math.min(gridX, GRID_COLS - bw);
		const clampedY = Math.min(gridY, GRID_ROWS - bh);

		if (clampedX < 0 || clampedY < 0) return;

		// Walk upward from the bottom to find the lowest open spot
		let finalY = GRID_ROWS - bh;

		for (let testY = GRID_ROWS - bh; testY >= 0; testY--) {
			if (!this.overlapsAny(state.bricks, clampedX, testY, bw, bh)) {
				finalY = testY;
			} else {
				break;
			}
		}

		// If finalY still overlaps, walk upward
		while (
			finalY > 0 &&
			this.overlapsAny(state.bricks, clampedX, finalY, bw, bh)
		) {
			finalY--;
		}

		// Final overlap check
		if (this.overlapsAny(state.bricks, clampedX, finalY, bw, bh)) {
			return;
		}

		const brick: Brick = {
			x: clampedX,
			y: finalY,
			w: bw,
			h: bh,
			color: color,
			id: state.nextBrickId,
		};

		state.nextBrickId++;
		state.totalPlaced++;
		state.bricks.push(brick);
	}

	/** Remove a brick at the given grid position */
	removeBrickAt(state: BrickBuilderState, gridX: number, gridY: number): void {
		const index = state.bricks.findIndex(
			(b) =>
				gridX >= b.x && gridX < b.x + b.w && gridY >= b.y && gridY < b.y + b.h,
		);

		if (index !== -1) {
			state.bricks.splice(index, 1);
			// Apply gravity to remaining bricks above the removed one
			this.applyGravity(state);
		}
	}

	/** Frame update: apply gravity to floating bricks */
	update(state: BrickBuilderState, _dt: number): void {
		this.applyGravity(state);
	}

	/** Apply gravity: settle all floating bricks downward */
	private applyGravity(state: BrickBuilderState): void {
		// Sort bricks by Y descending so bottom bricks settle first
		const sorted = state.bricks.slice().sort((a, b) => b.y - a.y);

		let changed = true;
		let iterations = 0;
		const maxIterations = GRID_ROWS;

		while (changed && iterations < maxIterations) {
			changed = false;
			iterations++;

			for (const brick of sorted) {
				const newY = brick.y + 1;

				// Check if brick can move down
				if (newY + brick.h > GRID_ROWS) continue;

				// Check overlap with other bricks
				const others = state.bricks.filter((b) => b.id !== brick.id);

				if (!this.overlapsAnyBricks(others, brick.x, newY, brick.w, brick.h)) {
					brick.y = newY;
					changed = true;
				}
			}
		}
	}

	/** Check if a rectangle overlaps any existing brick */
	private overlapsAny(
		bricks: readonly Brick[],
		x: number,
		y: number,
		w: number,
		h: number,
	): boolean {
		return this.overlapsAnyBricks(bricks, x, y, w, h);
	}

	/** Check rectangle overlap against a list of bricks */
	private overlapsAnyBricks(
		bricks: readonly Brick[],
		x: number,
		y: number,
		w: number,
		h: number,
	): boolean {
		for (const b of bricks) {
			if (x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y) {
				return true;
			}
		}

		return false;
	}
}
