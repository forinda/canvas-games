import type { Renderable } from "@shared/Renderable";
import type { CityState } from "../types";
import { CELL_SIZE, HUD_HEIGHT } from "../types";
import { BUILDING_DEFS } from "../data/buildings";

export class GridRenderer implements Renderable<CityState> {
	render(ctx: CanvasRenderingContext2D, state: CityState): void {
		const s = state;

		for (let row = 0; row < s.rows; row++) {
			for (let col = 0; col < s.cols; col++) {
				const x = col * CELL_SIZE;
				const y = HUD_HEIGHT + row * CELL_SIZE;
				const b = s.grid[row][col];

				ctx.fillStyle = (col + row) % 2 === 0 ? "#1a2a1a" : "#172417";
				ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

				ctx.strokeStyle = "rgba(255,255,255,0.04)";
				ctx.lineWidth = 1;
				ctx.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);

				if (b) {
					const def = BUILDING_DEFS[b.type];

					ctx.fillStyle = `${def.color}44`;
					ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
					ctx.font = `${CELL_SIZE * 0.55}px sans-serif`;
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
					ctx.fillText(def.icon, x + CELL_SIZE / 2, y + CELL_SIZE / 2);

					if (b.level > 1) {
						ctx.font = `bold ${CELL_SIZE * 0.2}px monospace`;
						ctx.fillStyle = "#ffd700";
						ctx.textAlign = "right";
						ctx.textBaseline = "bottom";
						ctx.fillText(`L${b.level}`, x + CELL_SIZE - 4, y + CELL_SIZE - 4);
					}
				}
			}
		}

		// Hover highlight
		if (s.hoveredCell && s.selectedType) {
			const { col, row } = s.hoveredCell;
			const x = col * CELL_SIZE;
			const y = HUD_HEIGHT + row * CELL_SIZE;
			const canPlace = s.grid[row]?.[col] === null;

			ctx.fillStyle = canPlace
				? "rgba(60,255,120,0.15)"
				: "rgba(255,60,60,0.15)";
			ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
		}
	}
}
