# Step 3: Vehicle Collision

**Goal:** Detect frog-vehicle collisions, kill the frog with a death animation, respawn at the start, and track lives.

**Time:** ~15 minutes

---

## What You'll Build

Building on the scrolling traffic from Step 2:
- **AABB collision**: Frog overlaps a vehicle = death
- **Death animation**: Red expanding circle with a skull, lasting 0.6 seconds
- **Respawn**: Frog returns to the center of the start row
- **Lives system**: Start with 3 lives, lose one per death, game over at zero

---

## Concepts

- **AABB overlap**: Two rectangles overlap when `rightA > leftB && leftA < rightB` (same row)
- **Death timer**: A brief pause after dying prevents instant re-death and gives visual feedback
- **State flags**: `dying` blocks input and collision checks; `gameOver` freezes the game

---

## Code

### 1. Update Types

**File:** `src/games/frogger/types.ts`

Add lives, death state, and game flow flags:

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

// ── Master state ───────────────────────────────────────────────────

export interface FroggerState {
  frog: Frog;
  vehicles: Vehicle[];
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

### 2. Create Collision System

**File:** `src/games/frogger/systems/CollisionSystem.ts`

Check frog-vehicle overlap each frame. Trigger death when hit:

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
      // Frog hitbox: slightly inset from cell edges
      const frogLeft = frog.col * state.cellW + 2;
      const frogRight = (frog.col + 1) * state.cellW - 2;

      for (const v of state.vehicles) {
        if (v.row !== frog.row) continue;

        // AABB overlap on the X axis (same row guaranteed)
        if (frogRight > v.x && frogLeft < v.x + v.width) {
          this.killFrog(state);
          return;
        }
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

    // Return frog to start position
    state.frog.col = Math.floor(COLS / 2);
    state.frog.row = state.lanes.length - 1;
  }
}
```

**Collision details:**
- Only check when the frog is on a `road` lane — safe zones and river are ignored for now
- The 2px inset on the frog hitbox prevents frustrating edge-pixel deaths
- `killFrog` sets the `dying` flag and starts the death timer
- `respawn` decrements lives and resets position, or triggers game over

---

### 3. Update Input System

**File:** `src/games/frogger/systems/InputSystem.ts`

Block input while dying or game over. Add pause, start, and restart controls:

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

    // Pause toggle
    if (e.key === 'p' || e.key === 'P') {
      if (s.started && !s.gameOver) {
        s.paused = !s.paused;
      }
      return;
    }

    // Restart after game over
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

    // Block movement while paused, dead, or game over
    if (s.paused || s.gameOver || s.dying) return;

    // Auto-start on first movement key
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

**New behaviors:**
- `P` toggles pause (only when the game is active)
- Space/Enter restarts after game over, or starts the game initially
- Movement is blocked during `dying`, `paused`, and `gameOver` states
- First arrow key press auto-starts the game

---

### 4. Update Game Renderer

**File:** `src/games/frogger/renderers/GameRenderer.ts`

Add a death animation to the frog drawing:

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

    // Death animation — red expanding ring with skull
    if (state.dying) {
      const t = 1 - (state.deathTimer / 0.6); // 0 → 1
      ctx.fillStyle = `rgba(255, 0, 0, ${1 - t})`;
      ctx.beginPath();
      ctx.arc(fx, fy, cw * 0.3 + t * cw * 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = `${cw * 0.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 1 - t;
      ctx.fillText('\u{1F480}', fx, fy); // skull emoji
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

**Death animation:**
- `t` progresses from 0 to 1 over 0.6 seconds
- Red circle expands from the frog's position while fading out
- Skull emoji fades out in sync
- After the timer expires, the collision system calls `respawn`

---

### 5. Create HUD Renderer

**File:** `src/games/frogger/renderers/HUDRenderer.ts`

Show lives count and basic overlays for start, pause, and game over:

```typescript
import type { FroggerState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: FroggerState): void {
    const W = state.canvasW;
    const H = state.canvasH;

    // ── Top bar — lives display ─────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, 36);

    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f44336';

    let livesText = 'Lives: ';
    for (let i = 0; i < state.lives; i++) livesText += '\u2764 '; // heart
    ctx.fillText(livesText, 8, 18);

    // ── Overlays ────────────────────────────────────────────────

    if (!state.started) {
      this.drawOverlay(ctx, W, H, '\u{1F438} FROGGER', 'Press any arrow key to start', '#4caf50');
      return;
    }

    if (state.paused) {
      this.drawOverlay(ctx, W, H, 'PAUSED', 'Press [P] to resume', '#ff9800');
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

### 6. Update Game Engine

**File:** `src/games/frogger/FroggerEngine.ts`

Wire in the collision system, HUD renderer, and game flow flags:

```typescript
import type { FroggerState } from './types';
import { COLS, ROWS } from './types';
import { buildLanes } from './data/levels';
import { InputSystem } from './systems/InputSystem';
import { TrafficSystem } from './systems/TrafficSystem';
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
    this.collisionSystem = new CollisionSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

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
  }
}
```

**Game flow:**
- The update loop only runs when `started && !paused && !gameOver`
- `reset()` restores all state to initial values (called from input system on Space after game over)
- Collision system runs after traffic so vehicles are in their current-frame positions

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Frogger"
3. **Observe:**
   - Start overlay appears — press an arrow key to begin
   - Move the frog into a road lane and wait for a vehicle
   - Frog hit: red expanding circle + skull emoji for 0.6 seconds
   - Frog respawns at the bottom center
   - Lives display in top-left decreases by one heart
   - After 3 deaths: "GAME OVER" overlay
   - Press Space to restart with 3 lives
   - Press P to pause/resume

---

## Challenges

**Easy:**
- Change starting lives from 3 to 5
- Make the death animation last 1 second instead of 0.6
- Change the death color from red to orange

**Medium:**
- Add screen shake during the death animation
- Flash the frog's last position with alternating colors before respawning
- Add an invincibility period (1 second) after respawning

**Hard:**
- Add a "near miss" visual effect when a vehicle passes within 2px of the frog
- Implement a ghost trail showing the path to the death location
- Add a brief slow-motion effect (halve `dt`) right before death

---

## What You Learned

- AABB collision detection between grid-based player and pixel-positioned objects
- Death timer pattern: flag + countdown + respawn
- Game state machine: `started`, `paused`, `dying`, `gameOver`
- Overlay rendering for different game phases
- Lives system with decrement and game-over threshold

**Next:** River lanes with logs the frog can ride on!
