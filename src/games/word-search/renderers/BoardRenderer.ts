import type { Renderable } from "@shared/Renderable";
import type { WordSearchState } from "../types";
import { GAME_COLOR } from "../types";

export class BoardRenderer implements Renderable<WordSearchState> {
	render(ctx: CanvasRenderingContext2D, state: WordSearchState): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		// Background
		ctx.fillStyle = "#0a0a1a";
		ctx.fillRect(0, 0, W, H);

		const { offsetX, offsetY, cellSize, rows, cols } = state;

		// Grid background
		ctx.fillStyle = "#151530";
		ctx.beginPath();
		ctx.roundRect(
			offsetX - 4,
			offsetY - 4,
			cols * cellSize + 8,
			rows * cellSize + 8,
			8,
		);
		ctx.fill();

		ctx.strokeStyle = "rgba(92, 107, 192, 0.3)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.roundRect(
			offsetX - 4,
			offsetY - 4,
			cols * cellSize + 8,
			rows * cellSize + 8,
			8,
		);
		ctx.stroke();

		// Draw found word highlights
		for (const pw of state.placedWords) {
			if (!pw.found) continue;

			const color = state.foundColors.get(pw.word) || GAME_COLOR;

			this.drawWordHighlight(ctx, state, pw.cells, color, 0.3);
		}

		// Draw current selection highlight
		if (state.selection.length > 0) {
			this.drawWordHighlight(ctx, state, state.selection, GAME_COLOR, 0.4);
		}

		// Draw grid lines
		ctx.strokeStyle = "rgba(255,255,255,0.05)";
		ctx.lineWidth = 1;

		for (let r = 0; r <= rows; r++) {
			ctx.beginPath();
			ctx.moveTo(offsetX, offsetY + r * cellSize);
			ctx.lineTo(offsetX + cols * cellSize, offsetY + r * cellSize);
			ctx.stroke();
		}

		for (let c = 0; c <= cols; c++) {
			ctx.beginPath();
			ctx.moveTo(offsetX + c * cellSize, offsetY);
			ctx.lineTo(offsetX + c * cellSize, offsetY + rows * cellSize);
			ctx.stroke();
		}

		// Draw letters
		const fontSize = Math.max(12, cellSize * 0.55);

		ctx.font = `bold ${fontSize}px monospace`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				const cell = state.grid[r][c];
				const cx = offsetX + c * cellSize + cellSize / 2;
				const cy = offsetY + r * cellSize + cellSize / 2;

				// Check if this cell is part of a found word
				const isFound = this.isCellInFoundWord(state, r, c);
				const isSelected = state.selection.some(
					(s) => s.row === r && s.col === c,
				);

				if (isFound) {
					ctx.fillStyle = "#fff";
				} else if (isSelected) {
					ctx.fillStyle = "#e0e0ff";
				} else {
					ctx.fillStyle = "#8888aa";
				}

				ctx.fillText(cell.letter, cx, cy);
			}
		}
	}

	private drawWordHighlight(
		ctx: CanvasRenderingContext2D,
		state: WordSearchState,
		cells: { row: number; col: number }[],
		color: string,
		alpha: number,
	): void {
		if (cells.length === 0) return;

		const { offsetX, offsetY, cellSize } = state;
		const half = cellSize / 2;

		// Draw a rounded line through all cells
		const first = cells[0];
		const last = cells[cells.length - 1];

		const x1 = offsetX + first.col * cellSize + half;
		const y1 = offsetY + first.row * cellSize + half;
		const x2 = offsetX + last.col * cellSize + half;
		const y2 = offsetY + last.row * cellSize + half;

		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.strokeStyle = color;
		ctx.lineWidth = cellSize * 0.75;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
		ctx.restore();
	}

	private isCellInFoundWord(
		state: WordSearchState,
		row: number,
		col: number,
	): boolean {
		for (const pw of state.placedWords) {
			if (!pw.found) continue;

			if (pw.cells.some((c) => c.row === row && c.col === col)) return true;
		}

		return false;
	}
}
