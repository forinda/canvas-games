import type { Renderable } from "@core/Renderable";
import type { PipeState, Pipe } from "../types";
import { getOpenings } from "../types";

export class BoardRenderer implements Renderable<PipeState> {
	render(ctx: CanvasRenderingContext2D, state: PipeState): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		// Clear
		ctx.fillStyle = "#0a0a1a";
		ctx.fillRect(0, 0, W, H);

		const { grid, rows, cols, offsetX, offsetY, cellSize } = state;

		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				const x = offsetX + c * cellSize;
				const y = offsetY + r * cellSize;
				const pipe = grid[r][c];

				this.drawCell(ctx, x, y, cellSize, pipe);
			}
		}
	}

	private drawCell(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		size: number,
		pipe: Pipe,
	): void {
		const pad = 2;

		// Background
		ctx.fillStyle = "#1a1a2e";
		ctx.fillRect(x + pad, y + pad, size - pad * 2, size - pad * 2);

		// Border
		ctx.strokeStyle = "#2a2a4a";
		ctx.lineWidth = 1;
		ctx.strokeRect(x + pad, y + pad, size - pad * 2, size - pad * 2);

		// Draw pipe openings
		const cx = x + size / 2;
		const cy = y + size / 2;
		const openings = getOpenings(pipe);
		const pipeWidth = size * 0.3;
		const halfPipe = pipeWidth / 2;

		// Determine colors
		let pipeColor = "#555";

		if (pipe.isSource) {
			pipeColor = "#2ecc71";
		} else if (pipe.isDrain) {
			pipeColor = "#e74c3c";
		} else if (pipe.connected) {
			pipeColor = "#3498db";
		}

		// If water is filling, interpolate color
		if (pipe.waterFill > 0 && !pipe.isSource && !pipe.isDrain) {
			const t = pipe.waterFill;

			pipeColor = this.lerpColor("#555", "#3498db", t);
		}

		// Draw center hub
		ctx.fillStyle = pipeColor;
		ctx.fillRect(cx - halfPipe, cy - halfPipe, pipeWidth, pipeWidth);

		// Draw each opening as a rectangle from center to edge
		for (const dir of openings) {
			ctx.fillStyle = pipeColor;

			switch (dir) {
				case 0: // up
					ctx.fillRect(
						cx - halfPipe,
						y + pad,
						pipeWidth,
						size / 2 - pad - halfPipe + halfPipe,
					);
					break;
				case 1: // right
					ctx.fillRect(cx + halfPipe, cy - halfPipe, size / 2 - pad, pipeWidth);
					break;
				case 2: // down
					ctx.fillRect(cx - halfPipe, cy + halfPipe, pipeWidth, size / 2 - pad);
					break;
				case 3: // left
					ctx.fillRect(
						x + pad,
						cy - halfPipe,
						size / 2 - pad - halfPipe + halfPipe,
						pipeWidth,
					);
					break;
			}
		}

		// Draw source/drain indicator
		if (pipe.isSource) {
			ctx.fillStyle = "#2ecc71";
			ctx.beginPath();
			ctx.arc(cx, cy, size * 0.15, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = "#fff";
			ctx.font = `bold ${Math.floor(size * 0.25)}px monospace`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("S", cx, cy);
		} else if (pipe.isDrain) {
			ctx.fillStyle = "#e74c3c";
			ctx.beginPath();
			ctx.arc(cx, cy, size * 0.15, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = "#fff";
			ctx.font = `bold ${Math.floor(size * 0.25)}px monospace`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("D", cx, cy);
		}

		// Water flow animation: pulse effect on connected pipes
		if (
			pipe.connected &&
			pipe.waterFill > 0.5 &&
			!pipe.isSource &&
			!pipe.isDrain
		) {
			const pulse = 0.3 + 0.2 * Math.sin(Date.now() / 300);

			ctx.fillStyle = `rgba(52, 152, 219, ${pulse})`;
			ctx.fillRect(
				cx - halfPipe * 0.6,
				cy - halfPipe * 0.6,
				pipeWidth * 0.6,
				pipeWidth * 0.6,
			);
		}
	}

	private lerpColor(a: string, b: string, t: number): string {
		const ar = parseInt(a.slice(1, 3), 16);
		const ag = parseInt(a.slice(3, 5), 16);
		const ab = parseInt(a.slice(5, 7), 16);
		const br = parseInt(b.slice(1, 3), 16);
		const bg = parseInt(b.slice(3, 5), 16);
		const bb = parseInt(b.slice(5, 7), 16);
		const rr = Math.round(ar + (br - ar) * t);
		const rg = Math.round(ag + (bg - ag) * t);
		const rb = Math.round(ab + (bb - ab) * t);

		return `rgb(${rr},${rg},${rb})`;
	}
}
