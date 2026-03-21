import type { Renderable } from "@core/Renderable";
import type { RhythmState, TimingGrade } from "../types";

const GRADE_COLORS: Record<TimingGrade, string> = {
	Perfect: "#00e676",
	Good: "#ffeb3b",
	OK: "#ff9800",
	Miss: "#f44336",
};

export class GameRenderer implements Renderable<RhythmState> {
	render(ctx: CanvasRenderingContext2D, state: RhythmState): void {
		const W = state.width;
		const H = state.height;

		this.drawBackground(ctx, W, H);
		this.drawCircles(ctx, state);
		this.drawHitEffects(ctx, state);
		this.drawMissEffects(ctx, state);
	}

	private drawBackground(
		ctx: CanvasRenderingContext2D,
		W: number,
		H: number,
	): void {
		// Dark gradient background
		const grad = ctx.createRadialGradient(
			W / 2,
			H / 2,
			0,
			W / 2,
			H / 2,
			Math.max(W, H) * 0.7,
		);

		grad.addColorStop(0, "#1a1a2e");
		grad.addColorStop(1, "#0d0d1a");
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, W, H);

		// Subtle grid pattern
		ctx.globalAlpha = 0.04;
		ctx.strokeStyle = "#e040fb";
		ctx.lineWidth = 1;
		const spacing = 60;

		for (let x = 0; x < W; x += spacing) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, H);
			ctx.stroke();
		}

		for (let y = 0; y < H; y += spacing) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(W, y);
			ctx.stroke();
		}

		ctx.globalAlpha = 1;
	}

	private drawCircles(ctx: CanvasRenderingContext2D, state: RhythmState): void {
		for (const circle of state.circles) {
			if (circle.hit || circle.missed) continue;

			const gap = Math.abs(circle.outerRadius - circle.radius);
			const color = this.getCircleColor(gap);

			// Inner target circle (filled)
			ctx.beginPath();
			ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
			ctx.fillStyle = color;
			ctx.globalAlpha = 0.25;
			ctx.fill();
			ctx.globalAlpha = 1;

			ctx.strokeStyle = color;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
			ctx.stroke();

			// Outer shrinking ring
			ctx.strokeStyle = color;
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.arc(circle.x, circle.y, circle.outerRadius, 0, Math.PI * 2);
			ctx.stroke();

			// Crosshair in center
			ctx.strokeStyle = color;
			ctx.lineWidth = 1;
			ctx.globalAlpha = 0.4;
			const cr = circle.radius * 0.4;

			ctx.beginPath();
			ctx.moveTo(circle.x - cr, circle.y);
			ctx.lineTo(circle.x + cr, circle.y);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(circle.x, circle.y - cr);
			ctx.lineTo(circle.x, circle.y + cr);
			ctx.stroke();
			ctx.globalAlpha = 1;
		}
	}

	private getCircleColor(gap: number): string {
		if (gap <= 8) return GRADE_COLORS.Perfect;

		if (gap <= 20) return GRADE_COLORS.Good;

		if (gap <= 35) return GRADE_COLORS.OK;

		return "#e040fb";
	}

	private drawHitEffects(
		ctx: CanvasRenderingContext2D,
		state: RhythmState,
	): void {
		for (const effect of state.hitEffects) {
			ctx.save();
			ctx.globalAlpha = effect.alpha;

			const color = GRADE_COLORS[effect.grade];

			// Burst ring
			ctx.strokeStyle = color;
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.arc(effect.x, effect.y, effect.radius * effect.scale, 0, Math.PI * 2);
			ctx.stroke();

			// Particle burst lines
			const numLines = 8;
			const innerR = effect.radius * 0.5;
			const outerR = effect.radius * effect.scale * 1.3;

			ctx.strokeStyle = color;
			ctx.lineWidth = 2;

			for (let i = 0; i < numLines; i++) {
				const angle = (i / numLines) * Math.PI * 2;

				ctx.beginPath();
				ctx.moveTo(
					effect.x + Math.cos(angle) * innerR,
					effect.y + Math.sin(angle) * innerR,
				);
				ctx.lineTo(
					effect.x + Math.cos(angle) * outerR,
					effect.y + Math.sin(angle) * outerR,
				);
				ctx.stroke();
			}

			// Grade text
			ctx.font = "bold 20px monospace";
			ctx.fillStyle = color;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(
				effect.grade,
				effect.x,
				effect.y - effect.radius * effect.scale - 15,
			);

			ctx.restore();
		}
	}

	private drawMissEffects(
		ctx: CanvasRenderingContext2D,
		state: RhythmState,
	): void {
		for (const effect of state.missEffects) {
			ctx.save();
			ctx.globalAlpha = effect.alpha;

			// Red X mark
			ctx.strokeStyle = "#f44336";
			ctx.lineWidth = 4;
			ctx.lineCap = "round";
			const size = 20;

			ctx.beginPath();
			ctx.moveTo(effect.x - size, effect.y - size);
			ctx.lineTo(effect.x + size, effect.y + size);
			ctx.stroke();

			ctx.beginPath();
			ctx.moveTo(effect.x + size, effect.y - size);
			ctx.lineTo(effect.x - size, effect.y + size);
			ctx.stroke();

			// "Miss" text
			ctx.font = "bold 18px monospace";
			ctx.fillStyle = "#f44336";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("Miss", effect.x, effect.y - 30);

			ctx.restore();
		}
	}
}
