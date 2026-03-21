import type { Renderable } from "@core/Renderable";
import type { RhythmState } from "../types";
import { ROUND_DURATION } from "../types";

export class HUDRenderer implements Renderable<RhythmState> {
	render(ctx: CanvasRenderingContext2D, state: RhythmState): void {
		const W = state.width;
		const H = state.height;

		if (!state.started) {
			this.drawStartOverlay(ctx, W, H);

			return;
		}

		this.drawScore(ctx, state);
		this.drawCombo(ctx, state, W);
		this.drawTimer(ctx, state, W);
		this.drawAccuracy(ctx, state, W, H);

		if (state.gameOver) {
			this.drawGameOverOverlay(ctx, state, W, H);
		} else if (state.paused) {
			this.drawPausedOverlay(ctx, W, H);
		}
	}

	private drawScore(ctx: CanvasRenderingContext2D, state: RhythmState): void {
		ctx.save();
		ctx.font = "bold 32px monospace";
		ctx.fillStyle = "#fff";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.shadowColor = "rgba(224,64,251,0.5)";
		ctx.shadowBlur = 8;
		ctx.fillText(`${state.score}`, 20, 20);

		ctx.shadowBlur = 0;
		ctx.font = "14px monospace";
		ctx.fillStyle = "#888";
		ctx.fillText(`Best: ${state.highScore}`, 20, 58);
		ctx.restore();
	}

	private drawCombo(
		ctx: CanvasRenderingContext2D,
		state: RhythmState,
		W: number,
	): void {
		if (state.combo < 2) return;

		ctx.save();
		const pulse = 1 + Math.sin(performance.now() * 0.008) * 0.08;
		const fontSize = Math.floor(28 * pulse);

		ctx.font = `bold ${fontSize}px monospace`;
		ctx.textAlign = "center";
		ctx.textBaseline = "top";

		// Multiplier
		if (state.multiplier > 1) {
			ctx.fillStyle = "#ffeb3b";
			ctx.shadowColor = "rgba(255,235,59,0.6)";
			ctx.shadowBlur = 12;
			ctx.fillText(`${state.multiplier}x`, W / 2, 20);
		}

		ctx.shadowBlur = 0;
		ctx.font = "bold 20px monospace";
		ctx.fillStyle = "#e040fb";
		ctx.fillText(`${state.combo} combo`, W / 2, 52);

		ctx.restore();
	}

	private drawTimer(
		ctx: CanvasRenderingContext2D,
		state: RhythmState,
		W: number,
	): void {
		ctx.save();

		const seconds = Math.ceil(state.timeRemaining);
		const minutes = Math.floor(seconds / 60);
		const secs = seconds % 60;
		const timeStr = `${minutes}:${secs.toString().padStart(2, "0")}`;

		// Color changes when low on time
		const isLow = state.timeRemaining <= 10;

		ctx.font = "bold 28px monospace";
		ctx.fillStyle = isLow ? "#f44336" : "#fff";
		ctx.textAlign = "right";
		ctx.textBaseline = "top";

		if (isLow) {
			ctx.shadowColor = "rgba(244,67,54,0.5)";
			ctx.shadowBlur = 10;
		}

		ctx.fillText(timeStr, W - 20, 20);

		// Timer bar
		ctx.shadowBlur = 0;
		const barW = 120;
		const barH = 6;
		const barX = W - 20 - barW;
		const barY = 54;
		const progress = state.timeRemaining / ROUND_DURATION;

		ctx.fillStyle = "rgba(255,255,255,0.1)";
		ctx.fillRect(barX, barY, barW, barH);

		ctx.fillStyle = isLow ? "#f44336" : "#e040fb";
		ctx.fillRect(barX, barY, barW * progress, barH);

		ctx.restore();
	}

	private drawAccuracy(
		ctx: CanvasRenderingContext2D,
		state: RhythmState,
		_W: number,
		H: number,
	): void {
		const total = state.totalHits + state.totalMisses;

		if (total === 0) return;

		const accuracy = (state.totalHits / total) * 100;

		ctx.save();
		ctx.font = "14px monospace";
		ctx.fillStyle = "#888";
		ctx.textAlign = "left";
		ctx.textBaseline = "bottom";
		ctx.fillText(`Accuracy: ${accuracy.toFixed(1)}%`, 20, H - 20);
		ctx.restore();
	}

	private drawStartOverlay(
		ctx: CanvasRenderingContext2D,
		W: number,
		H: number,
	): void {
		ctx.save();

		ctx.fillStyle = "rgba(0,0,0,0.7)";
		ctx.fillRect(0, 0, W, H);

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		ctx.font = "bold 52px monospace";
		ctx.fillStyle = "#e040fb";
		ctx.shadowColor = "rgba(224,64,251,0.5)";
		ctx.shadowBlur = 20;
		ctx.fillText("Rhythm Tap", W / 2, H / 2 - 60);

		ctx.shadowBlur = 0;
		ctx.font = "20px monospace";
		ctx.fillStyle = "#fff";
		ctx.fillText("Tap circles when the rings align!", W / 2, H / 2);

		ctx.font = "18px monospace";
		ctx.fillStyle = "#aaa";
		ctx.fillText("Click or tap to start", W / 2, H / 2 + 40);

		ctx.font = "14px monospace";
		ctx.fillStyle = "#666";
		ctx.fillText("[P] Pause  |  [H] Help  |  [ESC] Exit", W / 2, H / 2 + 80);

		ctx.restore();
	}

	private drawGameOverOverlay(
		ctx: CanvasRenderingContext2D,
		state: RhythmState,
		W: number,
		H: number,
	): void {
		ctx.save();

		ctx.fillStyle = "rgba(0,0,0,0.75)";
		ctx.fillRect(0, 0, W, H);

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		ctx.font = "bold 48px monospace";
		ctx.fillStyle = "#e040fb";
		ctx.shadowColor = "rgba(224,64,251,0.5)";
		ctx.shadowBlur = 15;
		ctx.fillText("TIME UP!", W / 2, H / 2 - 100);

		ctx.shadowBlur = 0;

		// Score
		ctx.font = "bold 36px monospace";
		ctx.fillStyle = "#fff";
		ctx.fillText(`Score: ${state.score}`, W / 2, H / 2 - 40);

		// High score
		if (state.score >= state.highScore && state.score > 0) {
			ctx.font = "bold 22px monospace";
			ctx.fillStyle = "#ffeb3b";
			ctx.fillText("New High Score!", W / 2, H / 2);
		} else {
			ctx.font = "18px monospace";
			ctx.fillStyle = "#aaa";
			ctx.fillText(`Best: ${state.highScore}`, W / 2, H / 2);
		}

		// Stats
		const total = state.totalHits + state.totalMisses;
		const accuracy =
			total > 0 ? ((state.totalHits / total) * 100).toFixed(1) : "0.0";

		ctx.font = "16px monospace";
		ctx.fillStyle = "#ccc";
		ctx.fillText(
			`Max Combo: ${state.maxCombo}  |  Accuracy: ${accuracy}%`,
			W / 2,
			H / 2 + 40,
		);

		ctx.fillStyle = "#999";
		ctx.fillText(
			`Perfect: ${state.perfectHits}  Good: ${state.goodHits}  OK: ${state.okHits}  Miss: ${state.totalMisses}`,
			W / 2,
			H / 2 + 65,
		);

		// Restart prompt
		ctx.font = "20px monospace";
		ctx.fillStyle = "#ccc";
		ctx.fillText("Press SPACE or tap to restart", W / 2, H / 2 + 110);

		ctx.font = "14px monospace";
		ctx.fillStyle = "#666";
		ctx.fillText("[ESC] Exit to menu", W / 2, H / 2 + 140);

		ctx.restore();
	}

	private drawPausedOverlay(
		ctx: CanvasRenderingContext2D,
		W: number,
		H: number,
	): void {
		ctx.save();
		ctx.fillStyle = "rgba(0,0,0,0.6)";
		ctx.fillRect(0, 0, W, H);

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = "bold 48px monospace";
		ctx.fillStyle = "#fff";
		ctx.fillText("PAUSED", W / 2, H / 2 - 20);

		ctx.font = "20px monospace";
		ctx.fillStyle = "#aaa";
		ctx.fillText("Press [P] to resume", W / 2, H / 2 + 30);
		ctx.restore();
	}
}
