# Step 6: Score, Lives & Polish

**Goal:** Add score per crossing, persistent high score, a full HUD, level display, and start/game-over overlays for a complete arcade experience.

**Time:** ~15 minutes

---

## What You'll Build

Finishing the game from Step 5:
- **Score system**: Points for each lily pad landing, scaled by level
- **High score**: Persisted to `localStorage` across sessions
- **Full HUD**: Lives, score, high score, and level displayed in a top bar
- **Overlays**: Start screen, pause, level complete, and game over
- **Hop animation**: Smooth visual sliding between cells
- **Window resize**: Canvas and cell dimensions update when the window resizes

---

## Concepts

- **localStorage persistence**: Save and load the high score with a key
- **Hop animation**: Set an offset when moving, then lerp it to zero over a short timer
- **HUD layering**: Semi-transparent bar drawn after the game scene, before overlays

---

## Code

### 1. Final Types

**File:** `src/games/frogger/types.ts`

Add score, high score, hop animation fields, and the localStorage key:

```typescript
// ── Grid & layout constants ────────────────────────────────────────

export const COLS = 13;
export const ROWS = 13; // 0=goal, 1–5=river, 6=safe, 7–11=road, 12=start
export const GOAL_SLOTS = 5; // lily-pad slots at the top row

export const HS_KEY = 'frogger_highscore';

// ── Lane type identifiers ──────────────────────────────────────────

export type LaneKind = 'goal' | 'river' | 'safe' | 'road' | 'start';

export type Direction = -1 | 1; // -1 = left, 1 = right

// ── Lane descriptor (defined per level in data/levels.ts) ──────────

export interface LaneDescriptor {
  kind: LaneKind;
  speed: number;        // pixels-per-second base speed (0 for safe/start/goal)
  direction: Direction;
  /** Vehicle/log templates that can appear in this lane */
  objects: LaneObjectTemplate[];
}

export interface LaneObjectTemplate {
  width: number;  // in grid cells
  gap: number;    // minimum gap in grid cells before next object
}

// ── Runtime objects ────────────────────────────────────────────────

export interface Frog {
  col: number;
  row: number;
  /** Pixel offsets for smooth hop animation (0 when idle) */
  offsetX: number;
  offsetY: number;
  /** true while hop animation is playing */
  hopping: boolean;
  hopTimer: number;
}

export interface Vehicle {
  x: number;       // pixel position (left edge)
  row: number;
  width: number;   // in pixels
  speed: number;    // px/s (signed: negative = left)
  color: string;
}

export interface Log {
  x: number;
  row: number;
  width: number;
  speed: number;    // px/s (signed)
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
  score: number;
  highScore: number;
  level: number;
  goalsReached: number;

  cellW: number;
  cellH: number;
  canvasW: number;
  canvasH: number;

  paused: boolean;
  started: boolean;
  gameOver: boolean;
  dying: boolean;
  deathTimer: number;
  levelComplete: boolean;
  levelCompleteTimer: number;
}
```

---

### 2. Final Lane Data

**File:** `src/games/frogger/data/levels.ts`

No changes from Step 5 — included here for completeness:

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

/** Colours used for each vehicle in a lane (cycles) */
export const VEHICLE_COLORS = ['#e53935', '#fb8c00', '#fdd835', '#8e24aa', '#1e88e5'];
```

---

### 3. Final Input System

**File:** `src/games/frogger/systems/InputSystem.ts`

Add hop animation — the frog's grid position updates instantly, but a pixel offset creates a smooth slide:

```typescript
import type { FroggerState } from '../types';
import { COLS, ROWS } from '../types';

const HOP_DURATION = 0.1; // seconds for hop animation

export class InputSystem {
  private state: FroggerState;
  private onExit: () => void;
  private onReset: () => void;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(
    state: FroggerState,
    onExit: () => void,
    onReset: () => void,
  ) {
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

    if (s.paused || s.gameOver || s.dying || s.levelComplete) return;
    if (!s.started) s.started = true;

    // Prevent double-hopping while already mid-hop
    if (s.frog.hopping) return;

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

    // Move grid position immediately
    s.frog.col = newCol;
    s.frog.row = newRow;

    // Set pixel offset to previous position (negative of movement)
    // The engine will lerp this back to zero over HOP_DURATION
    s.frog.offsetX = -dc * s.cellW;
    s.frog.offsetY = -dr * s.cellH;
    s.frog.hopping = true;
    s.frog.hopTimer = HOP_DURATION;
  }
}
```

**Hop animation trick:**
1. Grid position jumps immediately to the new cell (so collision checks use the correct cell)
2. A pixel offset is set to the *negative* of the movement (frog appears at the old position)
3. The engine lerps the offset toward zero over 100ms, creating a smooth visual slide
4. During `hopping`, further key presses are ignored (no double-hops)

---

### 4. Final Traffic System

**File:** `src/games/frogger/systems/TrafficSystem.ts`

No changes from Step 2 — included for completeness:

```typescript
import type { FroggerState, Vehicle } from '../types';
import { VEHICLE_COLORS } from '../data/levels';

export class TrafficSystem {
  /** Populate vehicles for all road lanes on level start / reset */
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

      // Wrap around
      if (v.speed > 0 && v.x > w) {
        v.x = -v.width;
      } else if (v.speed < 0 && v.x + v.width < 0) {
        v.x = w;
      }
    }
  }
}
```

---

### 5. Final River System

**File:** `src/games/frogger/systems/RiverSystem.ts`

Skip riding logic while the frog is mid-hop:

```typescript
import type { FroggerState, Log } from '../types';

export class RiverSystem {
  /** Populate logs for all river lanes on level start / reset */
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

    // Move logs
    for (const log of state.logs) {
      log.x += log.speed * dt;

      if (log.speed > 0 && log.x > w) {
        log.x = -log.width;
      } else if (log.speed < 0 && log.x + log.width < 0) {
        log.x = w;
      }
    }

    // If frog is on a river row and not hopping, ride the log
    const frog = state.frog;
    if (frog.hopping) return;

    const lane = state.lanes[frog.row];
    if (!lane || lane.kind !== 'river') return;

    // Find log under frog
    const frogPx = frog.col * state.cellW + state.cellW * 0.5;
    let onLog = false;

    for (const log of state.logs) {
      if (log.row !== frog.row) continue;
      if (frogPx >= log.x && frogPx <= log.x + log.width) {
        // Ride the log — shift frog with log
        const shift = log.speed * dt;
        const newFrogCenter = frogPx + shift;
        const newCol = Math.round((newFrogCenter - state.cellW * 0.5) / state.cellW);
        frog.col = newCol;
        onLog = true;
        break;
      }
    }

    // If in river but not on a log, frog drowns
    if (!onLog) {
      state.dying = true;
    }
  }
}
```

---

### 6. Final Collision System

**File:** `src/games/frogger/systems/CollisionSystem.ts`

Add scoring and high-score persistence. Skip checks while the frog hops:

```typescript
import type { FroggerState } from '../types';
import { COLS, GOAL_SLOTS, HS_KEY } from '../types';

const DEATH_DURATION = 0.6;

export class CollisionSystem {
  update(state: FroggerState, dt: number): void {
    const frog = state.frog;

    // Handle death timer
    if (state.dying) {
      state.deathTimer -= dt;
      if (state.deathTimer <= 0) {
        this.respawn(state);
      }
      return;
    }

    // Skip checks while hopping
    if (frog.hopping) return;

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

    // ── River: drowning is set by RiverSystem ──────────────────
    if (state.dying) {
      this.killFrog(state);
      return;
    }

    // ── Frog drifted off screen on a log ───────────────────────
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
        pad.occupied = true;
        state.goalsReached++;

        // Award score: 100 base + 50 per level
        state.score += 100 + state.level * 50;
        if (state.score > state.highScore) {
          state.highScore = state.score;
        }

        if (state.goalsReached >= GOAL_SLOTS) {
          // Level complete
          state.levelComplete = true;
          state.levelCompleteTimer = 1.5;
        } else {
          this.respawnToStart(state);
        }
      } else {
        // Landed on an already-occupied pad or empty space — die
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
      // Persist high score
      try {
        const prev = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
        if (state.highScore > prev) {
          localStorage.setItem(HS_KEY, String(state.highScore));
        }
      } catch { /* noop — localStorage may be unavailable */ }
      return;
    }

    this.respawnToStart(state);
  }

  private respawnToStart(state: FroggerState): void {
    state.frog.col = Math.floor(COLS / 2);
    state.frog.row = state.lanes.length - 1; // start row
    state.frog.offsetX = 0;
    state.frog.offsetY = 0;
    state.frog.hopping = false;
    state.frog.hopTimer = 0;
  }
}
```

**Scoring:**
- Each lily pad landing awards `100 + level * 50` points
- Level 1: 150 per pad, Level 2: 200, Level 3: 250, etc.
- High score updates in real-time and persists on game over

---

### 7. Final Game Renderer

**File:** `src/games/frogger/renderers/GameRenderer.ts`

Incorporate the hop offset into frog drawing:

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
          // Lane markings
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
          // Water wave lines
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
      const py = ch * 0.5;
      const radius = cw * 0.35;

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

      // Bark texture
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

      // Windshield
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

    // Include hop offset for smooth animation
    const fx = frog.col * cw + frog.offsetX + cw * 0.5;
    const fy = frog.row * ch + frog.offsetY + ch * 0.5;

    if (state.dying) {
      // Death animation — red expanding circle
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

**Hop offset:** `frog.offsetX` and `frog.offsetY` are added to the pixel position. When non-zero, the frog appears between its old and new cell. The engine lerps these to zero.

---

### 8. Final HUD Renderer

**File:** `src/games/frogger/renderers/HUDRenderer.ts`

Full HUD with score, high score, lives, and level:

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

    // Lives
    ctx.fillStyle = '#f44336';
    let livesText = 'Lives: ';
    for (let i = 0; i < state.lives; i++) livesText += '\u2764 ';
    ctx.fillText(livesText, 8, 18);

    // Score (centered)
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(`Score: ${state.score}`, W * 0.5, 18);

    // Level + High Score (right-aligned)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#4caf50';
    ctx.fillText(`Level ${state.level}  |  Hi: ${state.highScore}`, W - 8, 18);

    // ── Overlays ────────────────────────────────────────────────

    if (!state.started) {
      this.drawOverlay(ctx, W, H,
        '\u{1F438} FROGGER',
        'Press any arrow key or WASD to start',
        '#4caf50',
      );
      return;
    }

    if (state.paused) {
      this.drawOverlay(ctx, W, H, 'PAUSED', 'Press [P] to resume', '#ff9800');
      return;
    }

    if (state.levelComplete) {
      this.drawOverlay(ctx, W, H,
        `LEVEL ${state.level} COMPLETE!`,
        'Get ready...',
        '#4caf50',
      );
      return;
    }

    if (state.gameOver) {
      this.drawOverlay(ctx, W, H,
        'GAME OVER',
        `Score: ${state.score}  |  Press Space to restart`,
        '#f44336',
      );
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
    ctx.fillText('Press [ESC] to exit  |  [P] pause  |  [H] help', W * 0.5, H * 0.62);
  }
}
```

---

### 9. Final Platform Adapter

**File:** `src/games/frogger/adapters/PlatformAdapter.ts`

```typescript
import type { GameInstance } from '@shared/GameInterface';
import { FroggerEngine } from '../FroggerEngine';

export class PlatformAdapter implements GameInstance {
  private engine: FroggerEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new FroggerEngine(canvas, onExit);
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

### 10. Final Game Engine

**File:** `src/games/frogger/FroggerEngine.ts`

Complete engine with hop animation, resize handling, and all systems:

```typescript
import type { FroggerState } from './types';
import { COLS, ROWS, GOAL_SLOTS, HS_KEY } from './types';
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
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Load persisted high score
    let hs = 0;
    try {
      hs = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
    } catch { /* noop */ }

    const cellW = canvas.width / COLS;
    const cellH = canvas.height / ROWS;
    const lanes = buildLanes(1);

    this.state = {
      frog: {
        col: Math.floor(COLS / 2),
        row: ROWS - 1,
        offsetX: 0,
        offsetY: 0,
        hopping: false,
        hopTimer: 0,
      },
      vehicles: [],
      logs: [],
      lilyPads: this.buildLilyPads(),
      lanes,
      lives: 3,
      score: 0,
      highScore: hs,
      level: 1,
      goalsReached: 0,
      cellW,
      cellH,
      canvasW: canvas.width,
      canvasH: canvas.height,
      paused: false,
      started: false,
      gameOver: false,
      dying: false,
      deathTimer: 0,
      levelComplete: false,
      levelCompleteTimer: 0,
    };

    // Systems
    this.trafficSystem = new TrafficSystem();
    this.riverSystem = new RiverSystem();
    this.collisionSystem = new CollisionSystem();
    this.inputSystem = new InputSystem(this.state, onExit, () => this.reset());
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    // Populate moving objects
    this.trafficSystem.populate(this.state);
    this.riverSystem.populate(this.state);

    // Resize handler
    this.resizeHandler = () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.state.canvasW = this.canvas.width;
      this.state.canvasH = this.canvas.height;
      this.state.cellW = this.canvas.width / COLS;
      this.state.cellH = this.canvas.height / ROWS;
      this.trafficSystem.populate(this.state);
      this.riverSystem.populate(this.state);
    };
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.inputSystem.attach();
    window.addEventListener('resize', this.resizeHandler);
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
    window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05); // seconds, capped
    this.lastTime = now;

    if (this.state.started && !this.state.paused && !this.state.gameOver) {
      this.update(dt);
    }

    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

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

    // Hop animation — lerp offset toward zero
    if (s.frog.hopping) {
      s.frog.hopTimer -= dt;
      if (s.frog.hopTimer <= 0) {
        s.frog.hopping = false;
        s.frog.hopTimer = 0;
        s.frog.offsetX = 0;
        s.frog.offsetY = 0;
      } else {
        const ratio = s.frog.hopTimer / 0.1;
        s.frog.offsetX = s.frog.offsetX > 0
          ? Math.max(0, s.frog.offsetX * ratio)
          : Math.min(0, s.frog.offsetX * ratio);
        s.frog.offsetY = s.frog.offsetY > 0
          ? Math.max(0, s.frog.offsetY * ratio)
          : Math.min(0, s.frog.offsetY * ratio);
      }
    }

    this.trafficSystem.update(s, dt);
    this.riverSystem.update(s, dt);
    this.collisionSystem.update(s, dt);
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);

    this.gameRenderer.render(ctx, this.state);
    this.hudRenderer.render(ctx, this.state);
  }

  private reset(): void {
    const s = this.state;
    s.level = 1;
    s.score = 0;
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
    s.frog.offsetX = 0;
    s.frog.offsetY = 0;
    s.frog.hopping = false;
    s.frog.hopTimer = 0;
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
    s.frog.offsetX = 0;
    s.frog.offsetY = 0;
    s.frog.hopping = false;
    s.frog.hopTimer = 0;
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

---

### 11. Final Game Export

**File:** `src/games/frogger/index.ts`

```typescript
import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const FroggerGame: GameDefinition = {
  id: 'frogger',
  name: 'Frogger',
  description: 'Guide the frog across busy roads and rivers!',
  icon: '\u{1F438}',
  color: '#4caf50',
  category: 'arcade' as const,
  help: {
    goal: 'Guide the frog across traffic and rivers to reach all 5 lily pads.',
    controls: [
      { key: 'Arrow Keys / WASD', action: 'Hop one cell in that direction' },
      { key: 'P', action: 'Pause / resume' },
      { key: 'H', action: 'Toggle help overlay' },
      { key: 'Space / Enter', action: 'Restart after game over' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: [
      'Time your hops carefully \u2014 watch traffic before moving',
      'On river lanes you must land on a log or you drown',
      'The frog rides logs \u2014 watch out for the screen edges',
      'Fill all 5 lily pads to clear the level',
      'Speed increases each level \u2014 stay alert!',
    ],
  },
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Frogger"
3. **Observe:**
   - Start overlay: "FROGGER — Press any arrow key or WASD to start"
   - HUD top bar: Lives (hearts), Score (centered), Level + Hi score (right)
   - Frog hops smoothly between cells (100ms slide animation)
   - Score increases on each successful lily pad landing
   - High score updates in real-time, persists after game over
   - Level-complete overlay shows for 1.5 seconds
   - Next level: all objects move faster
   - Game over overlay shows final score and restart prompt
   - Window resize recalculates cell dimensions and repopulates objects
   - Pause overlay with [P]

---

## Challenges

**Easy:**
- Award bonus points (50) for each row the frog advances
- Change the high-score key to include the player's name
- Add a "New High Score!" message on the game-over screen

**Medium:**
- Add a time bonus that decreases each second — faster crossings earn more
- Implement a combo system — consecutive pad landings without dying multiply score
- Add particle effects when the frog lands on a pad

**Hard:**
- Add a global leaderboard using a simple API endpoint
- Implement replay recording — store each input with its timestamp
- Add a "speed run" mode with a visible timer and no lives limit

---

## What You Learned

- Score system with level-based scaling
- High score persistence with `localStorage`
- Hop animation using offset lerping
- Full HUD with multiple data fields in a semi-transparent bar
- Overlay state machine: start, pause, level complete, game over
- Window resize handling for responsive canvas games
- Complete game loop: input, physics, collision, rendering, UI

---

## Complete Game Summary

Over 6 steps you built a full Frogger arcade game:

1. **Grid & Frog** — Lane-based grid layout with discrete movement
2. **Road Lanes & Vehicles** — Scrolling traffic with edge wrapping
3. **Vehicle Collision** — Death animation, respawn, and lives
4. **River Lanes & Logs** — Moving platforms and drowning mechanics
5. **Goal & Levels** — Lily pad targets and speed progression
6. **Score, Lives & Polish** — HUD, high score, overlays, and hop animation

The complete source code is at [`src/games/frogger/`](../../src/games/frogger/).

**Next Game:** Continue to [Space Invaders](../21-space-invaders/README.md) — where you will learn enemy formations and bullet mechanics!
