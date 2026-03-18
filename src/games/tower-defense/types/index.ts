// ─── Enums & Literals ─────────────────────────────────────────────────────────

export type Screen = 'menu' | 'modeSelect' | 'playing' | 'paused' | 'gameover' | 'win';
export type GameMode = 'classic' | 'endless' | 'challenge';
export type CellType = 'empty' | 'path' | 'tower' | 'start' | 'end';
export type TowerType = 'archer' | 'cannon' | 'frost' | 'sniper';
export type EnemyType = 'goblin' | 'orc' | 'ghost' | 'boss';
export type ProjectileType = 'arrow' | 'cannonball' | 'frostbolt' | 'bullet';

// ─── Grid ─────────────────────────────────────────────────────────────────────

export interface GridCoord {
  col: number;
  row: number;
}

export interface Cell {
  col: number;
  row: number;
  type: CellType;
  towerId: string | null;
}

// ─── Towers ───────────────────────────────────────────────────────────────────

export interface TowerDef {
  type: TowerType;
  name: string;
  cost: number;
  damage: number;
  range: number;
  fireInterval: number; // ms between shots
  projectileType: ProjectileType;
  projectileSpeed: number;
  splashRadius: number;  // 0 = no splash
  slowFactor: number;    // 0 = no slow, 0.5 = halve speed
  color: string;
  icon: string;          // emoji icon
  upgradeCostMultiplier: number;
}

export interface PlacedTower {
  id: string;
  type: TowerType;
  col: number;
  row: number;
  level: number;         // 1–3
  totalInvested: number;
  lastFiredAt: number;
  targetId: string | null;
}

// ─── Enemies ──────────────────────────────────────────────────────────────────

export interface EnemyDef {
  type: EnemyType;
  name: string;
  baseHp: number;
  baseSpeed: number;     // cells per second
  reward: number;
  color: string;
  icon: string;          // emoji
  immuneToSlow: boolean;
  size: number;          // radius in pixels (relative to cell)
}

export interface ActiveEnemy {
  id: string;
  type: EnemyType;
  hp: number;
  maxHp: number;
  speed: number;         // current cells/sec (affected by slow)
  baseSpeed: number;
  slowUntil: number;     // timestamp when slow expires
  reward: number;
  waypointIndex: number; // which waypoint heading toward
  progress: number;      // 0–1 between waypointIndex-1 and waypointIndex
  x: number;             // pixel position (computed)
  y: number;
  dead: boolean;
  reachedEnd: boolean;
  hpBarTimer: number;    // timestamp: show hp bar for 2s after hit
}

// ─── Projectiles ──────────────────────────────────────────────────────────────

export interface Projectile {
  id: string;
  type: ProjectileType;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  x: number;
  y: number;
  speed: number;
  damage: number;
  splashRadius: number;
  slowFactor: number;
  targetId: string;
  done: boolean;
  color: string;
}

// ─── Waves ────────────────────────────────────────────────────────────────────

export interface SpawnGroup {
  enemyType: EnemyType;
  count: number;
  interval: number; // ms between each enemy spawn
  hpMultiplier?: number;
  speedMultiplier?: number;
}

export interface WaveDef {
  waveNumber: number;
  groups: SpawnGroup[];
  preBossAnnounce?: boolean;
}

// ─── Particles ────────────────────────────────────────────────────────────────

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number; // alpha reduction per frame
  done: boolean;
}

// ─── Damage Numbers ──────────────────────────────────────────────────────

export interface DamageNumber {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  age: number; // seconds alive
}

// ─── Game State ───────────────────────────────────────────────────────────────

export interface GameStateData {
  screen: Screen;
  mode: GameMode;
  lives: number;
  maxLives: number;
  gold: number;
  score: number;
  highScore: number;
  currentWave: number;
  totalWaves: number;
  waveInProgress: boolean;
  betweenWaveCountdown: number; // ms remaining before next wave auto-starts
  grid: Cell[][];
  towers: PlacedTower[];
  enemies: ActiveEnemy[];
  projectiles: Projectile[];
  particles: Particle[];
  selectedTowerType: TowerType | null;
  selectedPlacedTowerId: string | null;
  hoveredCell: GridCoord | null;
  // wave spawner internal state
  spawnQueue: SpawnQueueItem[];
  lastSpawnTime: number;
  pausedAt: number; // timestamp when paused (0 = not paused)
  bossAnnounceUntil: number; // timestamp until boss warning is shown
  // floating damage numbers
  damageNumbers: DamageNumber[];
  // placement fail flash
  placementFail: { col: number; row: number; timer: number } | null;
  // sell confirmation
  pendingSellTowerId: string | null;
}

export interface SpawnQueueItem {
  enemyType: EnemyType;
  scheduledAt: number; // absolute timestamp to spawn
  hpMultiplier: number;
  speedMultiplier: number;
}

// ─── Canvas Config ────────────────────────────────────────────────────────────

export interface CanvasConfig {
  cols: number;
  rows: number;
  hudHeight: number;     // px reserved at top for HUD
  panelHeight: number;   // px reserved at bottom for tower panel
}
