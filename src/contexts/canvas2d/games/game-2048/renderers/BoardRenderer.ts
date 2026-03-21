import type { Renderable } from "@core/Renderable";
import type { Game2048State, Tile } from "../types";
import { GRID_SIZE } from "../types";

/** Color map for tile values */
const TILE_COLORS: Record<number, { bg: string; fg: string }> = {
	2: { bg: "#eee4da", fg: "#776e65" },
	4: { bg: "#ede0c8", fg: "#776e65" },
	8: { bg: "#f2b179", fg: "#f9f6f2" },
	16: { bg: "#f59563", fg: "#f9f6f2" },
	32: { bg: "#f67c5f", fg: "#f9f6f2" },
	64: { bg: "#f65e3b", fg: "#f9f6f2" },
	128: { bg: "#edcf72", fg: "#f9f6f2" },
	256: { bg: "#edcc61", fg: "#f9f6f2" },
	512: { bg: "#edc850", fg: "#f9f6f2" },
	1024: { bg: "#edc53f", fg: "#f9f6f2" },
	2048: { bg: "#edc22e", fg: "#f9f6f2" },
};

const DEFAULT_TILE_COLOR = { bg: "#3c3a32", fg: "#f9f6f2" };
const BOARD_BG = "#bbada0";
const CELL_BG = "rgba(238,228,218,0.35)";

export class BoardRenderer implements Renderable<Game2048State> {
	render(ctx: CanvasRenderingContext2D, state: Game2048State): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		// Clear
		ctx.fillStyle = "#faf8ef";
		ctx.fillRect(0, 0, W, H);

		// Compute board dimensions
		const boardSize = Math.min(W * 0.85, H * 0.6, 500);
		const padding = boardSize * 0.03;
		const cellSize = (boardSize - padding * (GRID_SIZE + 1)) / GRID_SIZE;
		const boardX = (W - boardSize) / 2;
		const boardY = H * 0.3;

		// Draw board background
		ctx.fillStyle = BOARD_BG;
		ctx.beginPath();
		ctx.roundRect(boardX, boardY, boardSize, boardSize, 8);
		ctx.fill();

		// Draw empty cells
		for (let r = 0; r < GRID_SIZE; r++) {
			for (let c = 0; c < GRID_SIZE; c++) {
				const x = boardX + padding + c * (cellSize + padding);
				const y = boardY + padding + r * (cellSize + padding);

				ctx.fillStyle = CELL_BG;
				ctx.beginPath();
				ctx.roundRect(x, y, cellSize, cellSize, 4);
				ctx.fill();
			}
		}

		// Draw tiles
		const t = Math.min(state.animProgress, 1);

		for (let r = 0; r < GRID_SIZE; r++) {
			for (let c = 0; c < GRID_SIZE; c++) {
				const tile = state.grid[r][c];

				if (!tile) continue;

				// If merged, draw the two source tiles sliding in during animation
				if (tile.mergedFrom && t < 1) {
					for (const src of tile.mergedFrom) {
						this.drawTile(
							ctx,
							src,
							boardX,
							boardY,
							padding,
							cellSize,
							t,
							false,
						);
					}
				} else {
					this.drawTile(ctx, tile, boardX, boardY, padding, cellSize, t, true);
				}
			}
		}
	}

	private drawTile(
		ctx: CanvasRenderingContext2D,
		tile: Tile,
		boardX: number,
		boardY: number,
		padding: number,
		cellSize: number,
		t: number,
		allowScale: boolean,
	): void {
		// Interpolate position
		const curRow = tile.prevRow + (tile.row - tile.prevRow) * t;
		const curCol = tile.prevCol + (tile.col - tile.prevCol) * t;

		const x = boardX + padding + curCol * (cellSize + padding);
		const y = boardY + padding + curRow * (cellSize + padding);

		// Scale for new/merged tiles
		let scale = 1;

		if (allowScale && (tile.isNew || tile.mergedFrom) && t < 1) {
			// Pop-in effect
			scale = 0.2 + 0.8 * t;
		}

		const colors = TILE_COLORS[tile.value] ?? DEFAULT_TILE_COLOR;

		ctx.save();

		if (scale !== 1) {
			const cx = x + cellSize / 2;
			const cy = y + cellSize / 2;

			ctx.translate(cx, cy);
			ctx.scale(scale, scale);
			ctx.translate(-cx, -cy);
		}

		// Tile background
		ctx.fillStyle = colors.bg;
		ctx.beginPath();
		ctx.roundRect(x, y, cellSize, cellSize, 4);
		ctx.fill();

		// Tile text
		const fontSize =
			tile.value >= 1024
				? cellSize * 0.3
				: tile.value >= 128
					? cellSize * 0.35
					: cellSize * 0.45;

		ctx.font = `bold ${fontSize}px 'Clear Sans', 'Helvetica Neue', Arial, sans-serif`;
		ctx.fillStyle = colors.fg;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(String(tile.value), x + cellSize / 2, y + cellSize / 2);

		ctx.restore();
	}
}
