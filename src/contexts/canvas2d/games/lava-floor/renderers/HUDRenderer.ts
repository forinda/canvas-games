import type { Renderable } from "@core/Renderable";
import type { LavaState } from "../types";

export class HUDRenderer implements Renderable<LavaState> {
	render(ctx: CanvasRenderingContext2D, state: LavaState): void {
		const { phase } = state;

		if (phase === "playing") {
			this.drawTimer(ctx, state);
		} else if (phase === "idle") {
			this.drawIdleOverlay(ctx, state);
		} else if (phase === "dead") {
			this.drawTimer(ctx, state);
			this.drawDeathOverlay(ctx, state);
		}
	}

	private formatTime(ms: number): string {
		const totalSeconds = ms / 1000;
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = Math.floor(totalSeconds % 60);
		const tenths = Math.floor((totalSeconds * 10) % 10);

		if (minutes > 0) {
			return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
		}

		return `${seconds}.${tenths}s`;
	}

	private drawTimer(ctx: CanvasRenderingContext2D, state: LavaState): void {
		const text = this.formatTime(state.survivalTime);
		const x = state.canvasW / 2;
		const y = 45;

		ctx.font = "bold 36px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		ctx.strokeStyle = "#000";
		ctx.lineWidth = 5;
		ctx.lineJoin = "round";
		ctx.strokeText(text, x, y);

		ctx.fillStyle = "#ff5722";
		ctx.fillText(text, x, y);

		// Best time in corner
		if (state.bestTime > 0) {
			ctx.font = "bold 16px monospace";
			ctx.textAlign = "right";
			ctx.strokeStyle = "#000";
			ctx.lineWidth = 3;
			ctx.strokeText(
				`Best: ${state.bestTime.toFixed(1)}s`,
				state.canvasW - 16,
				30,
			);
			ctx.fillStyle = "#ffab40";
			ctx.fillText(
				`Best: ${state.bestTime.toFixed(1)}s`,
				state.canvasW - 16,
				30,
			);
		}
	}

	private drawIdleOverlay(
		ctx: CanvasRenderingContext2D,
		state: LavaState,
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
		ctx.strokeText("Lava Floor", cx, cy);
		ctx.fillStyle = "#ff5722";
		ctx.fillText("Lava Floor", cx, cy);

		// Subtitle
		ctx.font = "bold 18px monospace";
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 3;
		ctx.strokeText("The Floor is Lava!", cx, cy + 45);
		ctx.fillStyle = "#ffab40";
		ctx.fillText("The Floor is Lava!", cx, cy + 45);

		// Instruction (pulsing)
		const alpha = 0.5 + 0.5 * Math.sin(performance.now() * 0.004);

		ctx.globalAlpha = alpha;
		ctx.font = "bold 20px monospace";
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 3;
		ctx.strokeText(
			"Press Arrow Keys or Space to Start",
			cx,
			state.canvasH * 0.6,
		);
		ctx.fillStyle = "#fff";
		ctx.fillText("Press Arrow Keys or Space to Start", cx, state.canvasH * 0.6);
		ctx.globalAlpha = 1;

		// Controls hint
		ctx.font = "14px monospace";
		ctx.fillStyle = "#999";
		ctx.fillText(
			"Arrows: Move  |  Space: Jump  |  ESC: Exit",
			cx,
			state.canvasH * 0.67,
		);

		// Best time
		if (state.bestTime > 0) {
			ctx.font = "bold 18px monospace";
			ctx.strokeStyle = "#000";
			ctx.lineWidth = 3;
			ctx.strokeText(
				`Best: ${state.bestTime.toFixed(1)}s`,
				cx,
				state.canvasH * 0.74,
			);
			ctx.fillStyle = "#ffab40";
			ctx.fillText(
				`Best: ${state.bestTime.toFixed(1)}s`,
				cx,
				state.canvasH * 0.74,
			);
		}
	}

	private drawDeathOverlay(
		ctx: CanvasRenderingContext2D,
		state: LavaState,
	): void {
		const cx = state.canvasW / 2;
		const cy = state.canvasH / 2;
		const survived = Math.floor(state.survivalTime / 100) / 10;

		// Dim overlay
		ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
		ctx.fillRect(0, 0, state.canvasW, state.canvasH);

		// Panel
		const panelW = 300;
		const panelH = 220;
		const px = cx - panelW / 2;
		const py = cy - panelH / 2 - 10;

		ctx.fillStyle = "#2d1200";
		ctx.strokeStyle = "#ff5722";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.roundRect(px, py, panelW, panelH, 12);
		ctx.fill();
		ctx.stroke();

		// Game Over text
		ctx.font = "bold 32px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = "#f44336";
		ctx.fillText("Burned!", cx, py + 40);

		// Score
		ctx.font = "bold 22px monospace";
		ctx.fillStyle = "#fff";
		ctx.fillText(`Survived: ${survived.toFixed(1)}s`, cx, cy);

		// Best
		ctx.font = "bold 18px monospace";
		ctx.fillStyle = "#ffab40";
		ctx.fillText(`Best: ${state.bestTime.toFixed(1)}s`, cx, cy + 30);

		// New best indicator
		if (survived > 0 && survived >= state.bestTime) {
			ctx.font = "bold 14px monospace";
			ctx.fillStyle = "#ffeb3b";
			ctx.fillText("NEW BEST!", cx, cy + 55);
		}

		// Restart instruction
		const alpha = 0.5 + 0.5 * Math.sin(performance.now() * 0.004);

		ctx.globalAlpha = alpha;
		ctx.font = "bold 16px monospace";
		ctx.fillStyle = "#ccc";
		ctx.fillText("Press Space to Restart", cx, py + panelH - 20);
		ctx.globalAlpha = 1;
	}
}
