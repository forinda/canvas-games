export type Cell = "red" | "yellow" | null;
export type Player = "red" | "yellow";
export type GameMode = "ai" | "2player";

export const COLS = 7;
export const ROWS = 6;
export const TOTAL_CELLS = COLS * ROWS;

export interface WinCell {
	row: number;
	col: number;
}

export interface WinLine {
	cells: WinCell[];
	progress: number; // 0..1 glow animation
}

export interface DiscDrop {
	col: number;
	targetRow: number;
	currentY: number; // animated Y position (in row-units, starts at -1)
	player: Player;
	done: boolean;
}

export interface ConnectFourState {
	/** board[row][col], row 0 = top */
	board: Cell[][];
	currentPlayer: Player;
	mode: GameMode;
	winner: Player | null;
	winLine: WinLine | null;
	isDraw: boolean;
	gameOver: boolean;
	paused: boolean;
	scoreRed: number;
	scoreYellow: number;
	draws: number;
	canvasWidth: number;
	canvasHeight: number;
	aiThinking: boolean;
	showModeSelect: boolean;
	hoverCol: number; // column the mouse is over (-1 if none)
	animationTime: number;
	activeDrop: DiscDrop | null; // currently animating disc
	dropQueue: { col: number; player: Player }[]; // queued drops
}

export const SCORE_KEY = "connect_four_scores";
