import type { Renderable } from "@shared/Renderable";
import type { FruitNinjaState } from "../types";
import { MAX_LIVES } from "../types";

export class HUDRenderer implements Renderable<FruitNinjaState> {
	render(ctx: CanvasRenderingContext2D, state: FruitNinjaState): void {
		const W = state.width;
		const H = state.height;

		this.drawScore(ctx, state, W);
		this.drawLives(ctx, state, W);
		this.drawCombo(ctx, state, W, H);

		if (!state.started) {
			this.drawStartOverlay(ctx, W, H);
		} else if (state.gameOver) {
			this.drawGameOverOverlay(ctx, state, W, H);
		} else if (state.paused) {
			this.drawPausedOverlay(ctx, W, H);
		}
	}

	private drawScore(
		ctx: CanvasRenderingContext2D,
		state: FruitNinjaState,
		_W: number,
	): void {
		ctx.save();
		ctx.font = "bold 32px sans-serif";
		ctx.fillStyle = "#fff";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.shadowColor = "rgba(0,0,0,0.5)";
		ctx.shadowBlur = 6;
		ctx.fillText(`Score: ${state.score}`, 20, 20);

		ctx.font = "16px sans-serif";
		ctx.fillStyle = "#ccc";
		ctx.fillText(`Best: ${state.highScore}`, 20, 58);
		ctx.restore();
	}

	private drawLives(
		ctx: CanvasRenderingContext2D,
		state: FruitNinjaState,
		W: number,
	): void {
		ctx.save();
		ctx.font = "28px sans-serif";
		ctx.textAlign = "right";
		ctx.textBaseline = "top";
		ctx.shadowColor = "rgba(0,0,0,0.5)";
		ctx.shadowBlur = 4;

		let display = "";

		for (let i = 0; i < MAX_LIVES; i++) {
			display += i < state.lives ? "🍎 " : "✖ ";
		}

		ctx.fillText(display.trim(), W - 20, 20);
		ctx.restore();
	}

	private drawCombo(
		ctx: CanvasRenderingContext2D,
		state: FruitNinjaState,
		W: number,
		_H: number,
	): void {
		if (state.combo < 2 || state.comboTimer <= 0) return;

		ctx.save();
		const scale = 1 + Math.sin(performance.now() * 0.01) * 0.1;

		ctx.font = `bold ${Math.floor(40 * scale)}px sans-serif`;
		ctx.fillStyle = "#ffeb3b";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.shadowColor = "rgba(255,152,0,0.7)";
		ctx.shadowBlur = 15;
		ctx.fillText(`${state.combo}x COMBO!`, W / 2, 80);
		ctx.restore();
	}

	private drawStartOverlay(
		ctx: CanvasRenderingContext2D,
		W: number,
		H: number,
	): void {
		ctx.save();

		// Semi-transparent overlay
		ctx.fillStyle = "rgba(0,0,0,0.6)";
		ctx.fillRect(0, 0, W, H);

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		// Title
		ctx.font = "bold 56px sans-serif";
		ctx.fillStyle = "#e91e63";
		ctx.shadowColor = "rgba(233,30,99,0.5)";
		ctx.shadowBlur = 20;
		ctx.fillText("🍉 Fruit Ninja", W / 2, H / 2 - 60);

		// Subtitle
		ctx.shadowBlur = 0;
		ctx.font = "22px sans-serif";
		ctx.fillStyle = "#fff";
		ctx.fillText("Swipe to slice fruits!", W / 2, H / 2);

		ctx.font = "18px sans-serif";
		ctx.fillStyle = "#aaa";
		ctx.fillText("Click or tap to start", W / 2, H / 2 + 40);

		ctx.font = "14px sans-serif";
		ctx.fillStyle = "#666";
		ctx.fillText("[P] Pause  |  [ESC] Exit", W / 2, H / 2 + 80);

		ctx.restore();
	}

	private drawGameOverOverlay(
		ctx: CanvasRenderingContext2D,
		state: FruitNinjaState,
		W: number,
		H: number,
	): void {
		ctx.save();

		ctx.fillStyle = "rgba(0,0,0,0.7)";
		ctx.fillRect(0, 0, W, H);

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		ctx.font = "bold 52px sans-serif";
		ctx.fillStyle = "#f44336";
		ctx.shadowColor = "rgba(244,67,54,0.5)";
		ctx.shadowBlur = 15;
		ctx.fillText("GAME OVER", W / 2, H / 2 - 70);

		ctx.shadowBlur = 0;
		ctx.font = "bold 36px sans-serif";
		ctx.fillStyle = "#fff";
		ctx.fillText(`Score: ${state.score}`, W / 2, H / 2 - 10);

		if (state.score >= state.highScore && state.score > 0) {
			ctx.font = "bold 24px sans-serif";
			ctx.fillStyle = "#ffeb3b";
			ctx.fillText("🏆 New High Score!", W / 2, H / 2 + 30);
		} else {
			ctx.font = "20px sans-serif";
			ctx.fillStyle = "#aaa";
			ctx.fillText(`Best: ${state.highScore}`, W / 2, H / 2 + 30);
		}

		ctx.font = "20px sans-serif";
		ctx.fillStyle = "#ccc";
		ctx.fillText("Press SPACE or tap to restart", W / 2, H / 2 + 80);

		ctx.font = "14px sans-serif";
		ctx.fillStyle = "#666";
		ctx.fillText("[ESC] Exit to menu", W / 2, H / 2 + 115);

		ctx.restore();
	}

	private drawPausedOverlay(
		ctx: CanvasRenderingContext2D,
		W: number,
		H: number,
	): void {
		ctx.save();
		ctx.fillStyle = "rgba(0,0,0,0.5)";
		ctx.fillRect(0, 0, W, H);

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = "bold 48px sans-serif";
		ctx.fillStyle = "#fff";
		ctx.fillText("PAUSED", W / 2, H / 2 - 20);

		ctx.font = "20px sans-serif";
		ctx.fillStyle = "#aaa";
		ctx.fillText("Press [P] to resume", W / 2, H / 2 + 30);
		ctx.restore();
	}
}
