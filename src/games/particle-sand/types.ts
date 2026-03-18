export type ParticleType = 'sand' | 'water' | 'fire' | 'stone' | 'steam';

export interface Particle {
  type: ParticleType;
  /** Lifetime counter — used for fire/steam fading */
  life: number;
  /** Whether this particle has already been updated this frame */
  updated: boolean;
}

export interface SandState {
  grid: (Particle | null)[];
  gridW: number;
  gridH: number;
  cellSize: number;
  selectedType: ParticleType;
  particleCount: number;
  paused: boolean;
  mouseDown: boolean;
  mouseX: number;
  mouseY: number;
  brushSize: number;
}

export const GRID_W = 200;
export const GRID_H = 150;
export const CELL_SIZE = 4;

export const PARTICLE_TYPES: ParticleType[] = ['sand', 'water', 'fire', 'stone', 'steam'];

export const PARTICLE_COLORS: Record<ParticleType, string[]> = {
  sand:  ['#e6c35c', '#d4a843', '#c9973a', '#dbb74e'],
  water: ['#4a90d9', '#3b7dd8', '#5a9fe0', '#2e6bbf'],
  fire:  ['#ff4500', '#ff6a00', '#ff8c00', '#ffae00'],
  stone: ['#808080', '#909090', '#707070', '#888888'],
  steam: ['#c8d8e8', '#b0c4de', '#d0dce8', '#a8bcd0'],
};

export const PARTICLE_LABELS: Record<ParticleType, string> = {
  sand: 'Sand',
  water: 'Water',
  fire: 'Fire',
  stone: 'Stone',
  steam: 'Steam',
};
