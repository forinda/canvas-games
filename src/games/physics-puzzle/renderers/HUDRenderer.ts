import type { Renderable } from "@shared/Renderable";
import type { PuzzleState } from "../types";

export class HUDRenderer implements Renderable<PuzzleState> {
	render(ctx: CanvasRenderingContext2D, state: PuzzleState): void {
		const canvas = ctx.canvas;
		const W = canvas.width;

		// HUD bar
		ctx.fillStyle = "rgba(0,0,0,0.6)";
		ctx.fillRect(0, 0, W, 40);
		ctx.font = "bold 14px monospace";
		ctx.textBaseline = "middle";
		ctx.fillStyle = "#666";
		ctx.textAlign = "left";
		ctx.fillText("< EXIT", 12, 20);
		ctx.fillStyle = "#f59e0b";
		ctx.textAlign = "center";
		ctx.fillText(`Level ${state.level}  |  Score: ${state.score}`, W / 2, 20);

		// Message
		if (state.message && !state.simulating) {
			ctx.fillStyle = "rgba(0,0,0,0.5)";
			ctx.fillRect(0, 44, W, 30);
			ctx.font = "13px monospace";
			ctx.fillStyle = "#ccc";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(state.message, W / 2, 59);
		}

		// Sim indicator
		if (state.simulating) {
			ctx.fillStyle = "#4ade80";
			ctx.font = "bold 14px monospace";
			ctx.textAlign = "right";
			ctx.fillText("SIMULATING...", W - 12, 20);
		}

		// Overlays
		if (!state.started) {
			this.drawOverlay(
				ctx,
				"PHYSICS PUZZLE",
				"Click to place pieces, then SPACE to simulate!\nGuide the ball to the star.",
				"#f59e0b",
			);
		} else if (state.solved) {
			this.drawOverlay(
				ctx,
				`LEVEL ${state.level} SOLVED!`,
				`Score: ${state.score}  |  Click for next level`,
				"#4ade80",
			);
		}
	}

	private drawOverlay(
		ctx: CanvasRenderingContext2D,
		title: string,
		sub: string,
		color: string,
	): void {
		const W = ctx.canvas.width,
			H = ctx.canvas.height;

		ctx.fillStyle = "rgba(0,0,0,0.7)";
		ctx.fillRect(0, 0, W, H);
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `bold ${Math.min(48, W * 0.06)}px monospace`;
		ctx.fillStyle = color;
		ctx.shadowColor = color;
		ctx.shadowBlur = 20;
		ctx.fillText(title, W / 2, H * 0.35);
		ctx.shadowBlur = 0;
		ctx.font = `${Math.min(14, W * 0.02)}px monospace`;
		ctx.fillStyle = "#aaa";
		const lines = sub.split("\n");

		lines.forEach((line, i) => ctx.fillText(line, W / 2, H * 0.48 + i * 22));
	}
}
