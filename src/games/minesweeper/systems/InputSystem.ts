import type { InputHandler } from "@shared/InputHandler";
import type { MinesweeperState, Difficulty } from "../types";
import type { BoardSystem } from "./BoardSystem";

export class InputSystem implements InputHandler {
	private state: MinesweeperState;
	private canvas: HTMLCanvasElement;
	private boardSystem: BoardSystem;
	private onExit: () => void;
	private onReset: (difficulty?: Difficulty) => void;

	private keyHandler: (e: KeyboardEvent) => void;
	private clickHandler: (e: MouseEvent) => void;
	private contextHandler: (e: MouseEvent) => void;

	constructor(
		state: MinesweeperState,
		canvas: HTMLCanvasElement,
		boardSystem: BoardSystem,
		onExit: () => void,
		onReset: (difficulty?: Difficulty) => void,
	) {
		this.state = state;
		this.canvas = canvas;
		this.boardSystem = boardSystem;
		this.onExit = onExit;
		this.onReset = onReset;

		this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
		this.clickHandler = (e: MouseEvent) => this.handleClick(e);
		this.contextHandler = (e: MouseEvent) => this.handleRightClick(e);
	}

	attach(): void {
		window.addEventListener("keydown", this.keyHandler);
		this.canvas.addEventListener("click", this.clickHandler);
		this.canvas.addEventListener("contextmenu", this.contextHandler);
	}

	detach(): void {
		window.removeEventListener("keydown", this.keyHandler);
		this.canvas.removeEventListener("click", this.clickHandler);
		this.canvas.removeEventListener("contextmenu", this.contextHandler);
	}

	private handleKey(e: KeyboardEvent): void {
		if (e.key === "Escape") {
			this.onExit();

			return;
		}

		if (e.key === "r" || e.key === "R") {
			this.onReset();

			return;
		}

		if (e.key === "1") {
			this.onReset("easy");

			return;
		}

		if (e.key === "2") {
			this.onReset("medium");

			return;
		}

		if (e.key === "3") {
			this.onReset("hard");

			return;
		}
	}

	private getCanvasPos(e: MouseEvent): { x: number; y: number } {
		const rect = this.canvas.getBoundingClientRect();

		return {
			x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
			y: (e.clientY - rect.top) * (this.canvas.height / rect.height),
		};
	}

	private getCellFromPos(
		x: number,
		y: number,
	): { row: number; col: number } | null {
		const s = this.state;
		const col = Math.floor((x - s.offsetX) / s.cellSize);
		const row = Math.floor((y - s.offsetY) / s.cellSize);

		if (row < 0 || row >= s.rows || col < 0 || col >= s.cols) return null;

		return { row, col };
	}

	private handleClick(e: MouseEvent): void {
		const s = this.state;
		const { x, y } = this.getCanvasPos(e);

		// Exit button
		if (x < 80 && y < 40) {
			this.onExit();

			return;
		}

		// Difficulty selector buttons in the HUD area
		const diffBtn = this.getDifficultyButton(x, y);

		if (diffBtn) {
			this.onReset(diffBtn);

			return;
		}

		// Game over / won — click anywhere on board to restart
		if (s.status === "won" || s.status === "lost") {
			this.onReset();

			return;
		}

		const cell = this.getCellFromPos(x, y);

		if (!cell) return;

		// First click — place mines and start timer
		if (!s.firstClick) {
			s.firstClick = true;
			s.status = "playing";
			this.boardSystem.placeMines(s, cell.row, cell.col);
		}

		const boardCell = s.board[cell.row][cell.col];

		if (boardCell.revealed && boardCell.adjacentMines > 0) {
			// Chord reveal on already-revealed numbered cells
			this.boardSystem.chordReveal(s, cell.row, cell.col);
		} else {
			this.boardSystem.reveal(s, cell.row, cell.col);
		}
	}

	private handleRightClick(e: MouseEvent): void {
		e.preventDefault();
		const s = this.state;

		if (s.status === "won" || s.status === "lost") return;

		const { x, y } = this.getCanvasPos(e);
		const cell = this.getCellFromPos(x, y);

		if (!cell) return;

		if (!s.firstClick) {
			// Allow flagging before first reveal
			s.firstClick = true;
			s.status = "playing";
			// Don't place mines yet — they get placed on first left-click reveal
			s.firstClick = false;
		}

		this.boardSystem.toggleFlag(s, cell.row, cell.col);
	}

	/** Check if click is on a difficulty button in the HUD. Returns the difficulty or null */
	private getDifficultyButton(x: number, y: number): Difficulty | null {
		const W = this.canvas.width;
		const btnY = 8;
		const btnH = 24;
		const btnW = 70;
		const gap = 8;
		const difficulties: Difficulty[] = ["easy", "medium", "hard"];
		const totalW = difficulties.length * btnW + (difficulties.length - 1) * gap;
		let startX = W - totalW - 12;

		for (const diff of difficulties) {
			if (x >= startX && x <= startX + btnW && y >= btnY && y <= btnY + btnH) {
				return diff;
			}

			startX += btnW + gap;
		}

		return null;
	}
}
