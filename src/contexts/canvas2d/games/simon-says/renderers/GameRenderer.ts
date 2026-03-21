import type { Renderable } from "@core/Renderable";
import type { SimonState, Color } from "../types";
import { COLORS, COLOR_MAP, COLOR_DIM_MAP, COLOR_BRIGHT_MAP } from "../types";

/**
 * Renders the four colored quadrants with flash animation and center circle.
 */
export class GameRenderer implements Renderable<SimonState> {
	/** Quadrant layout: color -> position offset from center */
	private static readonly QUADRANT_OFFSETS: Record<
		Color,
		{ dx: -1 | 1; dy: -1 | 1 }
	> = {
		red: { dx: -1, dy: -1 }, // top-left
		green: { dx: 1, dy: -1 }, // top-right
		blue: { dx: -1, dy: 1 }, // bottom-left
		yellow: { dx: 1, dy: 1 }, // bottom-right
	};

	render(ctx: CanvasRenderingContext2D, state: SimonState): void {
		const cx = state.canvasW / 2;
		const cy = state.canvasH / 2;
		const size = Math.min(state.canvasW, state.canvasH) * 0.35;
		const gap = 6;
		const quadSize = size - gap;
		const cornerRadius = 16;

		for (const color of COLORS) {
			const offset = GameRenderer.QUADRANT_OFFSETS[color];
			const isActive = state.activeColor === color;

			const fillColor = isActive
				? COLOR_BRIGHT_MAP[color]
				: COLOR_DIM_MAP[color];

			const qx = cx + (offset.dx === -1 ? -quadSize - gap : gap);
			const qy = cy + (offset.dy === -1 ? -quadSize - gap : gap);

			// Draw quadrant
			ctx.fillStyle = fillColor;
			ctx.beginPath();
			ctx.roundRect(qx, qy, quadSize, quadSize, cornerRadius);
			ctx.fill();

			// Border
			ctx.strokeStyle = COLOR_MAP[color];
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.roundRect(qx, qy, quadSize, quadSize, cornerRadius);
			ctx.stroke();

			// Glow effect when active
			if (isActive) {
				ctx.shadowColor = COLOR_BRIGHT_MAP[color];
				ctx.shadowBlur = 30;
				ctx.fillStyle = "rgba(0,0,0,0)";
				ctx.beginPath();
				ctx.roundRect(qx, qy, quadSize, quadSize, cornerRadius);
				ctx.fill();
				ctx.shadowBlur = 0;
			}

			// Color label in each quadrant
			ctx.font = "bold 14px monospace";
			ctx.fillStyle = isActive ? "#fff" : "rgba(255,255,255,0.3)";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(color.toUpperCase(), qx + quadSize / 2, qy + quadSize / 2);
		}

		// Center circle with round number
		this.renderCenterCircle(ctx, state, cx, cy, size);
	}

	private renderCenterCircle(
		ctx: CanvasRenderingContext2D,
		state: SimonState,
		cx: number,
		cy: number,
		size: number,
	): void {
		const radius = size * 0.18;

		// Circle background
		ctx.fillStyle = "#1a1a2e";
		ctx.beginPath();
		ctx.arc(cx, cy, radius, 0, Math.PI * 2);
		ctx.fill();

		// Circle border
		ctx.strokeStyle = "#4caf50";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.arc(cx, cy, radius, 0, Math.PI * 2);
		ctx.stroke();

		// Round number
		ctx.font = `bold ${Math.max(16, radius * 0.6)}px monospace`;
		ctx.fillStyle = "#fff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		if (state.started && state.phase !== "gameover") {
			ctx.fillText(String(state.round), cx, cy - 4);
			ctx.font = `${Math.max(9, radius * 0.25)}px monospace`;
			ctx.fillStyle = "#888";
			ctx.fillText("ROUND", cx, cy + radius * 0.4);
		} else if (state.phase === "gameover") {
			ctx.fillStyle = "#e53935";
			ctx.fillText("X", cx, cy);
		} else {
			ctx.fillStyle = "#4caf50";
			ctx.fillText("?", cx, cy);
		}
	}
}
