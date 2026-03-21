import type { Updatable } from "@core/Updatable";
import type { Gem, GemType, Match3State } from "../types";
import {
	GEM_TYPES,
	ROWS,
	COLS,
	FALL_SPEED,
	REMOVE_DURATION,
	SWAP_DURATION,
} from "../types";

/** Manages the board: initialisation, match detection, removal, gravity, refill */
export class BoardSystem implements Updatable<Match3State> {
	/* ---------- public helpers ---------- */

	/** Create a board with no initial matches */
	initBoard(state: Match3State): void {
		const board: (Gem | null)[][] = [];

		for (let r = 0; r < ROWS; r++) {
			board[r] = [];

			for (let c = 0; c < COLS; c++) {
				board[r][c] = this.createGem(r, c, state, board);
			}
		}

		state.board = board;
	}

	/** Find all horizontal and vertical matches of 3+ */
	findMatches(state: Match3State): Set<string> {
		const matched = new Set<string>();
		const { board } = state;

		// Horizontal
		for (let r = 0; r < ROWS; r++) {
			let run = 1;

			for (let c = 1; c < COLS; c++) {
				const prev = board[r][c - 1];
				const cur = board[r][c];

				if (prev && cur && prev.type === cur.type) {
					run++;
				} else {
					if (run >= 3) {
						for (let k = c - run; k < c; k++) matched.add(`${r},${k}`);
					}

					run = 1;
				}
			}

			if (run >= 3) {
				for (let k = COLS - run; k < COLS; k++) matched.add(`${r},${k}`);
			}
		}

		// Vertical
		for (let c = 0; c < COLS; c++) {
			let run = 1;

			for (let r = 1; r < ROWS; r++) {
				const prev = board[r - 1][c];
				const cur = board[r][c];

				if (prev && cur && prev.type === cur.type) {
					run++;
				} else {
					if (run >= 3) {
						for (let k = r - run; k < r; k++) matched.add(`${k},${c}`);
					}

					run = 1;
				}
			}

			if (run >= 3) {
				for (let k = ROWS - run; k < ROWS; k++) matched.add(`${k},${c}`);
			}
		}

		return matched;
	}

	/** Remove matched gems (set to null) */
	removeMatched(state: Match3State): void {
		for (const key of state.matched) {
			const [r, c] = key.split(",").map(Number);

			state.board[r][c] = null;
		}
	}

	/** Apply gravity: shift gems down, generate new ones at top */
	applyGravity(state: Match3State): boolean {
		let anyFalling = false;
		const { board, cellSize, boardOffsetX, boardOffsetY } = state;

		for (let c = 0; c < COLS; c++) {
			// Walk from bottom up, shift nulls
			let writeRow = ROWS - 1;

			for (let r = ROWS - 1; r >= 0; r--) {
				if (board[r][c] !== null) {
					const gem = board[r][c]!;

					if (r !== writeRow) {
						gem.row = writeRow;
						gem.falling = true;
						anyFalling = true;
						board[writeRow][c] = gem;
						board[r][c] = null;
					}

					gem.col = c;
					writeRow--;
				}
			}

			// Fill empty top rows with new gems
			for (let r = writeRow; r >= 0; r--) {
				const type = GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
				const gem: Gem = {
					type,
					row: r,
					col: c,
					x: boardOffsetX + c * cellSize + cellSize / 2,
					y: boardOffsetY + (r - (writeRow - r + 1)) * cellSize + cellSize / 2, // spawn above board
					falling: true,
					scale: 1,
					opacity: 1,
				};

				board[r][c] = gem;
				anyFalling = true;
			}
		}

		return anyFalling;
	}

	/** Perform a swap on the board array */
	swap(
		state: Match3State,
		rA: number,
		cA: number,
		rB: number,
		cB: number,
	): void {
		const a = state.board[rA][cA];
		const b = state.board[rB][cB];

		if (a) {
			a.row = rB;
			a.col = cB;
		}

		if (b) {
			b.row = rA;
			b.col = cA;
		}

		state.board[rA][cA] = b;
		state.board[rB][cB] = a;
	}

	/* ---------- frame update ---------- */

	update(state: Match3State, dt: number): void {
		switch (state.phase) {
			case "swapping":
				this.tickSwap(state, dt);
				break;
			case "swap-back":
				this.tickSwapBack(state, dt);
				break;
			case "removing":
				this.tickRemoving(state, dt);
				break;
			case "falling":
				this.tickFalling(state, dt);
				break;
		}
	}

	/* ---------- private ---------- */

	private tickSwap(state: Match3State, dt: number): void {
		state.phaseTimer += dt;

		if (state.phaseTimer >= SWAP_DURATION) {
			// Swap complete — check for matches
			const matches = this.findMatches(state);

			if (matches.size > 0) {
				state.matched = matches;
				state.phase = "removing";
				state.phaseTimer = 0;
				state.combo = 1;
			} else {
				// No match — swap back
				if (state.swapA && state.swapB) {
					this.swap(
						state,
						state.swapA.row,
						state.swapA.col,
						state.swapB.row,
						state.swapB.col,
					);
				}

				state.phase = "swap-back";
				state.phaseTimer = 0;
			}
		}
	}

	private tickSwapBack(state: Match3State, dt: number): void {
		state.phaseTimer += dt;

		if (state.phaseTimer >= SWAP_DURATION) {
			state.phase = "idle";
			state.swapA = null;
			state.swapB = null;
			// Refund the move since the swap was invalid
			state.movesLeft++;
		}
	}

	private tickRemoving(state: Match3State, dt: number): void {
		state.phaseTimer += dt;
		// Animate removal fade
		const progress = Math.min(state.phaseTimer / REMOVE_DURATION, 1);

		for (const key of state.matched) {
			const [r, c] = key.split(",").map(Number);
			const gem = state.board[r][c];

			if (gem) {
				gem.scale = 1 - progress * 0.5;
				gem.opacity = 1 - progress;
			}
		}

		if (progress >= 1) {
			this.removeMatched(state);
			state.matched.clear();
			this.applyGravity(state);
			state.phase = "falling";
			state.phaseTimer = 0;
		}
	}

	private tickFalling(state: Match3State, dt: number): void {
		let anyFalling = false;
		const { board, cellSize, boardOffsetX, boardOffsetY } = state;

		for (let r = 0; r < ROWS; r++) {
			for (let c = 0; c < COLS; c++) {
				const gem = board[r][c];

				if (!gem) continue;

				const targetY = boardOffsetY + r * cellSize + cellSize / 2;
				const targetX = boardOffsetX + c * cellSize + cellSize / 2;

				if (gem.falling) {
					gem.y += FALL_SPEED * (dt / 1000);
					gem.x = targetX;

					if (gem.y >= targetY) {
						gem.y = targetY;
						gem.falling = false;
					} else {
						anyFalling = true;
					}
				} else {
					gem.x = targetX;
					gem.y = targetY;
				}
			}
		}

		if (!anyFalling) {
			// Check for cascading matches
			const matches = this.findMatches(state);

			if (matches.size > 0) {
				state.matched = matches;
				state.combo++;
				state.phase = "removing";
				state.phaseTimer = 0;
			} else {
				state.phase = "idle";
				state.swapA = null;
				state.swapB = null;
				state.combo = 0;

				// Check game over
				if (state.movesLeft <= 0) {
					state.phase = "game-over";
					state.gameOver = true;
				}
			}
		}
	}

	private createGem(
		row: number,
		col: number,
		state: Match3State,
		board: (Gem | null)[][],
	): Gem {
		const { cellSize, boardOffsetX, boardOffsetY } = state;
		let type: GemType;

		// Avoid initial matches of 3
		do {
			type = GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
		} while (this.causesMatch(board, row, col, type));

		return {
			type,
			row,
			col,
			x: boardOffsetX + col * cellSize + cellSize / 2,
			y: boardOffsetY + row * cellSize + cellSize / 2,
			falling: false,
			scale: 1,
			opacity: 1,
		};
	}

	private causesMatch(
		board: (Gem | null)[][],
		row: number,
		col: number,
		type: GemType,
	): boolean {
		// Check horizontal (left 2)
		if (
			col >= 2 &&
			board[row][col - 1]?.type === type &&
			board[row][col - 2]?.type === type
		)
			return true;

		// Check vertical (up 2)
		if (
			row >= 2 &&
			board[row - 1]?.[col]?.type === type &&
			board[row - 2]?.[col]?.type === type
		)
			return true;

		return false;
	}
}
