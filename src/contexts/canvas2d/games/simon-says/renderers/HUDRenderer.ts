import type { Renderable } from "@core/Renderable";
import type { SimonState } from "../types";
import { GAME_COLOR } from "../types";

/**
 * Draws the HUD: round number, high score, and overlay screens.
 */
export class HUDRenderer implements Renderable<SimonState> {
	render(ctx: CanvasRenderingContext2D, state: SimonState): void {
		const W = state.canvasW;

		// --- Top HUD bar ---
		ctx.fillStyle = "rgba(0,0,0,0.5)";
		ctx.fillRect(0, 0, W, 48);

		ctx.font = "bold 14px monospace";
		ctx.textBaseline = "middle";

		// Round
		ctx.textAlign = "left";
		ctx.fillStyle = GAME_COLOR;
		ctx.fillText("ROUND", 16, 24);
		ctx.fillStyle = "#fff";
		ctx.fillText(String(state.started ? state.round : 0), 84, 24);

		// Phase indicator
		ctx.textAlign = "center";
		ctx.fillStyle = "#888";
		ctx.font = "12px monospace";

		if (state.started && state.phase === "showing") {
			ctx.fillStyle = "#fdd835";
			ctx.fillText("WATCH...", W / 2, 24);
		} else if (state.started && state.phase === "input") {
			ctx.fillStyle = "#43a047";
			ctx.fillText("YOUR TURN", W / 2, 24);
		} else if (state.phase === "gameover") {
			ctx.fillStyle = "#e53935";
			ctx.fillText("GAME OVER", W / 2, 24);
		}

		// High score
		ctx.textAlign = "right";
		ctx.font = "bold 14px monospace";
		ctx.fillStyle = GAME_COLOR;
		ctx.fillText("BEST", W - 60, 24);
		ctx.fillStyle = "#fff";
		ctx.fillText(String(state.highScore), W - 16, 24);

		// --- Overlays ---
		if (!state.started) {
			this.drawStartOverlay(ctx, state);
		} else if (state.phase === "gameover") {
			this.drawGameOverOverlay(ctx, state);
		}
	}

	private drawStartOverlay(
		ctx: CanvasRenderingContext2D,
		state: SimonState,
	): void {
		const W = state.canvasW;
		const H = state.canvasH;

		ctx.fillStyle = "rgba(0,0,0,0.6)";
		ctx.fillRect(0, 0, W, H);

		const panelW = Math.min(440, W * 0.75);
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

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		ctx.font = "bold 26px monospace";
		ctx.fillStyle = GAME_COLOR;
		ctx.fillText("Simon Says", W / 2, py + 40);

		ctx.font = "14px monospace";
		ctx.fillStyle = "#ccc";
		ctx.fillText("Watch the pattern, then repeat it!", W / 2, py + 80);

		if (state.highScore > 0) {
			ctx.font = "13px monospace";
			ctx.fillStyle = "#aaa";
			ctx.fillText(`High Score: Round ${state.highScore}`, W / 2, py + 110);
		}

		ctx.font = "14px monospace";
		ctx.fillStyle = "#aaa";
		ctx.fillText("Click or [Space] to start  |  [H] Help", W / 2, py + 145);

		ctx.font = "12px monospace";
		ctx.fillStyle = "#666";
		ctx.fillText("[ESC] Exit  |  [R] Restart", W / 2, py + 175);
	}

	private drawGameOverOverlay(
		ctx: CanvasRenderingContext2D,
		state: SimonState,
	): void {
		const W = state.canvasW;
		const H = state.canvasH;

		ctx.fillStyle = "rgba(0,0,0,0.6)";
		ctx.fillRect(0, 0, W, H);

		const panelW = Math.min(420, W * 0.75);
		const panelH = 200;
		const px = (W - panelW) / 2;
		const py = (H - panelH) / 2;

		ctx.fillStyle = "#12121f";
		ctx.beginPath();
		ctx.roundRect(px, py, panelW, panelH, 12);
		ctx.fill();

		ctx.strokeStyle = "#e53935";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(px, py, panelW, panelH, 12);
		ctx.stroke();

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		ctx.font = "bold 28px monospace";
		ctx.fillStyle = "#e53935";
		ctx.fillText("GAME OVER", W / 2, py + 40);

		const score = state.round - 1;

		ctx.font = "16px monospace";
		ctx.fillStyle = "#fff";
		ctx.fillText(`You reached Round ${score}`, W / 2, py + 80);

		ctx.font = "13px monospace";
		ctx.fillStyle = "#aaa";
		ctx.fillText(`High Score: Round ${state.highScore}`, W / 2, py + 110);

		ctx.font = "14px monospace";
		ctx.fillStyle = "#888";
		ctx.fillText("[Space] or Click to play again", W / 2, py + 150);

		ctx.font = "12px monospace";
		ctx.fillStyle = "#666";
		ctx.fillText("[ESC] Exit", W / 2, py + 178);
	}
}
