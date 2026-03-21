import type { Renderable } from "@core/Renderable";
import type { SnakeState } from "../types";
import { CELL } from "../types";

export class BoardRenderer implements Renderable<SnakeState> {
	render(ctx: CanvasRenderingContext2D, state: SnakeState): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		// Background
		ctx.fillStyle = "#0a0a12";
		ctx.fillRect(0, 0, W, H);

		// Grid lines
		ctx.strokeStyle = "rgba(255,255,255,0.03)";
		ctx.lineWidth = 1;

		for (let x = 0; x < W; x += CELL) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, H);
			ctx.stroke();
		}

		for (let y = 0; y < H; y += CELL) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(W, y);
			ctx.stroke();
		}

		// Snake body
		for (let i = state.snake.length - 1; i >= 0; i--) {
			const seg = state.snake[i];
			const isHead = i === 0;
			const pct = 1 - i / (state.snake.length || 1);

			ctx.fillStyle = isHead ? "#4ade80" : `hsl(145, 70%, ${30 + pct * 25}%)`;
			ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);

			if (isHead) {
				ctx.shadowColor = "#4ade80";
				ctx.shadowBlur = 8;
				ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
				ctx.shadowBlur = 0;
			}
		}

		// Food
		const pulse = 0.8 + 0.2 * Math.sin(performance.now() * 0.006);

		ctx.fillStyle = "#ef4444";
		ctx.shadowColor = "#ef4444";
		ctx.shadowBlur = 10 * pulse;
		ctx.beginPath();
		ctx.arc(
			state.food.x * CELL + CELL / 2,
			state.food.y * CELL + CELL / 2,
			CELL * 0.4 * pulse,
			0,
			Math.PI * 2,
		);
		ctx.fill();
		ctx.shadowBlur = 0;
	}
}
