import type { Updatable } from "@core/Updatable";
import { Cell, type SokobanState, type Snapshot } from "../types";

export class MoveSystem implements Updatable<SokobanState> {
	update(state: SokobanState, _dt: number): void {
		if (state.levelComplete || state.gameWon) return;

		const dir = state.queuedDir;

		if (!dir) return;

		state.queuedDir = null;

		const newX = state.player.x + dir.dx;
		const newY = state.player.y + dir.dy;

		// Out of bounds check
		if (!this.inBounds(state, newX, newY)) return;

		// Wall check
		if (state.grid[newY][newX] === Cell.Wall) return;

		// Check if a box is at the target position
		const boxIdx = this.boxAt(state, newX, newY);

		if (boxIdx >= 0) {
			// There is a box — can we push it?
			const pushX = newX + dir.dx;
			const pushY = newY + dir.dy;

			if (!this.inBounds(state, pushX, pushY)) return;

			if (state.grid[pushY][pushX] === Cell.Wall) return;

			if (this.boxAt(state, pushX, pushY) >= 0) return; // Can't push into another box

			// Save snapshot before move
			this.saveSnapshot(state);

			// Push box
			state.boxes[boxIdx] = { x: pushX, y: pushY };

			// Move player
			state.player = { x: newX, y: newY };
			state.moves++;
		} else {
			// No box — just move
			this.saveSnapshot(state);
			state.player = { x: newX, y: newY };
			state.moves++;
		}
	}

	private inBounds(state: SokobanState, x: number, y: number): boolean {
		return x >= 0 && x < state.width && y >= 0 && y < state.height;
	}

	private boxAt(state: SokobanState, x: number, y: number): number {
		return state.boxes.findIndex((b) => b.x === x && b.y === y);
	}

	private saveSnapshot(state: SokobanState): void {
		const snap: Snapshot = {
			player: { ...state.player },
			boxes: state.boxes.map((b) => ({ ...b })),
		};

		state.undoStack.push(snap);
	}
}
