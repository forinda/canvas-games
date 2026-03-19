import type { InputHandler } from "@shared/InputHandler";
import type { MemoryState } from "../types";
import type { BoardSystem } from "./BoardSystem";

/**
 * Handles mouse clicks for flipping cards and keyboard shortcuts.
 */
export class InputSystem implements InputHandler {
	private state: MemoryState;
	private canvas: HTMLCanvasElement;
	private boardSystem: BoardSystem;
	private onExit: () => void;
	private onReset: () => void;
	private onToggleHelp: () => void;
	private onChangeDifficulty: (dir: number) => void;

	private handleClick: (e: MouseEvent) => void;
	private handleKeyDown: (e: KeyboardEvent) => void;

	constructor(
		state: MemoryState,
		canvas: HTMLCanvasElement,
		boardSystem: BoardSystem,
		onExit: () => void,
		onReset: () => void,
		onToggleHelp: () => void,
		onChangeDifficulty: (dir: number) => void,
	) {
		this.state = state;
		this.canvas = canvas;
		this.boardSystem = boardSystem;
		this.onExit = onExit;
		this.onReset = onReset;
		this.onToggleHelp = onToggleHelp;
		this.onChangeDifficulty = onChangeDifficulty;

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
			s.timerRunning = true;

			return;
		}

		if (s.gameOver || s.paused) return;

		// Don't allow clicks while two cards are revealed (waiting for auto-flip)
		if (s.phase === "two-flipped" || s.phase === "checking") return;

		const rect = this.canvas.getBoundingClientRect();
		const mx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
		const my = (e.clientY - rect.top) * (this.canvas.height / rect.height);

		const col = Math.floor((mx - s.boardOffsetX) / s.cellSize);
		const row = Math.floor((my - s.boardOffsetY) / s.cellSize);

		if (row < 0 || row >= s.rows || col < 0 || col >= s.cols) return;

		const idx = row * s.cols + col;
		const card = s.board[idx];

		if (!card || card.flipped || card.matched) return;

		this.boardSystem.flipCard(s, idx);
	}

	private onKeyDown(e: KeyboardEvent): void {
		const s = this.state;

		switch (e.key.toLowerCase()) {
			case "escape":
				this.onExit();
				break;
			case "p":
				if (s.started && !s.gameOver) {
					s.paused = !s.paused;
					s.timerRunning = !s.paused;
				}

				break;
			case "h":
				this.onToggleHelp();
				break;
			case " ":
				e.preventDefault();

				if (s.gameOver) this.onReset();
				else if (!s.started) {
					s.started = true;
					s.timerRunning = true;
				}

				break;
			case "arrowleft":
				if (!s.started || s.gameOver) this.onChangeDifficulty(-1);

				break;
			case "arrowright":
				if (!s.started || s.gameOver) this.onChangeDifficulty(1);

				break;
			case "r":
				if (s.started) this.onReset();

				break;
		}
	}
}
