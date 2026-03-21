import type { Renderable } from "@core/Renderable";
import type { LightsOutState } from "../types";
import { GAME_COLOR } from "../types";
import { LEVELS } from "../data/levels";

export class HUDRenderer implements Renderable<LightsOutState> {
	render(ctx: CanvasRenderingContext2D, state: LightsOutState): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		this.drawTopBar(ctx, state, W);

		if (state.status === "level-complete") {
			this.drawOverlay(
				ctx,
				W,
				H,
				"LEVEL COMPLETE!",
				`Solved in ${state.moves} move${state.moves !== 1 ? "s" : ""}`,
				"Click or [N] for next level",
				"#4ade80",
			);
		} else if (state.status === "all-done") {
			this.drawOverlay(
				ctx,
				W,
				H,
				"CONGRATULATIONS!",
				"You completed all 15 levels!",
				"Click or [R] to play again",
				GAME_COLOR,
			);
		}
	}

	private drawTopBar(
		ctx: CanvasRenderingContext2D,
		state: LightsOutState,
		W: number,
	): void {
		ctx.fillStyle = "rgba(0,0,0,0.6)";
		ctx.fillRect(0, 0, W, 40);

		ctx.font = "bold 14px monospace";
		ctx.textBaseline = "middle";

		// Exit button
		ctx.fillStyle = "#666";
		ctx.textAlign = "left";
		ctx.fillText("< EXIT", 12, 20);

		// Level indicator
		ctx.fillStyle = GAME_COLOR;
		ctx.textAlign = "center";
		ctx.fillText(`Level ${state.level + 1} / ${LEVELS.length}`, W / 2, 20);

		// Moves counter
		ctx.fillStyle = "#aaa";
		ctx.textAlign = "right";
		ctx.fillText(`Moves: ${state.moves}`, W - 16, 20);
	}

	private drawOverlay(
		ctx: CanvasRenderingContext2D,
		W: number,
		H: number,
		title: string,
		subtitle: string,
		hint: string,
		color: string,
	): void {
		ctx.fillStyle = "rgba(0,0,0,0.7)";
		ctx.fillRect(0, 0, W, H);

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		ctx.font = `bold ${Math.min(56, W * 0.07)}px monospace`;
		ctx.fillStyle = color;
		ctx.shadowColor = color;
		ctx.shadowBlur = 20;
		ctx.fillText(title, W / 2, H * 0.36);
		ctx.shadowBlur = 0;

		ctx.font = `${Math.min(20, W * 0.03)}px monospace`;
		ctx.fillStyle = "#ccc";
		ctx.fillText(subtitle, W / 2, H * 0.48);

		ctx.font = `${Math.min(14, W * 0.02)}px monospace`;
		ctx.fillStyle = "#666";
		ctx.fillText(hint, W / 2, H * 0.56);

		ctx.fillText("[R] Restart level  [ESC] Exit", W / 2, H * 0.62);
	}
}
