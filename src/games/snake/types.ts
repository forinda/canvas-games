export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Coord {
  x: number;
  y: number;
}

export interface SnakeState {
  snake: Coord[];
  food: Coord;
  dir: Direction;
  nextDir: Direction;
  score: number;
  highScore: number;
  speed: number;
  gameOver: boolean;
  paused: boolean;
  started: boolean;
  gridW: number;
  gridH: number;
}

export const CELL = 20;
export const HS_KEY = 'snake_highscore';
