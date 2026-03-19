import type { Renderable } from "@shared/Renderable";
import type { LavaState } from "../types";
import { PLATFORM_HEIGHT } from "../types";

export class GameRenderer implements Renderable<LavaState> {
	render(ctx: CanvasRenderingContext2D, state: LavaState): void {
		const { canvasW, canvasH } = state;

		// Dark background
		const bgGrad = ctx.createLinearGradient(0, 0, 0, canvasH);

		bgGrad.addColorStop(0, "#1a0a00");
		bgGrad.addColorStop(0.5, "#2d1200");
		bgGrad.addColorStop(1, "#1a0a00");
		ctx.fillStyle = bgGrad;
		ctx.fillRect(0, 0, canvasW, canvasH);

		// Heat haze background particles
		this.drawHeatHaze(ctx, state);

		// Platforms
		this.drawPlatforms(ctx, state);

		// Player
		this.drawPlayer(ctx, state);

		// Particles
		this.drawParticles(ctx, state);

		// Lava
		this.drawLava(ctx, state);

		// Lava bubbles
		this.drawLavaBubbles(ctx, state);

		// Death flash
		if (state.flashTimer > 0) {
			const alpha = state.flashTimer / 200;

			ctx.fillStyle = `rgba(255, 80, 20, ${alpha * 0.6})`;
			ctx.fillRect(0, 0, canvasW, canvasH);
		}
	}

	private drawHeatHaze(ctx: CanvasRenderingContext2D, state: LavaState): void {
		const time = performance.now() * 0.001;

		ctx.fillStyle = "rgba(255, 100, 0, 0.03)";

		for (let i = 0; i < 15; i++) {
			const x = ((i * 97 + time * 20) % (state.canvasW + 40)) - 20;
			const y = state.lavaY - 50 - Math.sin(time + i) * 30;
			const size = 15 + Math.sin(time * 2 + i) * 8;

			ctx.beginPath();
			ctx.arc(x, y, size, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	private drawPlatforms(ctx: CanvasRenderingContext2D, state: LavaState): void {
		for (const plat of state.platforms) {
			ctx.globalAlpha = plat.opacity;

			// Platform body
			const grad = ctx.createLinearGradient(
				plat.x,
				plat.y,
				plat.x,
				plat.y + PLATFORM_HEIGHT,
			);

			if (plat.sinking && !plat.sunk) {
				// Sinking platform turns red
				const urgency = 1 - plat.sinkTimer / 2000;
				const r = Math.floor(100 + urgency * 155);
				const g = Math.floor(80 - urgency * 60);
				const b = Math.floor(60 - urgency * 40);

				grad.addColorStop(0, `rgb(${r}, ${g}, ${b})`);
				grad.addColorStop(
					1,
					`rgb(${Math.floor(r * 0.7)}, ${Math.floor(g * 0.7)}, ${Math.floor(b * 0.7)})`,
				);
			} else {
				grad.addColorStop(0, "#8d6e63");
				grad.addColorStop(1, "#5d4037");
			}

			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.roundRect(plat.x, plat.y, plat.w, PLATFORM_HEIGHT, 3);
			ctx.fill();

			// Platform edge highlight
			ctx.strokeStyle = plat.sinking
				? `rgba(255, 100, 50, ${plat.opacity})`
				: `rgba(188, 170, 164, ${plat.opacity})`;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.roundRect(plat.x, plat.y, plat.w, PLATFORM_HEIGHT, 3);
			ctx.stroke();

			// Shake effect when close to sinking
			if (plat.sinking && !plat.sunk && plat.sinkTimer < 500) {
				const shake = Math.sin(performance.now() * 0.05) * 2;

				ctx.fillStyle = "rgba(255, 50, 0, 0.3)";
				ctx.fillRect(plat.x + shake, plat.y, plat.w, PLATFORM_HEIGHT);
			}

			ctx.globalAlpha = 1;
		}
	}

	private drawPlayer(ctx: CanvasRenderingContext2D, state: LavaState): void {
		if (state.phase === "dead") return;

		const player = state.player;
		const px = player.x;
		const py = player.y;
		const hw = player.width / 2;
		const hh = player.height / 2;

		ctx.save();
		ctx.translate(px, py);

		// Body
		ctx.fillStyle = "#42a5f5";
		ctx.beginPath();
		ctx.roundRect(-hw, -hh, player.width, player.height, 4);
		ctx.fill();

		ctx.strokeStyle = "#1565c0";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(-hw, -hh, player.width, player.height, 4);
		ctx.stroke();

		// Eyes
		const eyeDir = player.facingRight ? 1 : -1;

		ctx.fillStyle = "#fff";
		ctx.beginPath();
		ctx.arc(-4 * eyeDir, -hh + 10, 4, 0, Math.PI * 2);
		ctx.arc(4 * eyeDir, -hh + 10, 4, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = "#333";
		ctx.beginPath();
		ctx.arc(-4 * eyeDir + eyeDir * 1.5, -hh + 10, 2, 0, Math.PI * 2);
		ctx.arc(4 * eyeDir + eyeDir * 1.5, -hh + 10, 2, 0, Math.PI * 2);
		ctx.fill();

		// Feet animation
		if (state.leftHeld || state.rightHeld) {
			const legOffset = Math.sin(performance.now() * 0.01) * 3;

			ctx.fillStyle = "#1565c0";
			ctx.fillRect(-hw + 2, hh - 4, 8, 4 + legOffset);
			ctx.fillRect(hw - 10, hh - 4, 8, 4 - legOffset);
		} else {
			ctx.fillStyle = "#1565c0";
			ctx.fillRect(-hw + 2, hh - 4, 8, 4);
			ctx.fillRect(hw - 10, hh - 4, 8, 4);
		}

		ctx.restore();
	}

	private drawParticles(ctx: CanvasRenderingContext2D, state: LavaState): void {
		for (const p of state.particles) {
			const alpha = p.life / p.maxLife;

			ctx.globalAlpha = alpha;
			ctx.fillStyle = p.color;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.globalAlpha = 1;
	}

	private drawLava(ctx: CanvasRenderingContext2D, state: LavaState): void {
		const { canvasW, canvasH, lavaY } = state;
		const time = performance.now() * 0.002;

		// Lava surface wave
		ctx.beginPath();
		ctx.moveTo(0, canvasH);
		ctx.lineTo(0, lavaY);

		for (let x = 0; x <= canvasW; x += 8) {
			const wave =
				Math.sin(x * 0.02 + time) * 4 + Math.sin(x * 0.035 + time * 1.3) * 3;

			ctx.lineTo(x, lavaY + wave);
		}

		ctx.lineTo(canvasW, canvasH);
		ctx.closePath();

		// Lava gradient
		const lavaGrad = ctx.createLinearGradient(0, lavaY, 0, canvasH);

		lavaGrad.addColorStop(0, "#ff5722");
		lavaGrad.addColorStop(0.2, "#ff3d00");
		lavaGrad.addColorStop(0.5, "#dd2c00");
		lavaGrad.addColorStop(1, "#bf360c");
		ctx.fillStyle = lavaGrad;
		ctx.fill();

		// Bright surface glow
		ctx.beginPath();
		ctx.moveTo(0, lavaY + 5);

		for (let x = 0; x <= canvasW; x += 6) {
			const wave =
				Math.sin(x * 0.02 + time) * 4 + Math.sin(x * 0.035 + time * 1.3) * 3;

			ctx.lineTo(x, lavaY + wave);
		}

		ctx.lineTo(canvasW, lavaY + 5);
		ctx.closePath();

		ctx.fillStyle = "rgba(255, 200, 50, 0.4)";
		ctx.fill();

		// Lava glow on screen
		const glowGrad = ctx.createLinearGradient(0, lavaY - 80, 0, lavaY);

		glowGrad.addColorStop(0, "rgba(255, 80, 0, 0)");
		glowGrad.addColorStop(1, "rgba(255, 80, 0, 0.15)");
		ctx.fillStyle = glowGrad;
		ctx.fillRect(0, lavaY - 80, canvasW, 80);
	}

	private drawLavaBubbles(
		ctx: CanvasRenderingContext2D,
		state: LavaState,
	): void {
		for (const bubble of state.lavaBubbles) {
			const alpha = 0.6 + Math.sin(bubble.phase) * 0.3;

			ctx.globalAlpha = alpha;

			const grad = ctx.createRadialGradient(
				bubble.x,
				bubble.y,
				0,
				bubble.x,
				bubble.y,
				bubble.radius,
			);

			grad.addColorStop(0, "#ffab00");
			grad.addColorStop(0.6, "#ff6d00");
			grad.addColorStop(1, "rgba(255, 61, 0, 0)");
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.globalAlpha = 1;
	}
}
