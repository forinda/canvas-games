import type { Renderable } from "@core/Renderable";
import type { Match3State } from "../types";

const GAME_COLOR = "#e91e63";

/** Draws score, moves remaining, combo counter, and overlay screens */
export class HUDRenderer implements Renderable<Match3State> {
	render(ctx: CanvasRenderingContext2D, state: Match3State): void {
		const W = state.canvasW;

		// --- Top HUD bar ---
		ctx.fillStyle = "rgba(0,0,0,0.5)";
		ctx.fillRect(0, 0, W, 48);

		ctx.font = "bold 16px monospace";
		ctx.textBaseline = "middle";
		ctx.textAlign = "left";

		// Score
		ctx.fillStyle = GAME_COLOR;
		ctx.fillText("SCORE", 16, 24);
		ctx.fillStyle = "#fff";
		ctx.fillText(String(state.score), 90, 24);

		// High score
		ctx.fillStyle = "#888";
		ctx.fillText(`HI: ${state.highScore}`, 200, 24);

		// Moves
		ctx.textAlign = "right";
		ctx.fillStyle = state.movesLeft <= 5 ? "#ef4444" : "#4ade80";
		ctx.fillText(`MOVES: ${state.movesLeft}`, W - 16, 24);

		// Combo indicator
		if (
			state.combo > 1 &&
			(state.phase === "removing" || state.phase === "falling")
		) {
			ctx.textAlign = "center";
			ctx.font = `bold ${18 + state.combo * 2}px monospace`;
			ctx.fillStyle = GAME_COLOR;
			ctx.fillText(`COMBO x${state.combo}!`, W / 2, 24);
		}

		// --- Overlays ---
		if (!state.started) {
			this.drawOverlay(
				ctx,
				state,
				"Match-3 Puzzle",
				"Click to start  |  [H] Help",
			);
		} else if (state.paused) {
			this.drawOverlay(ctx, state, "PAUSED", "Press [P] to resume");
		} else if (state.gameOver) {
			this.drawOverlay(
				ctx,
				state,
				"GAME OVER",
				`Final Score: ${state.score}  |  Press [Space] to retry`,
			);
		}
	}

	private drawOverlay(
		ctx: CanvasRenderingContext2D,
		state: Match3State,
		title: string,
		subtitle: string,
	): void {
		const W = state.canvasW;
		const H = state.canvasH;

		ctx.fillStyle = "rgba(0,0,0,0.7)";
		ctx.fillRect(0, 0, W, H);

		const panelW = Math.min(400, W * 0.7);
		const panelH = 160;
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

		ctx.font = "bold 28px monospace";
		ctx.fillStyle = GAME_COLOR;
		ctx.fillText(title, W / 2, py + 55);

		ctx.font = "14px monospace";
		ctx.fillStyle = "#aaa";
		ctx.fillText(subtitle, W / 2, py + 105);
	}
}
