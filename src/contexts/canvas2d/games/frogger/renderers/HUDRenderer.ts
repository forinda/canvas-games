import type { Renderable } from "@core/Renderable";
import type { FroggerState } from "../types";

export class HUDRenderer implements Renderable<FroggerState> {
	render(ctx: CanvasRenderingContext2D, state: FroggerState): void {
		const W = state.canvasW;
		const H = state.canvasH;

		// ── Top bar ───────────────────────────────────────────────────
		ctx.fillStyle = "rgba(0,0,0,0.55)";
		ctx.fillRect(0, 0, W, 36);

		ctx.font = "bold 14px monospace";
		ctx.textBaseline = "middle";
		ctx.textAlign = "left";

		// Lives
		ctx.fillStyle = "#f44336";
		let livesText = "Lives: ";

		for (let i = 0; i < state.lives; i++) livesText += "❤ ";

		ctx.fillText(livesText, 8, 18);

		// Score
		ctx.fillStyle = "#fff";
		ctx.textAlign = "center";
		ctx.fillText(`Score: ${state.score}`, W * 0.5, 18);

		// Level
		ctx.textAlign = "right";
		ctx.fillStyle = "#4caf50";
		ctx.fillText(`Level ${state.level}  |  Hi: ${state.highScore}`, W - 8, 18);

		// ── Overlays ──────────────────────────────────────────────────

		if (!state.started) {
			this.drawOverlay(
				ctx,
				W,
				H,
				"🐸 FROGGER",
				"Press any arrow key or WASD to start",
				"#4caf50",
			);

			return;
		}

		if (state.paused) {
			this.drawOverlay(ctx, W, H, "PAUSED", "Press [P] to resume", "#ff9800");

			return;
		}

		if (state.levelComplete) {
			this.drawOverlay(
				ctx,
				W,
				H,
				`LEVEL ${state.level} COMPLETE!`,
				"Get ready...",
				"#4caf50",
			);

			return;
		}

		if (state.gameOver) {
			this.drawOverlay(
				ctx,
				W,
				H,
				"GAME OVER",
				`Score: ${state.score}  |  Press Space to restart`,
				"#f44336",
			);

			return;
		}
	}

	private drawOverlay(
		ctx: CanvasRenderingContext2D,
		W: number,
		H: number,
		title: string,
		subtitle: string,
		color: string,
	): void {
		ctx.fillStyle = "rgba(0,0,0,0.7)";
		ctx.fillRect(0, 0, W, H);

		ctx.font = "bold 36px monospace";
		ctx.fillStyle = color;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(title, W * 0.5, H * 0.4);

		ctx.font = "16px monospace";
		ctx.fillStyle = "#ccc";
		ctx.fillText(subtitle, W * 0.5, H * 0.52);

		ctx.font = "12px monospace";
		ctx.fillStyle = "#888";
		ctx.fillText(
			"Press [ESC] to exit  |  [P] pause  |  [H] help",
			W * 0.5,
			H * 0.62,
		);
	}
}
