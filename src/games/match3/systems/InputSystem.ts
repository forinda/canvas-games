import type { InputHandler } from "@shared/InputHandler";
import type { Match3State } from "../types";
import type { BoardSystem } from "./BoardSystem";

/**
 * Handles mouse clicks for gem selection and swapping.
 * Also handles keyboard shortcuts (P = pause, Esc = exit, H = help, Space = restart).
 */
export class InputSystem implements InputHandler {
	private state: Match3State;
	private canvas: HTMLCanvasElement;
	private boardSystem: BoardSystem;
	private onExit: () => void;
	private onReset: () => void;
	private onToggleHelp: () => void;

	private handleClick: (e: MouseEvent) => void;
	private handleKeyDown: (e: KeyboardEvent) => void;

	constructor(
		state: Match3State,
		canvas: HTMLCanvasElement,
		boardSystem: BoardSystem,
		onExit: () => void,
		onReset: () => void,
		onToggleHelp: () => void,
	) {
		this.state = state;
		this.canvas = canvas;
		this.boardSystem = boardSystem;
		this.onExit = onExit;
		this.onReset = onReset;
		this.onToggleHelp = onToggleHelp;

		this.handleClick = this.onClick.bind(this);
		this.handleKeyDown = this.onKeyDown.bind(this);
	}

	attach(): void {
		this.canvas.addEventListener("click", this.handleClick);
		window.addEventListener("keydown", this.handleKeyDown);
	}

	detach(): void {
		this.canvas.removeEventListener("click", this.handleClick);
		window.removeEventListener("keydown", this.handleKeyDown);
	}

	private onClick(e: MouseEvent): void {
		const s = this.state;

		if (!s.started) {
			s.started = true;

			return;
		}

		if (s.gameOver || s.paused) return;

		if (s.phase !== "idle") return;

		const rect = this.canvas.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;

		const col = Math.floor((mx - s.boardOffsetX) / s.cellSize);
		const row = Math.floor((my - s.boardOffsetY) / s.cellSize);

		if (row < 0 || row >= s.rows || col < 0 || col >= s.cols) {
			s.selected = null;

			return;
		}

		if (!s.selected) {
			s.selected = { row, col };

			return;
		}

		// Second click — must be adjacent
		const dr = Math.abs(row - s.selected.row);
		const dc = Math.abs(col - s.selected.col);
		const isAdjacent = (dr === 1 && dc === 0) || (dr === 0 && dc === 1);

		if (!isAdjacent) {
			// Select the new gem instead
			s.selected = { row, col };

			return;
		}

		// Perform swap
		s.swapA = { row: s.selected.row, col: s.selected.col };
		s.swapB = { row, col };
		this.boardSystem.swap(
			s,
			s.swapA.row,
			s.swapA.col,
			s.swapB.row,
			s.swapB.col,
		);
		s.movesLeft--;
		s.phase = "swapping";
		s.phaseTimer = 0;
		s.selected = null;
	}

	private onKeyDown(e: KeyboardEvent): void {
		const s = this.state;

		switch (e.key.toLowerCase()) {
			case "escape":
				this.onExit();
				break;
			case "p":
				if (s.started && !s.gameOver) s.paused = !s.paused;

				break;
			case "h":
				this.onToggleHelp();
				break;
			case " ":
				e.preventDefault();

				if (s.gameOver) this.onReset();
				else if (!s.started) s.started = true;

				break;
		}
	}
}
