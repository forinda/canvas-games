# Step 1: Project Setup & Track Rendering

**Goal:** Draw a race track from a defined waypoint path with grass, road surface, boundaries, and a start/finish line.

**Time:** ~15 minutes

---

## What You'll Build

- **Type definitions** for cars, tracks, and full game state
- **Track data** defining waypoints for a closed-loop circuit
- **Track renderer** that draws grass, road surface, center dashes, white edge lines, and a checkered start line
- **Engine skeleton** with a canvas, camera, and render loop
- **Platform adapter and entry point** to plug the game in

---

## Concepts

- **Waypoint-Based Tracks**: Instead of drawing a track pixel by pixel, we define it as a list of (x, y) waypoints. The renderer connects them with thick strokes to form the road surface. This makes tracks easy to edit and extend.
- **Offset Paths for Boundaries**: Road edges are computed by offsetting each waypoint along its averaged normal vector. This produces inner and outer boundary lines that follow the curves naturally.
- **Camera System**: The canvas viewport is smaller than the track, so we translate the drawing context by `(-cameraX + W/2, -cameraY + H/2)` to center the camera on a world position.
- **Closed-Path Rendering**: Using `ctx.closePath()` before `ctx.stroke()` connects the last waypoint back to the first, forming a loop.

---

## Code

### 1. Create Types

**File:** `src/games/racing/types.ts`

All types and constants for the entire game, defined up front so later steps never need to modify this file.

```typescript
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
```

**What's happening:**
- `Car` tracks position, angle, speed, lap progress, checkpoint state, and a trail of skid marks. We define it all now even though most fields are used in later steps.
- `TrackDefinition` holds the waypoint array, road width, and starting angle. Tracks are simple data -- the renderer does all the visual work.
- `RacingState` is the single source of truth: player car, AI cars, track, phase, timers, camera position, and sorted race positions.
- Physics constants (`MAX_SPEED`, `ACCELERATION`, etc.) are tuned to feel good and are easy to tweak later.

---

### 2. Create Track Data

**File:** `src/games/racing/data/tracks.ts`

A hand-crafted circuit with curves and straights.

```typescript
import type { TrackDefinition } from '../types';

/**
 * Default track: an oval-ish loop with curves.
 * Waypoints form a closed loop; the last connects back to the first.
 */
export const defaultTrack: TrackDefinition = {
  name: 'Grand Circuit',
  roadWidth: 100,
  startAngle: 0,
  waypoints: [
    // Bottom straight (start/finish)
    { x: 400, y: 600 },
    { x: 700, y: 600 },
    { x: 1000, y: 600 },
    // Bottom-right curve
    { x: 1200, y: 550 },
    { x: 1350, y: 420 },
    // Right straight up
    { x: 1380, y: 250 },
    // Top-right curve
    { x: 1300, y: 100 },
    { x: 1150, y: 30 },
    // Top straight
    { x: 900, y: 0 },
    { x: 650, y: -20 },
    { x: 400, y: 0 },
    // Top-left curve
    { x: 250, y: 60 },
    { x: 130, y: 180 },
    // Left straight down
    { x: 100, y: 350 },
    // Bottom-left curve
    { x: 140, y: 500 },
    { x: 250, y: 590 },
  ],
};
```

**What's happening:**
- The 16 waypoints trace a closed loop roughly 1400px wide and 620px tall.
- `roadWidth: 100` means the road extends 50px on each side of the center line.
- The first waypoint is the start/finish position. Cars begin here and laps are counted when they return to it.
- Curves are defined by placing waypoints closer together with changing direction; straights use widely spaced points.

---

### 3. Create the Track Renderer

**File:** `src/games/racing/renderers/TrackRenderer.ts`

Draws the grass background, road surface, center dashes, edge boundaries, checkpoints, and the start/finish line.

```typescript
import type { RacingState, TrackWaypoint } from '../types';

export class TrackRenderer {
  render(ctx: CanvasRenderingContext2D, state: RacingState): void {
    const { track, cameraX, cameraY, canvasW, canvasH } = state;
    const wp = track.waypoints;

    ctx.save();
    ctx.translate(-cameraX + canvasW / 2, -cameraY + canvasH / 2);

    // Grass background (large area)
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(
      cameraX - canvasW,
      cameraY - canvasH,
      canvasW * 3,
      canvasH * 3,
    );

    // Grass texture dots
    ctx.fillStyle = '#357a2e';
    const grassSeed = 42;

    for (let i = 0; i < 200; i++) {
      const gx = ((grassSeed * (i + 1) * 7) % 3000) - 500;
      const gy = ((grassSeed * (i + 1) * 13) % 2000) - 500;

      ctx.fillRect(gx, gy, 3, 3);
    }

    // Road surface
    ctx.strokeStyle = '#555';
    ctx.lineWidth = track.roadWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(wp[0].x, wp[0].y);

    for (let i = 1; i < wp.length; i++) {
      ctx.lineTo(wp[i].x, wp[i].y);
    }

    ctx.closePath();
    ctx.stroke();

    // Road center dashes
    ctx.strokeStyle = '#777';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 20]);
    ctx.beginPath();
    ctx.moveTo(wp[0].x, wp[0].y);

    for (let i = 1; i < wp.length; i++) {
      ctx.lineTo(wp[i].x, wp[i].y);
    }

    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Road boundaries (white edges)
    this.drawBoundary(ctx, wp, track.roadWidth / 2, '#fff', 2);
    this.drawBoundary(ctx, wp, -track.roadWidth / 2, '#fff', 2);

    // Start/finish line
    this.drawStartLine(ctx, wp[0], wp[1], track.roadWidth);

    // Checkpoint markers (subtle)
    for (let i = 0; i < wp.length; i++) {
      if (i === 0) continue; // skip start line

      ctx.fillStyle = 'rgba(255,255,0,0.15)';
      ctx.beginPath();
      ctx.arc(wp[i].x, wp[i].y, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawBoundary(
    ctx: CanvasRenderingContext2D,
    wp: TrackWaypoint[],
    offset: number,
    color: string,
    width: number,
  ): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const pts = this.offsetPath(wp, offset);

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);

    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }

    ctx.closePath();
    ctx.stroke();
  }

  private offsetPath(wp: TrackWaypoint[], offset: number): TrackWaypoint[] {
    const result: TrackWaypoint[] = [];

    for (let i = 0; i < wp.length; i++) {
      const prev = wp[(i - 1 + wp.length) % wp.length];
      const next = wp[(i + 1) % wp.length];
      // Average normal
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;

      result.push({ x: wp[i].x + nx * offset, y: wp[i].y + ny * offset });
    }

    return result;
  }

  private drawStartLine(
    ctx: CanvasRenderingContext2D,
    start: TrackWaypoint,
    next: TrackWaypoint,
    roadWidth: number,
  ): void {
    const dx = next.x - start.x;
    const dy = next.y - start.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const half = roadWidth / 2;

    // Checkered pattern
    const segments = 8;

    for (let i = 0; i < segments; i++) {
      const t = (i / segments) * 2 - 1; // -1 to 1
      const t2 = ((i + 1) / segments) * 2 - 1;
      const x1 = start.x + nx * half * t;
      const y1 = start.y + ny * half * t;
      const x2 = start.x + nx * half * t2;
      const y2 = start.y + ny * half * t2;

      ctx.strokeStyle = i % 2 === 0 ? '#fff' : '#222';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
}
```

**What's happening:**
- Everything is drawn in world-space after `ctx.translate(-cameraX + canvasW/2, -cameraY + canvasH/2)`. This shifts the world so the camera target ends up at the center of the viewport.
- The grass fills a 3x-canvas area around the camera so you never see the edge when scrolling.
- The road is drawn as a single thick stroke (`lineWidth = roadWidth`) along the waypoint path. `lineCap: 'round'` and `lineJoin: 'round'` smooth the corners.
- `offsetPath()` computes boundary lines by averaging the normal vectors from neighboring waypoints and pushing each point outward by `+/- roadWidth/2`.
- The start line uses 8 alternating black/white segments to create a checkered flag effect perpendicular to the track direction.

---

### 4. Create the Engine

**File:** `src/games/racing/RacingEngine.ts`

For this step, the engine only creates a player car, positions the camera, and renders the track.

```typescript
import type { RacingState, Car } from './types';
import {
  TOTAL_LAPS,
  COUNTDOWN_SECONDS,
  PLAYER_COLOR,
} from './types';
import { defaultTrack } from './data/tracks';
import { TrackRenderer } from './renderers/TrackRenderer';

export class RacingEngine {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private state: RacingState;
  private running = false;
  private rafId = 0;

  // Renderers
  private trackRenderer: TrackRenderer;

  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.createInitialState();

    // Renderers
    this.trackRenderer = new TrackRenderer();

    // Resize
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasW = canvas.width;
      this.state.canvasH = canvas.height;
    };

    window.addEventListener('resize', this.resizeHandler);
  }

  start(): void {
    this.running = true;
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;

    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);
    this.trackRenderer.render(ctx, this.state);
  }

  private createInitialState(): RacingState {
    const track = defaultTrack;
    const startWP = track.waypoints[0];
    const nextWP = track.waypoints[1];
    const startAngle = Math.atan2(nextWP.y - startWP.y, nextWP.x - startWP.x);

    const player: Car = {
      x: startWP.x,
      y: startWP.y,
      angle: startAngle,
      speed: 0,
      acceleration: 0,
      isPlayer: true,
      color: PLAYER_COLOR,
      name: 'You',
      waypointIndex: 1,
      laps: 0,
      lastCheckpoint: 0,
      finished: false,
      finishTime: 0,
      skidMarks: [],
    };

    return {
      player,
      aiCars: [],
      track,
      phase: 'countdown',
      countdownTimer: COUNTDOWN_SECONDS,
      raceTime: 0,
      totalLaps: TOTAL_LAPS,
      canvasW: this.canvas.width,
      canvasH: this.canvas.height,
      cameraX: startWP.x,
      cameraY: startWP.y,
      paused: false,
      positions: [player],
    };
  }
}
```

**What's happening:**
- The engine creates the initial state with a single player car positioned at the first waypoint. No AI cars yet -- those come in Step 6.
- The camera starts centered on the starting position so you see the track immediately.
- The render loop clears the canvas and draws the track every frame. No update logic yet -- the car cannot move until we add controls in Step 2.
- `createInitialState()` computes the starting angle by looking from waypoint 0 toward waypoint 1, so the car faces along the track.

---

### 5. Create the Platform Adapter

**File:** `src/games/racing/adapters/PlatformAdapter.ts`

```typescript
import { RacingEngine } from '../RacingEngine';

export class PlatformAdapter {
  private engine: RacingEngine;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new RacingEngine(canvas);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

---

### 6. Create the Entry Point

**File:** `src/games/racing/index.ts`

```typescript
import { PlatformAdapter } from './adapters/PlatformAdapter';

export function createRacing(canvas: HTMLCanvasElement): { destroy: () => void } {
  const adapter = new PlatformAdapter(canvas);
  adapter.start();
  return { destroy: () => adapter.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Racing game in your browser
3. **Observe:**
   - A **green grass background** filling the screen
   - A **grey road surface** forming a closed loop circuit
   - **Dashed center line** running along the middle of the road
   - **White edge boundaries** on both sides of the road
   - A **checkered start/finish line** at the first waypoint
   - **Yellow checkpoint dots** at each waypoint along the track
   - **Resize the window** and the viewport adjusts seamlessly

---

## Challenges

**Easy:**
- Change the grass color to a different shade and add more texture dots.
- Increase `roadWidth` to 140 and observe how the track changes.

**Medium:**
- Add a second track definition with a different layout (e.g., a figure-8) and switch between them.

**Hard:**
- Replace the flat road color with a gradient that darkens toward the edges, simulating a worn racing surface.

---

## What You Learned

- Defining a waypoint-based track as simple data that the renderer interprets
- Drawing thick stroked paths to create a road surface with rounded joins
- Computing offset paths using averaged normal vectors for road boundaries
- Setting up a camera translation system for world-space rendering
- Building a render loop skeleton that will grow into the full game engine

**Next:** Car Rendering & Controls -- draw the player car and make it respond to keyboard input!
