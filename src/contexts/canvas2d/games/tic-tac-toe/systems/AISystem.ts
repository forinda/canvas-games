import type { Updatable } from "@core/Updatable";
import type { TicTacToeState, Cell, Player } from "../types.ts";
import { WIN_LINES, TOTAL_CELLS } from "../types.ts";

export class AISystem implements Updatable<TicTacToeState> {
	private pendingMove: number | null = null;
	private thinkTimer = 0;
	private readonly THINK_DELAY = 400; // ms delay to feel natural

	update(state: TicTacToeState, dt: number): void {
		if (state.mode !== "ai") return;

		if (state.gameOver) return;

		if (state.currentPlayer !== "O") return;

		if (state.showModeSelect) return;

		if (this.pendingMove === null) {
			state.aiThinking = true;
			this.pendingMove = this.findBestMove(state.board);
			this.thinkTimer = 0;
		}

		this.thinkTimer += dt;

		if (this.thinkTimer >= this.THINK_DELAY && this.pendingMove !== null) {
			state.aiThinking = false;
			state.lastClickCell = this.pendingMove;
			this.pendingMove = null;
			this.thinkTimer = 0;
		}
	}

	private findBestMove(board: Cell[]): number {
		let bestScore = -Infinity;
		let bestMove = -1;

		for (let i = 0; i < TOTAL_CELLS; i++) {
			if (board[i] !== null) continue;

			board[i] = "O";
			const score = this.minimax(board, 0, false, -Infinity, Infinity);

			board[i] = null;

			if (score > bestScore) {
				bestScore = score;
				bestMove = i;
			}
		}

		return bestMove;
	}

	private minimax(
		board: Cell[],
		depth: number,
		isMaximizing: boolean,
		alpha: number,
		beta: number,
	): number {
		// Check terminal states
		if (this.hasWon(board, "O")) return 10 - depth;

		if (this.hasWon(board, "X")) return depth - 10;

		if (this.isFull(board)) return 0;

		if (isMaximizing) {
			let maxEval = -Infinity;

			for (let i = 0; i < TOTAL_CELLS; i++) {
				if (board[i] !== null) continue;

				board[i] = "O";
				const evalScore = this.minimax(board, depth + 1, false, alpha, beta);

				board[i] = null;
				maxEval = Math.max(maxEval, evalScore);
				alpha = Math.max(alpha, evalScore);

				if (beta <= alpha) break;
			}

			return maxEval;
		} else {
			let minEval = Infinity;

			for (let i = 0; i < TOTAL_CELLS; i++) {
				if (board[i] !== null) continue;

				board[i] = "X";
				const evalScore = this.minimax(board, depth + 1, true, alpha, beta);

				board[i] = null;
				minEval = Math.min(minEval, evalScore);
				beta = Math.min(beta, evalScore);

				if (beta <= alpha) break;
			}

			return minEval;
		}
	}

	private hasWon(board: Cell[], player: Player): boolean {
		for (const line of WIN_LINES) {
			if (
				board[line[0]] === player &&
				board[line[1]] === player &&
				board[line[2]] === player
			) {
				return true;
			}
		}

		return false;
	}

	private isFull(board: Cell[]): boolean {
		for (let i = 0; i < TOTAL_CELLS; i++) {
			if (board[i] === null) return false;
		}

		return true;
	}

	reset(): void {
		this.pendingMove = null;
		this.thinkTimer = 0;
	}
}
