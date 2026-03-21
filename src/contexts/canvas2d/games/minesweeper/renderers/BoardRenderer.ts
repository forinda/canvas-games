import type { Renderable } from "@core/Renderable";
import type { MinesweeperState } from "../types";
import { NUMBER_COLORS } from "../types";

export class BoardRenderer implements Renderable<MinesweeperState> {
	render(ctx: CanvasRenderingContext2D, state: MinesweeperState): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		// Clear
		ctx.fillStyle = "#1a1a2e";
		ctx.fillRect(0, 0, W, H);

		const { board, rows, cols, offsetX, offsetY, cellSize } = state;

		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				const cell = board[r][c];
				const x = offsetX + c * cellSize;
				const y = offsetY + r * cellSize;

				// Cell background
				if (cell.revealed) {
					ctx.fillStyle = cell.mine ? "#7f1d1d" : "#2a2a4a";
				} else {
					ctx.fillStyle = "#3a3a5c";
				}

				ctx.fillRect(x, y, cellSize, cellSize);

				// Cell border
				ctx.strokeStyle = "#1a1a2e";
				ctx.lineWidth = 1;
				ctx.strokeRect(x, y, cellSize, cellSize);

				// Unrevealed raised effect
				if (!cell.revealed) {
					ctx.fillStyle = "rgba(255,255,255,0.08)";
					ctx.fillRect(x, y, cellSize, 2);
					ctx.fillRect(x, y, 2, cellSize);
					ctx.fillStyle = "rgba(0,0,0,0.15)";
					ctx.fillRect(x + cellSize - 2, y, 2, cellSize);
					ctx.fillRect(x, y + cellSize - 2, cellSize, 2);
				}

				const cx = x + cellSize / 2;
				const cy = y + cellSize / 2;

				if (cell.revealed) {
					if (cell.mine) {
						this.drawMine(ctx, cx, cy, cellSize);
					} else if (cell.adjacentMines > 0) {
						this.drawNumber(ctx, cx, cy, cellSize, cell.adjacentMines);
					}
				} else if (cell.flagged) {
					this.drawFlag(ctx, cx, cy, cellSize);
				}
			}
		}

		// Board border
		ctx.strokeStyle = "#555";
		ctx.lineWidth = 2;
		ctx.strokeRect(
			offsetX - 1,
			offsetY - 1,
			cols * cellSize + 2,
			rows * cellSize + 2,
		);
	}

	private drawMine(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		size: number,
	): void {
		const r = size * 0.28;

		ctx.fillStyle = "#1e1e1e";
		ctx.beginPath();
		ctx.arc(cx, cy, r, 0, Math.PI * 2);
		ctx.fill();

		// Spikes
		ctx.strokeStyle = "#1e1e1e";
		ctx.lineWidth = 2;

		for (let i = 0; i < 4; i++) {
			const angle = (i * Math.PI) / 4;

			ctx.beginPath();
			ctx.moveTo(
				cx + Math.cos(angle) * r * 0.5,
				cy + Math.sin(angle) * r * 0.5,
			);
			ctx.lineTo(
				cx + Math.cos(angle) * r * 1.5,
				cy + Math.sin(angle) * r * 1.5,
			);
			ctx.stroke();
		}

		// Highlight
		ctx.fillStyle = "rgba(255,255,255,0.4)";
		ctx.beginPath();
		ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.2, 0, Math.PI * 2);
		ctx.fill();
	}

	private drawNumber(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		size: number,
		num: number,
	): void {
		const fontSize = Math.floor(size * 0.55);

		ctx.font = `bold ${fontSize}px monospace`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = NUMBER_COLORS[num] ?? "#fff";
		ctx.fillText(String(num), cx, cy + 1);
	}

	private drawFlag(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		size: number,
	): void {
		const s = size * 0.25;

		// Pole
		ctx.strokeStyle = "#aaa";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(cx, cy - s * 1.2);
		ctx.lineTo(cx, cy + s);
		ctx.stroke();

		// Flag triangle
		ctx.fillStyle = "#ef4444";
		ctx.beginPath();
		ctx.moveTo(cx, cy - s * 1.2);
		ctx.lineTo(cx + s * 1.2, cy - s * 0.4);
		ctx.lineTo(cx, cy + s * 0.2);
		ctx.closePath();
		ctx.fill();

		// Base
		ctx.fillStyle = "#aaa";
		ctx.fillRect(cx - s * 0.6, cy + s, s * 1.2, 2);
	}
}
