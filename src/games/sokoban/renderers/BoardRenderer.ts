import type { Renderable } from "@shared/Renderable";
import { Cell, COLORS, type SokobanState } from "../types";

export class BoardRenderer implements Renderable<SokobanState> {
	render(ctx: CanvasRenderingContext2D, state: SokobanState): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		// Clear
		ctx.fillStyle = COLORS.background;
		ctx.fillRect(0, 0, W, H);

		// Calculate tile size to fit board centered with some padding
		const hudTop = 50; // space for HUD
		const padding = 20;
		const availW = W - padding * 2;
		const availH = H - hudTop - padding * 2;
		const tileSize = Math.floor(
			Math.min(availW / state.width, availH / state.height),
		);
		const boardW = tileSize * state.width;
		const boardH = tileSize * state.height;
		const offsetX = Math.floor((W - boardW) / 2);
		const offsetY = Math.floor((H - boardH) / 2) + hudTop / 2;

		// Draw grid
		for (let y = 0; y < state.height; y++) {
			for (let x = 0; x < state.width; x++) {
				const cell = state.grid[y][x];
				const px = offsetX + x * tileSize;
				const py = offsetY + y * tileSize;

				if (cell === Cell.Wall) {
					this.drawWall(ctx, px, py, tileSize);
				} else if (cell === Cell.Floor || cell === Cell.Target) {
					this.drawFloor(ctx, px, py, tileSize);

					if (cell === Cell.Target) {
						this.drawTarget(ctx, px, py, tileSize);
					}
				}
			}
		}

		// Draw boxes
		for (const box of state.boxes) {
			const px = offsetX + box.x * tileSize;
			const py = offsetY + box.y * tileSize;
			const onTarget = state.grid[box.y][box.x] === Cell.Target;

			this.drawBox(ctx, px, py, tileSize, onTarget);
		}

		// Draw player
		const ppx = offsetX + state.player.x * tileSize;
		const ppy = offsetY + state.player.y * tileSize;

		this.drawPlayer(ctx, ppx, ppy, tileSize);
	}

	private drawWall(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		size: number,
	): void {
		const inset = 1;

		// Bottom (shadow)
		ctx.fillStyle = COLORS.wall;
		ctx.fillRect(x + inset, y + inset, size - inset * 2, size - inset * 2);
		// Top face
		ctx.fillStyle = COLORS.wallTop;
		ctx.fillRect(x + inset, y + inset, size - inset * 2, size - inset * 2 - 3);
	}

	private drawFloor(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		size: number,
	): void {
		ctx.fillStyle = COLORS.floor;
		ctx.fillRect(x, y, size, size);
		// Subtle grid line
		ctx.strokeStyle = "rgba(255,255,255,0.03)";
		ctx.lineWidth = 1;
		ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
	}

	private drawTarget(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		size: number,
	): void {
		const cx = x + size / 2;
		const cy = y + size / 2;
		const r = size * 0.2;

		ctx.fillStyle = COLORS.targetDim;
		ctx.beginPath();
		ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = COLORS.target;
		ctx.beginPath();
		ctx.arc(cx, cy, r, 0, Math.PI * 2);
		ctx.fill();
	}

	private drawBox(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		size: number,
		onTarget: boolean,
	): void {
		const inset = 3;
		const bx = x + inset;
		const by = y + inset;
		const bs = size - inset * 2;

		const fillColor = onTarget ? COLORS.boxOnTarget : COLORS.box;
		const borderColor = onTarget ? COLORS.boxOnTargetBorder : COLORS.boxBorder;

		// Shadow
		ctx.fillStyle = "rgba(0,0,0,0.3)";
		ctx.fillRect(bx + 2, by + 2, bs, bs);

		// Box body
		ctx.fillStyle = fillColor;
		ctx.fillRect(bx, by, bs, bs);

		// Border
		ctx.strokeStyle = borderColor;
		ctx.lineWidth = 2;
		ctx.strokeRect(bx, by, bs, bs);

		// Cross marks
		ctx.strokeStyle = borderColor;
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(bx + 4, by + 4);
		ctx.lineTo(bx + bs - 4, by + bs - 4);
		ctx.moveTo(bx + bs - 4, by + 4);
		ctx.lineTo(bx + 4, by + bs - 4);
		ctx.stroke();
	}

	private drawPlayer(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		size: number,
	): void {
		const cx = x + size / 2;
		const cy = y + size / 2;
		const r = size * 0.35;

		// Shadow
		ctx.fillStyle = "rgba(0,0,0,0.3)";
		ctx.beginPath();
		ctx.arc(cx + 2, cy + 2, r, 0, Math.PI * 2);
		ctx.fill();

		// Body
		ctx.fillStyle = COLORS.player;
		ctx.beginPath();
		ctx.arc(cx, cy, r, 0, Math.PI * 2);
		ctx.fill();

		// Eyes
		ctx.fillStyle = COLORS.playerEye;
		const eyeR = r * 0.15;

		ctx.beginPath();
		ctx.arc(cx - r * 0.25, cy - r * 0.15, eyeR, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(cx + r * 0.25, cy - r * 0.15, eyeR, 0, Math.PI * 2);
		ctx.fill();
	}
}
