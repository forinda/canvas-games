import type { Renderable } from "@shared/Renderable";
import type { GravityState } from "../types";
import { COLORS } from "../types";

export class GameRenderer implements Renderable<GravityState> {
	render(ctx: CanvasRenderingContext2D, state: GravityState): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		// Clear background
		ctx.fillStyle = COLORS.background;
		ctx.fillRect(0, 0, W, H);

		// Calculate cell size and offset to center the grid
		const maxGridW = W * 0.8;
		const maxGridH = H * 0.75;
		const cellSize = Math.floor(
			Math.min(maxGridW / state.gridWidth, maxGridH / state.gridHeight),
		);
		const gridW = cellSize * state.gridWidth;
		const gridH = cellSize * state.gridHeight;
		const offsetX = Math.floor((W - gridW) / 2);
		const offsetY = Math.floor((H - gridH) / 2) + 20;

		// Draw grid lines
		this.drawGrid(ctx, state, cellSize, offsetX, offsetY);

		// Draw walls
		this.drawWalls(ctx, state, cellSize, offsetX, offsetY);

		// Draw exit (glowing)
		this.drawExit(ctx, state, cellSize, offsetX, offsetY);

		// Draw trail
		this.drawTrail(ctx, state, cellSize, offsetX, offsetY);

		// Draw ball
		this.drawBall(ctx, state, cellSize, offsetX, offsetY);

		// Draw gravity direction indicator
		this.drawGravityArrow(ctx, state, cellSize, offsetX, offsetY, gridW, gridH);
	}

	private drawGrid(
		ctx: CanvasRenderingContext2D,
		state: GravityState,
		cell: number,
		ox: number,
		oy: number,
	): void {
		ctx.strokeStyle = COLORS.grid;
		ctx.lineWidth = 1;

		for (let x = 0; x <= state.gridWidth; x++) {
			ctx.beginPath();
			ctx.moveTo(ox + x * cell, oy);
			ctx.lineTo(ox + x * cell, oy + state.gridHeight * cell);
			ctx.stroke();
		}

		for (let y = 0; y <= state.gridHeight; y++) {
			ctx.beginPath();
			ctx.moveTo(ox, oy + y * cell);
			ctx.lineTo(ox + state.gridWidth * cell, oy + y * cell);
			ctx.stroke();
		}
	}

	private drawWalls(
		ctx: CanvasRenderingContext2D,
		state: GravityState,
		cell: number,
		ox: number,
		oy: number,
	): void {
		for (const wall of state.walls) {
			const wx = ox + wall.x * cell;
			const wy = oy + wall.y * cell;

			// Wall body
			ctx.fillStyle = COLORS.wall;
			ctx.fillRect(wx, wy, cell, cell);

			// Highlight on top edge
			ctx.fillStyle = COLORS.wallHighlight;
			ctx.fillRect(wx, wy, cell, 2);
			ctx.fillRect(wx, wy, 2, cell);

			// Dark edge
			ctx.fillStyle = "rgba(0,0,0,0.2)";
			ctx.fillRect(wx + cell - 2, wy, 2, cell);
			ctx.fillRect(wx, wy + cell - 2, cell, 2);
		}
	}

	private drawExit(
		ctx: CanvasRenderingContext2D,
		state: GravityState,
		cell: number,
		ox: number,
		oy: number,
	): void {
		const ex = ox + state.exit.x * cell + cell / 2;
		const ey = oy + state.exit.y * cell + cell / 2;
		const glowSize = Math.sin(state.glowPhase) * 0.15 + 0.85;
		const radius = (cell / 2) * 0.7 * glowSize;

		// Outer glow
		const glowAlpha = Math.sin(state.glowPhase) * 0.2 + 0.4;

		ctx.fillStyle = `rgba(76, 175, 80, ${glowAlpha})`;
		ctx.beginPath();
		ctx.arc(ex, ey, radius * 1.6, 0, Math.PI * 2);
		ctx.fill();

		// Inner glow
		ctx.fillStyle = COLORS.exitGlow;
		ctx.beginPath();
		ctx.arc(ex, ey, radius * 1.2, 0, Math.PI * 2);
		ctx.fill();

		// Core
		ctx.fillStyle = COLORS.exit;
		ctx.beginPath();
		ctx.arc(ex, ey, radius, 0, Math.PI * 2);
		ctx.fill();

		// Star/diamond shape inside
		ctx.fillStyle = "rgba(255,255,255,0.6)";
		ctx.beginPath();
		const s = radius * 0.4;

		ctx.moveTo(ex, ey - s);
		ctx.lineTo(ex + s * 0.6, ey);
		ctx.lineTo(ex, ey + s);
		ctx.lineTo(ex - s * 0.6, ey);
		ctx.closePath();
		ctx.fill();
	}

	private drawTrail(
		ctx: CanvasRenderingContext2D,
		state: GravityState,
		cell: number,
		ox: number,
		oy: number,
	): void {
		const trail = state.ball.trail;
		const len = trail.length;

		for (let i = 0; i < len; i++) {
			const alpha = ((i + 1) / len) * 0.35;
			const size = ((i + 1) / len) * 0.4 + 0.1;

			ctx.fillStyle = `rgba(120, 144, 156, ${alpha})`;
			ctx.beginPath();
			ctx.arc(
				ox + trail[i].x * cell + cell / 2,
				oy + trail[i].y * cell + cell / 2,
				(cell / 2) * size,
				0,
				Math.PI * 2,
			);
			ctx.fill();
		}
	}

	private drawBall(
		ctx: CanvasRenderingContext2D,
		state: GravityState,
		cell: number,
		ox: number,
		oy: number,
	): void {
		let bx: number;
		let by: number;

		if (state.sliding) {
			// Interpolate position
			const t = state.slideProgress;
			const smooth = t * t * (3 - 2 * t); // smoothstep

			bx = state.slideFrom.x + (state.slideTo.x - state.slideFrom.x) * smooth;
			by = state.slideFrom.y + (state.slideTo.y - state.slideFrom.y) * smooth;
		} else {
			bx = state.ball.pos.x;
			by = state.ball.pos.y;
		}

		const px = ox + bx * cell + cell / 2;
		const py = oy + by * cell + cell / 2;
		const radius = (cell / 2) * 0.7;

		// Shadow
		ctx.fillStyle = "rgba(0,0,0,0.3)";
		ctx.beginPath();
		ctx.arc(px + 2, py + 2, radius, 0, Math.PI * 2);
		ctx.fill();

		// Ball gradient
		const grad = ctx.createRadialGradient(
			px - radius * 0.3,
			py - radius * 0.3,
			radius * 0.1,
			px,
			py,
			radius,
		);

		grad.addColorStop(0, COLORS.ballCore);
		grad.addColorStop(1, COLORS.ball);

		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.arc(px, py, radius, 0, Math.PI * 2);
		ctx.fill();

		// Shine
		ctx.fillStyle = "rgba(255,255,255,0.5)";
		ctx.beginPath();
		ctx.arc(
			px - radius * 0.25,
			py - radius * 0.25,
			radius * 0.25,
			0,
			Math.PI * 2,
		);
		ctx.fill();
	}

	private drawGravityArrow(
		ctx: CanvasRenderingContext2D,
		state: GravityState,
		_cell: number,
		ox: number,
		oy: number,
		gridW: number,
		gridH: number,
	): void {
		const arrowSize = 16;
		let ax: number;
		let ay: number;
		let angle: number;

		switch (state.gravity) {
			case "down":
				ax = ox + gridW / 2;
				ay = oy + gridH + 24;
				angle = Math.PI / 2;
				break;
			case "up":
				ax = ox + gridW / 2;
				ay = oy - 24;
				angle = -Math.PI / 2;
				break;
			case "left":
				ax = ox - 24;
				ay = oy + gridH / 2;
				angle = Math.PI;
				break;
			case "right":
				ax = ox + gridW + 24;
				ay = oy + gridH / 2;
				angle = 0;
				break;
		}

		ctx.save();
		ctx.translate(ax, ay);
		ctx.rotate(angle);

		// Arrow shape
		ctx.fillStyle = COLORS.arrowIndicator;
		ctx.globalAlpha = 0.7;
		ctx.beginPath();
		ctx.moveTo(arrowSize, 0);
		ctx.lineTo(-arrowSize * 0.5, -arrowSize * 0.6);
		ctx.lineTo(-arrowSize * 0.5, arrowSize * 0.6);
		ctx.closePath();
		ctx.fill();
		ctx.globalAlpha = 1;

		ctx.restore();

		// Label near arrow
		ctx.font = "11px monospace";
		ctx.fillStyle = COLORS.arrowIndicator;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		let lx = ax;
		let ly = ay;

		switch (state.gravity) {
			case "down":
				ly += 18;
				break;
			case "up":
				ly -= 18;
				break;
			case "left":
				lx -= 18;
				break;
			case "right":
				lx += 18;
				break;
		}

		ctx.fillText("G", lx, ly);
	}
}
