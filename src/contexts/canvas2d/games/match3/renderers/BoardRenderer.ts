import type { Renderable } from "@core/Renderable";
import type { Match3State } from "../types";
import { GEM_COLORS, GEM_GLOW, ROWS, COLS } from "../types";

/** Draws the board background, gems (colored circles with glow), and selection highlight */
export class BoardRenderer implements Renderable<Match3State> {
	render(ctx: CanvasRenderingContext2D, state: Match3State): void {
		const { board, cellSize, boardOffsetX, boardOffsetY, selected, matched } =
			state;

		// Board background
		ctx.fillStyle = "#1a1a2e";
		ctx.beginPath();
		ctx.roundRect(
			boardOffsetX - 4,
			boardOffsetY - 4,
			COLS * cellSize + 8,
			ROWS * cellSize + 8,
			12,
		);
		ctx.fill();

		// Grid lines (subtle)
		ctx.strokeStyle = "rgba(255,255,255,0.05)";
		ctx.lineWidth = 1;

		for (let r = 0; r <= ROWS; r++) {
			ctx.beginPath();
			ctx.moveTo(boardOffsetX, boardOffsetY + r * cellSize);
			ctx.lineTo(boardOffsetX + COLS * cellSize, boardOffsetY + r * cellSize);
			ctx.stroke();
		}

		for (let c = 0; c <= COLS; c++) {
			ctx.beginPath();
			ctx.moveTo(boardOffsetX + c * cellSize, boardOffsetY);
			ctx.lineTo(boardOffsetX + c * cellSize, boardOffsetY + ROWS * cellSize);
			ctx.stroke();
		}

		// Selected highlight
		if (selected) {
			ctx.fillStyle = "rgba(255,255,255,0.15)";
			ctx.fillRect(
				boardOffsetX + selected.col * cellSize,
				boardOffsetY + selected.row * cellSize,
				cellSize,
				cellSize,
			);
			ctx.strokeStyle = "#fff";
			ctx.lineWidth = 2;
			ctx.strokeRect(
				boardOffsetX + selected.col * cellSize + 1,
				boardOffsetY + selected.row * cellSize + 1,
				cellSize - 2,
				cellSize - 2,
			);
		}

		// Gems
		const radius = cellSize * 0.38;

		for (let r = 0; r < ROWS; r++) {
			for (let c = 0; c < COLS; c++) {
				const gem = board[r][c];

				if (!gem) continue;

				ctx.save();
				ctx.globalAlpha = gem.opacity;

				const cx = gem.x;
				const cy = gem.y;
				const drawRadius = radius * gem.scale;

				// Glow
				const isMatched = matched.has(`${r},${c}`);

				if (isMatched) {
					ctx.shadowColor = GEM_GLOW[gem.type];
					ctx.shadowBlur = 20;
				} else {
					ctx.shadowColor = GEM_GLOW[gem.type];
					ctx.shadowBlur = 8;
				}

				// Main circle
				const gradient = ctx.createRadialGradient(
					cx - drawRadius * 0.3,
					cy - drawRadius * 0.3,
					drawRadius * 0.1,
					cx,
					cy,
					drawRadius,
				);

				gradient.addColorStop(0, GEM_GLOW[gem.type]);
				gradient.addColorStop(1, GEM_COLORS[gem.type]);

				ctx.fillStyle = gradient;
				ctx.beginPath();
				ctx.arc(cx, cy, drawRadius, 0, Math.PI * 2);
				ctx.fill();

				// Specular highlight
				ctx.shadowBlur = 0;
				ctx.fillStyle = "rgba(255,255,255,0.35)";
				ctx.beginPath();
				ctx.ellipse(
					cx - drawRadius * 0.2,
					cy - drawRadius * 0.25,
					drawRadius * 0.35,
					drawRadius * 0.2,
					-0.5,
					0,
					Math.PI * 2,
				);
				ctx.fill();

				ctx.restore();
			}
		}
	}
}
