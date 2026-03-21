import type { Renderable } from "@core/Renderable";
import type { PlatState } from "../types";

export class WorldRenderer implements Renderable<PlatState> {
	private canvas: HTMLCanvasElement;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
	}

	render(ctx: CanvasRenderingContext2D, state: PlatState): void {
		const W = this.canvas.width;
		const H = this.canvas.height;

		// Sky gradient
		const sky = ctx.createLinearGradient(0, 0, 0, H);

		sky.addColorStop(0, "#1a1a3e");
		sky.addColorStop(1, "#2d1b4e");
		ctx.fillStyle = sky;
		ctx.fillRect(0, 0, W, H);

		// Stars
		ctx.fillStyle = "rgba(255,255,255,0.3)";

		for (let i = 0; i < 50; i++) {
			const sx = (((i * 137 + 50) % W) + state.camX * 0.1) % W;
			const sy = (i * 89 + 30) % (H * 0.6);

			ctx.fillRect(sx, sy, 2, 2);
		}

		ctx.save();
		ctx.translate(-state.camX, -state.camY);

		// Platforms
		for (const p of state.platforms) {
			if (p.y > 900) continue;

			ctx.fillStyle = p.color;
			ctx.fillRect(p.x, p.y, p.w, p.h);
			ctx.fillStyle = "rgba(255,255,255,0.1)";
			ctx.fillRect(p.x, p.y, p.w, 3);
		}

		// Goal flag
		ctx.fillStyle = "#ffd700";
		ctx.fillRect(state.goalX, state.goalY - 60, 4, 60);
		ctx.fillStyle = "#ef4444";
		ctx.beginPath();
		ctx.moveTo(state.goalX + 4, state.goalY - 60);
		ctx.lineTo(state.goalX + 34, state.goalY - 45);
		ctx.lineTo(state.goalX + 4, state.goalY - 30);
		ctx.fill();

		ctx.restore();
	}
}
