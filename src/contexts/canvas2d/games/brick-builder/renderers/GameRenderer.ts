import type { Renderable } from "@core/Renderable";
import type { BrickBuilderState } from "../types";
import { CELL_SIZE, GRID_COLS, GRID_ROWS, BRICK_COLORS } from "../types";
import { BRICK_TEMPLATES } from "../data/bricks";

export class GameRenderer implements Renderable<BrickBuilderState> {
	render(ctx: CanvasRenderingContext2D, state: BrickBuilderState): void {
		const W = state.canvasWidth;
		const H = state.canvasHeight;

		// Clear
		ctx.fillStyle = "#1a1a2e";
		ctx.fillRect(0, 0, W, H);

		this.renderGrid(ctx, state);
		this.renderPlacedBricks(ctx, state);
		this.renderHoverPreview(ctx, state);
	}

	private renderGrid(
		ctx: CanvasRenderingContext2D,
		state: BrickBuilderState,
	): void {
		const ox = state.gridOffsetX;
		const oy = state.gridOffsetY;
		const gridW = GRID_COLS * CELL_SIZE;
		const gridH = GRID_ROWS * CELL_SIZE;

		// Grid background
		ctx.fillStyle = "#0d1b2a";
		ctx.fillRect(ox, oy, gridW, gridH);

		// Grid lines
		ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
		ctx.lineWidth = 1;

		for (let c = 0; c <= GRID_COLS; c++) {
			const x = ox + c * CELL_SIZE;

			ctx.beginPath();
			ctx.moveTo(x, oy);
			ctx.lineTo(x, oy + gridH);
			ctx.stroke();
		}

		for (let r = 0; r <= GRID_ROWS; r++) {
			const y = oy + r * CELL_SIZE;

			ctx.beginPath();
			ctx.moveTo(ox, y);
			ctx.lineTo(ox + gridW, y);
			ctx.stroke();
		}

		// Grid border
		ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
		ctx.lineWidth = 2;
		ctx.strokeRect(ox, oy, gridW, gridH);

		// Ground line (bottom of grid)
		ctx.strokeStyle = "#4a4a5a";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(ox, oy + gridH);
		ctx.lineTo(ox + gridW, oy + gridH);
		ctx.stroke();
	}

	private renderPlacedBricks(
		ctx: CanvasRenderingContext2D,
		state: BrickBuilderState,
	): void {
		const ox = state.gridOffsetX;
		const oy = state.gridOffsetY;

		for (const brick of state.bricks) {
			const px = ox + brick.x * CELL_SIZE;
			const py = oy + brick.y * CELL_SIZE;
			const pw = brick.w * CELL_SIZE;
			const ph = brick.h * CELL_SIZE;

			this.drawBrick(ctx, px, py, pw, ph, brick.color, brick.w, brick.h);
		}
	}

	private renderHoverPreview(
		ctx: CanvasRenderingContext2D,
		state: BrickBuilderState,
	): void {
		if (!state.mouseOnGrid) return;

		const template = BRICK_TEMPLATES[state.selectedTemplateIndex];
		const bw = state.rotated ? template.h : template.w;
		const bh = state.rotated ? template.w : template.h;
		const color = BRICK_COLORS[state.selectedColorIndex];

		// Clamp preview to grid
		const gx = Math.min(state.hoverGridX, GRID_COLS - bw);
		const gy = Math.min(state.hoverGridY, GRID_ROWS - bh);

		if (gx < 0 || gy < 0) return;

		const ox = state.gridOffsetX;
		const oy = state.gridOffsetY;
		const px = ox + gx * CELL_SIZE;
		const py = oy + gy * CELL_SIZE;
		const pw = bw * CELL_SIZE;
		const ph = bh * CELL_SIZE;

		ctx.globalAlpha = 0.5;
		this.drawBrick(ctx, px, py, pw, ph, color, bw, bh);
		ctx.globalAlpha = 1.0;

		// Preview outline
		ctx.strokeStyle = "#ffffff";
		ctx.lineWidth = 2;
		ctx.setLineDash([4, 4]);
		ctx.strokeRect(px, py, pw, ph);
		ctx.setLineDash([]);
	}

	/** Draw a single brick with 3D studs */
	private drawBrick(
		ctx: CanvasRenderingContext2D,
		px: number,
		py: number,
		pw: number,
		ph: number,
		color: string,
		cellsW: number,
		cellsH: number,
	): void {
		// Main brick body
		ctx.fillStyle = color;
		ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);

		// Top highlight
		ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
		ctx.fillRect(px + 1, py + 1, pw - 2, 3);

		// Left highlight
		ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
		ctx.fillRect(px + 1, py + 1, 3, ph - 2);

		// Bottom shadow
		ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
		ctx.fillRect(px + 1, py + ph - 4, pw - 2, 3);

		// Right shadow
		ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
		ctx.fillRect(px + pw - 4, py + 1, 3, ph - 2);

		// Outline
		ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
		ctx.lineWidth = 1;
		ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);

		// 3D studs on top of each cell
		for (let cy = 0; cy < cellsH; cy++) {
			for (let cx = 0; cx < cellsW; cx++) {
				const studX = px + cx * CELL_SIZE + CELL_SIZE / 2;
				const studY = py + cy * CELL_SIZE + CELL_SIZE / 2;
				const studR = CELL_SIZE * 0.25;

				// Stud base (darker)
				ctx.beginPath();
				ctx.arc(studX, studY + 1, studR, 0, Math.PI * 2);
				ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
				ctx.fill();

				// Stud body
				ctx.beginPath();
				ctx.arc(studX, studY, studR, 0, Math.PI * 2);
				ctx.fillStyle = color;
				ctx.fill();

				// Stud highlight
				ctx.beginPath();
				ctx.arc(
					studX - studR * 0.25,
					studY - studR * 0.25,
					studR * 0.5,
					0,
					Math.PI * 2,
				);
				ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
				ctx.fill();

				// Stud outline
				ctx.beginPath();
				ctx.arc(studX, studY, studR, 0, Math.PI * 2);
				ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
				ctx.lineWidth = 1;
				ctx.stroke();
			}
		}
	}
}
