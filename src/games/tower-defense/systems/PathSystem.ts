import type { GridCoord, ActiveEnemy } from "../types";

export const GRID_COLS = 16;
export const GRID_ROWS = 10;

/**
 * Path waypoints as a series of straight-line anchor points (col, row).
 * The path winds across the 16×10 grid from column 0 to column 15.
 *
 * Layout (S=start, E=end, numbers = path row):
 *   Row 1: col 0→5  (right)
 *   Row 1→7: col 5 (down)
 *   Row 7: col 5→10 (right)
 *   Row 7→3: col 10 (up)
 *   Row 3: col 10→15 (right)  → end at row 3 col 15
 *
 *   Then from row3,col15 → row8,col15 → row8,col12 → end (exit)
 */
export const PATH_WAYPOINTS: GridCoord[] = [
	{ col: 0, row: 1 }, // start
	{ col: 5, row: 1 },
	{ col: 5, row: 7 },
	{ col: 10, row: 7 },
	{ col: 10, row: 3 },
	{ col: 14, row: 3 },
	{ col: 14, row: 8 },
	{ col: 15, row: 8 }, // end
];

/**
 * Given an enemy's waypointIndex and progress (0–1),
 * return its pixel {x, y} position.
 * cellSize is the size of a single grid cell in pixels.
 * offsetY is the Y offset of the game grid (below HUD).
 */
export function getEnemyPixelPos(
	enemy: ActiveEnemy,
	cellSize: number,
	offsetY: number,
): { x: number; y: number } {
	const wpIdx = enemy.waypointIndex;

	if (wpIdx <= 0) {
		const wp = PATH_WAYPOINTS[0];

		return {
			x: wp.col * cellSize + cellSize / 2,
			y: offsetY + wp.row * cellSize + cellSize / 2,
		};
	}

	const from = PATH_WAYPOINTS[wpIdx - 1];
	const to = PATH_WAYPOINTS[Math.min(wpIdx, PATH_WAYPOINTS.length - 1)];
	const t = enemy.progress;

	return {
		x: (from.col + (to.col - from.col) * t) * cellSize + cellSize / 2,
		y: offsetY + (from.row + (to.row - from.row) * t) * cellSize + cellSize / 2,
	};
}

/**
 * Advance enemy along the path by `distanceCells` (cells traveled this frame).
 * Returns true if the enemy reached the end.
 */
export function advanceEnemy(
	enemy: ActiveEnemy,
	distanceCells: number,
): boolean {
	let remaining = distanceCells;

	while (remaining > 0 && enemy.waypointIndex < PATH_WAYPOINTS.length) {
		const from = PATH_WAYPOINTS[enemy.waypointIndex - 1];
		const to = PATH_WAYPOINTS[enemy.waypointIndex];

		const segLenCol = Math.abs(to.col - from.col);
		const segLenRow = Math.abs(to.row - from.row);
		const segLen = segLenCol + segLenRow; // Manhattan (path is axis-aligned)

		const progressLeft = 1 - enemy.progress;
		const progressNeeded = remaining / segLen;

		if (progressNeeded < progressLeft) {
			enemy.progress += progressNeeded;
			remaining = 0;
		} else {
			remaining -= progressLeft * segLen;
			enemy.waypointIndex++;
			enemy.progress = 0;

			if (enemy.waypointIndex >= PATH_WAYPOINTS.length) {
				return true; // reached end
			}
		}
	}

	return false;
}

/**
 * Total path progress score for an enemy (used for targeting priority).
 * Higher = further along path.
 */
export function pathProgress(enemy: ActiveEnemy): number {
	return enemy.waypointIndex + enemy.progress;
}
