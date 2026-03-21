import type { Renderable } from "@core/Renderable";
import type { Game2048State } from "../types";
import type { HelpOverlay } from "@shared/HelpOverlay";
import type { GameHelp } from "@core/GameInterface";

export class HUDRenderer implements Renderable<Game2048State> {
	private helpOverlay: HelpOverlay;
	private help: GameHelp;

	constructor(helpOverlay: HelpOverlay, help: GameHelp) {
		this.helpOverlay = helpOverlay;
		this.help = help;
	}

	render(ctx: CanvasRenderingContext2D, state: Game2048State): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		// Title
		ctx.font = `bold ${Math.min(48, W * 0.08)}px 'Clear Sans', Arial, sans-serif`;
		ctx.fillStyle = "#776e65";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		const titleX = (W - Math.min(W * 0.85, H * 0.6, 500)) / 2;

		ctx.fillText("2048", titleX, H * 0.05);

		// Score boxes
		const boxW = Math.min(100, W * 0.18);
		const boxH = 50;
		const boardRight = (W + Math.min(W * 0.85, H * 0.6, 500)) / 2;
		const scoreX = boardRight - boxW * 2 - 10;
		const bestX = boardRight - boxW;
		const boxY = H * 0.05;

		this.drawScoreBox(ctx, "SCORE", state.score, scoreX, boxY, boxW, boxH);
		this.drawScoreBox(ctx, "BEST", state.highScore, bestX, boxY, boxW, boxH);

		// Instruction hint
		ctx.font = `${Math.min(13, W * 0.025)}px 'Clear Sans', Arial, sans-serif`;
		ctx.fillStyle = "#776e65";
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillText(
			"Arrow keys to move  |  [R] Restart  |  [H] Help  |  [ESC] Exit",
			W / 2,
			H * 0.22,
		);

		// Game Over overlay
		if (state.gameOver) {
			this.drawOverlay(
				ctx,
				"Game Over!",
				"Press [R] to restart",
				"rgba(238,228,218,0.73)",
			);
		}

		// Win overlay
		if (state.won && !state.keepPlaying) {
			this.drawOverlay(
				ctx,
				"You Win!",
				"Press [C] to keep playing  |  [R] to restart",
				"rgba(237,194,46,0.5)",
			);
		}

		// Help overlay (on top of everything)
		this.helpOverlay.render(ctx, this.help, "2048", "#ff9800");
	}

	private drawScoreBox(
		ctx: CanvasRenderingContext2D,
		label: string,
		value: number,
		x: number,
		y: number,
		w: number,
		h: number,
	): void {
		ctx.fillStyle = "#bbada0";
		ctx.beginPath();
		ctx.roundRect(x, y, w, h, 4);
		ctx.fill();

		ctx.font = `bold ${Math.min(11, w * 0.12)}px 'Clear Sans', Arial, sans-serif`;
		ctx.fillStyle = "#eee4da";
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillText(label, x + w / 2, y + 6);

		ctx.font = `bold ${Math.min(20, w * 0.22)}px 'Clear Sans', Arial, sans-serif`;
		ctx.fillStyle = "#fff";
		ctx.fillText(String(value), x + w / 2, y + 24);
	}

	private drawOverlay(
		ctx: CanvasRenderingContext2D,
		title: string,
		subtitle: string,
		bgColor: string,
	): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		// Compute board area to overlay
		const boardSize = Math.min(W * 0.85, H * 0.6, 500);
		const boardX = (W - boardSize) / 2;
		const boardY = H * 0.3;

		ctx.fillStyle = bgColor;
		ctx.beginPath();
		ctx.roundRect(boardX, boardY, boardSize, boardSize, 8);
		ctx.fill();

		ctx.font = `bold ${Math.min(48, boardSize * 0.1)}px 'Clear Sans', Arial, sans-serif`;
		ctx.fillStyle = "#776e65";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(title, W / 2, boardY + boardSize / 2 - 20);

		ctx.font = `${Math.min(18, boardSize * 0.04)}px 'Clear Sans', Arial, sans-serif`;
		ctx.fillStyle = "#776e65";
		ctx.fillText(subtitle, W / 2, boardY + boardSize / 2 + 25);
	}
}
