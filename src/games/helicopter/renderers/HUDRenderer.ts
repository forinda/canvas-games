import type { Renderable } from "@shared/Renderable";
import type { HelicopterState } from "../types";

export class HUDRenderer implements Renderable<HelicopterState> {
	render(ctx: CanvasRenderingContext2D, state: HelicopterState): void {
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

	private drawScore(
		ctx: CanvasRenderingContext2D,
		state: HelicopterState,
	): void {
		const score = Math.floor(state.distance);
		const text = `${score}m`;
		const x = state.canvasW / 2;
		const y = 50;

		ctx.font = "bold 40px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		ctx.strokeStyle = "#000";
		ctx.lineWidth = 5;
		ctx.lineJoin = "round";
		ctx.strokeText(text, x, y);

		ctx.fillStyle = "#66bb6a";
		ctx.fillText(text, x, y);

		// Best score in corner
		if (state.bestScore > 0) {
			ctx.font = "bold 16px monospace";
			ctx.textAlign = "right";
			ctx.strokeStyle = "#000";
			ctx.lineWidth = 3;
			ctx.strokeText(`Best: ${state.bestScore}m`, state.canvasW - 16, 30);
			ctx.fillStyle = "#a5d6a7";
			ctx.fillText(`Best: ${state.bestScore}m`, state.canvasW - 16, 30);
		}
	}

	private drawIdleOverlay(
		ctx: CanvasRenderingContext2D,
		state: HelicopterState,
	): void {
		const cx = state.canvasW / 2;
		const cy = state.canvasH * 0.3;

		// Title
		ctx.font = "bold 48px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 5;
		ctx.lineJoin = "round";
		ctx.strokeText("Helicopter", cx, cy);
		ctx.fillStyle = "#66bb6a";
		ctx.fillText("Helicopter", cx, cy);

		// Instruction (pulsing)
		const alpha = 0.5 + 0.5 * Math.sin(performance.now() * 0.004);

		ctx.globalAlpha = alpha;
		ctx.font = "bold 20px monospace";
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 3;
		ctx.strokeText("Hold Space or Click to Fly", cx, state.canvasH * 0.6);
		ctx.fillStyle = "#fff";
		ctx.fillText("Hold Space or Click to Fly", cx, state.canvasH * 0.6);
		ctx.globalAlpha = 1;

		// Best score
		if (state.bestScore > 0) {
			ctx.font = "bold 18px monospace";
			ctx.strokeStyle = "#000";
			ctx.lineWidth = 3;
			ctx.strokeText(`Best: ${state.bestScore}m`, cx, state.canvasH * 0.67);
			ctx.fillStyle = "#a5d6a7";
			ctx.fillText(`Best: ${state.bestScore}m`, cx, state.canvasH * 0.67);
		}
	}

	private drawDeathOverlay(
		ctx: CanvasRenderingContext2D,
		state: HelicopterState,
	): void {
		const cx = state.canvasW / 2;
		const cy = state.canvasH / 2;
		const score = Math.floor(state.distance);

		// Dim overlay
		ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
		ctx.fillRect(0, 0, state.canvasW, state.canvasH);

		// Panel
		const panelW = 280;
		const panelH = 200;
		const px = cx - panelW / 2;
		const py = cy - panelH / 2 - 10;

		ctx.fillStyle = "#1a3a0a";
		ctx.strokeStyle = "#66bb6a";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.roundRect(px, py, panelW, panelH, 12);
		ctx.fill();
		ctx.stroke();

		// Game Over text
		ctx.font = "bold 32px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = "#ef5350";
		ctx.fillText("Crashed!", cx, py + 40);

		// Score
		ctx.font = "bold 22px monospace";
		ctx.fillStyle = "#fff";
		ctx.fillText(`Distance: ${score}m`, cx, cy);

		// Best
		ctx.font = "bold 18px monospace";
		ctx.fillStyle = "#a5d6a7";
		ctx.fillText(`Best: ${state.bestScore}m`, cx, cy + 30);

		// New best indicator
		if (score > 0 && score >= state.bestScore) {
			ctx.font = "bold 14px monospace";
			ctx.fillStyle = "#ffeb3b";
			ctx.fillText("NEW BEST!", cx, cy + 55);
		}

		// Restart instruction
		const alpha = 0.5 + 0.5 * Math.sin(performance.now() * 0.004);

		ctx.globalAlpha = alpha;
		ctx.font = "bold 16px monospace";
		ctx.fillStyle = "#ccc";
		ctx.fillText("Tap or Space to Restart", cx, py + panelH - 20);
		ctx.globalAlpha = 1;
	}
}
