import type { Renderable } from "@shared/Renderable";
import type { PongState } from "../types";
import { BALL_RADIUS, CENTER_LINE_DASH } from "../types";

export class GameRenderer implements Renderable<PongState> {
	render(ctx: CanvasRenderingContext2D, state: PongState): void {
		const { canvasW: W, canvasH: H } = state;

		// Background
		ctx.fillStyle = "#0a0a1a";
		ctx.fillRect(0, 0, W, H);

		this.drawCenterLine(ctx, state);
		this.drawPaddle(ctx, state.leftPaddle, "#26c6da");
		this.drawPaddle(ctx, state.rightPaddle, "#26c6da");
		this.drawBallTrail(ctx, state);
		this.drawBall(ctx, state);
	}

	// ── Private ──────────────────────────────────────────────────────────────

	private drawCenterLine(ctx: CanvasRenderingContext2D, s: PongState): void {
		ctx.save();
		ctx.setLineDash(CENTER_LINE_DASH);
		ctx.strokeStyle = "rgba(255,255,255,0.15)";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(s.canvasW / 2, 0);
		ctx.lineTo(s.canvasW / 2, s.canvasH);
		ctx.stroke();
		ctx.restore();
	}

	private drawPaddle(
		ctx: CanvasRenderingContext2D,
		paddle: PongState["leftPaddle"],
		color: string,
	): void {
		ctx.save();
		ctx.shadowColor = color;
		ctx.shadowBlur = 12;
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 4);
		ctx.fill();
		ctx.restore();
	}

	private drawBallTrail(ctx: CanvasRenderingContext2D, s: PongState): void {
		for (const t of s.ball.trail) {
			ctx.fillStyle = `rgba(38,198,218,${t.alpha * 0.4})`;
			ctx.beginPath();
			ctx.arc(t.x, t.y, BALL_RADIUS * 0.8, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	private drawBall(ctx: CanvasRenderingContext2D, s: PongState): void {
		const b = s.ball;

		ctx.save();
		ctx.shadowColor = "#fff";
		ctx.shadowBlur = 16;
		ctx.fillStyle = "#fff";
		ctx.beginPath();
		ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
}
