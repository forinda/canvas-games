# Step 4: River Lanes & Logs

**Goal:** Add scrolling logs to the river lanes. The frog rides logs automatically and drowns if it lands in water without one.

**Time:** ~15 minutes

---

## What You'll Build

Building on the collision system from Step 3:
- **Log objects**: Brown rounded rectangles scrolling across river lanes (rows 1-5)
- **Riding mechanic**: Frog on a log drifts with it each frame
- **Drowning**: Landing on a river lane without a log = death
- **Edge death**: Frog carried off-screen by a log = death

---

## Concepts

- **Moving platforms**: The frog's column shifts by the log's velocity each frame while standing on one
- **Point-in-rect test**: Check if the frog's center pixel falls within a log's bounds
- **Implicit drowning**: If the frog is on a river row and no log contains it, the river system sets `dying = true`

---

## Code

### 1. Update Types

**File:** `src/games/frogger/types.ts`

Add the `Log` interface and `logs` array to state:

```typescript
// ── Grid & layout constants ────────────────────────────────────────

export const COLS = 13;
export const ROWS = 13;

// ── Lane type identifiers ──────────────────────────────────────────

export type LaneKind = 'goal' | 'river' | 'safe' | 'road' | 'start';

export type Direction = -1 | 1;

// ── Lane descriptor ────────────────────────────────────────────────

export interface LaneObjectTemplate {
  width: number;
  gap: number;
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
  x: number;
  row: number;
  width: number;
  speed: number;
  color: string;
}

export interface Log {
  x: number;       // pixel position (left edge)
  row: number;
  width: number;   // in pixels
  speed: number;    // px/s (signed)
}

// ── Master state ───────────────────────────────────────────────────

export interface FroggerState {
  frog: Frog;
  vehicles: Vehicle[];
  logs: Log[];
  lanes: LaneDescriptor[];

  lives: number;
  dying: boolean;
  deathTimer: number;
  started: boolean;
  gameOver: boolean;
  paused: boolean;

  cellW: number;
  cellH: number;
  canvasW: number;
  canvasH: number;
}
```

---

### 2. Update Lane Data

**File:** `src/games/frogger/data/levels.ts`

Give river lanes speed, direction, and log templates:

```typescript
import type { LaneDescriptor } from '../types';

export function buildLanes(): LaneDescriptor[] {
  return [
    // Row 0 — goal
    { kind: 'goal', speed: 0, direction: 1, objects: [] },

    // Rows 1–5 — river (logs!)
    { kind: 'river', speed: 50,  direction: -1, objects: [{ width: 3, gap: 3 }] },
    { kind: 'river', speed: 35,  direction: 1,  objects: [{ width: 4, gap: 2 }] },
    { kind: 'river', speed: 55,  direction: -1, objects: [{ width: 2, gap: 3 }] },
    { kind: 'river', speed: 40,  direction: 1,  objects: [{ width: 3, gap: 4 }] },
    { kind: 'river', speed: 60,  direction: -1, objects: [{ width: 4, gap: 3 }] },

    // Row 6 — safe zone
    { kind: 'safe', speed: 0, direction: 1, objects: [] },

    // Rows 7–11 — road
    { kind: 'road', speed: 60,  direction: -1, objects: [{ width: 1, gap: 4 }] },
    { kind: 'road', speed: 40,  direction: 1,  objects: [{ width: 2, gap: 3 }] },
    { kind: 'road', speed: 75,  direction: -1, objects: [{ width: 1, gap: 5 }] },
    { kind: 'road', speed: 50,  direction: 1,  objects: [{ width: 2, gap: 4 }] },
    { kind: 'road', speed: 65,  direction: -1, objects: [{ width: 1, gap: 3 }] },

    // Row 12 — start zone
    { kind: 'start', speed: 0, direction: 1, objects: [] },
  ];
}

export const VEHICLE_COLORS = ['#e53935', '#fb8c00', '#fdd835', '#8e24aa', '#1e88e5'];
```

**Log design notes:**
- Wider logs (3-4 cells) are easier to land on
- Shorter logs (2 cells) with bigger gaps are harder
- Alternating directions create variety and challenge

---

### 3. Create River System

**File:** `src/games/frogger/systems/RiverSystem.ts`

Populate logs, move them each frame, and handle the riding mechanic:

```typescript
import type { FroggerState, Log } from '../types';

export class RiverSystem {
  /** Populate logs for all river lanes */
  populate(state: FroggerState): void {
    state.logs = [];

    for (let row = 0; row < state.lanes.length; row++) {
      const lane = state.lanes[row];
      if (lane.kind !== 'river') continue;

      for (const tmpl of lane.objects) {
        const widthPx = tmpl.width * state.cellW;
        const gapPx = (tmpl.gap + tmpl.width) * state.cellW;
        const count = Math.ceil(state.canvasW / gapPx) + 1;
        const signedSpeed = lane.speed * lane.direction;

        for (let i = 0; i < count; i++) {
          const log: Log = {
            x: i * gapPx,
            row,
            width: widthPx,
            speed: signedSpeed,
          };
          state.logs.push(log);
        }
      }
    }
  }

  update(state: FroggerState, dt: number): void {
    const w = state.canvasW;

    // Move all logs
    for (const log of state.logs) {
      log.x += log.speed * dt;

      // Wrap around
      if (log.speed > 0 && log.x > w) {
        log.x = -log.width;
      } else if (log.speed < 0 && log.x + log.width < 0) {
        log.x = w;
      }
    }

    // If frog is on a river row, check if it is on a log
    const frog = state.frog;
    const lane = state.lanes[frog.row];
    if (!lane || lane.kind !== 'river') return;

    // Find the log under the frog
    const frogCenterPx = frog.col * state.cellW + state.cellW * 0.5;
    let onLog = false;

    for (const log of state.logs) {
      if (log.row !== frog.row) continue;

      if (frogCenterPx >= log.x && frogCenterPx <= log.x + log.width) {
        // Ride the log — shift frog's column with the log
        const shift = log.speed * dt;
        const newCenter = frogCenterPx + shift;
        const newCol = Math.round((newCenter - state.cellW * 0.5) / state.cellW);
        frog.col = newCol;
        onLog = true;
        break;
      }
    }

    // Not on a log in a river lane = drown
    if (!onLog) {
      state.dying = true;
    }
  }
}
```

**Riding mechanic explained:**
1. Convert frog's grid column to a pixel center: `col * cellW + cellW/2`
2. Check each log in the frog's row — does the center fall within `[log.x, log.x + log.width]`?
3. If yes: shift the center by `log.speed * dt`, then convert back to a column with `Math.round`
4. If no log contains the frog: set `dying = true`, which the collision system picks up

**Drowning:**
- The river system does not manage the death timer — it only sets the flag
- The collision system (from Step 3) handles the timer countdown and respawn

---

### 4. Update Collision System

**File:** `src/games/frogger/systems/CollisionSystem.ts`

Add edge-of-screen death for frogs riding logs off the canvas:

```typescript
import type { FroggerState } from '../types';
import { COLS } from '../types';

const DEATH_DURATION = 0.6;

export class CollisionSystem {
  update(state: FroggerState, dt: number): void {
    const frog = state.frog;

    // Handle death timer countdown
    if (state.dying) {
      state.deathTimer -= dt;
      if (state.deathTimer <= 0) {
        this.respawn(state);
      }
      return;
    }

    const lane = state.lanes[frog.row];
    if (!lane) return;

    // ── Vehicle collision ──────────────────────────────────────
    if (lane.kind === 'road') {
      const frogLeft = frog.col * state.cellW + 2;
      const frogRight = (frog.col + 1) * state.cellW - 2;

      for (const v of state.vehicles) {
        if (v.row !== frog.row) continue;
        if (frogRight > v.x && frogLeft < v.x + v.width) {
          this.killFrog(state);
          return;
        }
      }
    }

    // ── River: drowning flag set by RiverSystem ────────────────
    if (state.dying) {
      this.killFrog(state);
      return;
    }

    // ── Frog drifted off-screen on a log ───────────────────────
    if (lane.kind === 'river') {
      if (frog.col < 0 || frog.col >= COLS) {
        this.killFrog(state);
        return;
      }
    }
  }

  private killFrog(state: FroggerState): void {
    state.dying = true;
    state.deathTimer = DEATH_DURATION;
  }

  private respawn(state: FroggerState): void {
    state.lives--;
    state.dying = false;
    state.deathTimer = 0;

    if (state.lives <= 0) {
      state.gameOver = true;
      return;
    }

    state.frog.col = Math.floor(COLS / 2);
    state.frog.row = state.lanes.length - 1;
  }
}
```

**Edge death:** If a log carries the frog to `col < 0` or `col >= COLS`, the frog dies. This prevents the frog from drifting invisibly off-screen.

---

### 5. Update Game Renderer

**File:** `src/games/frogger/renderers/GameRenderer.ts`

Add log drawing between the lane backgrounds and the frog:

```typescript
import type { FroggerState } from '../types';

const ROAD_COLOR = '#555555';
const RIVER_COLOR = '#1565c0';
const GRASS_COLOR = '#388e3c';
const START_COLOR = '#2e7d32';
const GOAL_COLOR = '#1b5e20';
const LOG_COLOR = '#795548';
const LOG_BARK = '#5d4037';

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

    // ── Draw logs ───────────────────────────────────────────────
    for (const log of state.logs) {
      const ly = log.row * ch;
      const margin = ch * 0.1;

      // Log body — brown rounded rectangle
      ctx.fillStyle = LOG_COLOR;
      ctx.beginPath();
      ctx.roundRect(log.x, ly + margin, log.width, ch - margin * 2, ch * 0.2);
      ctx.fill();

      // Bark texture — vertical lines along the log
      ctx.strokeStyle = LOG_BARK;
      ctx.lineWidth = 1;
      const step = cw * 0.6;
      for (let bx = log.x + step; bx < log.x + log.width - 4; bx += step) {
        ctx.beginPath();
        ctx.moveTo(bx, ly + margin + 3);
        ctx.lineTo(bx, ly + ch - margin - 3);
        ctx.stroke();
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

    if (state.dying) {
      const t = 1 - (state.deathTimer / 0.6);
      ctx.fillStyle = `rgba(255, 0, 0, ${1 - t})`;
      ctx.beginPath();
      ctx.arc(fx, fy, cw * 0.3 + t * cw * 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = `${cw * 0.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 1 - t;
      ctx.fillText('\u{1F480}', fx, fy);
      ctx.globalAlpha = 1;
      return;
    }

    const bodyR = cw * 0.35;
    ctx.fillStyle = '#66bb6a';
    ctx.beginPath();
    ctx.arc(fx, fy, bodyR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    const eyeR = cw * 0.1;
    const eyeOff = cw * 0.15;
    ctx.beginPath();
    ctx.arc(fx - eyeOff, fy - eyeOff, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(fx + eyeOff, fy - eyeOff, eyeR, 0, Math.PI * 2);
    ctx.fill();

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

**Log drawing details:**
- Brown `roundRect` for the log body with 10% vertical margin
- Dark brown vertical strokes for bark texture, spaced every 0.6 cells
- Logs are drawn after lane backgrounds but before vehicles and frog, so the frog appears on top

---

### 6. Update Game Engine

**File:** `src/games/frogger/FroggerEngine.ts`

Wire in the river system:

```typescript
import type { FroggerState } from './types';
import { COLS, ROWS } from './types';
import { buildLanes } from './data/levels';
import { InputSystem } from './systems/InputSystem';
import { TrafficSystem } from './systems/TrafficSystem';
import { RiverSystem } from './systems/RiverSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class FroggerEngine {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private state: FroggerState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;

  private inputSystem: InputSystem;
  private trafficSystem: TrafficSystem;
  private riverSystem: RiverSystem;
  private collisionSystem: CollisionSystem;
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;

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
      logs: [],
      lanes: buildLanes(),
      lives: 3,
      dying: false,
      deathTimer: 0,
      started: false,
      gameOver: false,
      paused: false,
      cellW,
      cellH,
      canvasW: canvas.width,
      canvasH: canvas.height,
    };

    this.inputSystem = new InputSystem(this.state, onExit, () => this.reset());
    this.trafficSystem = new TrafficSystem();
    this.riverSystem = new RiverSystem();
    this.collisionSystem = new CollisionSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    this.trafficSystem.populate(this.state);
    this.riverSystem.populate(this.state);
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
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (this.state.started && !this.state.paused && !this.state.gameOver) {
      this.update(dt);
    }

    this.render();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    this.trafficSystem.update(this.state, dt);
    this.riverSystem.update(this.state, dt);
    this.collisionSystem.update(this.state, dt);
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }

  private reset(): void {
    const s = this.state;
    s.lives = 3;
    s.gameOver = false;
    s.dying = false;
    s.deathTimer = 0;
    s.paused = false;
    s.started = true;
    s.frog.col = Math.floor(COLS / 2);
    s.frog.row = ROWS - 1;
    this.trafficSystem.populate(s);
    this.riverSystem.populate(s);
  }
}
```

**System update order matters:**
1. `TrafficSystem` — move vehicles
2. `RiverSystem` — move logs, ride frog, detect drowning
3. `CollisionSystem` — check vehicle hits, handle death timer, respawn

The river system must run before collision so the `dying` flag is set before the collision system processes it.

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Frogger"
3. **Observe:**
   - Brown logs scroll across the five river lanes (rows 1-5)
   - Logs alternate direction per lane
   - Move frog onto a log — it drifts with the log automatically
   - Jump into the river without landing on a log — frog drowns (death animation)
   - Ride a log until it carries the frog off-screen — frog dies
   - Bark texture lines visible on each log
   - All previous features still work: vehicle collision, lives, pause, restart

---

## Challenges

**Easy:**
- Make all logs 4 cells wide (easier to land on)
- Change the log color to a lighter brown
- Double the river lane speeds

**Medium:**
- Add turtle platforms that periodically submerge (disappear for 2 seconds)
- Make logs have slight random speed variation within each lane
- Add a splash particle effect when the frog drowns

**Hard:**
- Add crocodile logs that occasionally snap (killing the frog)
- Implement current visualization — water particles flowing in the lane direction
- Make the frog visually stand on top of the log (slight Y offset)

---

## What You Learned

- Moving platform mechanic: shifting the player with the platform each frame
- Point-in-rect collision for log detection
- Implicit state: "not on any log in a river lane" = death
- System coordination: river system sets a flag, collision system processes it
- Drawing textured objects (bark lines on logs)

**Next:** Lily pads at the top and level completion!
