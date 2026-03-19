import type { Renderable } from "@shared/Renderable";
import type { GravityState } from "../types";
import { COLORS } from "../types";
import { LEVELS } from "../data/levels";

export class HUDRenderer implements Renderable<GravityState> {
	render(ctx: CanvasRenderingContext2D, state: GravityState): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		this.drawTopBar(ctx, state, W);

		if (state.levelComplete) {
			this.drawLevelCompleteOverlay(ctx, state, W, H);
		}

		if (state.gameWon) {
			this.drawGameWonOverlay(ctx, state, W, H);
		}
	}

	private drawTopBar(
		ctx: CanvasRenderingContext2D,
		state: GravityState,
		W: number,
	): void {
		const pad = 16;
		const y = 28;

		// Level
		ctx.font = "bold 16px monospace";
		ctx.fillStyle = COLORS.hud;
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillText(`Level ${state.level + 1} / ${LEVELS.length}`, pad, y);

		// Gravity direction
		const dirLabel = this.gravityLabel(state.gravity);

		ctx.font = "14px monospace";
		ctx.fillStyle = COLORS.hudDim;
		ctx.textAlign = "center";
		ctx.fillText(`Gravity: ${dirLabel}`, W / 2, y + 2);

		// Moves count
		ctx.font = "14px monospace";
		ctx.fillStyle = COLORS.hudDim;
		ctx.textAlign = "right";
		ctx.fillText(`Moves: ${state.moves}`, W - pad, y + 2);

		// Help hint
		ctx.font = "11px monospace";
		ctx.fillStyle = "rgba(255,255,255,0.25)";
		ctx.textAlign = "right";
		ctx.fillText("[H] Help  [R] Reset  [ESC] Exit", W - pad, y + 22);
	}

	private drawLevelCompleteOverlay(
		ctx: CanvasRenderingContext2D,
		state: GravityState,
		W: number,
		H: number,
	): void {
		const alpha = Math.min(state.completeTimer * 2, 0.75);

		ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
		ctx.fillRect(0, 0, W, H);

		if (state.completeTimer > 0.3) {
			ctx.font = "bold 36px monospace";
			ctx.fillStyle = COLORS.exit;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("Level Complete!", W / 2, H / 2 - 30);

			ctx.font = "18px monospace";
			ctx.fillStyle = COLORS.hud;
			ctx.fillText(`Moves: ${state.moves}`, W / 2, H / 2 + 15);

			ctx.font = "14px monospace";
			ctx.fillStyle = COLORS.hudDim;
			ctx.fillText(
				"Press [Space] or [Enter] for next level",
				W / 2,
				H / 2 + 50,
			);
		}
	}

	private drawGameWonOverlay(
		ctx: CanvasRenderingContext2D,
		state: GravityState,
		W: number,
		H: number,
	): void {
		const alpha = Math.min(state.completeTimer * 2, 0.85);

		ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
		ctx.fillRect(0, 0, W, H);

		if (state.completeTimer > 0.3) {
			ctx.font = "bold 40px monospace";
			ctx.fillStyle = "#ffd700";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("You Win!", W / 2, H / 2 - 40);

			ctx.font = "20px monospace";
			ctx.fillStyle = COLORS.hud;
			ctx.fillText("All 15 levels completed!", W / 2, H / 2 + 10);

			ctx.font = "14px monospace";
			ctx.fillStyle = COLORS.hudDim;
			ctx.fillText(
				"Press [Space] to play again or [ESC] to exit",
				W / 2,
				H / 2 + 50,
			);
		}
	}

	private gravityLabel(dir: string): string {
		switch (dir) {
			case "down":
				return "\u2193 Down";
			case "up":
				return "\u2191 Up";
			case "left":
				return "\u2190 Left";
			case "right":
				return "\u2192 Right";
			default:
				return dir;
		}
	}
}
