import type { Updatable } from "@shared/Updatable";
import type { MemoryState, Card, Difficulty } from "../types";
import { DIFFICULTIES, REVEAL_DURATION, FLIP_SPEED } from "../types";
import { ICONS } from "../data/icons";

/**
 * Manages board initialisation, card flipping logic, match checking,
 * and the timed auto-flip-back after a mismatch.
 */
export class BoardSystem implements Updatable<MemoryState> {
	/** Fisher-Yates shuffle */
	private shuffle<T>(arr: T[]): T[] {
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			const tmp = arr[i];

			arr[i] = arr[j];
			arr[j] = tmp;
		}

		return arr;
	}

	/** Create a fresh shuffled board for the given difficulty */
	initBoard(state: MemoryState): void {
		const config = DIFFICULTIES[state.difficulty];
		const totalCards = config.rows * config.cols;
		const numPairs = totalCards / 2;

		// Pick icons for this difficulty
		const selectedIcons = ICONS.slice(0, numPairs);
		const pairs = [
			...selectedIcons.map((_, i) => i),
			...selectedIcons.map((_, i) => i),
		];

		this.shuffle(pairs);

		const board: Card[] = [];

		for (let i = 0; i < totalCards; i++) {
			const row = Math.floor(i / config.cols);
			const col = i % config.cols;

			board.push({
				iconIndex: pairs[i],
				flipped: false,
				matched: false,
				flipProgress: 0,
				row,
				col,
			});
		}

		state.board = board;
		state.rows = config.rows;
		state.cols = config.cols;
		state.totalPairs = numPairs;
		state.pairsFound = 0;
		state.moves = 0;
		state.elapsedTime = 0;
		state.timerRunning = false;
		state.firstPick = null;
		state.secondPick = null;
		state.revealTimer = 0;
		state.phase = "idle";
		state.gameOver = false;
		state.started = false;
	}

	/** Flip a card at the given board index */
	flipCard(state: MemoryState, idx: number): void {
		const card = state.board[idx];

		if (card.flipped || card.matched) return;

		card.flipped = true;

		if (state.firstPick === null) {
			state.firstPick = idx;
			state.phase = "one-flipped";
		} else {
			state.secondPick = idx;
			state.moves++;
			state.phase = "two-flipped";
			state.revealTimer = 0;
		}
	}

	/** Called every frame to animate flips and check matches after reveal delay */
	update(state: MemoryState, dt: number): void {
		// Animate flip progress for all cards
		for (const card of state.board) {
			const target = card.flipped || card.matched ? 1 : 0;

			if (card.flipProgress < target) {
				card.flipProgress = Math.min(1, card.flipProgress + FLIP_SPEED * dt);
			} else if (card.flipProgress > target) {
				card.flipProgress = Math.max(0, card.flipProgress - FLIP_SPEED * dt);
			}
		}

		// Handle two-flipped state: wait for reveal duration then check
		if (state.phase === "two-flipped") {
			state.revealTimer += dt;

			if (state.revealTimer >= REVEAL_DURATION) {
				this.checkMatch(state);
			}
		}
	}

	/** Check if the two flipped cards match */
	private checkMatch(state: MemoryState): void {
		if (state.firstPick === null || state.secondPick === null) return;

		const cardA = state.board[state.firstPick];
		const cardB = state.board[state.secondPick];

		if (cardA.iconIndex === cardB.iconIndex) {
			// Match found
			cardA.matched = true;
			cardB.matched = true;
			state.pairsFound++;

			if (state.pairsFound >= state.totalPairs) {
				state.phase = "won";
				state.gameOver = true;
				state.timerRunning = false;
			} else {
				state.phase = "idle";
			}
		} else {
			// No match — flip both back
			cardA.flipped = false;
			cardB.flipped = false;
			state.phase = "idle";
		}

		state.firstPick = null;
		state.secondPick = null;
		state.revealTimer = 0;
	}

	/** Get the list of available difficulty keys in order */
	getDifficultyKeys(): Difficulty[] {
		return ["4x4", "5x4", "6x6"];
	}
}
