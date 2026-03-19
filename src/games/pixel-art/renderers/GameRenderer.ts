import type { Renderable } from "@shared/Renderable";
import type { PixelArtState } from "../types";
import { HUD_HEIGHT } from "../types";

export class GameRenderer implements Renderable<PixelArtState> {
	render(ctx: CanvasRenderingContext2D, state: PixelArtState): void {
		const W = state.canvasWidth;
		const H = state.canvasHeight;

		// Clear entire canvas
		ctx.fillStyle = "#1a1a2e";
		ctx.fillRect(0, 0, W, H);

		const availH = H - HUD_HEIGHT;
		const cellSize = Math.floor(
			Math.min(W / state.gridSize, availH / state.gridSize),
		);
		const gridPixelW = cellSize * state.gridSize;
		const gridPixelH = cellSize * state.gridSize;
		const offsetX = Math.floor((W - gridPixelW) / 2);
		const offsetY = Math.floor((availH - gridPixelH) / 2);

		// Draw checkerboard background for empty cells
		for (let y = 0; y < state.gridSize; y++) {
			for (let x = 0; x < state.gridSize; x++) {
				const px = offsetX + x * cellSize;
				const py = offsetY + y * cellSize;
				const color = state.grid[y][x];

				if (color !== null) {
					ctx.fillStyle = color;
				} else {
					// Checkerboard pattern for transparency
					const isLight = (x + y) % 2 === 0;

					ctx.fillStyle = isLight ? "#2a2a3e" : "#22223a";
				}

				ctx.fillRect(px, py, cellSize, cellSize);
			}
		}

		// Draw grid lines
		ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
		ctx.lineWidth = 1;

		for (let x = 0; x <= state.gridSize; x++) {
			const px = offsetX + x * cellSize;

			ctx.beginPath();
			ctx.moveTo(px + 0.5, offsetY);
			ctx.lineTo(px + 0.5, offsetY + gridPixelH);
			ctx.stroke();
		}

		for (let y = 0; y <= state.gridSize; y++) {
			const py = offsetY + y * cellSize;

			ctx.beginPath();
			ctx.moveTo(offsetX, py + 0.5);
			ctx.lineTo(offsetX + gridPixelW, py + 0.5);
			ctx.stroke();
		}

		// Hover preview
		if (state.hoverActive) {
			const hx = state.hoverX;
			const hy = state.hoverY;

			if (hx >= 0 && hx < state.gridSize && hy >= 0 && hy < state.gridSize) {
				const px = offsetX + hx * cellSize;
				const py = offsetY + hy * cellSize;

				if (state.currentTool === "draw" || state.currentTool === "fill") {
					ctx.fillStyle = state.currentColor + "80"; // semi-transparent preview
					ctx.fillRect(px, py, cellSize, cellSize);
				}

				// Highlight border
				ctx.strokeStyle = "#ffffff";
				ctx.lineWidth = 2;
				ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
			}
		}
	}
}
