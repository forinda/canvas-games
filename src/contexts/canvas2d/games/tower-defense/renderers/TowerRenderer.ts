import type { GameStateData, PlacedTower } from "../types";
import type { GridSystem } from "../systems/GridSystem";
import { TOWER_DEFS } from "../data/towers";

export class TowerRenderer {
	render(
		ctx: CanvasRenderingContext2D,
		state: GameStateData,
		grid: GridSystem,
	): void {
		for (const tower of state.towers) {
			this.drawTower(ctx, tower, grid, state);
		}
	}

	private drawTower(
		ctx: CanvasRenderingContext2D,
		tower: PlacedTower,
		grid: GridSystem,
		state: GameStateData,
	) {
		const def = TOWER_DEFS[tower.type];
		const center = grid.cellCenter(tower.col, tower.row);
		const cs = grid.cellSize;
		const r = cs * 0.38;
		const isSelected = state.selectedPlacedTowerId === tower.id;

		// Shadow
		ctx.shadowColor = "rgba(0,0,0,0.5)";
		ctx.shadowBlur = 6;

		// Base circle
		ctx.beginPath();
		ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
		ctx.fillStyle = def.color;
		ctx.fill();

		// Selection ring
		if (isSelected) {
			ctx.beginPath();
			ctx.arc(center.x, center.y, r + 3, 0, Math.PI * 2);
			ctx.strokeStyle = "#fff";
			ctx.lineWidth = 2;
			ctx.stroke();
		}

		ctx.shadowBlur = 0;

		// Draw barrel rotated toward current target
		ctx.save();
		ctx.translate(center.x, center.y);

		// Rotate toward target if one exists
		if (tower.targetId) {
			const target = state.enemies.find((e) => e.id === tower.targetId);

			if (target && !target.dead) {
				const angle = Math.atan2(target.y - center.y, target.x - center.x);

				ctx.rotate(angle + Math.PI / 2); // +90° because barrel points up by default
			}
		}

		// Barrel
		ctx.fillStyle = "rgba(0,0,0,0.5)";
		ctx.fillRect(-cs * 0.06, -r * 0.9, cs * 0.12, r * 0.9);

		ctx.restore();

		// Level stars
		const starY = center.y + r + 5;

		ctx.fillStyle = "#ffd700";
		ctx.font = `${Math.max(6, cs * 0.18)}px sans-serif`;
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		const stars = "★".repeat(tower.level);

		ctx.fillText(stars, center.x, starY);

		// Icon emoji
		ctx.font = `${Math.max(10, cs * 0.36)}px sans-serif`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(def.icon, center.x, center.y);

		// Draw attack line to current target
		if (tower.targetId) {
			const target = state.enemies.find((e) => e.id === tower.targetId);

			if (target && !target.dead) {
				ctx.beginPath();
				ctx.moveTo(center.x, center.y);
				ctx.lineTo(target.x, target.y);
				ctx.strokeStyle = `${def.color}40`;
				ctx.lineWidth = 1;
				ctx.setLineDash([3, 5]);
				ctx.stroke();
				ctx.setLineDash([]);
			}
		}
	}
}
