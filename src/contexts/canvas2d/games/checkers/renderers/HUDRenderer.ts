import type { Renderable } from "@core/Renderable";
import type { CheckersState } from "../types";

export class HUDRenderer implements Renderable<CheckersState> {
	render(ctx: CanvasRenderingContext2D, state: CheckersState): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		// Exit button
		this.drawExitButton(ctx);

		if (state.showModeSelector) {
			this.drawModeSelector(ctx, W, H);

			return;
		}

		this.drawTurnIndicator(ctx, state, W);
		this.drawCapturedCount(ctx, state, W, H);
		this.drawModeLabel(ctx, state, W);

		if (state.aiThinking) {
			this.drawAIThinking(ctx, W, H);
		}

		if (state.gameOver) {
			this.drawGameOverOverlay(ctx, state, W, H);
		}

		if (state.paused && !state.gameOver) {
			this.drawPauseOverlay(ctx, W, H);
		}
	}

	private drawExitButton(ctx: CanvasRenderingContext2D): void {
		ctx.fillStyle = "rgba(255,255,255,0.08)";
		ctx.beginPath();
		ctx.roundRect(8, 8, 70, 28, 6);
		ctx.fill();
		ctx.font = "13px monospace";
		ctx.fillStyle = "#aaa";
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillText("< Exit", 16, 22);
	}

	private drawTurnIndicator(
		ctx: CanvasRenderingContext2D,
		state: CheckersState,
		W: number,
	): void {
		const text = state.currentTurn === "red" ? "Red's Turn" : "Black's Turn";
		const color = state.currentTurn === "red" ? "#ff4444" : "#888";

		ctx.font = "bold 18px monospace";
		ctx.fillStyle = color;
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillText(text, W / 2, 12);

		// Turn indicator circle
		ctx.fillStyle = state.currentTurn === "red" ? "#cc0000" : "#222";
		ctx.strokeStyle = state.currentTurn === "red" ? "#ff4444" : "#555";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(
			W / 2 - ctx.measureText(text).width / 2 - 18,
			22,
			8,
			0,
			Math.PI * 2,
		);
		ctx.fill();
		ctx.stroke();
	}

	private drawCapturedCount(
		ctx: CanvasRenderingContext2D,
		state: CheckersState,
		W: number,
		H: number,
	): void {
		const margin = 60;
		const boardSize = Math.min(W - margin * 2, H - margin * 2 - 40);
		const boardX = (W - boardSize) / 2;
		const boardY = (H - boardSize) / 2 + 20;

		ctx.font = "14px monospace";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";

		// Red captured (displayed near top - black's side)
		ctx.fillStyle = "#ff4444";
		ctx.fillText(`Red captured: ${state.capturedBlack}`, boardX, boardY - 30);

		// Black captured (displayed near bottom - red's side)
		ctx.fillStyle = "#aaa";
		ctx.fillText(
			`Black captured: ${state.capturedRed}`,
			boardX,
			boardY + boardSize + 30,
		);
	}

	private drawModeLabel(
		ctx: CanvasRenderingContext2D,
		state: CheckersState,
		W: number,
	): void {
		const label = state.mode === "ai" ? "vs AI" : "2 Player";

		ctx.font = "12px monospace";
		ctx.fillStyle = "#555";
		ctx.textAlign = "right";
		ctx.textBaseline = "top";
		ctx.fillText(label, W - 16, 12);

		ctx.fillStyle = "#444";
		ctx.fillText("[H] Help  [U] Undo  [R] Restart  [ESC] Menu", W - 16, 28);
	}

	private drawModeSelector(
		ctx: CanvasRenderingContext2D,
		W: number,
		H: number,
	): void {
		// Background
		ctx.fillStyle = "#1a1a2e";
		ctx.fillRect(0, 0, W, H);

		const cx = W / 2;

		// Title
		ctx.font = "bold 36px monospace";
		ctx.fillStyle = "#b71c1c";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("Checkers", cx, H / 2 - 120);

		// Icon
		ctx.font = "48px serif";
		ctx.fillText("\uD83D\uDD34", cx, H / 2 - 180);

		// Subtitle
		ctx.font = "14px monospace";
		ctx.fillStyle = "#888";
		ctx.fillText("Select game mode", cx, H / 2 - 75);

		// VS AI button
		const btnW = 220;
		const btnH = 50;

		const aiY = H / 2 - 35;

		ctx.fillStyle = "#b71c1c";
		ctx.beginPath();
		ctx.roundRect(cx - btnW / 2, aiY, btnW, btnH, 10);
		ctx.fill();
		ctx.font = "bold 16px monospace";
		ctx.fillStyle = "#fff";
		ctx.fillText("vs AI", cx, aiY + btnH / 2);

		// 2 Player button
		const tpY = H / 2 + 35;

		ctx.fillStyle = "#333";
		ctx.beginPath();
		ctx.roundRect(cx - btnW / 2, tpY, btnW, btnH, 10);
		ctx.fill();
		ctx.strokeStyle = "#555";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.roundRect(cx - btnW / 2, tpY, btnW, btnH, 10);
		ctx.stroke();
		ctx.font = "bold 16px monospace";
		ctx.fillStyle = "#ccc";
		ctx.fillText("2 Player", cx, tpY + btnH / 2);

		// Instructions
		ctx.font = "12px monospace";
		ctx.fillStyle = "#555";
		ctx.fillText("[ESC] to exit", cx, H / 2 + 120);
	}

	private drawAIThinking(
		ctx: CanvasRenderingContext2D,
		W: number,
		H: number,
	): void {
		ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
		ctx.fillRect(0, 0, W, H);

		ctx.font = "bold 18px monospace";
		ctx.fillStyle = "#fff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		const dots = ".".repeat(Math.floor(Date.now() / 400) % 4);

		ctx.fillText(`AI is thinking${dots}`, W / 2, H / 2);
	}

	private drawGameOverOverlay(
		ctx: CanvasRenderingContext2D,
		state: CheckersState,
		W: number,
		H: number,
	): void {
		ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
		ctx.fillRect(0, 0, W, H);

		const winnerText =
			state.winner === "red"
				? "Red Wins!"
				: state.winner === "black"
					? "Black Wins!"
					: "Draw!";
		const winColor =
			state.winner === "red"
				? "#ff4444"
				: state.winner === "black"
					? "#aaa"
					: "#fff";

		ctx.font = "bold 42px monospace";
		ctx.fillStyle = winColor;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(winnerText, W / 2, H / 2 - 30);

		ctx.font = "16px monospace";
		ctx.fillStyle = "#888";
		ctx.fillText(
			`Red: ${12 - state.capturedRed} remaining | Black: ${12 - state.capturedBlack} remaining`,
			W / 2,
			H / 2 + 15,
		);

		// Restart button
		const btnW = 180;
		const btnH = 44;
		const btnX = W / 2 - btnW / 2;
		const btnY = H / 2 + 45;

		ctx.fillStyle = "#b71c1c";
		ctx.beginPath();
		ctx.roundRect(btnX, btnY, btnW, btnH, 8);
		ctx.fill();

		ctx.font = "bold 16px monospace";
		ctx.fillStyle = "#fff";
		ctx.fillText("Play Again", W / 2, btnY + btnH / 2);

		ctx.font = "12px monospace";
		ctx.fillStyle = "#555";
		ctx.fillText("[R] Restart  [ESC] Menu", W / 2, btnY + btnH + 24);
	}

	private drawPauseOverlay(
		ctx: CanvasRenderingContext2D,
		W: number,
		H: number,
	): void {
		ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
		ctx.fillRect(0, 0, W, H);

		ctx.font = "bold 32px monospace";
		ctx.fillStyle = "#fff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("PAUSED", W / 2, H / 2 - 20);

		ctx.font = "14px monospace";
		ctx.fillStyle = "#888";
		ctx.fillText("Press [H] to resume", W / 2, H / 2 + 20);
	}
}
