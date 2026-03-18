import type {
  GameStateData,
  GameMode,
  Cell,
  CellType,
} from './types';
import { PATH_WAYPOINTS, GRID_COLS, GRID_ROWS } from './systems/PathSystem';
import { EconomySystem } from './systems/EconomySystem';

// ─── Mode configs ─────────────────────────────────────────────────────────────

const MODE_CONFIG: Record<GameMode, { lives: number; gold: number; totalWaves: number }> = {
  classic: { lives: 20, gold: 200, totalWaves: 10 },
  endless: { lives: 15, gold: 150, totalWaves: Infinity },
  challenge: { lives: 10, gold: 150, totalWaves: 10 },
};

// ─── Grid init ────────────────────────────────────────────────────────────────

function buildGrid(): Cell[][] {
  const grid: Cell[][] = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    grid[row] = [];
    for (let col = 0; col < GRID_COLS; col++) {
      grid[row][col] = { col, row, type: 'empty', towerId: null };
    }
  }

  // Mark path cells
  for (let i = 0; i < PATH_WAYPOINTS.length; i++) {
    const wp = PATH_WAYPOINTS[i];
    let cellType: CellType = 'path';
    if (i === 0) cellType = 'start';
    else if (i === PATH_WAYPOINTS.length - 1) cellType = 'end';
    grid[wp.row][wp.col].type = cellType;
  }

  // Mark cells between waypoints as path
  for (let i = 0; i < PATH_WAYPOINTS.length - 1; i++) {
    const a = PATH_WAYPOINTS[i];
    const b = PATH_WAYPOINTS[i + 1];
    const dc = Math.sign(b.col - a.col);
    const dr = Math.sign(b.row - a.row);
    let c = a.col + dc;
    let r = a.row + dr;
    while (c !== b.col || r !== b.row) {
      const t = grid[r]?.[c];
      if (t && t.type === 'empty') t.type = 'path';
      c += dc;
      r += dr;
    }
  }

  return grid;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createInitialState(mode: GameMode): GameStateData {
  const cfg = MODE_CONFIG[mode];
  return {
    screen: 'playing',
    mode,
    lives: cfg.lives,
    maxLives: cfg.lives,
    gold: cfg.gold,
    score: 0,
    highScore: EconomySystem.loadHighScore(),
    currentWave: 0,
    totalWaves: cfg.totalWaves,
    waveInProgress: false,
    betweenWaveCountdown: 0,
    grid: buildGrid(),
    towers: [],
    enemies: [],
    projectiles: [],
    particles: [],
    selectedTowerType: null,
    selectedPlacedTowerId: null,
    hoveredCell: null,
    spawnQueue: [],
    lastSpawnTime: 0,
    pausedAt: 0,
    bossAnnounceUntil: 0,
    damageNumbers: [],
    placementFail: null,
    pendingSellTowerId: null,
  };
}

export function createMenuState(): GameStateData {
  return {
    screen: 'menu',
    mode: 'classic',
    lives: 20,
    maxLives: 20,
    gold: 200,
    score: 0,
    highScore: EconomySystem.loadHighScore(),
    currentWave: 0,
    totalWaves: 10,
    waveInProgress: false,
    betweenWaveCountdown: 0,
    grid: buildGrid(),
    towers: [],
    enemies: [],
    projectiles: [],
    particles: [],
    selectedTowerType: null,
    selectedPlacedTowerId: null,
    hoveredCell: null,
    spawnQueue: [],
    lastSpawnTime: 0,
    pausedAt: 0,
    bossAnnounceUntil: 0,
    damageNumbers: [],
    placementFail: null,
    pendingSellTowerId: null,
  };
}
