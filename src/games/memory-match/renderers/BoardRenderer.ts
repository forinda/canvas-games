import type { Renderable } from "@shared/Renderable";
import type { MemoryState } from "../types";
import { GAME_COLOR } from "../types";
import { ICONS } from "../data/icons";

/**
 * Draws the card grid with flip animations (scale-X transform),
 * face-down pattern, face-up icon, and matched glow effect.
 */
export class BoardRenderer implements Renderable<MemoryState> {
	render(ctx: CanvasRenderingContext2D, state: MemoryState): void {
		const { board, cellSize, boardOffsetX, boardOffsetY, rows, cols } = state;

		// Board background
		const boardW = cols * cellSize;
		const boardH = rows * cellSize;

		ctx.fillStyle = "#1a1a2e";
		ctx.beginPath();
		ctx.roundRect(
			boardOffsetX - 8,
			boardOffsetY - 8,
			boardW + 16,
			boardH + 16,
			12,
		);
		ctx.fill();

		const gap = 4;
		const cardW = cellSize - gap * 2;
		const cardH = cellSize - gap * 2;
		const cardR = 8;

		for (let i = 0; i < board.length; i++) {
			const card = board[i];
			const cx = boardOffsetX + card.col * cellSize + cellSize / 2;
			const cy = boardOffsetY + card.row * cellSize + cellSize / 2;

			const progress = card.flipProgress;
			// Scale X goes from 1 -> 0 -> 1 as progress goes 0 -> 0.5 -> 1
			const scaleX = Math.abs(Math.cos(progress * Math.PI));
			const showFace = progress > 0.5;

			ctx.save();
			ctx.translate(cx, cy);
			ctx.scale(scaleX, 1);

			if (card.matched) {
				// Matched glow
				ctx.shadowColor = GAME_COLOR;
				ctx.shadowBlur = 16;
			}

			if (showFace) {
				// Face-up: white card with icon
				ctx.fillStyle = card.matched ? "#2d1f3d" : "#ffffff";
				ctx.beginPath();
				ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, cardR);
				ctx.fill();

				if (card.matched) {
					ctx.strokeStyle = GAME_COLOR;
					ctx.lineWidth = 2;
					ctx.beginPath();
					ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, cardR);
					ctx.stroke();
				}

				// Icon
				ctx.shadowBlur = 0;
				const fontSize = Math.floor(cellSize * 0.45);

				ctx.font = `${fontSize}px serif`;
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.globalAlpha = card.matched ? 0.5 : 1;
				ctx.fillText(ICONS[card.iconIndex], 0, 2);
			} else {
				// Face-down: patterned card back
				ctx.fillStyle = "#5c2d91";
				ctx.beginPath();
				ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, cardR);
				ctx.fill();

				// Border
				ctx.strokeStyle = "#7b3faf";
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, cardR);
				ctx.stroke();

				// Diamond pattern
				ctx.strokeStyle = "rgba(255,255,255,0.12)";
				ctx.lineWidth = 1;
				const patternSize = Math.floor(cellSize * 0.18);
				const startX = -cardW / 2 + patternSize;
				const startY = -cardH / 2 + patternSize;
				const endX = cardW / 2 - patternSize;
				const endY = cardH / 2 - patternSize;

				for (let px = startX; px <= endX; px += patternSize) {
					for (let py = startY; py <= endY; py += patternSize) {
						ctx.beginPath();
						ctx.moveTo(px, py - patternSize * 0.35);
						ctx.lineTo(px + patternSize * 0.35, py);
						ctx.lineTo(px, py + patternSize * 0.35);
						ctx.lineTo(px - patternSize * 0.35, py);
						ctx.closePath();
						ctx.stroke();
					}
				}

				// Center question mark
				ctx.shadowBlur = 0;
				const qFontSize = Math.floor(cellSize * 0.3);

				ctx.font = `bold ${qFontSize}px monospace`;
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillStyle = "rgba(255,255,255,0.25)";
				ctx.fillText("?", 0, 2);
			}

			ctx.restore();
		}
	}
}
