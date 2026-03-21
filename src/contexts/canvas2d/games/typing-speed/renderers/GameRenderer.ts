import type { Renderable } from "@core/Renderable";
import type { TypingState, FallingWord } from "../types";
import { FONT_SIZE } from "../types";

export class GameRenderer implements Renderable<TypingState> {
	render(ctx: CanvasRenderingContext2D, state: TypingState): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		// Dark background
		ctx.fillStyle = "#0a0e17";
		ctx.fillRect(0, 0, W, H);

		// Subtle grid lines
		ctx.strokeStyle = "rgba(255,255,255,0.02)";
		ctx.lineWidth = 1;

		for (let y = 0; y < H; y += 60) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(W, y);
			ctx.stroke();
		}

		// Draw falling words
		for (const word of state.words) {
			this.drawWord(ctx, word, word === state.activeWord);
		}

		// Danger zone at the bottom
		const gradient = ctx.createLinearGradient(0, H - 80, 0, H);

		gradient.addColorStop(0, "rgba(255,0,0,0)");
		gradient.addColorStop(1, "rgba(255,0,0,0.12)");
		ctx.fillStyle = gradient;
		ctx.fillRect(0, H - 80, W, 80);

		// Danger line
		ctx.strokeStyle = "rgba(255,60,60,0.3)";
		ctx.lineWidth = 1;
		ctx.setLineDash([8, 4]);
		ctx.beginPath();
		ctx.moveTo(0, H - 80);
		ctx.lineTo(W, H - 80);
		ctx.stroke();
		ctx.setLineDash([]);
	}

	private drawWord(
		ctx: CanvasRenderingContext2D,
		word: FallingWord,
		isActive: boolean,
	): void {
		const len = word.text.length;
		const color = this.getWordColor(len);

		ctx.font = `bold ${FONT_SIZE}px monospace`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		// Glow effect for active word
		if (isActive) {
			ctx.shadowColor = "#00e5ff";
			ctx.shadowBlur = 16;

			// Draw highlight background
			const textWidth = ctx.measureText(word.text).width;

			ctx.fillStyle = "rgba(0,229,255,0.08)";
			ctx.beginPath();
			ctx.roundRect(
				word.x - textWidth / 2 - 8,
				word.y - FONT_SIZE / 2 - 4,
				textWidth + 16,
				FONT_SIZE + 8,
				6,
			);
			ctx.fill();
		}

		// Draw typed portion in a different color
		if (word.typed.length > 0) {
			const typedText = word.text.slice(0, word.typed.length);
			const remainText = word.text.slice(word.typed.length);

			// Measure full text for centering
			const fullWidth = ctx.measureText(word.text).width;
			const typedWidth = ctx.measureText(typedText).width;
			const startX = word.x - fullWidth / 2;

			ctx.textAlign = "left";

			// Typed portion — bright green
			ctx.fillStyle = "#00e676";
			ctx.fillText(typedText, startX, word.y);

			// Remaining portion
			ctx.fillStyle = isActive ? "#ffffff" : color;
			ctx.fillText(remainText, startX + typedWidth, word.y);
		} else {
			ctx.fillStyle = color;
			ctx.fillText(word.text, word.x, word.y);
		}

		ctx.shadowBlur = 0;
	}

	private getWordColor(length: number): string {
		if (length <= 3) return "#4fc3f7"; // light blue — easy

		if (length <= 4) return "#81c784"; // green — moderate

		if (length <= 5) return "#fff176"; // yellow — medium

		if (length <= 6) return "#ffb74d"; // orange — hard

		return "#ef5350"; // red — very hard
	}
}
