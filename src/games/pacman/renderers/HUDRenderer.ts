import type { Renderable } from "@shared/Renderable";
import type { PacManState } from "../types";

export class HUDRenderer implements Renderable<PacManState> {
	render(ctx: CanvasRenderingContext2D, state: PacManState): void {
		const W = ctx.canvas.width;

		// Score bar at top
		ctx.font = "bold 16px monospace";
		ctx.textBaseline = "top";
		ctx.textAlign = "left";
		ctx.fillStyle = "#fff";
		ctx.fillText(`SCORE: ${state.score}`, 12, 8);

		ctx.textAlign = "center";
		ctx.fillStyle = "#ffeb3b";
		ctx.fillText(`LEVEL ${state.level}`, W / 2, 8);

		ctx.textAlign = "right";
		ctx.fillStyle = "#fff";
		ctx.fillText(`HIGH: ${state.highScore}`, W - 12, 8);

		// Lives indicator at bottom-left
		const lifeSize = 10;
		const lifeY = ctx.canvas.height - 20;

		for (let i = 0; i < state.lives; i++) {
			const lx = 16 + i * 28;

			ctx.fillStyle = "#ffff00";
			ctx.beginPath();
			ctx.arc(lx, lifeY, lifeSize, 0.25, Math.PI * 2 - 0.25);
			ctx.lineTo(lx, lifeY);
			ctx.closePath();
			ctx.fill();
		}

		// Overlays
		if (!state.started) {
			this.renderOverlay(
				ctx,
				"PAC-MAN",
				"Press any arrow key to start",
				"#ffeb3b",
			);
		} else if (state.paused) {
			this.renderOverlay(ctx, "PAUSED", "Press P to resume", "#ffeb3b");
		} else if (state.gameOver) {
			this.renderOverlay(ctx, "GAME OVER", "Press SPACE to restart", "#ff4444");
		} else if (state.won) {
			this.renderOverlay(
				ctx,
				"YOU WIN!",
				"Press SPACE for next level",
				"#00ff00",
			);
		}
	}

	private renderOverlay(
		ctx: CanvasRenderingContext2D,
		title: string,
		subtitle: string,
		color: string,
	): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		ctx.fillStyle = "rgba(0,0,0,0.6)";
		ctx.fillRect(0, 0, W, H);

		ctx.font = "bold 36px monospace";
		ctx.fillStyle = color;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(title, W / 2, H / 2 - 20);

		ctx.font = "16px monospace";
		ctx.fillStyle = "#ccc";
		ctx.fillText(subtitle, W / 2, H / 2 + 20);

		ctx.font = "12px monospace";
		ctx.fillStyle = "#888";
		ctx.fillText("Press [H] for help", W / 2, H / 2 + 50);
	}
}
