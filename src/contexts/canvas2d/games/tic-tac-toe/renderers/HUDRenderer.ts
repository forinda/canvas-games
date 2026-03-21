import type { Renderable } from "@core/Renderable";
import type { TicTacToeState } from "../types.ts";

export class HUDRenderer implements Renderable<TicTacToeState> {
	render(ctx: CanvasRenderingContext2D, state: TicTacToeState): void {
		const W = state.canvasWidth;
		const H = state.canvasHeight;

		if (state.showModeSelect) {
			this.renderModeSelect(ctx, W, H);

			return;
		}

		this.renderScoreboard(ctx, state, W);
		this.renderTurnIndicator(ctx, state, W, H);

		if (state.gameOver) {
			this.renderGameOverOverlay(ctx, state, W, H);
		}
	}

	private renderModeSelect(
		ctx: CanvasRenderingContext2D,
		W: number,
		H: number,
	): void {
		// Background
		ctx.fillStyle = "#0f0f1a";
		ctx.fillRect(0, 0, W, H);

		// Title
		ctx.font = "bold 36px monospace";
		ctx.fillStyle = "#ef5350";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("Tic-Tac-Toe", W / 2, H / 2 - 120);

		ctx.font = "16px monospace";
		ctx.fillStyle = "#888";
		ctx.fillText("Choose a game mode", W / 2, H / 2 - 75);

		const btnW = 200;
		const btnH = 50;
		const centerX = W / 2;
		const centerY = H / 2;

		// AI button
		this.drawButton(
			ctx,
			centerX - btnW / 2,
			centerY - 10 - btnH,
			btnW,
			btnH,
			"vs AI",
			"#ef5350",
		);

		// 2-player button
		this.drawButton(
			ctx,
			centerX - btnW / 2,
			centerY + 10,
			btnW,
			btnH,
			"2 Players",
			"#42a5f5",
		);

		// Hint
		ctx.font = "12px monospace";
		ctx.fillStyle = "#555";
		ctx.fillText(
			"Press [ESC] to exit  |  Press [H] for help",
			W / 2,
			H / 2 + 100,
		);
	}

	private drawButton(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		w: number,
		h: number,
		label: string,
		color: string,
	): void {
		ctx.fillStyle = "rgba(255,255,255,0.05)";
		ctx.beginPath();
		ctx.roundRect(x, y, w, h, 10);
		ctx.fill();

		ctx.strokeStyle = color;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(x, y, w, h, 10);
		ctx.stroke();

		ctx.font = "bold 18px monospace";
		ctx.fillStyle = color;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(label, x + w / 2, y + h / 2);
	}

	private renderScoreboard(
		ctx: CanvasRenderingContext2D,
		state: TicTacToeState,
		W: number,
	): void {
		const y = 24;

		ctx.font = "bold 14px monospace";
		ctx.textBaseline = "top";
		ctx.textAlign = "center";

		// X score
		ctx.fillStyle = "#ef5350";
		ctx.fillText(`X: ${state.scoreX}`, W / 2 - 100, y);

		// Draws
		ctx.fillStyle = "#888";
		ctx.fillText(`Draw: ${state.draws}`, W / 2, y);

		// O score
		ctx.fillStyle = "#42a5f5";
		ctx.fillText(`O: ${state.scoreO}`, W / 2 + 100, y);

		// Mode indicator
		ctx.font = "11px monospace";
		ctx.fillStyle = "#555";
		ctx.fillText(
			state.mode === "ai" ? "Mode: vs AI" : "Mode: 2 Players",
			W / 2,
			y + 20,
		);
	}

	private renderTurnIndicator(
		ctx: CanvasRenderingContext2D,
		state: TicTacToeState,
		W: number,
		H: number,
	): void {
		if (state.gameOver) return;

		const boardSize = Math.min(W, H) * 0.6;
		const boardY = (H - boardSize) / 2 + 20;
		const y = boardY + boardSize + 30;

		ctx.font = "16px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "top";

		if (state.aiThinking) {
			ctx.fillStyle = "#42a5f5";
			ctx.fillText("AI is thinking...", W / 2, y);
		} else {
			const color = state.currentPlayer === "X" ? "#ef5350" : "#42a5f5";

			ctx.fillStyle = color;
			ctx.fillText(`${state.currentPlayer}'s turn`, W / 2, y);
		}

		// Controls hint
		ctx.font = "11px monospace";
		ctx.fillStyle = "#444";
		ctx.fillText("[R] Restart  [M] Mode  [H] Help  [ESC] Exit", W / 2, y + 25);
	}

	private renderGameOverOverlay(
		ctx: CanvasRenderingContext2D,
		state: TicTacToeState,
		W: number,
		H: number,
	): void {
		// Semi-transparent overlay
		ctx.fillStyle = "rgba(0,0,0,0.55)";
		ctx.fillRect(0, 0, W, H);

		// Result panel
		const panelW = 300;
		const panelH = 140;
		const px = (W - panelW) / 2;
		const py = (H - panelH) / 2;

		ctx.fillStyle = "#1a1a2e";
		ctx.beginPath();
		ctx.roundRect(px, py, panelW, panelH, 12);
		ctx.fill();

		ctx.strokeStyle = state.isDraw
			? "#888"
			: state.winner === "X"
				? "#ef5350"
				: "#42a5f5";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(px, py, panelW, panelH, 12);
		ctx.stroke();

		ctx.font = "bold 24px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		if (state.isDraw) {
			ctx.fillStyle = "#ccc";
			ctx.fillText("It's a Draw!", W / 2, py + 50);
		} else {
			const color = state.winner === "X" ? "#ef5350" : "#42a5f5";

			ctx.fillStyle = color;
			ctx.fillText(`${state.winner} Wins!`, W / 2, py + 50);
		}

		ctx.font = "13px monospace";
		ctx.fillStyle = "#777";
		ctx.fillText("Click or press [R] to play again", W / 2, py + 100);
	}
}
