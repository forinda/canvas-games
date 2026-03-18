// ── Racing game types and constants ──

export interface Car {
  x: number;
  y: number;
  angle: number;       // radians
  speed: number;       // px/s
  acceleration: number;
  isPlayer: boolean;
  color: string;
  name: string;
  /** Current waypoint index the car is heading toward */
  waypointIndex: number;
  /** Laps completed */
  laps: number;
  /** Last checkpoint index crossed */
  lastCheckpoint: number;
  /** Has finished the race */
  finished: boolean;
  /** Finish time in seconds */
  finishTime: number;
  /** Skid mark trail */
  skidMarks: { x: number; y: number; alpha: number }[];
}

export interface TrackWaypoint {
  x: number;
  y: number;
}

export interface TrackSegment {
  from: TrackWaypoint;
  to: TrackWaypoint;
}

export interface TrackDefinition {
  name: string;
  waypoints: TrackWaypoint[];
  roadWidth: number;
  startAngle: number;
}

export type GamePhase = 'countdown' | 'racing' | 'finished';

export interface RacingState {
  player: Car;
  aiCars: Car[];
  track: TrackDefinition;
  phase: GamePhase;
  countdownTimer: number;  // seconds remaining
  raceTime: number;        // seconds elapsed
  totalLaps: number;
  canvasW: number;
  canvasH: number;
  cameraX: number;
  cameraY: number;
  paused: boolean;
  positions: Car[];        // all cars sorted by race position
}

// ── Constants ──

export const TOTAL_LAPS = 3;
export const COUNTDOWN_SECONDS = 3;

// Physics
export const MAX_SPEED = 320;
export const ACCELERATION = 200;
export const BRAKE_FORCE = 300;
export const FRICTION = 60;
export const STEER_SPEED = 2.8;          // rad/s at low speed
export const MIN_STEER_SPEED_FACTOR = 0.3; // steering reduced at high speed
export const OFF_TRACK_FRICTION = 200;
export const OFF_TRACK_MAX_SPEED = 120;
export const DRIFT_FACTOR = 0.92;

// AI
export const AI_SPEED_FACTOR_MIN = 0.78;
export const AI_SPEED_FACTOR_MAX = 0.92;
export const AI_STEER_SMOOTHING = 3.0;
export const AI_WAYPOINT_RADIUS = 60;
export const AI_VARIATION = 30; // px random offset on waypoints

// Rendering
export const CAR_LENGTH = 30;
export const CAR_WIDTH = 16;
export const SKID_MARK_MAX = 200;

export const AI_COLORS = ['#2196f3', '#ff9800', '#9c27b0'];
export const AI_NAMES = ['Blue', 'Orange', 'Purple'];
export const PLAYER_COLOR = '#f44336';
