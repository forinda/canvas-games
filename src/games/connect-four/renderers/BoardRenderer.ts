import type { Renderable } from "@shared/Renderable.ts";
import type { ConnectFourState } from "../types.ts";
import { COLS, ROWS } from "../types.ts";

export class BoardRenderer implements Renderable<ConnectFourState> {
	render(ctx: CanvasRenderingContext2D, state: ConnectFourState): void {
		const W = state.canvasWidth;
		const H = state.canvasHeight;

		// Clear
		ctx.fillStyle = "#0f0f1a";
		ctx.fillRect(0, 0, W, H);

		if (state.showModeSelect) return;

		const metrics = this.getBoardMetrics(W, H);
		const { boardX, boardY, cellSize, boardW, boardH } = metrics;
		const discRadius = cellSize * 0.38;

		// Draw hover preview disc (ghost)
		if (
			!state.gameOver &&
			!state.aiThinking &&
			state.hoverCol >= 0 &&
			state.activeDrop === null
		) {
			const previewX = boardX + state.hoverCol * cellSize + cellSize / 2;
			const previewY = boardY - cellSize * 0.5;
			const color =
				state.currentPlayer === "red"
					? "rgba(244,67,54,0.5)"
					: "rgba(255,235,59,0.5)";

			ctx.beginPath();
			ctx.arc(previewX, previewY, discRadius, 0, Math.PI * 2);
			ctx.fillStyle = color;
			ctx.fill();
		}

		// Draw board background (blue with rounded corners)
		ctx.fillStyle = "#1565c0";
		ctx.beginPath();
		ctx.roundRect(boardX - 8, boardY - 8, boardW + 16, boardH + 16, 12);
		ctx.fill();

		// Draw holes and discs
		for (let r = 0; r < ROWS; r++) {
			for (let c = 0; c < COLS; c++) {
				const cx = boardX + c * cellSize + cellSize / 2;
				const cy = boardY + r * cellSize + cellSize / 2;
				const cell = state.board[r][c];

				// Draw hole (dark background circle to simulate hole)
				ctx.beginPath();
				ctx.arc(cx, cy, discRadius + 2, 0, Math.PI * 2);
				ctx.fillStyle = "#0a0a18";
				ctx.fill();

				if (cell !== null) {
					this.drawDisc(ctx, cx, cy, discRadius, cell);
				}
			}
		}

		// Draw animating drop disc on top
		if (state.activeDrop && !state.activeDrop.done) {
			const drop = state.activeDrop;
			const cx = boardX + drop.col * cellSize + cellSize / 2;
			const cy = boardY + drop.currentY * cellSize + cellSize / 2;

			this.drawDisc(ctx, cx, cy, discRadius, drop.player);
		}

		// Draw winning line glow
		if (state.winLine) {
			this.drawWinGlow(ctx, state, boardX, boardY, cellSize, discRadius);
		}
	}

	private drawDisc(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		radius: number,
		player: "red" | "yellow",
	): void {
		const baseColor = player === "red" ? "#f44336" : "#ffeb3b";
		const highlightColor = player === "red" ? "#ef9a9a" : "#fff9c4";

		// Main disc
		ctx.beginPath();
		ctx.arc(cx, cy, radius, 0, Math.PI * 2);
		ctx.fillStyle = baseColor;
		ctx.fill();

		// Inner highlight for 3D effect
		const grad = ctx.createRadialGradient(
			cx - radius * 0.2,
			cy - radius * 0.2,
			radius * 0.1,
			cx,
			cy,
			radius,
		);

		grad.addColorStop(0, highlightColor);
		grad.addColorStop(0.6, baseColor);
		grad.addColorStop(1, player === "red" ? "#c62828" : "#f9a825");
		ctx.beginPath();
		ctx.arc(cx, cy, radius, 0, Math.PI * 2);
		ctx.fillStyle = grad;
		ctx.fill();
	}

	private drawWinGlow(
		ctx: CanvasRenderingContext2D,
		state: ConnectFourState,
		boardX: number,
		boardY: number,
		cellSize: number,
		discRadius: number,
	): void {
		const wl = state.winLine!;
		const glowIntensity = 0.5 + 0.5 * Math.sin(state.animationTime * 0.005);
		const glowColor =
			state.winner === "red"
				? `rgba(255,138,128,${glowIntensity * wl.progress})`
				: `rgba(255,255,141,${glowIntensity * wl.progress})`;

		ctx.shadowColor = state.winner === "red" ? "#ff8a80" : "#ffff8d";
		ctx.shadowBlur = 20 * wl.progress;

		for (const cell of wl.cells) {
			const cx = boardX + cell.col * cellSize + cellSize / 2;
			const cy = boardY + cell.row * cellSize + cellSize / 2;

			ctx.beginPath();
			ctx.arc(cx, cy, discRadius + 4, 0, Math.PI * 2);
			ctx.strokeStyle = glowColor;
			ctx.lineWidth = 4;
			ctx.stroke();
		}

		ctx.shadowBlur = 0;
	}

	private getBoardMetrics(
		W: number,
		H: number,
	): {
		boardX: number;
		boardY: number;
		cellSize: number;
		boardW: number;
		boardH: number;
	} {
		const cellSize = Math.min((W - 40) / COLS, (H - 140) / (ROWS + 1));
		const boardW = cellSize * COLS;
		const boardH = cellSize * ROWS;
		const boardX = (W - boardW) / 2;
		const boardY = (H - boardH) / 2 + 30;

		return { boardX, boardY, cellSize, boardW, boardH };
	}
}
