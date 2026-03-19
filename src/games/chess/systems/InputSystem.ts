import type { InputHandler } from "@shared/InputHandler.ts";
import type { ChessState, Position, GameMode, PieceType } from "../types.ts";
import { BOARD_SIZE } from "../types.ts";

export class InputSystem implements InputHandler {
	private canvas: HTMLCanvasElement;
	private state: ChessState;
	private onExit: () => void;
	private onSquareClick: (pos: Position) => void;
	private onModeSelect: (mode: GameMode) => void;
	private onRestart: () => void;
	private onToggleHelp: () => void;
	private onUndo: () => void;
	private onPromotionChoice: (choice: PieceType) => void;

	private clickHandler: (e: MouseEvent) => void;
	private keyHandler: (e: KeyboardEvent) => void;

	constructor(
		canvas: HTMLCanvasElement,
		state: ChessState,
		onExit: () => void,
		onSquareClick: (pos: Position) => void,
		onModeSelect: (mode: GameMode) => void,
		onRestart: () => void,
		onToggleHelp: () => void,
		onUndo: () => void,
		onPromotionChoice: (choice: PieceType) => void,
	) {
		this.canvas = canvas;
		this.state = state;
		this.onExit = onExit;
		this.onSquareClick = onSquareClick;
		this.onModeSelect = onModeSelect;
		this.onRestart = onRestart;
		this.onToggleHelp = onToggleHelp;
		this.onUndo = onUndo;
		this.onPromotionChoice = onPromotionChoice;

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

		if (s.showModeSelect) {
			const cw = s.canvasWidth;
			const ch = s.canvasHeight;
			const btnW = 220;
			const btnH = 50;
			const centerX = cw / 2;
			const centerY = ch / 2;

			const aiX = centerX - btnW / 2;
			const aiY = centerY - 10 - btnH;

			if (mx >= aiX && mx <= aiX + btnW && my >= aiY && my <= aiY + btnH) {
				this.onModeSelect("ai");

				return;
			}

			const twoX = centerX - btnW / 2;
			const twoY = centerY + 10;

			if (mx >= twoX && mx <= twoX + btnW && my >= twoY && my <= twoY + btnH) {
				this.onModeSelect("2player");

				return;
			}

			return;
		}

		// Handle promotion picker clicks
		if (s.pendingPromotion) {
			const boardInfo = this.getBoardLayout();
			const promoCol = s.pendingPromotion.col;
			const promoRow = s.pendingPromotion.row;
			const cellSize = boardInfo.cellSize;
			const pickerX = boardInfo.x + promoCol * cellSize;
			// Picker extends downward for white (row 0) or upward for black (row 7)
			const goingDown = promoRow === 0;
			const choices: PieceType[] = ["queen", "rook", "bishop", "knight"];

			for (let i = 0; i < choices.length; i++) {
				const py = goingDown
					? boardInfo.y + i * cellSize
					: boardInfo.y + (BOARD_SIZE - 1 - i) * cellSize;

				if (
					mx >= pickerX &&
					mx <= pickerX + cellSize &&
					my >= py &&
					my <= py + cellSize
				) {
					this.onPromotionChoice(choices[i]);

					return;
				}
			}

			// Click outside the picker does nothing while promotion is pending
			return;
		}

		// Convert to board coordinates
		const boardInfo = this.getBoardLayout();
		const col = Math.floor((mx - boardInfo.x) / boardInfo.cellSize);
		const row = Math.floor((my - boardInfo.y) / boardInfo.cellSize);

		if (col >= 0 && col < 8 && row >= 0 && row < 8) {
			this.onSquareClick({ row, col });
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
		} else if (e.key === "u" || e.key === "U") {
			this.onUndo();
		}
	}

	private getBoardLayout(): { x: number; y: number; cellSize: number } {
		const s = this.state;
		const size = Math.min(s.canvasWidth * 0.65, s.canvasHeight * 0.8);
		const cellSize = size / 8;
		const x = (s.canvasWidth - size) / 2 - s.canvasWidth * 0.08;
		const y = (s.canvasHeight - size) / 2;

		return { x, y, cellSize };
	}
}
