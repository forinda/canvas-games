import type { GameStateData } from "../types";

export class ParticleRenderer {
	update(state: GameStateData, dt: number): void {
		for (const p of state.particles) {
			if (p.done) continue;

			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.vy += 120 * dt; // gravity
			p.vx *= 0.97;
			p.alpha -= p.decay;

			if (p.alpha <= 0) p.done = true;
		}

		state.particles = state.particles.filter((p) => !p.done);
	}

	render(ctx: CanvasRenderingContext2D, state: GameStateData): void {
		for (const p of state.particles) {
			if (p.done) continue;

			ctx.globalAlpha = Math.max(0, p.alpha);
			ctx.fillStyle = p.color;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.globalAlpha = 1;
	}
}
