import type { InputHandler } from "@core/InputHandler";
import type { WordSearchState } from "../types";
import type { WordSystem } from "./WordSystem";

export class InputSystem implements InputHandler {
	private state: WordSearchState;
	private canvas: HTMLCanvasElement;
	private wordSystem: WordSystem;
	private onExit: () => void;
	private onReset: () => void;
	private onToggleHelp: () => void;

	private handleMouseDown: (e: MouseEvent) => void;
	private handleMouseMove: (e: MouseEvent) => void;
	private handleMouseUp: (e: MouseEvent) => void;
	private handleKeyDown: (e: KeyboardEvent) => void;
	private handleTouchStart: (e: TouchEvent) => void;
	private handleTouchMove: (e: TouchEvent) => void;
	private handleTouchEnd: (e: TouchEvent) => void;

	constructor(
		state: WordSearchState,
		canvas: HTMLCanvasElement,
		wordSystem: WordSystem,
		onExit: () => void,
		onReset: () => void,
		onToggleHelp: () => void,
	) {
		this.state = state;
		this.canvas = canvas;
		this.wordSystem = wordSystem;
		this.onExit = onExit;
		this.onReset = onReset;
		this.onToggleHelp = onToggleHelp;

		this.handleMouseDown = (e: MouseEvent) => {
			if (this.state.status !== "playing") return;

			const cell = this.getCellFromPos(e.clientX, e.clientY);

			if (cell) {
				this.state.dragging = true;
				this.state.dragStart = cell;
				this.state.selection = [cell];
				this.state.pointerPos = { x: e.clientX, y: e.clientY };
			}
		};

		this.handleMouseMove = (e: MouseEvent) => {
			if (!this.state.dragging || !this.state.dragStart) return;

			this.state.pointerPos = { x: e.clientX, y: e.clientY };
			const cell = this.getCellFromPos(e.clientX, e.clientY);

			if (cell) {
				this.state.selection = this.getLineCells(this.state.dragStart, cell);
			}
		};

		this.handleMouseUp = (_e: MouseEvent) => {
			if (!this.state.dragging) return;

			this.state.dragging = false;
			this.state.pointerPos = null;
			this.wordSystem.checkSelection(this.state);
			this.state.selection = [];
			this.state.dragStart = null;
		};

		this.handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				this.onExit();
			} else if (e.key === "r" || e.key === "R") {
				this.onReset();
			} else if (e.key === "h" || e.key === "H") {
				this.onToggleHelp();
			}
		};

		this.handleTouchStart = (e: TouchEvent) => {
			e.preventDefault();

			if (this.state.status !== "playing") return;

			const t = e.touches[0];
			const cell = this.getCellFromPos(t.clientX, t.clientY);

			if (cell) {
				this.state.dragging = true;
				this.state.dragStart = cell;
				this.state.selection = [cell];
				this.state.pointerPos = { x: t.clientX, y: t.clientY };
			}
		};

		this.handleTouchMove = (e: TouchEvent) => {
			e.preventDefault();

			if (!this.state.dragging || !this.state.dragStart) return;

			const t = e.touches[0];

			this.state.pointerPos = { x: t.clientX, y: t.clientY };
			const cell = this.getCellFromPos(t.clientX, t.clientY);

			if (cell) {
				this.state.selection = this.getLineCells(this.state.dragStart, cell);
			}
		};

		this.handleTouchEnd = (e: TouchEvent) => {
			e.preventDefault();

			if (!this.state.dragging) return;

			this.state.dragging = false;
			this.state.pointerPos = null;
			this.wordSystem.checkSelection(this.state);
			this.state.selection = [];
			this.state.dragStart = null;
		};
	}

	attach(): void {
		this.canvas.addEventListener("mousedown", this.handleMouseDown);
		window.addEventListener("mousemove", this.handleMouseMove);
		window.addEventListener("mouseup", this.handleMouseUp);
		window.addEventListener("keydown", this.handleKeyDown);
		this.canvas.addEventListener("touchstart", this.handleTouchStart, {
			passive: false,
		});
		this.canvas.addEventListener("touchmove", this.handleTouchMove, {
			passive: false,
		});
		this.canvas.addEventListener("touchend", this.handleTouchEnd, {
			passive: false,
		});
	}

	detach(): void {
		this.canvas.removeEventListener("mousedown", this.handleMouseDown);
		window.removeEventListener("mousemove", this.handleMouseMove);
		window.removeEventListener("mouseup", this.handleMouseUp);
		window.removeEventListener("keydown", this.handleKeyDown);
		this.canvas.removeEventListener("touchstart", this.handleTouchStart);
		this.canvas.removeEventListener("touchmove", this.handleTouchMove);
		this.canvas.removeEventListener("touchend", this.handleTouchEnd);
	}

	private getCellFromPos(
		x: number,
		y: number,
	): { row: number; col: number } | null {
		const s = this.state;
		const col = Math.floor((x - s.offsetX) / s.cellSize);
		const row = Math.floor((y - s.offsetY) / s.cellSize);

		if (row >= 0 && row < s.rows && col >= 0 && col < s.cols) {
			return { row, col };
		}

		return null;
	}

	/** Get cells along the line from start to end, constrained to horizontal/vertical/diagonal */
	private getLineCells(
		start: { row: number; col: number },
		end: { row: number; col: number },
	): { row: number; col: number }[] {
		const dr = end.row - start.row;
		const dc = end.col - start.col;

		// Determine dominant direction (horizontal, vertical, or diagonal)
		const absDr = Math.abs(dr);
		const absDc = Math.abs(dc);

		let stepR: number;
		let stepC: number;
		let steps: number;

		if (absDr === 0 && absDc === 0) {
			return [{ row: start.row, col: start.col }];
		}

		if (absDr >= absDc * 2) {
			// Vertical
			stepR = dr > 0 ? 1 : -1;
			stepC = 0;
			steps = absDr;
		} else if (absDc >= absDr * 2) {
			// Horizontal
			stepR = 0;
			stepC = dc > 0 ? 1 : -1;
			steps = absDc;
		} else {
			// Diagonal
			stepR = dr > 0 ? 1 : -1;
			stepC = dc > 0 ? 1 : -1;
			steps = Math.max(absDr, absDc);
		}

		const cells: { row: number; col: number }[] = [];

		for (let i = 0; i <= steps; i++) {
			const r = start.row + i * stepR;
			const c = start.col + i * stepC;

			if (r >= 0 && r < this.state.rows && c >= 0 && c < this.state.cols) {
				cells.push({ row: r, col: c });
			}
		}

		return cells;
	}
}
