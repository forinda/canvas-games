import type { Renderable } from "@shared/Renderable";
import type { GameHelp } from "@shared/GameInterface";
import type { BrickBuilderState } from "../types";
import {
	CELL_SIZE,
	GRID_COLS,
	GRID_ROWS,
	BRICK_COLORS,
	HUD_HEIGHT,
} from "../types";
import { BRICK_TEMPLATES } from "../data/bricks";
import { HelpOverlay } from "@shared/HelpOverlay";

export class HUDRenderer implements Renderable<BrickBuilderState> {
	private helpOverlay: HelpOverlay;
	private helpData: GameHelp;

	constructor(helpData: GameHelp) {
		this.helpOverlay = new HelpOverlay();
		this.helpData = helpData;
	}

	render(ctx: CanvasRenderingContext2D, state: BrickBuilderState): void {
		this.renderTopBar(ctx, state);
		this.renderPalette(ctx, state);
		this.renderColorPicker(ctx, state);
		this.renderClearButton(ctx, state);
		this.renderBrickCount(ctx, state);
		this.renderHelp(ctx, state);
	}

	private renderTopBar(
		ctx: CanvasRenderingContext2D,
		state: BrickBuilderState,
	): void {
		const W = state.canvasWidth;

		ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
		ctx.fillRect(0, 0, W, HUD_HEIGHT);

		// Title
		ctx.font = "bold 18px monospace";
		ctx.fillStyle = "#ff7043";
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillText("Brick Builder", 16, HUD_HEIGHT / 2);

		// Controls hint
		ctx.font = "11px monospace";
		ctx.fillStyle = "#666";
		ctx.textAlign = "right";
		ctx.fillText(
			"[H] Help  [ESC] Exit  [Scroll] Rotate  [Right-click] Remove",
			W - 16,
			HUD_HEIGHT / 2,
		);
	}

	private renderPalette(
		ctx: CanvasRenderingContext2D,
		state: BrickBuilderState,
	): void {
		const paletteX = state.gridOffsetX + GRID_COLS * CELL_SIZE + 16;
		const y = state.gridOffsetY + 8;

		// Palette header
		ctx.font = "bold 13px monospace";
		ctx.fillStyle = "#aaa";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillText("BRICKS", paletteX, y - 20);

		const selectedColor = BRICK_COLORS[state.selectedColorIndex];

		for (let i = 0; i < BRICK_TEMPLATES.length; i++) {
			const template = BRICK_TEMPLATES[i];
			const itemY = y + i * 44;
			const isSelected = i === state.selectedTemplateIndex;

			// Background
			ctx.fillStyle = isSelected
				? "rgba(255, 112, 67, 0.15)"
				: "rgba(255, 255, 255, 0.03)";
			ctx.beginPath();
			ctx.roundRect(paletteX, itemY, 160, 38, 6);
			ctx.fill();

			// Border
			if (isSelected) {
				ctx.strokeStyle = "#ff7043";
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.roundRect(paletteX, itemY, 160, 38, 6);
				ctx.stroke();
			}

			// Mini brick preview
			const previewCellSize = 10;
			const previewX = paletteX + 10;
			const previewY = itemY + (38 - template.h * previewCellSize) / 2;

			for (let cy = 0; cy < template.h; cy++) {
				for (let cx = 0; cx < template.w; cx++) {
					const bx = previewX + cx * previewCellSize;
					const by = previewY + cy * previewCellSize;

					ctx.fillStyle = selectedColor;
					ctx.fillRect(bx, by, previewCellSize - 1, previewCellSize - 1);
					ctx.fillStyle = "rgba(255,255,255,0.2)";
					ctx.fillRect(bx, by, previewCellSize - 1, 2);
				}
			}

			// Label
			ctx.font = "12px monospace";
			ctx.fillStyle = isSelected ? "#fff" : "#888";
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.fillText(template.label, paletteX + 60, itemY + 19);

			// Key hint
			ctx.font = "10px monospace";
			ctx.fillStyle = "#555";
			ctx.textAlign = "right";
			ctx.fillText(`[${i + 1}]`, paletteX + 150, itemY + 19);
		}
	}

	private renderColorPicker(
		ctx: CanvasRenderingContext2D,
		state: BrickBuilderState,
	): void {
		const paletteX = state.gridOffsetX + GRID_COLS * CELL_SIZE + 16;
		const colorY = state.gridOffsetY + BRICK_TEMPLATES.length * 44 + 48;
		const swatchSize = 28;
		const gap = 6;
		const perRow = 4;

		// Header
		ctx.font = "bold 13px monospace";
		ctx.fillStyle = "#aaa";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillText("COLORS  [C]", paletteX, colorY - 20);

		for (let i = 0; i < BRICK_COLORS.length; i++) {
			const col = i % perRow;
			const row = Math.floor(i / perRow);
			const cx = paletteX + col * (swatchSize + gap);
			const cy = colorY + row * (swatchSize + gap);
			const isSelected = i === state.selectedColorIndex;

			// Swatch
			ctx.fillStyle = BRICK_COLORS[i];
			ctx.beginPath();
			ctx.roundRect(cx, cy, swatchSize, swatchSize, 4);
			ctx.fill();

			// Selection ring
			if (isSelected) {
				ctx.strokeStyle = "#fff";
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.roundRect(cx - 2, cy - 2, swatchSize + 4, swatchSize + 4, 6);
				ctx.stroke();
			}
		}
	}

	private renderClearButton(
		ctx: CanvasRenderingContext2D,
		state: BrickBuilderState,
	): void {
		const paletteX = state.gridOffsetX + GRID_COLS * CELL_SIZE + 16;
		const clearY = state.gridOffsetY + BRICK_TEMPLATES.length * 44 + 48 + 80;
		const btnW = 160;
		const btnH = 32;

		// Button background
		ctx.fillStyle = "rgba(229, 57, 53, 0.15)";
		ctx.beginPath();
		ctx.roundRect(paletteX, clearY, btnW, btnH, 6);
		ctx.fill();

		ctx.strokeStyle = "rgba(229, 57, 53, 0.4)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.roundRect(paletteX, clearY, btnW, btnH, 6);
		ctx.stroke();

		ctx.font = "12px monospace";
		ctx.fillStyle = "#e53935";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("Clear All [Del]", paletteX + btnW / 2, clearY + btnH / 2);
	}

	private renderBrickCount(
		ctx: CanvasRenderingContext2D,
		state: BrickBuilderState,
	): void {
		const paletteX = state.gridOffsetX + GRID_COLS * CELL_SIZE + 16;
		const countY = state.gridOffsetY + GRID_ROWS * CELL_SIZE - 30;

		ctx.font = "12px monospace";
		ctx.fillStyle = "#666";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillText(`Bricks: ${state.bricks.length}`, paletteX, countY);
		ctx.fillText(`Total placed: ${state.totalPlaced}`, paletteX, countY + 18);
	}

	private renderHelp(
		ctx: CanvasRenderingContext2D,
		state: BrickBuilderState,
	): void {
		this.helpOverlay.visible = state.helpVisible;
		this.helpOverlay.render(ctx, this.helpData, "Brick Builder", "#ff7043");
	}
}
