import type { Renderable } from "@shared/Renderable";
import type { BasketballState } from "../types";

export class HUDRenderer implements Renderable<BasketballState> {
	render(ctx: CanvasRenderingContext2D, state: BasketballState): void {
		this.drawExitButton(ctx);
		this.drawScore(ctx, state);
		this.drawShotClock(ctx, state);
		this.drawStreak(ctx, state);
		this.drawBestScore(ctx, state);

		if (state.phase === "start") {
			this.drawStartOverlay(ctx, state);
		}

		if (state.phase === "gameover") {
			this.drawGameOverOverlay(ctx, state);
		}
	}

	private drawExitButton(ctx: CanvasRenderingContext2D): void {
		ctx.fillStyle = "rgba(255,255,255,0.15)";
		ctx.beginPath();
		ctx.roundRect(10, 10, 60, 28, 6);
		ctx.fill();

		ctx.font = "bold 13px monospace";
		ctx.fillStyle = "#ccc";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("ESC", 40, 24);
	}

	private drawScore(
		ctx: CanvasRenderingContext2D,
		state: BasketballState,
	): void {
		const cx = state.canvasW / 2;

		ctx.font = "bold 40px monospace";
		ctx.fillStyle = "#fff";
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillText(String(state.score), cx, 15);
	}

	private drawShotClock(
		ctx: CanvasRenderingContext2D,
		state: BasketballState,
	): void {
		if (state.phase !== "playing") return;

		const x = state.canvasW - 80;
		const y = 20;
		const remaining = Math.ceil(state.shotClock);

		// Background
		ctx.fillStyle = "rgba(0,0,0,0.5)";
		ctx.beginPath();
		ctx.roundRect(x - 5, y - 5, 70, 50, 8);
		ctx.fill();

		// Label
		ctx.font = "10px monospace";
		ctx.fillStyle = "#aaa";
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillText("SHOT CLOCK", x + 30, y);

		// Timer
		const isLow = state.shotClock <= 5;

		ctx.font = "bold 28px monospace";
		ctx.fillStyle = isLow ? "#e74c3c" : "#fff";
		ctx.fillText(String(remaining), x + 30, y + 14);

		// Progress bar
		const barW = 60;
		const barH = 4;
		const barX = x;
		const barY = y + 42;
		const fill = state.shotClock / state.shotClockMax;

		ctx.fillStyle = "rgba(255,255,255,0.2)";
		ctx.fillRect(barX, barY, barW, barH);

		ctx.fillStyle = isLow ? "#e74c3c" : "#ff7043";
		ctx.fillRect(barX, barY, barW * fill, barH);
	}

	private drawStreak(
		ctx: CanvasRenderingContext2D,
		state: BasketballState,
	): void {
		if (state.streak < 2) return;

		const x = 20;
		const y = 55;

		ctx.font = "bold 16px monospace";
		ctx.fillStyle = "#ff7043";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";

		let streakText = "STREAK x" + state.streak;

		if (state.streak >= 5) {
			streakText = "ON FIRE x" + state.streak;
			ctx.fillStyle = "#ff5722";
		}

		ctx.fillText(streakText, x, y);

		// Streak bonus info
		const bonus = Math.min(state.streak - 1, 5);

		ctx.font = "11px monospace";
		ctx.fillStyle = "#ffab91";
		ctx.fillText("+" + bonus + " bonus per shot", x, y + 20);
	}

	private drawBestScore(
		ctx: CanvasRenderingContext2D,
		state: BasketballState,
	): void {
		const x = state.canvasW - 80;
		const y = 80;

		ctx.font = "11px monospace";
		ctx.fillStyle = "#888";
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillText("BEST", x + 30, y);

		ctx.font = "bold 16px monospace";
		ctx.fillStyle = "#aaa";
		ctx.fillText(String(state.bestScore), x + 30, y + 14);
	}

	private drawStartOverlay(
		ctx: CanvasRenderingContext2D,
		state: BasketballState,
	): void {
		const W = state.canvasW;
		const H = state.canvasH;

		ctx.fillStyle = "rgba(0,0,0,0.7)";
		ctx.fillRect(0, 0, W, H);

		const cx = W / 2;
		const cy = H / 2;

		// Title
		ctx.font = "bold 48px monospace";
		ctx.fillStyle = "#ff7043";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("BASKETBALL", cx, cy - 60);

		// Ball icon
		ctx.font = "60px serif";
		ctx.fillText("\uD83C\uDFC0", cx, cy + 10);

		// Instructions
		ctx.font = "16px monospace";
		ctx.fillStyle = "#ccc";
		ctx.fillText("Click + drag from ball to aim", cx, cy + 70);
		ctx.fillText("Release to shoot", cx, cy + 95);

		// Start prompt
		ctx.font = "bold 18px monospace";
		ctx.fillStyle = "#ff7043";
		const blink = Math.sin(performance.now() / 400) > 0;

		if (blink) {
			ctx.fillText("Click or press ENTER to start", cx, cy + 140);
		}

		// Help hint
		ctx.font = "12px monospace";
		ctx.fillStyle = "#666";
		ctx.fillText("Press [H] for help", cx, cy + 175);
	}

	private drawGameOverOverlay(
		ctx: CanvasRenderingContext2D,
		state: BasketballState,
	): void {
		const W = state.canvasW;
		const H = state.canvasH;

		ctx.fillStyle = "rgba(0,0,0,0.8)";
		ctx.fillRect(0, 0, W, H);

		const cx = W / 2;
		const cy = H / 2;

		// Game Over text
		ctx.font = "bold 42px monospace";
		ctx.fillStyle = "#e74c3c";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("TIME UP!", cx, cy - 70);

		// Final score
		ctx.font = "bold 28px monospace";
		ctx.fillStyle = "#fff";
		ctx.fillText("Score: " + state.score, cx, cy - 20);

		// Best
		if (state.score >= state.bestScore) {
			ctx.font = "bold 20px monospace";
			ctx.fillStyle = "#ff7043";
			ctx.fillText("NEW BEST!", cx, cy + 15);
		} else {
			ctx.font = "16px monospace";
			ctx.fillStyle = "#aaa";
			ctx.fillText("Best: " + state.bestScore, cx, cy + 15);
		}

		// Restart prompt
		ctx.font = "bold 18px monospace";
		ctx.fillStyle = "#ff7043";
		const blink = Math.sin(performance.now() / 400) > 0;

		if (blink) {
			ctx.fillText("Click or press ENTER to restart", cx, cy + 60);
		}
	}
}
