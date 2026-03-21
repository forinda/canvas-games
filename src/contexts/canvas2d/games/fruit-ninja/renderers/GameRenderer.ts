import type { Renderable } from "@core/Renderable";
import type { FruitNinjaState } from "../types";

export class GameRenderer implements Renderable<FruitNinjaState> {
	render(ctx: CanvasRenderingContext2D, state: FruitNinjaState): void {
		const W = state.width;
		const H = state.height;

		// Wooden background
		this.drawBackground(ctx, W, H);

		// Juice particles (behind fruits)
		this.drawParticles(ctx, state);

		// Fruit halves (behind active fruits)
		this.drawHalves(ctx, state);

		// Active fruits
		this.drawFruits(ctx, state);

		// Slice trail
		this.drawTrail(ctx, state);
	}

	private drawBackground(
		ctx: CanvasRenderingContext2D,
		W: number,
		H: number,
	): void {
		// Base wood color
		const grad = ctx.createLinearGradient(0, 0, 0, H);

		grad.addColorStop(0, "#5d3a1a");
		grad.addColorStop(0.5, "#7a4a25");
		grad.addColorStop(1, "#4a2c10");
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, W, H);

		// Wood grain lines
		ctx.globalAlpha = 0.08;
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 1;

		for (let i = 0; i < 30; i++) {
			const y = (i / 30) * H + Math.sin(i * 0.7) * 10;

			ctx.beginPath();
			ctx.moveTo(0, y);

			for (let x = 0; x < W; x += 20) {
				ctx.lineTo(x, y + Math.sin(x * 0.01 + i) * 5);
			}

			ctx.stroke();
		}

		ctx.globalAlpha = 1;
	}

	private drawFruits(
		ctx: CanvasRenderingContext2D,
		state: FruitNinjaState,
	): void {
		for (const fruit of state.fruits) {
			if (fruit.sliced) continue;

			ctx.save();
			ctx.translate(fruit.x, fruit.y);
			ctx.rotate(fruit.rotation);

			const r = fruit.type.radius;

			if (fruit.isBomb) {
				// Bomb: dark circle with fuse
				ctx.fillStyle = "#222";
				ctx.beginPath();
				ctx.arc(0, 0, r, 0, Math.PI * 2);
				ctx.fill();

				ctx.strokeStyle = "#555";
				ctx.lineWidth = 3;
				ctx.beginPath();
				ctx.arc(0, 0, r, 0, Math.PI * 2);
				ctx.stroke();

				// Fuse
				ctx.strokeStyle = "#a97030";
				ctx.lineWidth = 3;
				ctx.beginPath();
				ctx.moveTo(0, -r);
				ctx.quadraticCurveTo(8, -r - 15, 4, -r - 22);
				ctx.stroke();

				// Spark at tip
				ctx.fillStyle = "#ffcc00";
				ctx.beginPath();
				ctx.arc(4, -r - 22, 4, 0, Math.PI * 2);
				ctx.fill();

				// X mark
				ctx.font = `bold ${r * 0.8}px sans-serif`;
				ctx.fillStyle = "#c62828";
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText("X", 0, 0);
			} else {
				// Fruit outer
				ctx.fillStyle = fruit.type.color;
				ctx.beginPath();
				ctx.arc(0, 0, r, 0, Math.PI * 2);
				ctx.fill();

				// Slight inner highlight
				ctx.fillStyle = fruit.type.innerColor;
				ctx.globalAlpha = 0.3;
				ctx.beginPath();
				ctx.arc(-r * 0.15, -r * 0.15, r * 0.65, 0, Math.PI * 2);
				ctx.fill();
				ctx.globalAlpha = 1;

				// Shine highlight
				ctx.fillStyle = "rgba(255,255,255,0.25)";
				ctx.beginPath();
				ctx.arc(-r * 0.25, -r * 0.3, r * 0.3, 0, Math.PI * 2);
				ctx.fill();

				// Leaf on top
				ctx.fillStyle = "#2e7d32";
				ctx.beginPath();
				ctx.ellipse(0, -r + 2, 5, 10, -0.3, 0, Math.PI * 2);
				ctx.fill();

				// Small stem
				ctx.strokeStyle = "#5d3a1a";
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.moveTo(0, -r + 2);
				ctx.lineTo(0, -r - 4);
				ctx.stroke();
			}

			ctx.restore();
		}
	}

	private drawHalves(
		ctx: CanvasRenderingContext2D,
		state: FruitNinjaState,
	): void {
		for (const half of state.halves) {
			ctx.save();
			ctx.translate(half.x, half.y);
			ctx.rotate(half.rotation);
			ctx.globalAlpha = Math.max(0, half.alpha);

			const r = half.type.radius;

			// Draw half circle
			ctx.beginPath();

			if (half.side === -1) {
				ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
			} else {
				ctx.arc(0, 0, r, Math.PI / 2, -Math.PI / 2);
			}

			ctx.closePath();

			// Outer color
			ctx.fillStyle = half.type.color;
			ctx.fill();

			// Inner flesh
			ctx.beginPath();

			if (half.side === -1) {
				ctx.arc(0, 0, r * 0.75, -Math.PI / 2, Math.PI / 2);
			} else {
				ctx.arc(0, 0, r * 0.75, Math.PI / 2, -Math.PI / 2);
			}

			ctx.closePath();
			ctx.fillStyle = half.type.innerColor;
			ctx.fill();

			ctx.globalAlpha = 1;
			ctx.restore();
		}
	}

	private drawParticles(
		ctx: CanvasRenderingContext2D,
		state: FruitNinjaState,
	): void {
		for (const p of state.particles) {
			ctx.save();
			ctx.globalAlpha = p.alpha;
			ctx.fillStyle = p.color;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}
	}

	private drawTrail(
		ctx: CanvasRenderingContext2D,
		state: FruitNinjaState,
	): void {
		const points = state.trail.points;

		if (points.length < 2) return;

		const now = performance.now();

		ctx.save();
		ctx.lineCap = "round";
		ctx.lineJoin = "round";

		// Glowing white trail
		for (let i = 1; i < points.length; i++) {
			const p0 = points[i - 1];
			const p1 = points[i];
			const age = now - p1.time;
			const alpha = Math.max(0, 1 - age / 150);

			if (alpha <= 0) continue;

			ctx.globalAlpha = alpha;

			// Outer glow
			ctx.strokeStyle = "rgba(200,220,255,0.5)";
			ctx.lineWidth = 12;
			ctx.beginPath();
			ctx.moveTo(p0.x, p0.y);
			ctx.lineTo(p1.x, p1.y);
			ctx.stroke();

			// Inner bright line
			ctx.strokeStyle = "#fff";
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(p0.x, p0.y);
			ctx.lineTo(p1.x, p1.y);
			ctx.stroke();
		}

		ctx.globalAlpha = 1;
		ctx.restore();
	}
}
