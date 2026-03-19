import type { Renderable } from "@shared/Renderable";
import type { PipeState } from "../types";
import { GAME_COLOR } from "../types";

export class HUDRenderer implements Renderable<PipeState> {
	render(ctx: CanvasRenderingContext2D, state: PipeState): void {
		const W = ctx.canvas.width;
		const hudY = 12;

		// Top HUD bar
		ctx.fillStyle = "rgba(10, 10, 26, 0.9)";
		ctx.fillRect(0, 0, W, 44);

		ctx.font = "bold 14px monospace";
		ctx.textBaseline = "middle";
		const midY = hudY + 10;

		// Level
		ctx.fillStyle = GAME_COLOR;
		ctx.textAlign = "left";
		ctx.fillText(`Level: ${state.level}`, 16, midY);

		// Moves
		ctx.fillStyle = "#ccc";
		ctx.textAlign = "center";
		ctx.fillText(`Moves: ${state.moves}`, W / 2 - 60, midY);

		// Timer
		const mins = Math.floor(state.timer / 60);
		const secs = Math.floor(state.timer % 60);
		const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;

		ctx.fillText(`Time: ${timeStr}`, W / 2 + 60, midY);

		// Grid size
		ctx.fillStyle = "#888";
		ctx.textAlign = "right";
		ctx.fillText(`${state.rows}x${state.cols}`, W - 16, midY);

		// Controls hint
		ctx.font = "11px monospace";
		ctx.fillStyle = "#555";
		ctx.textAlign = "center";
		ctx.fillText("[R] Restart  [H] Help  [ESC] Exit", W / 2, midY + 20);

		// Win overlay
		if (state.status === "won") {
			this.drawWinOverlay(ctx, state);
		}
	}

	private drawWinOverlay(
		ctx: CanvasRenderingContext2D,
		state: PipeState,
	): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
		ctx.fillRect(0, 0, W, H);

		const panelW = 320;
		const panelH = 200;
		const px = (W - panelW) / 2;
		const py = (H - panelH) / 2;

		ctx.fillStyle = "#12121f";
		ctx.beginPath();
		ctx.roundRect(px, py, panelW, panelH, 12);
		ctx.fill();

		ctx.strokeStyle = GAME_COLOR;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(px, py, panelW, panelH, 12);
		ctx.stroke();

		ctx.fillStyle = GAME_COLOR;
		ctx.font = "bold 24px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("Level Complete!", W / 2, py + 40);

		ctx.fillStyle = "#ccc";
		ctx.font = "14px monospace";
		ctx.fillText(`Moves: ${state.moves}`, W / 2, py + 80);

		const mins = Math.floor(state.timer / 60);
		const secs = Math.floor(state.timer % 60);

		ctx.fillText(
			`Time: ${mins}:${secs.toString().padStart(2, "0")}`,
			W / 2,
			py + 105,
		);

		ctx.fillStyle = "#888";
		ctx.font = "13px monospace";
		ctx.fillText("Press [N] for next level", W / 2, py + 150);
		ctx.fillText("Press [R] to replay", W / 2, py + 175);
	}
}
