export type BuildingType = 'house' | 'farm' | 'factory' | 'park' | 'road' | 'powerplant';

export interface Building {
  type: BuildingType;
  col: number;
  row: number;
  level: number;
}

export interface CityState {
  grid: (Building | null)[][];
  cols: number;
  rows: number;
  population: number;
  money: number;
  happiness: number;
  power: number;
  food: number;
  selectedType: BuildingType | null;
  hoveredCell: { col: number; row: number } | null;
  tick: number;
  started: boolean;
  speed: number; // 1x, 2x, 3x
  message: string;
  messageTimer: number;
}

export const CELL_SIZE = 48;
export const HUD_HEIGHT = 52;
