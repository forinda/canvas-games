import type { Renderable } from "@core/Renderable";
import type { CityState } from "../types";
import { BUILDING_DEFS, BUILDING_TYPES } from "../data/buildings";

export class PanelRenderer implements Renderable<CityState> {
	private canvas: HTMLCanvasElement;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
	}

	render(ctx: CanvasRenderingContext2D, state: CityState): void {
		const s = state;
		const W = this.canvas.width;
		const H = this.canvas.height;

		const panelY = H - 90;

		ctx.fillStyle = "#0d1a0d";
		ctx.fillRect(0, panelY, W, 90);
		ctx.fillStyle = "#2a4a2a";
		ctx.fillRect(0, panelY, W, 2);

		const cardW = 80;
		const cardH = 60;
		const pad = 10;

		BUILDING_TYPES.forEach((type, i) => {
			const def = BUILDING_DEFS[type];
			const cx = pad + i * (cardW + pad);
			const cy2 = panelY + 15;
			const selected = s.selectedType === type;
			const canAfford = s.money >= def.cost;

			ctx.fillStyle = selected ? "#1a3d1a" : canAfford ? "#141e14" : "#1a1a1a";
			ctx.beginPath();
			ctx.roundRect(cx, cy2, cardW, cardH, 6);
			ctx.fill();
			ctx.strokeStyle = selected ? def.color : "#2a3a2a";
			ctx.lineWidth = selected ? 2 : 1;
			ctx.beginPath();
			ctx.roundRect(cx, cy2, cardW, cardH, 6);
			ctx.stroke();

			ctx.globalAlpha = canAfford ? 1 : 0.4;
			ctx.font = `${cardW * 0.3}px sans-serif`;
			ctx.textAlign = "center";
			ctx.textBaseline = "top";
			ctx.fillText(def.icon, cx + cardW / 2, cy2 + 4);

			ctx.font = "bold 10px monospace";
			ctx.fillStyle = canAfford ? "#ccc" : "#555";
			ctx.fillText(def.name, cx + cardW / 2, cy2 + 30);

			ctx.font = "9px monospace";
			ctx.fillStyle = canAfford ? "#f1c40f" : "#555";
			ctx.fillText(`$${def.cost}`, cx + cardW / 2, cy2 + 44);
			ctx.globalAlpha = 1;
		});

		// Hotkey hints
		ctx.font = "10px monospace";
		ctx.fillStyle = "#333";
		ctx.textAlign = "left";
		ctx.fillText("[1-6] Select building  |  Click grid to place", pad, H - 6);
	}
}
