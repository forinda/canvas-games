import type { Renderable } from "@core/Renderable";
import type { FlappyState } from "../types";

export class HUDRenderer implements Renderable<FlappyState> {
	render(ctx: CanvasRenderingContext2D, state: FlappyState): void {
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

	private drawScore(ctx: CanvasRenderingContext2D, state: FlappyState): void {
		const text = String(state.score);
		const x = state.canvasW / 2;
		const y = 80;

		ctx.font = "bold 64px Arial, sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		// Shadow/outline
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 6;
		ctx.lineJoin = "round";
		ctx.strokeText(text, x, y);

		// White fill
		ctx.fillStyle = "#fff";
		ctx.fillText(text, x, y);
	}

	private drawIdleOverlay(
		ctx: CanvasRenderingContext2D,
		state: FlappyState,
	): void {
		const cx = state.canvasW / 2;
		const cy = state.canvasH * 0.28;

		// Title
		ctx.font = "bold 48px Arial, sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 5;
		ctx.lineJoin = "round";
		ctx.strokeText("Flappy Bird", cx, cy);
		ctx.fillStyle = "#fff";
		ctx.fillText("Flappy Bird", cx, cy);

		// Instruction (pulsing)
		const alpha = 0.5 + 0.5 * Math.sin(performance.now() * 0.004);

		ctx.globalAlpha = alpha;
		ctx.font = "bold 22px Arial, sans-serif";
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 3;
		ctx.strokeText("Tap or Press Space to Start", cx, state.canvasH * 0.62);
		ctx.fillStyle = "#fff";
		ctx.fillText("Tap or Press Space to Start", cx, state.canvasH * 0.62);
		ctx.globalAlpha = 1;

		// High score
		if (state.highScore > 0) {
			ctx.font = "bold 18px Arial, sans-serif";
			ctx.strokeStyle = "#000";
			ctx.lineWidth = 3;
			ctx.strokeText(`Best: ${state.highScore}`, cx, state.canvasH * 0.68);
			ctx.fillStyle = "#f1c40f";
			ctx.fillText(`Best: ${state.highScore}`, cx, state.canvasH * 0.68);
		}
	}

	private drawDeathOverlay(
		ctx: CanvasRenderingContext2D,
		state: FlappyState,
	): void {
		const cx = state.canvasW / 2;
		const cy = state.canvasH / 2;

		// Dim overlay
		ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
		ctx.fillRect(0, 0, state.canvasW, state.canvasH);

		// Score panel background
		const panelW = 240;
		const panelH = 180;
		const px = cx - panelW / 2;
		const py = cy - panelH / 2 - 10;

		ctx.fillStyle = "#deb550";
		ctx.strokeStyle = "#8b6914";
		ctx.lineWidth = 4;
		this.roundRect(ctx, px, py, panelW, panelH, 12);
		ctx.fill();
		ctx.stroke();

		// Inner panel
		ctx.fillStyle = "#c9960a";
		this.roundRect(ctx, px + 12, py + 12, panelW - 24, panelH - 24, 6);
		ctx.fill();

		// "Game Over" text
		ctx.font = "bold 36px Arial, sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 4;
		ctx.lineJoin = "round";
		ctx.strokeText("Game Over", cx, py - 20);
		ctx.fillStyle = "#fff";
		ctx.fillText("Game Over", cx, py - 20);

		// Score
		ctx.font = "bold 22px Arial, sans-serif";
		ctx.fillStyle = "#fff";
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 3;
		ctx.strokeText(`Score: ${state.score}`, cx, cy - 20);
		ctx.fillText(`Score: ${state.score}`, cx, cy - 20);

		// Best
		ctx.strokeText(`Best: ${state.highScore}`, cx, cy + 15);
		ctx.fillStyle = "#f1c40f";
		ctx.fillText(`Best: ${state.highScore}`, cx, cy + 15);

		// New best indicator
		if (state.score > 0 && state.score >= state.highScore) {
			ctx.font = "bold 14px Arial, sans-serif";
			ctx.fillStyle = "#e74c3c";
			ctx.strokeStyle = "#000";
			ctx.lineWidth = 2;
			ctx.strokeText("NEW!", cx + 70, cy + 15);
			ctx.fillText("NEW!", cx + 70, cy + 15);
		}

		// Restart instruction
		const alpha = 0.5 + 0.5 * Math.sin(performance.now() * 0.004);

		ctx.globalAlpha = alpha;
		ctx.font = "bold 20px Arial, sans-serif";
		ctx.fillStyle = "#fff";
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 3;
		ctx.strokeText("Tap to Restart", cx, cy + panelH / 2 + 20);
		ctx.fillText("Tap to Restart", cx, cy + panelH / 2 + 20);
		ctx.globalAlpha = 1;
	}

	private roundRect(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		w: number,
		h: number,
		r: number,
	): void {
		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.lineTo(x + w - r, y);
		ctx.quadraticCurveTo(x + w, y, x + w, y + r);
		ctx.lineTo(x + w, y + h - r);
		ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
		ctx.lineTo(x + r, y + h);
		ctx.quadraticCurveTo(x, y + h, x, y + h - r);
		ctx.lineTo(x, y + r);
		ctx.quadraticCurveTo(x, y, x + r, y);
		ctx.closePath();
	}
}
