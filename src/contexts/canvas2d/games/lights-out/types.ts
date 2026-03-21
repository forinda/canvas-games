export interface Cell {
	on: boolean;
}

export type GameStatus = "playing" | "level-complete" | "all-done";

export const GRID_SIZE = 5;
export const GAME_COLOR = "#ffca28";

export interface RippleEffect {
	row: number;
	col: number;
	startTime: number;
	duration: number;
}

export interface LightsOutState {
	board: Cell[][];
	level: number;
	moves: number;
	status: GameStatus;
	/** Offset for centering the board on canvas */
	offsetX: number;
	offsetY: number;
	cellSize: number;
	/** Active ripple animations */
	ripples: RippleEffect[];
	/** Timestamp when level-complete overlay appeared (for auto-advance delay) */
	levelCompleteTime: number;
}
