import type { Renderable } from "@core/Renderable";
import type { PuzzleState } from "../types";

export class InventoryRenderer implements Renderable<PuzzleState> {
	render(ctx: CanvasRenderingContext2D, state: PuzzleState): void {
		const canvas = ctx.canvas;
		const W = canvas.width,
			H = canvas.height;

		// Inventory panel (bottom)
		const panelH = 80;
		const panelY = H - panelH;

		ctx.fillStyle = "rgba(0,0,0,0.7)";
		ctx.fillRect(0, panelY, W, panelH);
		ctx.fillStyle = "#333";
		ctx.fillRect(0, panelY, W, 2);

		ctx.font = "12px monospace";
		ctx.textAlign = "left";
		ctx.fillStyle = "#888";
		ctx.textBaseline = "top";
		ctx.fillText(
			`Pieces: ${state.inventory.length - state.selectedInventory} remaining  |  [SPACE] Simulate  |  [R] Reset`,
			12,
			panelY + 10,
		);

		// Preview remaining pieces
		let ix = 12;

		for (let i = state.selectedInventory; i < state.inventory.length; i++) {
			const item = state.inventory[i];

			ctx.fillStyle = item.color;
			const previewW = Math.min(item.w, 60);
			const previewH = Math.min(item.h, 30);

			ctx.fillRect(ix, panelY + 36, previewW, previewH);
			ix += previewW + 10;
		}
	}
}
