import type { Renderable } from "@core/Renderable";
import type { BalloonState, Balloon, PopParticle } from "../types";

export class GameRenderer implements Renderable<BalloonState> {
	render(ctx: CanvasRenderingContext2D, state: BalloonState): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		this.drawBackground(ctx, W, H);
		this.drawBalloons(ctx, state.balloons);
		this.drawParticles(ctx, state.particles);
	}

	private drawBackground(
		ctx: CanvasRenderingContext2D,
		W: number,
		H: number,
	): void {
		const grad = ctx.createLinearGradient(0, 0, 0, H);

		grad.addColorStop(0, "#0d1b2a");
		grad.addColorStop(0.4, "#1b2838");
		grad.addColorStop(0.7, "#415a77");
		grad.addColorStop(1, "#89c2d9");
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, W, H);

		// Scattered clouds (simple ellipses)
		ctx.fillStyle = "rgba(255,255,255,0.04)";
		this.drawCloud(ctx, W * 0.15, H * 0.2, 120, 40);
		this.drawCloud(ctx, W * 0.6, H * 0.12, 160, 50);
		this.drawCloud(ctx, W * 0.85, H * 0.35, 100, 35);
		this.drawCloud(ctx, W * 0.35, H * 0.45, 140, 45);
	}

	private drawCloud(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		w: number,
		h: number,
	): void {
		ctx.beginPath();
		ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
		ctx.fill();
	}

	private drawBalloons(
		ctx: CanvasRenderingContext2D,
		balloons: Balloon[],
	): void {
		for (const b of balloons) {
			if (b.popped) continue;

			this.drawBalloon(ctx, b);
		}
	}

	private drawBalloon(ctx: CanvasRenderingContext2D, b: Balloon): void {
		const r = b.radius;
		const x = b.x;
		const y = b.y;

		// Shadow
		ctx.save();
		ctx.globalAlpha = 0.2;
		ctx.fillStyle = "#000";
		ctx.beginPath();
		ctx.ellipse(x + 3, y + 4, r * 0.9, r * 1.05, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();

		// Balloon body — gradient for depth
		const bodyGrad = ctx.createRadialGradient(
			x - r * 0.3,
			y - r * 0.3,
			r * 0.1,
			x,
			y,
			r,
		);

		bodyGrad.addColorStop(0, this.lightenColor(b.color, 60));
		bodyGrad.addColorStop(0.7, b.color);
		bodyGrad.addColorStop(1, this.darkenColor(b.color, 40));

		ctx.fillStyle = bodyGrad;
		ctx.beginPath();
		ctx.ellipse(x, y, r * 0.85, r, 0, 0, Math.PI * 2);
		ctx.fill();

		// Shine highlight
		ctx.fillStyle = "rgba(255,255,255,0.35)";
		ctx.beginPath();
		ctx.ellipse(
			x - r * 0.25,
			y - r * 0.35,
			r * 0.2,
			r * 0.3,
			-0.4,
			0,
			Math.PI * 2,
		);
		ctx.fill();

		// Knot at bottom
		ctx.fillStyle = this.darkenColor(b.color, 30);
		ctx.beginPath();
		ctx.moveTo(x - 3, y + r);
		ctx.lineTo(x + 3, y + r);
		ctx.lineTo(x, y + r + 6);
		ctx.closePath();
		ctx.fill();

		// String
		ctx.strokeStyle = "rgba(255,255,255,0.3)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(x, y + r + 6);
		ctx.bezierCurveTo(x - 4, y + r + 20, x + 4, y + r + 35, x - 2, y + r + 50);
		ctx.stroke();
	}

	private drawParticles(
		ctx: CanvasRenderingContext2D,
		particles: PopParticle[],
	): void {
		for (const p of particles) {
			const alpha = Math.max(0, p.life / 600);

			ctx.globalAlpha = alpha;
			ctx.fillStyle = p.color;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.globalAlpha = 1;
	}

	private lightenColor(hex: string, amount: number): string {
		return this.adjustColor(hex, amount);
	}

	private darkenColor(hex: string, amount: number): string {
		return this.adjustColor(hex, -amount);
	}

	private adjustColor(hex: string, amount: number): string {
		const num = parseInt(hex.slice(1), 16);
		const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
		const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
		const b = Math.min(255, Math.max(0, (num & 0xff) + amount));

		return `rgb(${r},${g},${b})`;
	}
}
