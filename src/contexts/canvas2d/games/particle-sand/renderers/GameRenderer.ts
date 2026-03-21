import type { Renderable } from "@core/Renderable";
import type { SandState } from "../types";
import { PARTICLE_COLORS } from "../types";

export class GameRenderer implements Renderable<SandState> {
	private imageData: ImageData | null;

	constructor() {
		this.imageData = null;
	}

	render(ctx: CanvasRenderingContext2D, state: SandState): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		// Background
		ctx.fillStyle = "#1a1a2e";
		ctx.fillRect(0, 0, W, H);

		// Ensure imageData is the right size
		const pixW = state.gridW * state.cellSize;
		const pixH = state.gridH * state.cellSize;

		if (
			!this.imageData ||
			this.imageData.width !== pixW ||
			this.imageData.height !== pixH
		) {
			this.imageData = ctx.createImageData(pixW, pixH);
		}

		const data = this.imageData.data;

		// Clear to background
		for (let i = 0; i < data.length; i += 4) {
			data[i] = 26; // R
			data[i + 1] = 26; // G
			data[i + 2] = 46; // B
			data[i + 3] = 255; // A
		}

		// Draw particles
		const cs = state.cellSize;

		for (let gy = 0; gy < state.gridH; gy++) {
			for (let gx = 0; gx < state.gridW; gx++) {
				const p = state.grid[gy * state.gridW + gx];

				if (!p) continue;

				const colors = PARTICLE_COLORS[p.type];
				const colorHex = colors[(gx + gy) % colors.length];
				const r = parseInt(colorHex.slice(1, 3), 16);
				const g = parseInt(colorHex.slice(3, 5), 16);
				const b = parseInt(colorHex.slice(5, 7), 16);

				// Apply fade for fire and steam based on life
				let alpha = 255;

				if (p.type === "fire") {
					alpha = Math.max(60, Math.min(255, Math.floor((p.life / 140) * 255)));
				} else if (p.type === "steam") {
					alpha = Math.max(40, Math.min(200, Math.floor((p.life / 140) * 200)));
				}

				// Fill cell pixels
				const px0 = gx * cs;
				const py0 = gy * cs;

				for (let py = py0; py < py0 + cs && py < pixH; py++) {
					for (let px = px0; px < px0 + cs && px < pixW; px++) {
						const i = (py * pixW + px) * 4;

						if (alpha === 255) {
							data[i] = r;
							data[i + 1] = g;
							data[i + 2] = b;
							data[i + 3] = 255;
						} else {
							// Blend with background
							const a = alpha / 255;

							data[i] = Math.floor(26 * (1 - a) + r * a);
							data[i + 1] = Math.floor(26 * (1 - a) + g * a);
							data[i + 2] = Math.floor(46 * (1 - a) + b * a);
							data[i + 3] = 255;
						}
					}
				}
			}
		}

		ctx.putImageData(this.imageData, 0, 0);

		// Draw brush cursor
		if (
			state.mouseX >= 0 &&
			state.mouseX < state.gridW &&
			state.mouseY >= 0 &&
			state.mouseY < state.gridH
		) {
			const cursorX = state.mouseX * cs;
			const cursorY = state.mouseY * cs;
			const cursorR = state.brushSize * cs;

			ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.arc(cursorX + cs / 2, cursorY + cs / 2, cursorR, 0, Math.PI * 2);
			ctx.stroke();
		}
	}
}
