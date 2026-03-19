import type { Cell, GameStateData, GridCoord, TowerType } from "../types";
import { GRID_COLS, GRID_ROWS } from "./PathSystem";
import { TOWER_DEFS, upgradeCost, sellRefund } from "../data/towers";
import { EconomySystem } from "./EconomySystem";

export class GridSystem {
	/** Canvas config */
	cellSize: number = 0;
	gridOffsetY: number = 0; // pixels from top (below HUD)
	panelHeight: number = 0;

	/**
	 * Update layout metrics whenever canvas is resized.
	 */
	updateLayout(
		canvasWidth: number,
		canvasHeight: number,
		hudHeight: number,
		panelH: number,
	) {
		this.panelHeight = panelH;
		this.gridOffsetY = hudHeight;
		const availH = canvasHeight - hudHeight - panelH;
		const cellByWidth = Math.floor(canvasWidth / GRID_COLS);
		const cellByHeight = Math.floor(availH / GRID_ROWS);

		this.cellSize = Math.min(cellByWidth, cellByHeight);
	}

	/** Convert pixel coords to grid cell, or null if outside grid */
	pixelToCell(px: number, py: number): GridCoord | null {
		if (py < this.gridOffsetY) return null;

		const col = Math.floor(px / this.cellSize);
		const row = Math.floor((py - this.gridOffsetY) / this.cellSize);

		if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;

		return { col, row };
	}

	/** Pixel center of a grid cell */
	cellCenter(col: number, row: number): { x: number; y: number } {
		return {
			x: col * this.cellSize + this.cellSize / 2,
			y: this.gridOffsetY + row * this.cellSize + this.cellSize / 2,
		};
	}

	/** Top-left pixel of a cell */
	cellOrigin(col: number, row: number): { x: number; y: number } {
		return {
			x: col * this.cellSize,
			y: this.gridOffsetY + row * this.cellSize,
		};
	}

	getCell(state: GameStateData, col: number, row: number): Cell | null {
		return state.grid[row]?.[col] ?? null;
	}

	canPlaceTower(state: GameStateData, col: number, row: number): boolean {
		const cell = this.getCell(state, col, row);

		if (!cell) return false;

		return cell.type === "empty" && cell.towerId === null;
	}
}

// ─── Tower placement actions ───────────────────────────────────────────────

export function tryPlaceTower(
	state: GameStateData,
	col: number,
	row: number,
	towerType: TowerType,
	grid: GridSystem,
): boolean {
	const def = TOWER_DEFS[towerType];

	if (state.gold < def.cost || !grid.canPlaceTower(state, col, row)) {
		state.placementFail = { col, row, timer: 0.4 };

		return false;
	}

	const id = `tower_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
	const tower = {
		id,
		type: towerType,
		col,
		row,
		level: 1,
		totalInvested: def.cost,
		lastFiredAt: 0,
		targetId: null,
	};

	state.towers.push(tower);
	state.grid[row][col].type = "tower";
	state.grid[row][col].towerId = id;
	EconomySystem.spendGold(state, def.cost);

	return true;
}

export function tryUpgradeTower(
	state: GameStateData,
	towerId: string,
): boolean {
	const tower = state.towers.find((t) => t.id === towerId);

	if (!tower || tower.level >= 3) return false;

	const def = TOWER_DEFS[tower.type];
	const cost = upgradeCost(def, tower.level);

	if (state.gold < cost) return false;

	tower.level++;
	tower.totalInvested += cost;
	EconomySystem.spendGold(state, cost);

	return true;
}

export function trySellTower(state: GameStateData, towerId: string): boolean {
	const idx = state.towers.findIndex((t) => t.id === towerId);

	if (idx === -1) return false;

	const tower = state.towers[idx];
	const refund = sellRefund(tower.totalInvested);

	EconomySystem.earnGold(state, refund);
	state.grid[tower.row][tower.col].type = "empty";
	state.grid[tower.row][tower.col].towerId = null;
	state.towers.splice(idx, 1);

	if (state.selectedPlacedTowerId === towerId) {
		state.selectedPlacedTowerId = null;
	}

	return true;
}
