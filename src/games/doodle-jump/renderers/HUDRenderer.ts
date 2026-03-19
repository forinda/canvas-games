import type { Renderable } from "@shared/Renderable";
import type { DoodleState } from "../types";

export class HUDRenderer implements Renderable<DoodleState> {
	render(ctx: CanvasRenderingContext2D, state: DoodleState): void {
		const { phase } = state;

		if (phase === "playing") {
			this.drawScore(ctx, state);
		} else if (phase === "idle") {
			this.drawIdleOverlay(ctx, state);
		} else if (phase === "dead") {
			this.drawScore(ctx, state);
			this.drawDeathOverlay(ctx, state);
		}
	}

	private drawScore(ctx: CanvasRenderingContext2D, state: DoodleState): void {
		const text = `Score: ${state.score}`;

		ctx.font = "bold 20px monospace";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";

		ctx.strokeStyle = "#fff";
		ctx.lineWidth = 3;
		ctx.lineJoin = "round";
		ctx.strokeText(text, 16, 16);

		ctx.fillStyle = "#333";
		ctx.fillText(text, 16, 16);

		// Best score
		if (state.highScore > 0) {
			const best = `Best: ${state.highScore}`;

			ctx.strokeText(best, 16, 42);
			ctx.fillStyle = "#66bb6a";
			ctx.fillText(best, 16, 42);
		}
	}

	private drawIdleOverlay(
		ctx: CanvasRenderingContext2D,
		state: DoodleState,
	): void {
		const cx = state.canvasW / 2;

		// Title
		ctx.font = "bold 42px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.strokeStyle = "#fff";
		ctx.lineWidth = 5;
		ctx.lineJoin = "round";
		ctx.strokeText("Doodle Jump", cx, state.canvasH * 0.22);
		ctx.fillStyle = "#388e3c";
		ctx.fillText("Doodle Jump", cx, state.canvasH * 0.22);

		// Instruction (pulsing)
		const alpha = 0.5 + 0.5 * Math.sin(performance.now() * 0.004);

		ctx.globalAlpha = alpha;
		ctx.font = "bold 18px monospace";
		ctx.strokeStyle = "#fff";
		ctx.lineWidth = 3;
		ctx.strokeText("Press any key to start", cx, state.canvasH * 0.55);
		ctx.fillStyle = "#555";
		ctx.fillText("Press any key to start", cx, state.canvasH * 0.55);
		ctx.globalAlpha = 1;

		// Controls hint
		ctx.font = "14px monospace";
		ctx.fillStyle = "#888";
		ctx.fillText("Arrow Keys or A/D to move", cx, state.canvasH * 0.62);

		// High score
		if (state.highScore > 0) {
			ctx.font = "bold 18px monospace";
			ctx.strokeStyle = "#fff";
			ctx.lineWidth = 3;
			ctx.strokeText(`Best: ${state.highScore}`, cx, state.canvasH * 0.7);
			ctx.fillStyle = "#66bb6a";
			ctx.fillText(`Best: ${state.highScore}`, cx, state.canvasH * 0.7);
		}
	}

	private drawDeathOverlay(
		ctx: CanvasRenderingContext2D,
		state: DoodleState,
	): void {
		const cx = state.canvasW / 2;
		const cy = state.canvasH / 2;

		// Dim overlay
		ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
		ctx.fillRect(0, 0, state.canvasW, state.canvasH);

		// Panel
		const panelW = 260;
		const panelH = 200;
		const px = cx - panelW / 2;
		const py = cy - panelH / 2;

		ctx.fillStyle = "#faf8ef";
		ctx.strokeStyle = "#66bb6a";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.roundRect(px, py, panelW, panelH, 12);
		ctx.fill();
		ctx.stroke();

		// Game Over title
		ctx.font = "bold 32px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = "#c62828";
		ctx.fillText("Game Over", cx, py + 40);

		// Score
		ctx.font = "bold 22px monospace";
		ctx.fillStyle = "#333";
		ctx.fillText(`Score: ${state.score}`, cx, cy + 5);

		// Best
		ctx.font = "bold 18px monospace";
		ctx.fillStyle = "#66bb6a";
		ctx.fillText(`Best: ${state.highScore}`, cx, cy + 35);

		// New best
		if (state.score > 0 && state.score >= state.highScore) {
			ctx.font = "bold 14px monospace";
			ctx.fillStyle = "#f44336";
			ctx.fillText("NEW BEST!", cx, cy + 58);
		}

		// Restart hint
		const alpha = 0.5 + 0.5 * Math.sin(performance.now() * 0.004);

		ctx.globalAlpha = alpha;
		ctx.font = "bold 16px monospace";
		ctx.fillStyle = "#555";
		ctx.fillText("Press Space to Restart", cx, py + panelH - 25);
		ctx.globalAlpha = 1;
	}
}
