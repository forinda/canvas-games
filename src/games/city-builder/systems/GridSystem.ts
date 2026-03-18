import type { CityState, Building } from '../types';
import { CELL_SIZE, HUD_HEIGHT } from '../types';

export class GridSystem {
  pixelToCell(state: CityState, x: number, y: number): { col: number; row: number } | null {
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor((y - HUD_HEIGHT) / CELL_SIZE);
    if (col < 0 || col >= state.cols || row < 0 || row >= state.rows) return null;
    return { col, row };
  }

  isCellEmpty(state: CityState, col: number, row: number): boolean {
    return state.grid[row]?.[col] === null;
  }

  placeBuilding(state: CityState, building: Building): void {
    state.grid[building.row][building.col] = building;
  }

  createEmptyGrid(cols: number, rows: number): (Building | null)[][] {
    const grid: (Building | null)[][] = [];
    for (let r = 0; r < rows; r++) {
      grid[r] = [];
      for (let c = 0; c < cols; c++) grid[r][c] = null;
    }
    return grid;
  }
}
