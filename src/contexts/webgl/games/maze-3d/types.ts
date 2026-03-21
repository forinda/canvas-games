export const CELL_SIZE = 3;
export const WALL_HEIGHT = 2.5;
export const WALL_THICK = 0.15;
export const PLAYER_RADIUS = 0.3;
export const PLAYER_HEIGHT = 1.6;
export const MOVE_SPEED = 4;
export const LOOK_SENSITIVITY = 0.002;

export interface CellWalls {
	north: boolean;
	south: boolean;
	east: boolean;
	west: boolean;
}

export interface MazeCell {
	row: number;
	col: number;
	walls: CellWalls;
	visited: boolean;
}

export interface Maze3DState {
	grid: MazeCell[][];
	rows: number;
	cols: number;
	/** Player grid position (for win detection) */
	playerRow: number;
	playerCol: number;
	/** Exit position */
	exitRow: number;
	exitCol: number;
	phase: "playing" | "won";
	level: number;
	timer: number;
}

/** Starting maze sizes per level */
export function getMazeSize(level: number): { rows: number; cols: number } {
	const base = 5 + level * 2;

	return { rows: Math.min(base, 15), cols: Math.min(base, 15) };
}
