import type { Renderable } from "@core/Renderable";
import type { MazeState } from "../types.ts";

/**
 * Renders the heads-up display: timer, level, score, and state overlays.
 */
export class HUDRenderer implements Renderable<MazeState> {
	render(ctx: CanvasRenderingContext2D, state: MazeState): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		// Top bar background
		ctx.fillStyle = "rgba(0,0,0,0.6)";
		ctx.fillRect(0, 0, W, 44);

		ctx.textBaseline = "middle";
		const barY = 22;

		// Timer (left)
		const timeStr = Math.ceil(state.timeLeft).toString();
		const timerColor =
			state.timeLeft <= 10
				? "#ff4444"
				: state.timeLeft <= 20
					? "#ffaa00"
					: "#4ade80";

		ctx.font = "bold 18px monospace";
		ctx.fillStyle = timerColor;
		ctx.textAlign = "left";
		ctx.fillText(`Time: ${timeStr}s`, 16, barY);

		// Level (center)
		ctx.fillStyle = "#607d8b";
		ctx.textAlign = "center";
		ctx.fillText(
			`Level ${state.level}  (${state.mazeW}x${state.mazeH})`,
			W / 2,
			barY,
		);

		// Score (right)
		ctx.fillStyle = "#ccc";
		ctx.textAlign = "right";
		ctx.fillText(`Score: ${state.totalScore}`, W - 16, barY);

		// Overlays
		if (!state.started) {
			this.overlay(
				ctx,
				W,
				H,
				"#607d8b",
				"Maze Runner",
				"Press SPACE to start  |  [H] for help",
			);
		} else if (state.paused) {
			this.overlay(ctx, W, H, "#ffaa00", "Paused", "Press P to resume");
		} else if (state.won) {
			this.overlay(
				ctx,
				W,
				H,
				"#4ade80",
				`Level ${state.level} Complete!`,
				"Press SPACE for next level",
			);
		} else if (state.lost) {
			this.overlay(
				ctx,
				W,
				H,
				"#ff4444",
				"Time's Up!",
				`Final Score: ${state.totalScore}  |  Press SPACE to restart`,
			);
		}
	}

	private overlay(
		ctx: CanvasRenderingContext2D,
		W: number,
		H: number,
		color: string,
		title: string,
		subtitle: string,
	): void {
		ctx.fillStyle = "rgba(0,0,0,0.7)";
		ctx.fillRect(0, 0, W, H);

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		ctx.font = "bold 36px monospace";
		ctx.fillStyle = color;
		ctx.fillText(title, W / 2, H / 2 - 24);

		ctx.font = "16px monospace";
		ctx.fillStyle = "#aaa";
		ctx.fillText(subtitle, W / 2, H / 2 + 20);
	}
}
