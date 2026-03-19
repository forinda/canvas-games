import type { InputHandler } from "@shared/InputHandler.ts";
import type { TicTacToeState } from "../types.ts";

export class InputSystem implements InputHandler {
	private canvas: HTMLCanvasElement;
	private state: TicTacToeState;
	private onExit: () => void;
	private onCellClick: (index: number) => void;
	private onModeSelect: (mode: "ai" | "2player") => void;
	private onRestart: () => void;
	private onToggleHelp: () => void;

	private clickHandler: (e: MouseEvent) => void;
	private keyHandler: (e: KeyboardEvent) => void;

	constructor(
		canvas: HTMLCanvasElement,
		state: TicTacToeState,
		onExit: () => void,
		onCellClick: (index: number) => void,
		onModeSelect: (mode: "ai" | "2player") => void,
		onRestart: () => void,
		onToggleHelp: () => void,
	) {
		this.canvas = canvas;
		this.state = state;
		this.onExit = onExit;
		this.onCellClick = onCellClick;
		this.onModeSelect = onModeSelect;
		this.onRestart = onRestart;
		this.onToggleHelp = onToggleHelp;

		this.clickHandler = (e: MouseEvent) => this.handleClick(e);
		this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
	}

	attach(): void {
		this.canvas.addEventListener("click", this.clickHandler);
		window.addEventListener("keydown", this.keyHandler);
	}

	detach(): void {
		this.canvas.removeEventListener("click", this.clickHandler);
		window.removeEventListener("keydown", this.keyHandler);
	}

	private handleClick(e: MouseEvent): void {
		const rect = this.canvas.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;

		const s = this.state;

		// Mode selection screen
		if (s.showModeSelect) {
			const cw = s.canvasWidth;
			const ch = s.canvasHeight;
			const btnW = 200;
			const btnH = 50;
			const centerX = cw / 2;
			const centerY = ch / 2;

			// AI button
			const aiX = centerX - btnW / 2;
			const aiY = centerY - 10 - btnH;

			if (mx >= aiX && mx <= aiX + btnW && my >= aiY && my <= aiY + btnH) {
				this.onModeSelect("ai");

				return;
			}

			// 2-player button
			const twoX = centerX - btnW / 2;
			const twoY = centerY + 10;

			if (mx >= twoX && mx <= twoX + btnW && my >= twoY && my <= twoY + btnH) {
				this.onModeSelect("2player");

				return;
			}

			return;
		}

		// Game over - click to restart
		if (s.gameOver) {
			this.onRestart();

			return;
		}

		// AI thinking - ignore clicks
		if (s.aiThinking) return;

		// Board click
		const boardSize = this.getBoardSize();
		const boardX = (s.canvasWidth - boardSize) / 2;
		const boardY = (s.canvasHeight - boardSize) / 2 + 20;
		const cellSize = boardSize / 3;

		const col = Math.floor((mx - boardX) / cellSize);
		const row = Math.floor((my - boardY) / cellSize);

		if (col >= 0 && col < 3 && row >= 0 && row < 3) {
			this.onCellClick(row * 3 + col);
		}
	}

	private handleKey(e: KeyboardEvent): void {
		if (e.key === "Escape") {
			this.onExit();
		} else if (e.key === "r" || e.key === "R") {
			this.onRestart();
		} else if (e.key === "h" || e.key === "H") {
			this.onToggleHelp();
		} else if (e.key === "m" || e.key === "M") {
			this.state.showModeSelect = true;
			this.state.gameOver = false;
		}
	}

	private getBoardSize(): number {
		return Math.min(this.state.canvasWidth, this.state.canvasHeight) * 0.6;
	}
}
