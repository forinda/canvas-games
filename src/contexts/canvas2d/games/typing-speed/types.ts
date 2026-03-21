export interface FallingWord {
	text: string;
	x: number;
	y: number;
	speed: number;
	typed: string;
}

export interface TypingState {
	words: FallingWord[];
	activeWord: FallingWord | null;
	currentInput: string;
	score: number;
	lives: number;
	gameOver: boolean;
	paused: boolean;
	started: boolean;
	totalTyped: number;
	correctTyped: number;
	wordsCompleted: number;
	startTime: number;
	elapsedTime: number;
	spawnTimer: number;
	spawnInterval: number;
	baseSpeed: number;
	canvasWidth: number;
	canvasHeight: number;
}

export const MAX_LIVES = 3;
export const INITIAL_SPAWN_INTERVAL = 2000;
export const MIN_SPAWN_INTERVAL = 600;
export const BASE_WORD_SPEED = 40;
export const SPEED_INCREMENT = 0.003;
export const FONT_SIZE = 22;
export const HS_KEY = "typing_speed_highscore";
