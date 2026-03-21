import type { Renderable } from "@core/Renderable";
import type { TypingState } from "../types";
import { MAX_LIVES } from "../types";

export class HUDRenderer implements Renderable<TypingState> {
	render(ctx: CanvasRenderingContext2D, state: TypingState): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		// Top bar background
		ctx.fillStyle = "rgba(0,0,0,0.7)";
		ctx.fillRect(0, 0, W, 44);

		ctx.textBaseline = "middle";
		ctx.font = "bold 14px monospace";

		// Exit button
		ctx.fillStyle = "#666";
		ctx.textAlign = "left";
		ctx.fillText("< EXIT", 12, 22);

		// Score
		ctx.fillStyle = "#00e676";
		ctx.textAlign = "center";
		ctx.fillText(`Score: ${state.score}`, W / 2, 22);

		// Lives
		ctx.textAlign = "right";
		ctx.fillStyle = "#ef5350";
		let livesText = "";

		for (let i = 0; i < MAX_LIVES; i++) {
			livesText += i < state.lives ? "\u2764 " : "\u2661 ";
		}

		ctx.fillText(livesText.trim(), W - 12, 22);

		// Stats bar
		ctx.fillStyle = "rgba(0,0,0,0.5)";
		ctx.fillRect(0, 44, W, 28);

		ctx.font = "12px monospace";
		ctx.textBaseline = "middle";
		const statY = 58;

		// WPM
		const wpm = this.calculateWPM(state);

		ctx.fillStyle = "#4fc3f7";
		ctx.textAlign = "left";
		ctx.fillText(`WPM: ${wpm}`, 12, statY);

		// Accuracy
		const accuracy = this.calculateAccuracy(state);

		ctx.fillStyle = "#fff176";
		ctx.textAlign = "center";
		ctx.fillText(`Accuracy: ${accuracy}%`, W / 2, statY);

		// Words completed
		ctx.fillStyle = "#81c784";
		ctx.textAlign = "right";
		ctx.fillText(`Words: ${state.wordsCompleted}`, W - 12, statY);

		// Current input display at bottom
		this.drawInputBar(ctx, state, W, H);

		// Overlays
		if (!state.started) {
			this.drawOverlay(
				ctx,
				W,
				H,
				"TYPING SPEED",
				"Start typing to begin!",
				"#00897b",
			);
		} else if (state.gameOver) {
			this.drawGameOverOverlay(ctx, state, W, H);
		} else if (state.paused) {
			this.drawOverlay(ctx, W, H, "PAUSED", "Press P to resume", "#f59e0b");
		}
	}

	private drawInputBar(
		ctx: CanvasRenderingContext2D,
		state: TypingState,
		W: number,
		H: number,
	): void {
		if (!state.started || state.gameOver || state.paused) return;

		const barH = 44;
		const barY = H - barH;

		ctx.fillStyle = "rgba(0,0,0,0.8)";
		ctx.fillRect(0, barY, W, barH);

		ctx.strokeStyle = "rgba(0,229,255,0.3)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(0, barY);
		ctx.lineTo(W, barY);
		ctx.stroke();

		ctx.font = "bold 18px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		if (state.currentInput.length > 0) {
			ctx.fillStyle = "#00e5ff";
			ctx.fillText(state.currentInput, W / 2, barY + barH / 2);

			// Blinking cursor
			const inputW = ctx.measureText(state.currentInput).width;

			if (Math.floor(performance.now() / 500) % 2 === 0) {
				ctx.fillStyle = "#00e5ff";
				ctx.fillRect(W / 2 + inputW / 2 + 2, barY + 10, 2, barH - 20);
			}
		} else {
			ctx.fillStyle = "#555";
			ctx.fillText("Type to destroy words...", W / 2, barY + barH / 2);
		}
	}

	private calculateWPM(state: TypingState): number {
		if (state.elapsedTime < 1000) return 0;

		const minutes = state.elapsedTime / 60000;

		return Math.round(state.wordsCompleted / Math.max(minutes, 0.01));
	}

	private calculateAccuracy(state: TypingState): number {
		if (state.totalTyped === 0) return 100;

		return Math.round((state.correctTyped / state.totalTyped) * 100);
	}

	private drawOverlay(
		ctx: CanvasRenderingContext2D,
		W: number,
		H: number,
		title: string,
		sub: string,
		color: string,
	): void {
		ctx.fillStyle = "rgba(0,0,0,0.75)";
		ctx.fillRect(0, 0, W, H);

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		ctx.font = `bold ${Math.min(56, W * 0.07)}px monospace`;
		ctx.fillStyle = color;
		ctx.shadowColor = color;
		ctx.shadowBlur = 24;
		ctx.fillText(title, W / 2, H * 0.38);
		ctx.shadowBlur = 0;

		ctx.font = `${Math.min(18, W * 0.025)}px monospace`;
		ctx.fillStyle = "#aaa";
		ctx.fillText(sub, W / 2, H * 0.5);

		ctx.font = `${Math.min(13, W * 0.02)}px monospace`;
		ctx.fillStyle = "#555";
		ctx.fillText("Press [H] for help  |  Press [ESC] to exit", W / 2, H * 0.58);
	}

	private drawGameOverOverlay(
		ctx: CanvasRenderingContext2D,
		state: TypingState,
		W: number,
		H: number,
	): void {
		ctx.fillStyle = "rgba(0,0,0,0.8)";
		ctx.fillRect(0, 0, W, H);

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		ctx.font = `bold ${Math.min(56, W * 0.07)}px monospace`;
		ctx.fillStyle = "#ef5350";
		ctx.shadowColor = "#ef5350";
		ctx.shadowBlur = 20;
		ctx.fillText("GAME OVER", W / 2, H * 0.28);
		ctx.shadowBlur = 0;

		const wpm = this.calculateWPM(state);
		const accuracy = this.calculateAccuracy(state);

		ctx.font = `bold ${Math.min(22, W * 0.03)}px monospace`;
		ctx.fillStyle = "#00e676";
		ctx.fillText(`Score: ${state.score}`, W / 2, H * 0.4);

		ctx.font = `${Math.min(16, W * 0.022)}px monospace`;
		ctx.fillStyle = "#4fc3f7";
		ctx.fillText(
			`WPM: ${wpm}  |  Accuracy: ${accuracy}%  |  Words: ${state.wordsCompleted}`,
			W / 2,
			H * 0.48,
		);

		ctx.font = `${Math.min(16, W * 0.022)}px monospace`;
		ctx.fillStyle = "#aaa";
		ctx.fillText("Press SPACE or ENTER to restart", W / 2, H * 0.58);

		ctx.font = `${Math.min(13, W * 0.02)}px monospace`;
		ctx.fillStyle = "#555";
		ctx.fillText("Press [ESC] to exit", W / 2, H * 0.64);
	}
}
