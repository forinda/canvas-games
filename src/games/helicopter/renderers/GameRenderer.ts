import type { Renderable } from "@shared/Renderable";
import type { HelicopterState } from "../types";
import { CAVE_SEGMENT_WIDTH } from "../types";

export class GameRenderer implements Renderable<HelicopterState> {
	render(ctx: CanvasRenderingContext2D, state: HelicopterState): void {
		const { canvasW, canvasH } = state;

		// Dark background
		const bgGrad = ctx.createLinearGradient(0, 0, 0, canvasH);

		bgGrad.addColorStop(0, "#0a1628");
		bgGrad.addColorStop(0.5, "#122040");
		bgGrad.addColorStop(1, "#0a1628");
		ctx.fillStyle = bgGrad;
		ctx.fillRect(0, 0, canvasW, canvasH);

		// Scrolling stars (background decoration)
		this.drawStars(ctx, state);

		// Cave walls
		this.drawCave(ctx, state);

		// Obstacles
		this.drawObstacles(ctx, state);

		// Helicopter
		this.drawHelicopter(ctx, state);

		// Death flash
		if (state.flashTimer > 0) {
			const alpha = state.flashTimer / 150;

			ctx.fillStyle = `rgba(255, 100, 50, ${alpha * 0.5})`;
			ctx.fillRect(0, 0, canvasW, canvasH);
		}
	}

	private drawStars(
		ctx: CanvasRenderingContext2D,
		state: HelicopterState,
	): void {
		ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
		const offset = state.backgroundOffset % 200;

		for (let i = 0; i < 30; i++) {
			const sx = ((i * 67 + 13 - offset) % (state.canvasW + 20)) - 10;
			const sy = (i * 43 + 7) % state.canvasH;
			const size = (i % 3) + 1;

			ctx.fillRect(sx, sy, size, size);
		}
	}

	private drawCave(
		ctx: CanvasRenderingContext2D,
		state: HelicopterState,
	): void {
		const cave = state.cave;

		if (cave.length < 2) return;

		// Top wall — jagged polygon
		ctx.beginPath();
		ctx.moveTo(cave[0].x, 0);

		for (const seg of cave) {
			ctx.lineTo(seg.x, seg.top);
		}

		const lastSeg = cave[cave.length - 1];

		ctx.lineTo(lastSeg.x + CAVE_SEGMENT_WIDTH, 0);
		ctx.closePath();

		const topGrad = ctx.createLinearGradient(0, 0, 0, state.canvasH * 0.4);

		topGrad.addColorStop(0, "#2d5016");
		topGrad.addColorStop(1, "#1a3a0a");
		ctx.fillStyle = topGrad;
		ctx.fill();

		// Top wall edge highlight
		ctx.strokeStyle = "#4a8a2a";
		ctx.lineWidth = 2;
		ctx.beginPath();

		for (let i = 0; i < cave.length; i++) {
			if (i === 0) {
				ctx.moveTo(cave[i].x, cave[i].top);
			} else {
				ctx.lineTo(cave[i].x, cave[i].top);
			}
		}

		ctx.stroke();

		// Bottom wall — jagged polygon
		ctx.beginPath();
		ctx.moveTo(cave[0].x, state.canvasH);

		for (const seg of cave) {
			ctx.lineTo(seg.x, seg.bottom);
		}

		ctx.lineTo(lastSeg.x + CAVE_SEGMENT_WIDTH, state.canvasH);
		ctx.closePath();

		const bottomGrad = ctx.createLinearGradient(
			0,
			state.canvasH * 0.6,
			0,
			state.canvasH,
		);

		bottomGrad.addColorStop(0, "#1a3a0a");
		bottomGrad.addColorStop(1, "#2d5016");
		ctx.fillStyle = bottomGrad;
		ctx.fill();

		// Bottom wall edge highlight
		ctx.strokeStyle = "#4a8a2a";
		ctx.lineWidth = 2;
		ctx.beginPath();

		for (let i = 0; i < cave.length; i++) {
			if (i === 0) {
				ctx.moveTo(cave[i].x, cave[i].bottom);
			} else {
				ctx.lineTo(cave[i].x, cave[i].bottom);
			}
		}

		ctx.stroke();
	}

	private drawObstacles(
		ctx: CanvasRenderingContext2D,
		state: HelicopterState,
	): void {
		for (const obs of state.obstacles) {
			const grad = ctx.createLinearGradient(
				obs.x,
				obs.y,
				obs.x + obs.width,
				obs.y,
			);

			grad.addColorStop(0, "#8b4513");
			grad.addColorStop(0.5, "#a0522d");
			grad.addColorStop(1, "#8b4513");
			ctx.fillStyle = grad;
			ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

			ctx.strokeStyle = "#654321";
			ctx.lineWidth = 1;
			ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
		}
	}

	private drawHelicopter(
		ctx: CanvasRenderingContext2D,
		state: HelicopterState,
	): void {
		const heli = state.helicopter;

		ctx.save();
		ctx.translate(heli.x, heli.y);

		// Tilt based on velocity
		const tilt = heli.velocity * 15;

		ctx.rotate(tilt);

		const w = heli.width;
		const h = heli.height;

		// Body
		ctx.fillStyle = "#66bb6a";
		ctx.beginPath();
		ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = "#388e3c";
		ctx.lineWidth = 2;
		ctx.stroke();

		// Cockpit window
		ctx.fillStyle = "#a5d6a7";
		ctx.beginPath();
		ctx.ellipse(w * 0.15, -h * 0.05, w * 0.15, h * 0.22, 0, 0, Math.PI * 2);
		ctx.fill();

		// Tail
		ctx.fillStyle = "#4caf50";
		ctx.beginPath();
		ctx.moveTo(-w / 2, -h * 0.1);
		ctx.lineTo(-w * 0.85, -h * 0.08);
		ctx.lineTo(-w * 0.85, h * 0.08);
		ctx.lineTo(-w / 2, h * 0.1);
		ctx.closePath();
		ctx.fill();

		// Tail rotor (small)
		ctx.strokeStyle = "#81c784";
		ctx.lineWidth = 2;
		const tailRotorLen = h * 0.35;
		const tailRotorAngle = heli.rotorAngle * 3;

		ctx.beginPath();
		ctx.moveTo(
			-w * 0.85 + Math.cos(tailRotorAngle) * 0,
			-h * 0.0 + Math.sin(tailRotorAngle) * tailRotorLen,
		);
		ctx.lineTo(
			-w * 0.85 - Math.cos(tailRotorAngle) * 0,
			-h * 0.0 - Math.sin(tailRotorAngle) * tailRotorLen,
		);
		ctx.stroke();

		// Main rotor
		ctx.strokeStyle = "#c8e6c9";
		ctx.lineWidth = 3;
		const rotorLen = w * 0.7;
		const rotorSin = Math.sin(heli.rotorAngle);
		// Simulate perspective by squashing the blade length
		const blade1Len = rotorLen * Math.abs(rotorSin);
		const blade2Len = rotorLen * Math.abs(Math.cos(heli.rotorAngle));

		// Rotor mast
		ctx.beginPath();
		ctx.moveTo(0, -h / 2);
		ctx.lineTo(0, -h / 2 - 5);
		ctx.stroke();

		// Blade 1
		ctx.beginPath();
		ctx.moveTo(-blade1Len, -h / 2 - 5);
		ctx.lineTo(blade1Len, -h / 2 - 5);
		ctx.stroke();

		// Blade 2
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(-blade2Len, -h / 2 - 5);
		ctx.lineTo(blade2Len, -h / 2 - 5);
		ctx.stroke();

		// Skids
		ctx.strokeStyle = "#555";
		ctx.lineWidth = 2;
		// Left skid leg
		ctx.beginPath();
		ctx.moveTo(-w * 0.15, h / 2);
		ctx.lineTo(-w * 0.2, h / 2 + 5);
		ctx.stroke();
		// Right skid leg
		ctx.beginPath();
		ctx.moveTo(w * 0.15, h / 2);
		ctx.lineTo(w * 0.2, h / 2 + 5);
		ctx.stroke();
		// Skid bar
		ctx.beginPath();
		ctx.moveTo(-w * 0.3, h / 2 + 5);
		ctx.lineTo(w * 0.3, h / 2 + 5);
		ctx.stroke();

		ctx.restore();
	}
}
