# Step 2: Road Lanes & Vehicles

**Goal:** Add vehicles that scroll across the road lanes at different speeds and directions, wrapping around the screen edges.

**Time:** ~15 minutes

---

## What You'll Build

Building on the grid from Step 1:
- **Vehicle objects**: Colored rectangles on road lanes (rows 7-11)
- **Lane templates**: Each lane defines vehicle width, gap, speed, and direction
- **Scrolling motion**: Vehicles move left or right at their lane's speed
- **Edge wrapping**: Vehicles reappear on the opposite side after leaving the screen

---

## Concepts

- **Object templates**: Each lane has a `width` (in cells) and `gap` that determine how many vehicles appear and how they are spaced
- **Signed speed**: `speed * direction` gives a positive (rightward) or negative (leftward) velocity
- **Edge wrapping**: When a vehicle moves fully off one side, reposition it just beyond the opposite edge

---

## Code

### 1. Update Types

**File:** `src/games/frogger/types.ts`

Add the vehicle interface and lane object templates:

```typescript
// ── Grid & layout constants ────────────────────────────────────────

export const COLS = 13;
export const ROWS = 13;

// ── Lane type identifiers ──────────────────────────────────────────

export type LaneKind = 'goal' | 'river' | 'safe' | 'road' | 'start';

export type Direction = -1 | 1;

// ── Lane descriptor ────────────────────────────────────────────────

export interface LaneObjectTemplate {
  width: number;  // in grid cells
  gap: number;    // minimum gap in grid cells before next object
}

export interface LaneDescriptor {
  kind: LaneKind;
  speed: number;
  direction: Direction;
  objects: LaneObjectTemplate[];
}

// ── Runtime objects ────────────────────────────────────────────────

export interface Frog {
  col: number;
  row: number;
}

export interface Vehicle {
  x: number;       // pixel position (left edge)
  row: number;
  width: number;   // in pixels
  speed: number;    // px/s (signed: negative = left)
  color: string;
}

// ── Master state ───────────────────────────────────────────────────

export interface FroggerState {
  frog: Frog;
  vehicles: Vehicle[];
  lanes: LaneDescriptor[];

  cellW: number;
  cellH: number;
  canvasW: number;
  canvasH: number;
}
```

---

### 2. Update Lane Data

**File:** `src/games/frogger/data/levels.ts`

Give each road lane a speed, direction, and object template. River lanes still have zero speed for now:

```typescript
import type { LaneDescriptor } from '../types';

export function buildLanes(): LaneDescriptor[] {
  return [
    // Row 0 — goal
    { kind: 'goal', speed: 0, direction: 1, objects: [] },

    // Rows 1–5 — river (no objects yet)
    { kind: 'river', speed: 0, direction: -1, objects: [] },
    { kind: 'river', speed: 0, direction: 1,  objects: [] },
    { kind: 'river', speed: 0, direction: -1, objects: [] },
    { kind: 'river', speed: 0, direction: 1,  objects: [] },
    { kind: 'river', speed: 0, direction: -1, objects: [] },

    // Row 6 — safe zone
    { kind: 'safe', speed: 0, direction: 1, objects: [] },

    // Rows 7–11 — road (vehicles!)
    { kind: 'road', speed: 60,  direction: -1, objects: [{ width: 1, gap: 4 }] },
    { kind: 'road', speed: 40,  direction: 1,  objects: [{ width: 2, gap: 3 }] },
    { kind: 'road', speed: 75,  direction: -1, objects: [{ width: 1, gap: 5 }] },
    { kind: 'road', speed: 50,  direction: 1,  objects: [{ width: 2, gap: 4 }] },
    { kind: 'road', speed: 65,  direction: -1, objects: [{ width: 1, gap: 3 }] },

    // Row 12 — start zone
    { kind: 'start', speed: 0, direction: 1, objects: [] },
  ];
}

/** Colours used for each vehicle in a lane (cycles) */
export const VEHICLE_COLORS = ['#e53935', '#fb8c00', '#fdd835', '#8e24aa', '#1e88e5'];
```

**Lane design notes:**
- `width: 1` = single-cell car, `width: 2` = truck/bus
- `gap: 4` means 4 cells of empty space between vehicles
- Alternating directions create a realistic multi-lane road
- Faster lanes have wider gaps so the player has time to react

---

### 3. Create Traffic System

**File:** `src/games/frogger/systems/TrafficSystem.ts`

Populate vehicles when the level loads, then scroll them each frame:

```typescript
import type { FroggerState, Vehicle } from '../types';
import { VEHICLE_COLORS } from '../data/levels';

export class TrafficSystem {
  /** Populate vehicles for all road lanes */
  populate(state: FroggerState): void {
    state.vehicles = [];

    for (let row = 0; row < state.lanes.length; row++) {
      const lane = state.lanes[row];
      if (lane.kind !== 'road') continue;

      for (const tmpl of lane.objects) {
        const widthPx = tmpl.width * state.cellW;
        const gapPx = (tmpl.gap + tmpl.width) * state.cellW;
        const count = Math.ceil(state.canvasW / gapPx) + 1;
        const signedSpeed = lane.speed * lane.direction;

        for (let i = 0; i < count; i++) {
          const vehicle: Vehicle = {
            x: i * gapPx,
            row,
            width: widthPx,
            speed: signedSpeed,
            color: VEHICLE_COLORS[(row + i) % VEHICLE_COLORS.length],
          };
          state.vehicles.push(vehicle);
        }
      }
    }
  }

  update(state: FroggerState, dt: number): void {
    const w = state.canvasW;

    for (const v of state.vehicles) {
      v.x += v.speed * dt;

      // Wrap around screen edges
      if (v.speed > 0 && v.x > w) {
        v.x = -v.width;
      } else if (v.speed < 0 && v.x + v.width < 0) {
        v.x = w;
      }
    }
  }
}
```

**Populate logic:**
1. Iterate lanes — skip non-road lanes
2. For each lane template, compute how many vehicles fill the screen width plus one extra (so there is no visible gap when wrapping)
3. Space them evenly by `(gap + width) * cellW`
4. Each vehicle gets a cycling color from `VEHICLE_COLORS`

**Wrap logic:**
- Moving right (`speed > 0`): when left edge passes the right side of the canvas, teleport to just off the left side
- Moving left (`speed < 0`): when right edge passes the left side, teleport to just off the right side

---

### 4. Update Game Renderer

**File:** `src/games/frogger/renderers/GameRenderer.ts`

Add vehicle drawing after the lanes and before the frog:

```typescript
import type { FroggerState } from '../types';

const ROAD_COLOR = '#555555';
const RIVER_COLOR = '#1565c0';
const GRASS_COLOR = '#388e3c';
const START_COLOR = '#2e7d32';
const GOAL_COLOR = '#1b5e20';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: FroggerState): void {
    const cw = state.cellW;
    const ch = state.cellH;

    // ── Draw lanes ──────────────────────────────────────────────
    for (let row = 0; row < state.lanes.length; row++) {
      const lane = state.lanes[row];
      const y = row * ch;

      switch (lane.kind) {
        case 'road':
          ctx.fillStyle = ROAD_COLOR;
          ctx.fillRect(0, y, state.canvasW, ch);
          ctx.setLineDash([cw * 0.4, cw * 0.4]);
          ctx.strokeStyle = '#999';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, y + ch);
          ctx.lineTo(state.canvasW, y + ch);
          ctx.stroke();
          ctx.setLineDash([]);
          break;

        case 'river':
          ctx.fillStyle = RIVER_COLOR;
          ctx.fillRect(0, y, state.canvasW, ch);
          ctx.strokeStyle = 'rgba(255,255,255,0.12)';
          ctx.lineWidth = 1;
          for (let wx = 0; wx < state.canvasW; wx += cw * 0.8) {
            ctx.beginPath();
            ctx.moveTo(wx, y + ch * 0.5);
            ctx.quadraticCurveTo(wx + cw * 0.2, y + ch * 0.3, wx + cw * 0.4, y + ch * 0.5);
            ctx.stroke();
          }
          break;

        case 'safe':
          ctx.fillStyle = GRASS_COLOR;
          ctx.fillRect(0, y, state.canvasW, ch);
          break;

        case 'start':
          ctx.fillStyle = START_COLOR;
          ctx.fillRect(0, y, state.canvasW, ch);
          break;

        case 'goal':
          ctx.fillStyle = GOAL_COLOR;
          ctx.fillRect(0, y, state.canvasW, ch);
          break;
      }
    }

    // ── Draw vehicles ───────────────────────────────────────────
    for (const v of state.vehicles) {
      const vy = v.row * ch;
      const margin = ch * 0.12;

      ctx.fillStyle = v.color;
      ctx.beginPath();
      ctx.roundRect(v.x, vy + margin, v.width, ch - margin * 2, 4);
      ctx.fill();

      // Windshield — on the leading edge of the vehicle
      ctx.fillStyle = 'rgba(200,230,255,0.5)';
      const wsW = Math.min(cw * 0.3, v.width * 0.2);
      const wsX = v.speed > 0 ? v.x + v.width - wsW - 3 : v.x + 3;
      ctx.fillRect(wsX, vy + margin + 3, wsW, ch - margin * 2 - 6);
    }

    // ── Draw frog ───────────────────────────────────────────────
    this.drawFrog(ctx, state);
  }

  private drawFrog(ctx: CanvasRenderingContext2D, state: FroggerState): void {
    const frog = state.frog;
    const cw = state.cellW;
    const ch = state.cellH;
    const fx = frog.col * cw + cw * 0.5;
    const fy = frog.row * ch + ch * 0.5;

    // Body
    const bodyR = cw * 0.35;
    ctx.fillStyle = '#66bb6a';
    ctx.beginPath();
    ctx.arc(fx, fy, bodyR, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#fff';
    const eyeR = cw * 0.1;
    const eyeOff = cw * 0.15;
    ctx.beginPath();
    ctx.arc(fx - eyeOff, fy - eyeOff, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(fx + eyeOff, fy - eyeOff, eyeR, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = '#222';
    const pupilR = cw * 0.04;
    ctx.beginPath();
    ctx.arc(fx - eyeOff, fy - eyeOff, pupilR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(fx + eyeOff, fy - eyeOff, pupilR, 0, Math.PI * 2);
    ctx.fill();
  }
}
```

**Vehicle drawing details:**
- `roundRect` with 4px radius for slightly rounded corners
- Small margin above and below so vehicles do not fill the full cell height
- Windshield rectangle on the leading edge (right side when moving right, left side when moving left)
- Cycling colors give variety without needing sprite assets

---

### 5. Update Game Engine

**File:** `src/games/frogger/FroggerEngine.ts`

Add a delta-time game loop and wire in the `TrafficSystem`:

```typescript
import type { FroggerState } from './types';
import { COLS, ROWS } from './types';
import { buildLanes } from './data/levels';
import { InputSystem } from './systems/InputSystem';
import { TrafficSystem } from './systems/TrafficSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class FroggerEngine {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private state: FroggerState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;

  private inputSystem: InputSystem;
  private trafficSystem: TrafficSystem;
  private gameRenderer: GameRenderer;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cellW = canvas.width / COLS;
    const cellH = canvas.height / ROWS;

    this.state = {
      frog: {
        col: Math.floor(COLS / 2),
        row: ROWS - 1,
      },
      vehicles: [],
      lanes: buildLanes(),
      cellW,
      cellH,
      canvasW: canvas.width,
      canvasH: canvas.height,
    };

    this.inputSystem = new InputSystem(this.state, onExit);
    this.trafficSystem = new TrafficSystem();
    this.gameRenderer = new GameRenderer();

    // Populate vehicles on the road lanes
    this.trafficSystem.populate(this.state);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.inputSystem.attach();
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
  }

  private loop = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05); // seconds, capped
    this.lastTime = now;

    this.update(dt);
    this.render();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    this.trafficSystem.update(this.state, dt);
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);
    this.gameRenderer.render(this.ctx, this.state);
  }
}
```

**Key changes from Step 1:**
- Added `lastTime` tracking and delta-time calculation
- `dt` is capped at 50ms to prevent huge jumps if the tab loses focus
- `TrafficSystem.populate()` called once in the constructor
- `TrafficSystem.update()` called every frame

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Frogger"
3. **Observe:**
   - Colored vehicles scroll across the five road lanes (rows 7-11)
   - Lanes alternate direction — some vehicles go left, some right
   - Different speeds per lane (60, 40, 75, 50, 65 px/s)
   - Vehicles wrap around when they leave the screen
   - Single-cell cars and two-cell trucks/buses
   - Frog still moves freely with arrow keys — no collision yet

---

## Challenges

**Easy:**
- Double all vehicle speeds
- Change the vehicle colors to shades of blue
- Add a third vehicle size (3 cells wide)

**Medium:**
- Make one lane have two different vehicle templates (cars and trucks mixed)
- Add headlight rectangles to the front of each vehicle
- Randomize initial vehicle positions so they are not evenly spaced

**Hard:**
- Add acceleration — vehicles speed up slightly over time
- Make vehicles cast a subtle shadow below them
- Add a "speed lines" particle effect behind fast vehicles

---

## What You Learned

- Object population from templates (width, gap, count)
- Signed velocity for bidirectional movement
- Edge wrapping for seamless infinite scrolling
- Delta-time updates (`position += speed * dt`)
- Drawing rounded rectangles with windshield details

**Next:** Collision detection — the frog should die when hit by a vehicle!
