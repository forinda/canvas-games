# Step 1: Project Setup & Arena

**Goal:** Draw the arena, player, and basic movement with WASD controls.

**Time:** ~15 minutes

---

## What You'll Build

- **A 1200x800 arena** with a dark background, subtle grid lines, and a green border
- **A player circle** centered on screen with eyes and a directional gun barrel
- **WASD movement** with diagonal normalization and arena boundary clamping
- **Mouse aiming** so the player always faces the cursor
- **Type definitions** for the entire game state used across all steps
- **Platform adapter** and entry point for the game launcher

---

## Concepts

- **Fixed Arena vs. Viewport**: The game world is a fixed 1200x800 arena. We scale and center it within any viewport size using `Math.min(W / ARENA_W, H / ARENA_H)`, then translate with `ctx.save()` / `ctx.translate()` / `ctx.scale()` / `ctx.restore()`.
- **Delta-Time Movement**: We multiply speed by `dt` (seconds since last frame) so the player moves at the same real-world speed regardless of frame rate. `PLAYER_SPEED = 180` means 180 pixels per second.
- **Diagonal Normalization**: If the player holds W+D simultaneously, the raw input vector is `(1, -1)` with length ~1.41. Dividing by that length keeps diagonal speed equal to cardinal speed.
- **Input Snapshots**: Rather than reading keys directly in the update loop, the `InputSystem` collects key state and mouse position into a plain `InputSnapshot` object each frame. This decouples input handling from game logic.

---

## Code

### 1. Create Types

**File:** `src/contexts/canvas2d/games/zombie-survival/types.ts`

All the types and constants for the entire game. Defined up front so later steps never need to restructure.

```typescript
// ─── Constants ────────────────────────────────────────────────────────────────

export const ARENA_W = 1200;
export const ARENA_H = 800;
export const PLAYER_RADIUS = 14;
export const PLAYER_SPEED = 180; // px/s
export const BULLET_SPEED = 600;
export const BULLET_RADIUS = 3;
export const BULLET_DAMAGE = 25;
export const BARRICADE_SIZE = 40;
export const BARRICADE_HP = 150;
export const BARRICADE_COST = 20; // resources
export const MAX_AMMO = 30;
export const FLASHLIGHT_RANGE = 260;
export const FLASHLIGHT_ANGLE = Math.PI / 3.5; // cone half-angle

export const DAY_DURATION = 15; // seconds
export const NIGHT_DURATION = 30; // seconds

export const SCAVENGE_RATE_AMMO = 1.2; // ammo per second during day
export const SCAVENGE_RATE_RESOURCES = 4; // resources per second during day

// ─── Enums & Literals ─────────────────────────────────────────────────────────

export type Screen = 'playing' | 'paused' | 'gameover';
export type TimeOfDay = 'day' | 'night';
export type ZombieType = 'walker' | 'runner' | 'tank';

export type ZombieState =
  | 'wandering'
  | 'chasing'
  | 'attacking_player'
  | 'attacking_barricade';

// ─── Entities ─────────────────────────────────────────────────────────────────

export interface Player {
  x: number;
  y: number;
  angle: number; // facing angle (radians, toward mouse)
  hp: number;
  maxHp: number;
  ammo: number;
  maxAmmo: number;
  resources: number;
  shootCooldown: number; // seconds remaining
  invincibleTimer: number; // seconds of invincibility after hit
}

export interface Zombie {
  id: number;
  type: ZombieType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackCooldown: number;
  attackInterval: number;
  state: ZombieState;
  targetBarricadeId: number | null;
  radius: number;
  dead: boolean;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  dead: boolean;
}

export interface Barricade {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  dead: boolean;
}

// ─── Wave Definitions ─────────────────────────────────────────────────────────

export interface WaveSpawn {
  type: ZombieType;
  count: number;
}

// ─── Particle Effect ──────────────────────────────────────────────────────────

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  decay: number;
  color: string;
  radius: number;
}

// ─── Game State ───────────────────────────────────────────────────────────────

export interface GameState {
  screen: Screen;
  player: Player;
  zombies: Zombie[];
  bullets: Bullet[];
  barricades: Barricade[];
  particles: Particle[];
  wave: number;
  timeOfDay: TimeOfDay;
  cycleTimer: number; // seconds remaining in current day/night phase
  zombiesRemainingInWave: number;
  spawnTimer: number;
  spawnQueue: WaveSpawn[];
  score: number;
  nextId: number;
  totalKills: number;
}
```

**What's happening:**
- `Player` tracks position, angle (radians toward mouse), health, ammo, resources, and cooldown timers. All fields are numbers -- no complex objects.
- `Zombie` has a `state` field that drives AI behavior: `wandering`, `chasing`, `attacking_player`, or `attacking_barricade`. The `targetBarricadeId` links to a specific barricade when attacking one.
- `GameState` is a single flat object holding every entity array, the wave counter, day/night cycle timer, and a global `nextId` counter for unique entity IDs.
- Constants like `ARENA_W = 1200` and `PLAYER_SPEED = 180` are exported so every system can import them without magic numbers.

---

### 2. Create the Input System

**File:** `src/contexts/canvas2d/games/zombie-survival/systems/InputSystem.ts`

Captures keyboard and mouse input, exposing a clean snapshot each frame.

```typescript
import type { GameState } from '../types.ts';

export interface InputSnapshot {
  moveX: number;  // -1, 0, 1
  moveY: number;  // -1, 0, 1
  aimX: number;   // canvas-space
  aimY: number;   // canvas-space
  shooting: boolean;
  placeBarricade: boolean;
  pause: boolean;
  help: boolean;
}

export class InputSystem {
  private canvas: HTMLCanvasElement;
  private keys = new Set<string>();
  private mouseX = 0;
  private mouseY = 0;
  private mouseDown = false;
  private placeFlag = false;
  private pauseFlag = false;
  private helpFlag = false;

  private _onKeyDown: (e: KeyboardEvent) => void;
  private _onKeyUp: (e: KeyboardEvent) => void;
  private _onMouseMove: (e: MouseEvent) => void;
  private _onMouseDown: (e: MouseEvent) => void;
  private _onMouseUp: (e: MouseEvent) => void;
  private _onContext: (e: MouseEvent) => void;

  constructor(canvas: HTMLCanvasElement, _getState: () => GameState) {
    this.canvas = canvas;

    this._onKeyDown = (e: KeyboardEvent) => {
      this.keys.add(e.key.toLowerCase());
      if (e.key.toLowerCase() === 'e') this.placeFlag = true;
      if (e.key.toLowerCase() === 'p' || e.key === 'Escape') this.pauseFlag = true;
      if (e.key.toLowerCase() === 'h') this.helpFlag = true;
    };
    this._onKeyUp = (e: KeyboardEvent) => {
      this.keys.delete(e.key.toLowerCase());
    };
    this._onMouseMove = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.mouseX = (e.clientX - rect.left) * scaleX;
      this.mouseY = (e.clientY - rect.top) * scaleY;
    };
    this._onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) this.mouseDown = true;
    };
    this._onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) this.mouseDown = false;
    };
    this._onContext = (e: MouseEvent) => {
      e.preventDefault();
    };
  }

  attach(): void {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    this.canvas.addEventListener('mouseup', this._onMouseUp);
    this.canvas.addEventListener('contextmenu', this._onContext);
  }

  detach(): void {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('mouseup', this._onMouseUp);
    this.canvas.removeEventListener('contextmenu', this._onContext);
  }

  /** Read and consume single-frame flags */
  snapshot(): InputSnapshot {
    const moveX =
      (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0) -
      (this.keys.has('a') || this.keys.has('arrowleft') ? 1 : 0);
    const moveY =
      (this.keys.has('s') || this.keys.has('arrowdown') ? 1 : 0) -
      (this.keys.has('w') || this.keys.has('arrowup') ? 1 : 0);

    const snap: InputSnapshot = {
      moveX,
      moveY,
      aimX: this.mouseX,
      aimY: this.mouseY,
      shooting: this.mouseDown,
      placeBarricade: this.placeFlag,
      pause: this.pauseFlag,
      help: this.helpFlag,
    };

    // Consume single-frame flags
    this.placeFlag = false;
    this.pauseFlag = false;
    this.helpFlag = false;

    return snap;
  }
}
```

**What's happening:**
- `keys` is a `Set<string>` -- keys are added on `keydown` and removed on `keyup`, so we can check multiple held keys simultaneously (e.g., W+D for diagonal movement).
- `placeFlag`, `pauseFlag`, and `helpFlag` are "consume-on-read" flags. They get set to `true` on keydown, then reset to `false` after `snapshot()` reads them. This ensures actions like "place barricade" fire exactly once per key press.
- Mouse coordinates are converted from CSS-space to canvas-space using the canvas bounding rect and scale factors, so aiming works correctly even if the canvas is stretched or offset.
- `contextmenu` is suppressed so right-clicking the canvas does not open a browser menu.

---

### 3. Create the Player System

**File:** `src/contexts/canvas2d/games/zombie-survival/systems/PlayerSystem.ts`

Handles movement, aiming, and arena boundary clamping. Shooting and barricade placement will be added in later steps.

```typescript
import type { GameState } from '../types.ts';
import type { InputSnapshot } from './InputSystem.ts';
import { PLAYER_SPEED, PLAYER_RADIUS, ARENA_W, ARENA_H } from '../types.ts';

export class PlayerSystem {
  private input!: InputSnapshot;

  setInput(input: InputSnapshot): void {
    this.input = input;
  }

  update(state: GameState, dt: number): void {
    const inp = this.input;
    if (!inp) return;

    const player = state.player;

    // ─── Movement ──────────────────────────────────────
    let dx = inp.moveX;
    let dy = inp.moveY;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len > 0) {
      dx /= len;
      dy /= len;
    }

    player.x += dx * PLAYER_SPEED * dt;
    player.y += dy * PLAYER_SPEED * dt;

    // Clamp to arena
    player.x = Math.max(PLAYER_RADIUS, Math.min(ARENA_W - PLAYER_RADIUS, player.x));
    player.y = Math.max(PLAYER_RADIUS, Math.min(ARENA_H - PLAYER_RADIUS, player.y));

    // ─── Aim ───────────────────────────────────────────
    player.angle = Math.atan2(inp.aimY - player.y, inp.aimX - player.x);

    // ─── Invincibility ─────────────────────────────────
    player.invincibleTimer = Math.max(0, player.invincibleTimer - dt);
  }
}
```

**What's happening:**
- The raw `moveX`/`moveY` values are -1, 0, or 1. When both axes are nonzero (diagonal), the vector has length ~1.41. Dividing by `len` normalizes it to length 1, so diagonal movement is the same speed as cardinal.
- `Math.max(PLAYER_RADIUS, Math.min(ARENA_W - PLAYER_RADIUS, player.x))` clamps the player center so the circle never overlaps the arena edge.
- `Math.atan2(dy, dx)` converts the vector from player to mouse into an angle in radians. This drives both the gun barrel direction and later the flashlight cone.

---

### 4. Create the Game Renderer

**File:** `src/contexts/canvas2d/games/zombie-survival/renderers/GameRenderer.ts`

Draws the arena background, grid, border, and the player character.

```typescript
import type { GameState } from '../types.ts';
import { ARENA_W, ARENA_H, PLAYER_RADIUS } from '../types.ts';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: GameState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Compute scale and offset to fit arena
    const scale = Math.min(W / ARENA_W, H / ARENA_H);
    const offsetX = (W - ARENA_W * scale) / 2;
    const offsetY = (H - ARENA_H * scale) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // ─── Background ──────────────────────────────────
    this.drawBackground(ctx, state);

    // ─── Player ──────────────────────────────────────
    this.drawPlayer(ctx, state);

    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D, state: GameState): void {
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const gridSize = 50;

    for (let x = 0; x <= ARENA_W; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ARENA_H);
      ctx.stroke();
    }

    for (let y = 0; y <= ARENA_H; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(ARENA_W, y);
      ctx.stroke();
    }

    // Arena border
    ctx.strokeStyle = '#2d5a2d';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, ARENA_W, ARENA_H);
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, state: GameState): void {
    const p = state.player;

    // Blink when invincible
    if (p.invincibleTimer > 0 && Math.floor(p.invincibleTimer * 10) % 2 === 0) return;

    ctx.save();
    ctx.translate(p.x, p.y);

    // Body
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Direction indicator (gun barrel)
    ctx.strokeStyle = '#ecf0f1';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(
      Math.cos(p.angle) * (PLAYER_RADIUS + 8),
      Math.sin(p.angle) * (PLAYER_RADIUS + 8),
    );
    ctx.stroke();

    // Eyes
    const eyeOffset = 5;
    const eyeAngle1 = p.angle - 0.3;
    const eyeAngle2 = p.angle + 0.3;

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(Math.cos(eyeAngle1) * eyeOffset, Math.sin(eyeAngle1) * eyeOffset, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(Math.cos(eyeAngle2) * eyeOffset, Math.sin(eyeAngle2) * eyeOffset, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
```

**What's happening:**
- `Math.min(W / ARENA_W, H / ARENA_H)` computes a uniform scale factor so the 1200x800 arena fits any viewport while preserving aspect ratio. `ctx.translate` centers it.
- The background is dark green (`#1a2a1a`) with a 50px grid of near-invisible white lines (`rgba(255,255,255,0.03)`) for subtle spatial reference.
- The player is a blue circle (`#3498db`) with a white gun barrel line extending from center in the direction of `p.angle`. Two small white eyes are offset from center at angles `p.angle +/- 0.3` radians, so they track the facing direction.
- When `invincibleTimer > 0`, the player blinks (every other 100ms frame is skipped) to signal damage.

---

### 5. Create the Engine

**File:** `src/contexts/canvas2d/games/zombie-survival/ZombieEngine.ts`

Orchestrates the game loop, creates initial state, and wires systems together.

```typescript
import type { GameState } from './types.ts';
import { ARENA_W, ARENA_H, MAX_AMMO, DAY_DURATION } from './types.ts';
import { InputSystem } from './systems/InputSystem.ts';
import { PlayerSystem } from './systems/PlayerSystem.ts';
import { GameRenderer } from './renderers/GameRenderer.ts';

export class ZombieEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState;

  private inputSystem: InputSystem;
  private playerSystem: PlayerSystem;
  private gameRenderer: GameRenderer;

  private lastTime = 0;
  private rafId = 0;
  private running = false;
  private onExit: () => void;

  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.canvas = canvas;
    this.onExit = onExit;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    this.state = this.createInitialState();

    this.inputSystem = new InputSystem(canvas, () => this.state);
    this.playerSystem = new PlayerSystem();
    this.gameRenderer = new GameRenderer();

    this.resizeHandler = () => this.handleResize();
  }

  private createInitialState(): GameState {
    return {
      screen: 'playing',
      player: {
        x: ARENA_W / 2,
        y: ARENA_H / 2,
        angle: 0,
        hp: 100,
        maxHp: 100,
        ammo: MAX_AMMO,
        maxAmmo: MAX_AMMO,
        resources: 40,
        shootCooldown: 0,
        invincibleTimer: 0,
      },
      zombies: [],
      bullets: [],
      barricades: [],
      particles: [],
      wave: 0,
      timeOfDay: 'day',
      cycleTimer: DAY_DURATION,
      zombiesRemainingInWave: 0,
      spawnTimer: 0,
      spawnQueue: [],
      score: 0,
      nextId: 1,
      totalKills: 0,
    };
  }

  private handleResize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  start(): void {
    this.running = true;
    this.handleResize();
    window.addEventListener('resize', this.resizeHandler);
    this.inputSystem.attach();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private loop(timestamp: number): void {
    if (!this.running) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number): void {
    const input = this.inputSystem.snapshot();

    if (this.state.screen !== 'playing') return;

    this.playerSystem.setInput(input);
    this.playerSystem.update(this.state, dt);
  }

  private render(): void {
    const { ctx, canvas } = this;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dark background
    ctx.fillStyle = '#080a08';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.gameRenderer.render(ctx, this.state);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resizeHandler);
    this.inputSystem.detach();
  }
}
```

**What's happening:**
- `createInitialState()` places the player at the center of the arena with 100 HP, full ammo, and 40 starting resources. All entity arrays start empty.
- `dt` is clamped to 0.05 seconds (20 FPS minimum). This prevents physics explosions when the tab is backgrounded and `requestAnimationFrame` delivers a large timestamp gap.
- The update/render split is clean: `update()` reads input and advances game logic, `render()` draws everything. This separation makes it easy to add systems in later steps.
- The outer canvas is filled with near-black (`#080a08`) before the GameRenderer draws the arena, so any letterboxing outside the arena is dark.

---

### 6. Create the Platform Adapter

**File:** `src/contexts/canvas2d/games/zombie-survival/adapters/PlatformAdapter.ts`

```typescript
import { ZombieEngine } from '../ZombieEngine.ts';

export class PlatformAdapter {
  private engine: ZombieEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new ZombieEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.stop();
  }
}
```

---

### 7. Create the Entry Point

**File:** `src/contexts/canvas2d/games/zombie-survival/index.ts`

```typescript
import { PlatformAdapter } from './adapters/PlatformAdapter.ts';

export function createZombieSurvival(canvas: HTMLCanvasElement, onExit: () => void) {
  const adapter = new PlatformAdapter(canvas, onExit);
  adapter.start();
  return { destroy: () => adapter.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Zombie Survival game in your browser
3. **Observe:**
   - Dark green arena centered in the viewport with subtle 50px grid lines
   - A **blue player circle** with white eyes and a gun barrel line
   - **Move with WASD** -- the player slides smoothly at 180 px/s
   - **Move the mouse** -- the gun barrel and eyes track the cursor
   - **Hold W+D** together -- diagonal speed matches cardinal speed (normalized)
   - **Walk to the edges** -- the player stops at the arena border
   - **Resize the window** -- the arena scales and re-centers

---

## Challenges

**Easy:**
- Change the player color from blue (`#3498db`) to green and increase `PLAYER_RADIUS` to 18.
- Change the grid line spacing from 50px to 100px.

**Medium:**
- Add a "crosshair" circle at the mouse position so aiming is more visible. Draw it in the GameRenderer after the player.

**Hard:**
- Add a trail effect: store the last 10 player positions and draw fading circles behind the player as they move.

---

## What You Learned

- Defining a comprehensive game state type with entity interfaces and constants
- Building an input system that collects keyboard and mouse into snapshots
- Implementing delta-time movement with diagonal normalization
- Scaling a fixed-size arena to fit any viewport using canvas transforms

**Next:** Shooting Mechanics -- aim and fire bullets at zombies with limited ammo!
