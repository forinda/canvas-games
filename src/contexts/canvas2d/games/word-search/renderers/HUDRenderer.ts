import type { Renderable } from "@core/Renderable";
import type { WordSearchState } from "../types";
import { GAME_COLOR } from "../types";

export class HUDRenderer implements Renderable<WordSearchState> {
	render(ctx: CanvasRenderingContext2D, state: WordSearchState): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;
		const { offsetX, offsetY, cellSize, cols } = state;

		// --- Top bar: theme + timer ---
		const topY = 12;

		ctx.font = "bold 18px monospace";
		ctx.fillStyle = GAME_COLOR;
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillText(`Theme: ${state.theme}`, offsetX, topY);

		// Timer
		const mins = Math.floor(state.timer / 60);
		const secs = Math.floor(state.timer % 60);
		const timeStr = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

		ctx.textAlign = "right";
		ctx.fillText(timeStr, offsetX + cols * cellSize, topY);

		// --- Word list on the right side ---
		const listX = offsetX + cols * cellSize + 24;
		const listMaxW = W - listX - 12;

		if (listMaxW > 60) {
			let listY = offsetY + 4;

			ctx.font = "bold 14px monospace";
			ctx.fillStyle = GAME_COLOR;
			ctx.textAlign = "left";
			ctx.textBaseline = "top";
			ctx.fillText("WORDS", listX, listY);
			listY += 24;

			const foundCount = state.placedWords.filter((pw) => pw.found).length;

			ctx.font = "12px monospace";
			ctx.fillStyle = "#666";
			ctx.fillText(`${foundCount}/${state.placedWords.length}`, listX, listY);
			listY += 22;

			ctx.font = "13px monospace";

			for (const pw of state.placedWords) {
				if (pw.found) {
					const color = state.foundColors.get(pw.word) || GAME_COLOR;

					ctx.fillStyle = color;
					ctx.fillText(pw.word, listX, listY);

					// Strikethrough
					const textW = ctx.measureText(pw.word).width;

					ctx.strokeStyle = color;
					ctx.lineWidth = 2;
					ctx.beginPath();
					ctx.moveTo(listX - 2, listY + 7);
					ctx.lineTo(listX + textW + 2, listY + 7);
					ctx.stroke();
				} else {
					ctx.fillStyle = "#777";
					ctx.fillText(pw.word, listX, listY);
				}

				listY += 20;
			}
		}

		// --- Bottom hints ---
		ctx.font = "12px monospace";
		ctx.fillStyle = "#444";
		ctx.textAlign = "center";
		ctx.textBaseline = "bottom";
		ctx.fillText("[R] Restart  [H] Help  [ESC] Exit", W / 2, H - 8);

		// --- Win overlay ---
		if (state.status === "won") {
			this.renderWinOverlay(ctx, state);
		}
	}

	private renderWinOverlay(
		ctx: CanvasRenderingContext2D,
		state: WordSearchState,
	): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		ctx.fillStyle = "rgba(0,0,0,0.7)";
		ctx.fillRect(0, 0, W, H);

		const panelW = Math.min(400, W * 0.6);
		const panelH = 180;
		const px = (W - panelW) / 2;
		const py = (H - panelH) / 2;

		ctx.fillStyle = "#151530";
		ctx.beginPath();
		ctx.roundRect(px, py, panelW, panelH, 12);
		ctx.fill();

		ctx.strokeStyle = GAME_COLOR;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(px, py, panelW, panelH, 12);
		ctx.stroke();

		ctx.font = "bold 28px monospace";
		ctx.fillStyle = "#fff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("All Words Found!", W / 2, py + 50);

		const mins = Math.floor(state.timer / 60);
		const secs = Math.floor(state.timer % 60);

		ctx.font = "18px monospace";
		ctx.fillStyle = GAME_COLOR;
		ctx.fillText(
			`Time: ${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
			W / 2,
			py + 95,
		);

		ctx.font = "14px monospace";
		ctx.fillStyle = "#888";
		ctx.fillText("Press [R] to play again", W / 2, py + 140);
	}
}
