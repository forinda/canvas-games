import type { Renderable } from "@core/Renderable";
import { GRID, BOX, type SudokuState } from "../types";

export class BoardRenderer implements Renderable<SudokuState> {
	render(ctx: CanvasRenderingContext2D, state: SudokuState): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		// Clear background
		ctx.fillStyle = "#0e0e1a";
		ctx.fillRect(0, 0, W, H);

		const { offsetX, offsetY, cellSize, board, selectedRow, selectedCol } =
			state;

		// Draw cells
		for (let r = 0; r < GRID; r++) {
			for (let c = 0; c < GRID; c++) {
				const x = offsetX + c * cellSize;
				const y = offsetY + r * cellSize;
				const cell = board[r][c];

				// Cell background
				let bg = "#1a1a2e";

				// Highlight same box as selected
				if (selectedRow >= 0 && selectedCol >= 0) {
					const selBoxR = Math.floor(selectedRow / BOX);
					const selBoxC = Math.floor(selectedCol / BOX);
					const cellBoxR = Math.floor(r / BOX);
					const cellBoxC = Math.floor(c / BOX);

					if (
						r === selectedRow ||
						c === selectedCol ||
						(cellBoxR === selBoxR && cellBoxC === selBoxC)
					) {
						bg = "#252545";
					}
				}

				// Selected cell
				if (r === selectedRow && c === selectedCol) {
					bg = "#3a3a6a";
				}

				// Highlight cells with same value as selected
				if (
					selectedRow >= 0 &&
					selectedCol >= 0 &&
					board[selectedRow][selectedCol].value !== 0 &&
					cell.value === board[selectedRow][selectedCol].value &&
					!(r === selectedRow && c === selectedCol)
				) {
					bg = "#2e2e55";
				}

				// Invalid/conflict highlight
				if (cell.invalid && cell.value !== 0) {
					bg = "#4a1a1a";
				}

				ctx.fillStyle = bg;
				ctx.fillRect(x, y, cellSize, cellSize);

				// Draw value
				if (cell.value !== 0) {
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
					const fontSize = Math.max(12, cellSize * 0.55);

					if (cell.given) {
						ctx.font = `bold ${fontSize}px monospace`;
						ctx.fillStyle = "#e0e0e0";
					} else {
						ctx.font = `${fontSize}px monospace`;
						ctx.fillStyle = cell.invalid ? "#ff5555" : "#7e9aff";
					}

					ctx.fillText(
						String(cell.value),
						x + cellSize / 2,
						y + cellSize / 2 + 1,
					);
				} else if (cell.notes.size > 0) {
					// Draw notes
					const noteSize = Math.max(7, cellSize * 0.22);

					ctx.font = `${noteSize}px monospace`;
					ctx.fillStyle = "#888";
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
					const third = cellSize / 3;

					for (let n = 1; n <= 9; n++) {
						if (!cell.notes.has(n)) continue;

						const nr = Math.floor((n - 1) / 3);
						const nc = (n - 1) % 3;
						const nx = x + nc * third + third / 2;
						const ny = y + nr * third + third / 2;

						ctx.fillText(String(n), nx, ny);
					}
				}
			}
		}

		// Draw grid lines
		ctx.strokeStyle = "#444";
		ctx.lineWidth = 1;

		for (let i = 0; i <= GRID; i++) {
			// Horizontal
			const y = offsetY + i * cellSize;

			ctx.beginPath();
			ctx.moveTo(offsetX, y);
			ctx.lineTo(offsetX + GRID * cellSize, y);
			ctx.stroke();
			// Vertical
			const x = offsetX + i * cellSize;

			ctx.beginPath();
			ctx.moveTo(x, offsetY);
			ctx.lineTo(x, offsetY + GRID * cellSize);
			ctx.stroke();
		}

		// Draw thick box borders (3x3)
		ctx.strokeStyle = "#aaa";
		ctx.lineWidth = 2.5;

		for (let i = 0; i <= BOX; i++) {
			// Horizontal
			const y = offsetY + i * BOX * cellSize;

			ctx.beginPath();
			ctx.moveTo(offsetX, y);
			ctx.lineTo(offsetX + GRID * cellSize, y);
			ctx.stroke();
			// Vertical
			const x = offsetX + i * BOX * cellSize;

			ctx.beginPath();
			ctx.moveTo(x, offsetY);
			ctx.lineTo(x, offsetY + GRID * cellSize);
			ctx.stroke();
		}

		// Outer border
		ctx.strokeStyle = "#ccc";
		ctx.lineWidth = 3;
		ctx.strokeRect(offsetX, offsetY, GRID * cellSize, GRID * cellSize);
	}
}
