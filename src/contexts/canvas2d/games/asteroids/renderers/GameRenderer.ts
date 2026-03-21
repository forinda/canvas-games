import type { Renderable } from "@core/Renderable";
import type { AsteroidsState } from "../types";
import { SHIP_RADIUS } from "../types";

export class GameRenderer implements Renderable<AsteroidsState> {
	render(ctx: CanvasRenderingContext2D, state: AsteroidsState): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		// Clear
		ctx.fillStyle = "#0a0a1a";
		ctx.fillRect(0, 0, W, H);

		// Draw stars (static based on canvas size as seed)
		this.drawStars(ctx, W, H);

		if (!state.started) return;

		this.drawParticles(ctx, state);
		this.drawBullets(ctx, state);
		this.drawAsteroids(ctx, state);

		if (!state.gameOver) {
			this.drawShip(ctx, state);
		}
	}

	private drawStars(ctx: CanvasRenderingContext2D, W: number, H: number): void {
		// Deterministic stars
		let seed = W * 137 + H * 251;
		const next = () => {
			seed = (seed * 16807 + 7) % 2147483647;

			return seed / 2147483647;
		};

		ctx.fillStyle = "#334";

		for (let i = 0; i < 120; i++) {
			const x = next() * W;
			const y = next() * H;
			const r = next() * 1.4;

			ctx.beginPath();
			ctx.arc(x, y, r, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	private drawShip(ctx: CanvasRenderingContext2D, state: AsteroidsState): void {
		const ship = state.ship;
		const now = performance.now();

		// Invulnerability flashing
		if (now < state.invulnUntil) {
			if (Math.floor(now / 100) % 2 === 0) return; // blink off
		}

		ctx.save();
		ctx.translate(ship.pos.x, ship.pos.y);
		ctx.rotate(ship.angle);

		// Ship triangle
		ctx.strokeStyle = "#9b59b6";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(0, -SHIP_RADIUS);
		ctx.lineTo(-SHIP_RADIUS * 0.7, SHIP_RADIUS * 0.7);
		ctx.lineTo(0, SHIP_RADIUS * 0.4);
		ctx.lineTo(SHIP_RADIUS * 0.7, SHIP_RADIUS * 0.7);
		ctx.closePath();
		ctx.stroke();

		// Thrust flame
		if (ship.thrusting) {
			ctx.strokeStyle = "#f80";
			ctx.lineWidth = 1.5;
			const flicker = 0.7 + Math.random() * 0.6;

			ctx.beginPath();
			ctx.moveTo(-SHIP_RADIUS * 0.35, SHIP_RADIUS * 0.5);
			ctx.lineTo(0, SHIP_RADIUS * (0.7 + 0.5 * flicker));
			ctx.lineTo(SHIP_RADIUS * 0.35, SHIP_RADIUS * 0.5);
			ctx.stroke();
		}

		ctx.restore();
	}

	private drawAsteroids(
		ctx: CanvasRenderingContext2D,
		state: AsteroidsState,
	): void {
		ctx.strokeStyle = "#aaa";
		ctx.lineWidth = 1.5;

		for (const a of state.asteroids) {
			ctx.beginPath();

			for (let i = 0; i <= a.vertices; i++) {
				const idx = i % a.vertices;
				const angle = (idx / a.vertices) * Math.PI * 2;
				const r = a.radius * a.offsets[idx];
				const x = a.pos.x + Math.cos(angle) * r;
				const y = a.pos.y + Math.sin(angle) * r;

				if (i === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}

			ctx.closePath();
			ctx.stroke();
		}
	}

	private drawBullets(
		ctx: CanvasRenderingContext2D,
		state: AsteroidsState,
	): void {
		ctx.fillStyle = "#fff";

		for (const b of state.bullets) {
			ctx.beginPath();
			ctx.arc(b.pos.x, b.pos.y, 2, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	private drawParticles(
		ctx: CanvasRenderingContext2D,
		state: AsteroidsState,
	): void {
		for (const p of state.particles) {
			const alpha = p.life / p.maxLife;

			ctx.globalAlpha = alpha;
			ctx.fillStyle = p.color;
			ctx.beginPath();
			ctx.arc(p.pos.x, p.pos.y, p.radius * alpha, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.globalAlpha = 1;
	}
}
