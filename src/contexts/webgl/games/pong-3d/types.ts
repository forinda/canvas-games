export const TABLE_W = 8;
export const TABLE_H = 12;
export const PADDLE_W = 1.8;
export const PADDLE_H = 0.3;
export const PADDLE_D = 0.4;
export const BALL_R = 0.25;
export const BALL_SPEED_INIT = 6;
export const BALL_SPEED_MAX = 14;
export const BALL_SPEED_INC = 0.3;
export const PADDLE_SPEED = 8;
export const AI_SPEED = 5.5;
export const WIN_SCORE = 7;
export const WALL_H = 0.4;

export interface Pong3DState {
	ballX: number;
	ballZ: number;
	ballVX: number;
	ballVZ: number;
	ballSpeed: number;
	playerX: number;
	aiX: number;
	playerScore: number;
	aiScore: number;
	phase: "start" | "playing" | "scored" | "win";
	winner: "player" | "ai" | null;
	scoreTimer: number;
	rallyHits: number;
}
