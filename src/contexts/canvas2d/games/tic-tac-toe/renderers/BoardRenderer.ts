import type { Renderable } from "@core/Renderable";
import type { TicTacToeState } from "../types.ts";

export class BoardRenderer implements Renderable<TicTacToeState> {
	render(ctx: CanvasRenderingContext2D, state: TicTacToeState): void {
		const W = state.canvasWidth;
		const H = state.canvasHeight;

		// Clear
		ctx.fillStyle = "#0f0f1a";
		ctx.fillRect(0, 0, W, H);

		if (state.showModeSelect) return;

		const boardSize = this.getBoardSize(state);
		const boardX = (W - boardSize) / 2;
		const boardY = (H - boardSize) / 2 + 20;
		const cellSize = boardSize / 3;

		// Draw grid lines
		this.drawGrid(ctx, boardX, boardY, boardSize, cellSize);

		// Draw marks
		for (let i = 0; i < 9; i++) {
			const cell = state.board[i];

			if (cell === null) continue;

			const row = Math.floor(i / 3);
			const col = i % 3;
			const cx = boardX + col * cellSize + cellSize / 2;
			const cy = boardY + row * cellSize + cellSize / 2;

			// Find animation progress
			let progress = 1;

			for (const anim of state.cellAnimations) {
				if (anim.cellIndex === i) {
					progress = anim.progress;
					break;
				}
			}

			if (cell === "X") {
				this.drawX(ctx, cx, cy, cellSize * 0.35, progress);
			} else {
				this.drawO(ctx, cx, cy, cellSize * 0.3, progress);
			}
		}

		// Draw winning line
		if (state.winLine) {
			this.drawWinLine(ctx, state, boardX, boardY, cellSize);
		}
	}

	private drawGrid(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		size: number,
		cellSize: number,
	): void {
		ctx.strokeStyle = "#3a3a5c";
		ctx.lineWidth = 4;
		ctx.lineCap = "round";

		// Vertical lines
		for (let i = 1; i < 3; i++) {
			ctx.beginPath();
			ctx.moveTo(x + i * cellSize, y + 10);
			ctx.lineTo(x + i * cellSize, y + size - 10);
			ctx.stroke();
		}

		// Horizontal lines
		for (let i = 1; i < 3; i++) {
			ctx.beginPath();
			ctx.moveTo(x + 10, y + i * cellSize);
			ctx.lineTo(x + size - 10, y + i * cellSize);
			ctx.stroke();
		}
	}

	private drawX(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		half: number,
		progress: number,
	): void {
		ctx.strokeStyle = "#ef5350";
		ctx.lineWidth = 5;
		ctx.lineCap = "round";

		// First stroke (top-left to bottom-right)
		const p1 = Math.min(progress * 2, 1);

		if (p1 > 0) {
			ctx.beginPath();
			ctx.moveTo(cx - half, cy - half);
			ctx.lineTo(cx - half + 2 * half * p1, cy - half + 2 * half * p1);
			ctx.stroke();
		}

		// Second stroke (top-right to bottom-left)
		const p2 = Math.max(0, Math.min((progress - 0.5) * 2, 1));

		if (p2 > 0) {
			ctx.beginPath();
			ctx.moveTo(cx + half, cy - half);
			ctx.lineTo(cx + half - 2 * half * p2, cy - half + 2 * half * p2);
			ctx.stroke();
		}
	}

	private drawO(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		radius: number,
		progress: number,
	): void {
		ctx.strokeStyle = "#42a5f5";
		ctx.lineWidth = 5;
		ctx.lineCap = "round";

		ctx.beginPath();
		ctx.arc(
			cx,
			cy,
			radius,
			-Math.PI / 2,
			-Math.PI / 2 + Math.PI * 2 * progress,
		);
		ctx.stroke();
	}

	private drawWinLine(
		ctx: CanvasRenderingContext2D,
		state: TicTacToeState,
		boardX: number,
		boardY: number,
		cellSize: number,
	): void {
		const wl = state.winLine!;
		const progress = wl.progress;

		const startCell = wl.cells[0];
		const endCell = wl.cells[2];

		const startRow = Math.floor(startCell / 3);
		const startCol = startCell % 3;
		const endRow = Math.floor(endCell / 3);
		const endCol = endCell % 3;

		const sx = boardX + startCol * cellSize + cellSize / 2;
		const sy = boardY + startRow * cellSize + cellSize / 2;
		const ex = boardX + endCol * cellSize + cellSize / 2;
		const ey = boardY + endRow * cellSize + cellSize / 2;

		const curX = sx + (ex - sx) * progress;
		const curY = sy + (ey - sy) * progress;

		// Glow effect
		ctx.shadowColor = state.winner === "X" ? "#ef5350" : "#42a5f5";
		ctx.shadowBlur = 15;
		ctx.strokeStyle = state.winner === "X" ? "#ff8a80" : "#90caf9";
		ctx.lineWidth = 6;
		ctx.lineCap = "round";

		ctx.beginPath();
		ctx.moveTo(sx, sy);
		ctx.lineTo(curX, curY);
		ctx.stroke();

		ctx.shadowBlur = 0;
	}

	private getBoardSize(state: TicTacToeState): number {
		return Math.min(state.canvasWidth, state.canvasHeight) * 0.6;
	}
}
