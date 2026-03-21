import type { Renderable } from "@core/Renderable";
import type { FishingState } from "../types";

export class SceneRenderer implements Renderable<FishingState> {
	render(ctx: CanvasRenderingContext2D, state: FishingState): void {
		const W = state.width;
		const H = state.height;

		// ── Sky gradient ──
		const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.45);

		skyGrad.addColorStop(0, "#0d47a1");
		skyGrad.addColorStop(0.5, "#1976d2");
		skyGrad.addColorStop(1, "#ff8f00");
		ctx.fillStyle = skyGrad;
		ctx.fillRect(0, 0, W, H * 0.45);

		// Sun
		ctx.fillStyle = "#ffee58";
		ctx.beginPath();
		ctx.arc(W * 0.8, H * 0.12, 40, 0, Math.PI * 2);
		ctx.fill();

		// Clouds
		ctx.fillStyle = "rgba(255,255,255,0.3)";
		this.drawCloud(
			ctx,
			W * 0.15 + Math.sin(state.time * 0.1) * 20,
			H * 0.08,
			50,
		);
		this.drawCloud(
			ctx,
			W * 0.5 + Math.sin(state.time * 0.07 + 1) * 15,
			H * 0.15,
			40,
		);
		this.drawCloud(
			ctx,
			W * 0.7 + Math.sin(state.time * 0.12 + 2) * 25,
			H * 0.06,
			35,
		);

		// ── Water ──
		const waterY = H * 0.45;
		const waterGrad = ctx.createLinearGradient(0, waterY, 0, H);

		waterGrad.addColorStop(0, "#0277bd");
		waterGrad.addColorStop(0.4, "#01579b");
		waterGrad.addColorStop(1, "#002f6c");
		ctx.fillStyle = waterGrad;
		ctx.fillRect(0, waterY, W, H - waterY);

		// Water waves
		this.drawWaves(ctx, state, waterY, W, H);

		// ── Dock ──
		this.drawDock(ctx, state);

		// ── Fishing line and bobber ──
		if (
			state.phase === "waiting" ||
			state.phase === "hooking" ||
			state.phase === "reeling"
		) {
			this.drawLine(ctx, state);
			this.drawBobber(ctx, state);
		}

		// ── Cast animation ──
		if (state.phase === "casting" && !state.castCharging) {
			this.drawLine(ctx, state);
			this.drawBobber(ctx, state);
		}
	}

	private drawCloud(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		r: number,
	): void {
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.arc(x + r * 0.8, y - r * 0.3, r * 0.7, 0, Math.PI * 2);
		ctx.arc(x + r * 1.4, y, r * 0.6, 0, Math.PI * 2);
		ctx.fill();
	}

	private drawWaves(
		ctx: CanvasRenderingContext2D,
		state: FishingState,
		waterY: number,
		W: number,
		_H: number,
	): void {
		ctx.strokeStyle = "rgba(255,255,255,0.1)";
		ctx.lineWidth = 2;

		for (let row = 0; row < 6; row++) {
			const y = waterY + 20 + row * 30;

			ctx.beginPath();

			for (let x = 0; x < W; x += 4) {
				const wave = Math.sin((x + state.waterOffset + row * 40) * 0.02) * 5;

				if (x === 0) ctx.moveTo(x, y + wave);
				else ctx.lineTo(x, y + wave);
			}

			ctx.stroke();
		}
	}

	private drawDock(ctx: CanvasRenderingContext2D, state: FishingState): void {
		const W = state.width;
		const H = state.height;
		const dockY = H * 0.38;
		const dockW = W * 0.18;
		const dockH = H * 0.12;

		// Dock planks
		ctx.fillStyle = "#5d4037";
		ctx.fillRect(0, dockY, dockW, dockH);

		// Plank lines
		ctx.strokeStyle = "#4e342e";
		ctx.lineWidth = 1;

		for (let i = 1; i < 4; i++) {
			const px = (dockW / 4) * i;

			ctx.beginPath();
			ctx.moveTo(px, dockY);
			ctx.lineTo(px, dockY + dockH);
			ctx.stroke();
		}

		// Support poles
		ctx.fillStyle = "#4e342e";
		ctx.fillRect(dockW * 0.2, dockY + dockH, 8, H - dockY - dockH);
		ctx.fillRect(dockW * 0.7, dockY + dockH, 8, H - dockY - dockH);

		// Person (simple stick figure)
		const px = dockW * 0.75;
		const py = dockY - 5;

		// Body
		ctx.strokeStyle = "#fff";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(px, py - 30);
		ctx.lineTo(px, py - 10);
		ctx.stroke();

		// Head
		ctx.fillStyle = "#ffcc80";
		ctx.beginPath();
		ctx.arc(px, py - 35, 7, 0, Math.PI * 2);
		ctx.fill();

		// Legs
		ctx.strokeStyle = "#fff";
		ctx.beginPath();
		ctx.moveTo(px, py - 10);
		ctx.lineTo(px - 8, py);
		ctx.moveTo(px, py - 10);
		ctx.lineTo(px + 8, py);
		ctx.stroke();

		// Fishing rod
		const rodTipX = dockW + 30;
		const rodTipY = dockY - 30;

		ctx.strokeStyle = "#8d6e63";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(px + 2, py - 25);
		ctx.quadraticCurveTo(px + 30, py - 50, rodTipX, rodTipY);
		ctx.stroke();

		// Store rod tip for line drawing
		state.waterOffset += 0; // just use existing props
	}

	private drawLine(ctx: CanvasRenderingContext2D, state: FishingState): void {
		const dockW = state.width * 0.18;
		const dockY = state.height * 0.38;
		const rodTipX = dockW + 30;
		const rodTipY = dockY - 30;

		ctx.strokeStyle = "rgba(255,255,255,0.5)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(rodTipX, rodTipY);
		ctx.lineTo(state.bobberX, state.bobberY);
		ctx.stroke();
	}

	private drawBobber(ctx: CanvasRenderingContext2D, state: FishingState): void {
		const bob = Math.sin(state.bobberBobTime * 3) * 4;
		const x = state.bobberX;
		const y = state.bobberY + bob;

		// Bobber body
		ctx.fillStyle = state.fishBiting ? "#ff1744" : "#ff5722";
		ctx.beginPath();
		ctx.ellipse(x, y, 6, 10, 0, 0, Math.PI * 2);
		ctx.fill();

		// Bobber top
		ctx.fillStyle = "#fff";
		ctx.beginPath();
		ctx.ellipse(x, y - 8, 4, 4, 0, 0, Math.PI * 2);
		ctx.fill();

		// Splash effect when fish biting
		if (state.fishBiting || state.phase === "hooking") {
			ctx.strokeStyle = "rgba(255,255,255,0.6)";
			ctx.lineWidth = 2;
			const splashR = 10 + Math.sin(state.bobberBobTime * 8) * 5;

			ctx.beginPath();
			ctx.arc(x, y, splashR, 0, Math.PI * 2);
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(x, y, splashR + 8, 0, Math.PI * 2);
			ctx.stroke();
		}
	}
}
