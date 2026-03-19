import type { Updatable } from "@shared/Updatable.ts";
import type { TicTacToeState, Cell, Player } from "../types.ts";
import { WIN_LINES, TOTAL_CELLS } from "../types.ts";

export class BoardSystem implements Updatable<TicTacToeState> {
	update(state: TicTacToeState, _dt: number): void {
		// Animate cell drawings
		for (const anim of state.cellAnimations) {
			if (anim.progress < 1) {
				anim.progress = Math.min(1, anim.progress + 0.06);
			}
		}

		// Animate winning line
		if (state.winLine && state.winLine.progress < 1) {
			state.winLine.progress = Math.min(1, state.winLine.progress + 0.04);
		}

		// Track animation time for pulsing effects
		state.animationTime += _dt;
	}

	placeMark(state: TicTacToeState, index: number): boolean {
		if (state.board[index] !== null || state.gameOver) return false;

		state.board[index] = state.currentPlayer;
		state.cellAnimations.push({ cellIndex: index, progress: 0 });

		// Check for win
		const winResult = this.checkWin(state.board, state.currentPlayer);

		if (winResult) {
			state.winner = state.currentPlayer;
			state.winLine = { cells: winResult, progress: 0 };
			state.gameOver = true;
			this.updateScore(state);

			return true;
		}

		// Check for draw
		if (this.checkDraw(state.board)) {
			state.isDraw = true;
			state.gameOver = true;
			state.draws++;

			return true;
		}

		// Switch player
		state.currentPlayer = state.currentPlayer === "X" ? "O" : "X";

		return true;
	}

	checkWin(board: Cell[], player: Player): [number, number, number] | null {
		for (const line of WIN_LINES) {
			if (
				board[line[0]] === player &&
				board[line[1]] === player &&
				board[line[2]] === player
			) {
				return line;
			}
		}

		return null;
	}

	checkDraw(board: Cell[]): boolean {
		for (let i = 0; i < TOTAL_CELLS; i++) {
			if (board[i] === null) return false;
		}

		return true;
	}

	private updateScore(state: TicTacToeState): void {
		if (state.winner === "X") {
			state.scoreX++;
		} else if (state.winner === "O") {
			state.scoreO++;
		}
	}
}
