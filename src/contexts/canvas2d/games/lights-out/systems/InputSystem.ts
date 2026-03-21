import type { InputHandler } from "@core/InputHandler";
import type { LightsOutState } from "../types";
import type { BoardSystem } from "./BoardSystem";

export class InputSystem implements InputHandler {
	private state: LightsOutState;
	private canvas: HTMLCanvasElement;
	private boardSystem: BoardSystem;
	private onExit: () => void;
	private onReset: () => void;

	private keyHandler: (e: KeyboardEvent) => void;
	private clickHandler: (e: MouseEvent) => void;

	constructor(
		state: LightsOutState,
		canvas: HTMLCanvasElement,
		boardSystem: BoardSystem,
		onExit: () => void,
		onReset: () => void,
	) {
		this.state = state;
		this.canvas = canvas;
		this.boardSystem = boardSystem;
		this.onExit = onExit;
		this.onReset = onReset;

		this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
		this.clickHandler = (e: MouseEvent) => this.handleClick(e);
	}

	attach(): void {
		window.addEventListener("keydown", this.keyHandler);
		this.canvas.addEventListener("click", this.clickHandler);
	}

	detach(): void {
		window.removeEventListener("keydown", this.keyHandler);
		this.canvas.removeEventListener("click", this.clickHandler);
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

		if (e.key === "n" || e.key === "N") {
			if (this.state.status === "level-complete") {
				this.boardSystem.nextLevel(this.state);
			}

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

		if (row < 0 || row >= 5 || col < 0 || col >= 5) return null;

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

		// Level complete — click to advance
		if (s.status === "level-complete") {
			this.boardSystem.nextLevel(s);

			return;
		}

		// All done — click to restart from level 1
		if (s.status === "all-done") {
			this.boardSystem.loadLevel(s, 0);
			this.computeLayout();

			return;
		}

		const cell = this.getCellFromPos(x, y);

		if (!cell) return;

		this.boardSystem.toggle(s, cell.row, cell.col);
	}

	private computeLayout(): void {
		const W = this.canvas.width;
		const H = this.canvas.height;
		const hudHeight = 50;
		const padding = 20;

		const availW = W - padding * 2;
		const availH = H - hudHeight - padding * 2;

		const cellW = Math.floor(availW / 5);
		const cellH = Math.floor(availH / 5);

		this.state.cellSize = Math.max(40, Math.min(cellW, cellH, 100));

		const boardW = 5 * this.state.cellSize;
		const boardH = 5 * this.state.cellSize;

		this.state.offsetX = Math.floor((W - boardW) / 2);
		this.state.offsetY = Math.floor(hudHeight + (H - hudHeight - boardH) / 2);
	}
}
