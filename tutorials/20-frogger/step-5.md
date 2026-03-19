# Step 5: Goal & Levels

**Goal:** Add five lily pads at the top row. Land on all five to complete the level. Each new level increases speed.

**Time:** ~15 minutes

---

## What You'll Build

Building on the river system from Step 4:
- **Lily pads**: Five green circles evenly spaced on the goal row (row 0)
- **Goal landing**: Hop onto a pad to fill it, then respawn at the start for the next pad
- **Level completion**: Fill all 5 pads to clear the level
- **Speed scaling**: Each level multiplies all lane speeds by a factor
- **Level transition**: Brief "Level Complete" overlay before the next level starts

---

## Concepts

- **Goal slots**: Fixed positions on the goal row — the frog must land exactly on one
- **Level speed multiplier**: `speed * (1 + (level - 1) * 0.15)` — 15% faster per level
- **Level transition timer**: A short countdown prevents jarring instant resets

---

## Code

### 1. Update Types

**File:** `src/games/frogger/types.ts`

Add lily pads, level tracking, and the goal slot constant:

```typescript
// ── Grid & layout constants ────────────────────────────────────────

export const COLS = 13;
export const ROWS = 13;
export const GOAL_SLOTS = 5;

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
  x: number;
  row: number;
  width: number;
  speed: number;
}

export interface LilyPad {
  col: number;
  occupied: boolean;
}

// ── Master state ───────────────────────────────────────────────────

export interface FroggerState {
  frog: Frog;
  vehicles: Vehicle[];
  logs: Log[];
  lilyPads: LilyPad[];
  lanes: LaneDescriptor[];

  lives: number;
  level: number;
  goalsReached: number;
  dying: boolean;
  deathTimer: number;
  started: boolean;
  gameOver: boolean;
  paused: boolean;
  levelComplete: boolean;
  levelCompleteTimer: number;

  cellW: number;
  cellH: number;
  canvasW: number;
  canvasH: number;
}
```

---

### 2. Update Lane Data

**File:** `src/games/frogger/data/levels.ts`

Accept a `level` parameter and scale speeds:

```typescript
import type { LaneDescriptor } from '../types';

/**
 * Returns the 13-row lane layout for a given level.
 * Higher levels increase speeds.
 */
export function buildLanes(level: number): LaneDescriptor[] {
  const s = 1 + (level - 1) * 0.15; // speed multiplier

  return [
    // Row 0 — goal (lily-pad row)
    { kind: 'goal', speed: 0, direction: 1, objects: [] },

    // Rows 1–5 — river (logs)
    { kind: 'river', speed: 50 * s, direction: -1, objects: [{ width: 3, gap: 3 }] },
    { kind: 'river', speed: 35 * s, direction: 1,  objects: [{ width: 4, gap: 2 }] },
    { kind: 'river', speed: 55 * s, direction: -1, objects: [{ width: 2, gap: 3 }] },
    { kind: 'river', speed: 40 * s, direction: 1,  objects: [{ width: 3, gap: 4 }] },
    { kind: 'river', speed: 60 * s, direction: -1, objects: [{ width: 4, gap: 3 }] },

    // Row 6 — safe zone (median)
    { kind: 'safe', speed: 0, direction: 1, objects: [] },

    // Rows 7–11 — road (vehicles)
    { kind: 'road', speed: 60 * s, direction: -1, objects: [{ width: 1, gap: 4 }] },
    { kind: 'road', speed: 40 * s, direction: 1,  objects: [{ width: 2, gap: 3 }] },
    { kind: 'road', speed: 75 * s, direction: -1, objects: [{ width: 1, gap: 5 }] },
    { kind: 'road', speed: 50 * s, direction: 1,  objects: [{ width: 2, gap: 4 }] },
    { kind: 'road', speed: 65 * s, direction: -1, objects: [{ width: 1, gap: 3 }] },

    // Row 12 — start zone
    { kind: 'start', speed: 0, direction: 1, objects: [] },
  ];
}

export const VEHICLE_COLORS = ['#e53935', '#fb8c00', '#fdd835', '#8e24aa', '#1e88e5'];
```

**Speed scaling:**
- Level 1: multiplier = 1.0 (base speed)
- Level 2: multiplier = 1.15
- Level 3: multiplier = 1.30
- Each level adds 15%, so by level 5 everything moves at 1.6x speed

---

### 3. Update Collision System

**File:** `src/games/frogger/systems/CollisionSystem.ts`

Add goal-row landing logic:

```typescript
import type { FroggerState } from '../types';
import { COLS, GOAL_SLOTS } from '../types';

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

    // ── Goal row — lily pad landing ────────────────────────────
    if (lane.kind === 'goal') {
      const pad = state.lilyPads.find(p => p.col === frog.col);

      if (pad && !pad.occupied) {
        // Successfully landed on an empty pad
        pad.occupied = true;
        state.goalsReached++;

        if (state.goalsReached >= GOAL_SLOTS) {
          // All pads filled — level complete!
          state.levelComplete = true;
          state.levelCompleteTimer = 1.5;
        } else {
          // More pads to go — respawn at start
          this.respawnToStart(state);
        }
      } else {
        // Landed on occupied pad or empty goal space — die
        this.killFrog(state);
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

    this.respawnToStart(state);
  }

  private respawnToStart(state: FroggerState): void {
    state.frog.col = Math.floor(COLS / 2);
    state.frog.row = state.lanes.length - 1;
  }
}
```

**Goal landing rules:**
- Frog reaches row 0 and stands on a column that matches an unoccupied lily pad: success
- The pad is marked `occupied`, `goalsReached` increments
- If all 5 are filled: `levelComplete = true` with a 1.5-second timer
- Landing on an already-occupied pad or on a column with no pad: death (like the original game)

---

### 4. Update Game Renderer

**File:** `src/games/frogger/renderers/GameRenderer.ts`

Draw lily pads on the goal row:

```typescript
import type { FroggerState } from '../types';

const ROAD_COLOR = '#555555';
const RIVER_COLOR = '#1565c0';
const GRASS_COLOR = '#388e3c';
const START_COLOR = '#2e7d32';
const GOAL_COLOR = '#1b5e20';
const LOG_COLOR = '#795548';
const LOG_BARK = '#5d4037';
const PAD_COLOR = '#4caf50';
const PAD_OCCUPIED = '#81c784';

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

    // ── Draw lily pads ──────────────────────────────────────────
    for (const pad of state.lilyPads) {
      const px = pad.col * cw + cw * 0.5;
      const py = ch * 0.5; // goal row is row 0
      const radius = cw * 0.35;

      // Pad circle
      ctx.fillStyle = pad.occupied ? PAD_OCCUPIED : PAD_COLOR;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();

      // Leaf vein
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, py - radius * 0.6);
      ctx.lineTo(px, py + radius * 0.6);
      ctx.stroke();

      // Show frog emoji on occupied pads
      if (pad.occupied) {
        ctx.font = `${cw * 0.4}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u{1F438}', px, py);
      }
    }

    // ── Draw logs ───────────────────────────────────────────────
    for (const log of state.logs) {
      const ly = log.row * ch;
      const margin = ch * 0.1;

      ctx.fillStyle = LOG_COLOR;
      ctx.beginPath();
      ctx.roundRect(log.x, ly + margin, log.width, ch - margin * 2, ch * 0.2);
      ctx.fill();

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

**Lily pad drawing:**
- Green circle at the pad's column position on row 0
- Occupied pads use a lighter green and show a frog emoji
- A vertical line through the center acts as a leaf vein

---

### 5. Update HUD Renderer

**File:** `src/games/frogger/renderers/HUDRenderer.ts`

Add a level-complete overlay:

```typescript
import type { FroggerState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: FroggerState): void {
    const W = state.canvasW;
    const H = state.canvasH;

    // ── Top bar ─────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, 36);

    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f44336';

    let livesText = 'Lives: ';
    for (let i = 0; i < state.lives; i++) livesText += '\u2764 ';
    ctx.fillText(livesText, 8, 18);

    // Level indicator
    ctx.textAlign = 'right';
    ctx.fillStyle = '#4caf50';
    ctx.fillText(`Level ${state.level}`, W - 8, 18);

    // ── Overlays ────────────────────────────────────────────────

    if (!state.started) {
      this.drawOverlay(ctx, W, H, '\u{1F438} FROGGER', 'Press any arrow key to start', '#4caf50');
      return;
    }

    if (state.paused) {
      this.drawOverlay(ctx, W, H, 'PAUSED', 'Press [P] to resume', '#ff9800');
      return;
    }

    if (state.levelComplete) {
      this.drawOverlay(ctx, W, H, `LEVEL ${state.level} COMPLETE!`, 'Get ready...', '#4caf50');
      return;
    }

    if (state.gameOver) {
      this.drawOverlay(ctx, W, H, 'GAME OVER', 'Press Space to restart', '#f44336');
      return;
    }
  }

  private drawOverlay(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    title: string,
    subtitle: string,
    color: string,
  ): void {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, W * 0.5, H * 0.4);

    ctx.font = '16px monospace';
    ctx.fillStyle = '#ccc';
    ctx.fillText(subtitle, W * 0.5, H * 0.52);

    ctx.font = '12px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText('Press [ESC] to exit  |  [P] pause', W * 0.5, H * 0.62);
  }
}
```

---

### 6. Update Input System

**File:** `src/games/frogger/systems/InputSystem.ts`

Block movement during level-complete transition:

```typescript
import type { FroggerState } from '../types';
import { COLS, ROWS } from '../types';

export class InputSystem {
  private state: FroggerState;
  private onExit: () => void;
  private onReset: () => void;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(state: FroggerState, onExit: () => void, onReset: () => void) {
    this.state = state;
    this.onExit = onExit;
    this.onReset = onReset;
    this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
  }

  attach(): void {
    window.addEventListener('keydown', this.keyHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyHandler);
  }

  private handleKey(e: KeyboardEvent): void {
    const s = this.state;

    if (e.key === 'Escape') {
      this.onExit();
      return;
    }

    if (e.key === 'p' || e.key === 'P') {
      if (s.started && !s.gameOver) {
        s.paused = !s.paused;
      }
      return;
    }

    if (e.key === ' ' || e.key === 'Enter') {
      if (s.gameOver) {
        this.onReset();
        return;
      }
      if (!s.started) {
        s.started = true;
        return;
      }
    }

    // Block movement during pause, death, game over, or level transition
    if (s.paused || s.gameOver || s.dying || s.levelComplete) return;
    if (!s.started) s.started = true;

    let dc = 0;
    let dr = 0;

    switch (e.key) {
      case 'ArrowUp':    case 'w': case 'W': dr = -1; break;
      case 'ArrowDown':  case 's': case 'S': dr = 1;  break;
      case 'ArrowLeft':  case 'a': case 'A': dc = -1; break;
      case 'ArrowRight': case 'd': case 'D': dc = 1;  break;
      default: return;
    }

    e.preventDefault();

    const newCol = s.frog.col + dc;
    const newRow = s.frog.row + dr;

    if (newCol < 0 || newCol >= COLS) return;
    if (newRow < 0 || newRow >= ROWS) return;

    s.frog.col = newCol;
    s.frog.row = newRow;
  }
}
```

---

### 7. Update Game Engine

**File:** `src/games/frogger/FroggerEngine.ts`

Add lily pad building, level-complete countdown, and `nextLevel`:

```typescript
import type { FroggerState } from './types';
import { COLS, ROWS, GOAL_SLOTS } from './types';
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
    const lanes = buildLanes(1);

    this.state = {
      frog: {
        col: Math.floor(COLS / 2),
        row: ROWS - 1,
      },
      vehicles: [],
      logs: [],
      lilyPads: this.buildLilyPads(),
      lanes,
      lives: 3,
      level: 1,
      goalsReached: 0,
      dying: false,
      deathTimer: 0,
      started: false,
      gameOver: false,
      paused: false,
      levelComplete: false,
      levelCompleteTimer: 0,
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
    const s = this.state;

    // Level-complete countdown
    if (s.levelComplete) {
      s.levelCompleteTimer -= dt;
      if (s.levelCompleteTimer <= 0) {
        this.nextLevel();
      }
      return;
    }

    this.trafficSystem.update(s, dt);
    this.riverSystem.update(s, dt);
    this.collisionSystem.update(s, dt);
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }

  private reset(): void {
    const s = this.state;
    s.level = 1;
    s.lives = 3;
    s.goalsReached = 0;
    s.gameOver = false;
    s.dying = false;
    s.deathTimer = 0;
    s.paused = false;
    s.started = true;
    s.levelComplete = false;
    s.levelCompleteTimer = 0;
    s.lanes = buildLanes(1);
    s.lilyPads = this.buildLilyPads();
    s.frog.col = Math.floor(COLS / 2);
    s.frog.row = ROWS - 1;
    this.trafficSystem.populate(s);
    this.riverSystem.populate(s);
  }

  private nextLevel(): void {
    const s = this.state;
    s.level++;
    s.goalsReached = 0;
    s.levelComplete = false;
    s.levelCompleteTimer = 0;
    s.dying = false;
    s.deathTimer = 0;
    s.lanes = buildLanes(s.level);
    s.lilyPads = this.buildLilyPads();
    s.frog.col = Math.floor(COLS / 2);
    s.frog.row = ROWS - 1;
    this.trafficSystem.populate(s);
    this.riverSystem.populate(s);
  }

  private buildLilyPads(): FroggerState['lilyPads'] {
    const pads: FroggerState['lilyPads'] = [];
    const spacing = Math.floor(COLS / (GOAL_SLOTS + 1));
    for (let i = 1; i <= GOAL_SLOTS; i++) {
      pads.push({ col: i * spacing, occupied: false });
    }
    return pads;
  }
}
```

**Lily pad placement:**
- `spacing = floor(13 / 6) = 2`
- Pad columns: 2, 4, 6, 8, 10 — evenly distributed across the 13-column grid
- All pads start unoccupied

**Level transition flow:**
1. Last pad filled: `levelComplete = true`, `levelCompleteTimer = 1.5`
2. Update loop counts down the timer (traffic and river still move during the overlay)
3. Timer reaches zero: `nextLevel()` increments the level, rebuilds lanes with faster speeds, resets pads
4. Player starts again at the bottom

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Frogger"
3. **Observe:**
   - Five green lily pads on the top row
   - Navigate the frog across traffic and river to row 0
   - Land on a pad: it turns lighter green with a frog emoji, frog respawns at bottom
   - Land on a column with no pad: frog dies
   - Land on an already-occupied pad: frog dies
   - Fill all 5 pads: "LEVEL 1 COMPLETE!" overlay for 1.5 seconds
   - Level 2 starts — everything moves 15% faster
   - Level indicator in top-right corner updates

---

## Challenges

**Easy:**
- Change the number of goal slots from 5 to 3
- Make the level-complete overlay last 3 seconds
- Increase the speed multiplier to 25% per level

**Medium:**
- Add a bonus timer that counts down — faster completion = more points
- Animate lily pads with a gentle pulsing effect
- Show a brief "flash" effect on a pad when the frog lands on it

**Hard:**
- Randomize pad positions each level (still evenly spaced)
- Add a bonus item that occasionally appears on a random pad for double points
- Make later levels introduce new lane patterns (more lanes, different object templates)

---

## What You Learned

- Goal-slot mechanics: fixed target positions the player must reach
- Level progression with speed scaling via a multiplier
- Level-complete transition: timer-based overlay before resetting
- Building evenly-spaced objects from a count and column total
- Multi-round gameplay: land on each pad, respawn, repeat

**Next:** Score tracking, high score persistence, and final polish!
