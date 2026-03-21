# Step 1: Project Setup & Player Rendering

**Goal:** Draw the player and arena from a top-down view with a dark background, grid overlay, and arena border.

**Time:** ~15 minutes

---

## What You'll Build

- **Dark arena background** with a subtle grid overlay for visual depth
- **Arena border** that defines the playable area
- **Player circle** rendered at the center of the screen
- **Type definitions** for the entire game state up front
- **Platform adapter** and entry point wiring
- **Responsive canvas** that resizes with the window

---

## Concepts

- **Top-Down Perspective**: Unlike a side-view platformer, a top-down shooter views the world from above. The player is a circle, and movement happens in all four directions equally.
- **Arena Boundaries**: A padded rectangle inside the canvas defines where the player and enemies can exist. `ARENA_PADDING` keeps everything away from the screen edge.
- **Vec2 Pattern**: A simple `{ x, y }` interface used for positions, velocities, and directions throughout the game.
- **State-Driven Architecture**: A single `ShooterState` object holds everything -- player, bullets, enemies, particles, input, and wave data. Systems read and mutate this state each frame.

---

## Code

### 1. Create Types

**File:** `src/contexts/canvas2d/games/topdown-shooter/types.ts`

All constants and interfaces for the entire game, defined up front so later steps never need to restructure.

```typescript
// ── Constants ────────────────────────────────────────────────────────
export const PLAYER_RADIUS = 18;
export const PLAYER_SPEED = 220;
export const PLAYER_MAX_HP = 100;
export const BULLET_SPEED = 600;
export const BULLET_RADIUS = 4;
export const BULLET_LIFETIME = 1.5; // seconds
export const SHOOT_COOLDOWN = 0.15; // seconds between shots
export const ARENA_PADDING = 40;
export const PARTICLE_LIFETIME = 0.4;
export const HS_KEY = 'topdown_shooter_highscore';

// ── Interfaces ───────────────────────────────────────────────────────
export interface Vec2 {
  x: number;
  y: number;
}

export interface Player {
  pos: Vec2;
  hp: number;
  maxHp: number;
  radius: number;
  shootCooldown: number;
  invincibleTimer: number;
}

export interface Bullet {
  pos: Vec2;
  vel: Vec2;
  age: number;
  radius: number;
  fromPlayer: boolean;
}

export type EnemyType = 'normal' | 'fast' | 'tank' | 'ranged';

export interface Enemy {
  pos: Vec2;
  vel: Vec2;
  hp: number;
  maxHp: number;
  radius: number;
  speed: number;
  type: EnemyType;
  color: string;
  /** For ranged enemies: seconds until next shot */
  shootTimer: number;
  damage: number;
}

export interface Particle {
  pos: Vec2;
  vel: Vec2;
  age: number;
  lifetime: number;
  color: string;
  radius: number;
}

export interface WaveData {
  wave: number;
  enemiesRemaining: number;
  spawnTimer: number;
  spawnInterval: number;
  betweenWaveTimer: number;
  active: boolean;
}

export interface ShooterState {
  canvasW: number;
  canvasH: number;
  player: Player;
  bullets: Bullet[];
  enemies: Enemy[];
  particles: Particle[];
  waveData: WaveData;
  score: number;
  highScore: number;
  kills: number;
  gameOver: boolean;
  paused: boolean;
  started: boolean;
  // input state
  keys: Set<string>;
  mouse: Vec2;
  mouseDown: boolean;
}
```

**What's happening:**
- `Vec2` is the foundation -- every position and velocity uses `{ x, y }`.
- `Player` tracks position, health, shoot cooldown, and an invincibility timer for damage feedback.
- `Bullet` has a `fromPlayer` flag so we know whether it should hit enemies or the player.
- `Enemy` includes a `type` field that determines behavior: normal enemies chase, fast enemies are quick, tanks are tough, ranged enemies shoot back.
- `ShooterState` is the single source of truth. Every system reads and writes this object. Input state (`keys`, `mouse`, `mouseDown`) lives here too so systems can query it without holding references to DOM events.

---

### 2. Create the Game Renderer

**File:** `src/contexts/canvas2d/games/topdown-shooter/renderers/GameRenderer.ts`

Draws the arena background, grid, and player. We will add bullets, enemies, and particles in later steps.

```typescript
import type { ShooterState } from '../types';
import { ARENA_PADDING, PLAYER_RADIUS } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: ShooterState): void {
    const W = state.canvasW;
    const H = state.canvasH;

    // ── Background ───────────────────────────────────────────────
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    // ── Arena border ─────────────────────────────────────────────
    const ap = ARENA_PADDING;
    ctx.strokeStyle = '#333355';
    ctx.lineWidth = 2;
    ctx.strokeRect(ap, ap, W - ap * 2, H - ap * 2);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const gridSize = 60;

    for (let x = ap; x < W - ap; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, ap);
      ctx.lineTo(x, H - ap);
      ctx.stroke();
    }

    for (let y = ap; y < H - ap; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(ap, y);
      ctx.lineTo(W - ap, y);
      ctx.stroke();
    }

    // ── Player ───────────────────────────────────────────────────
    const { player } = state;

    // Player body
    ctx.fillStyle = '#42a5f5';
    ctx.beginPath();
    ctx.arc(player.pos.x, player.pos.y, player.radius, 0, Math.PI * 2);
    ctx.fill();

    // Player outline glow
    ctx.strokeStyle = '#90caf9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.pos.x, player.pos.y, player.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}
```

**What's happening:**
- The background is a deep navy (`#1a1a2e`) -- dark enough that bright bullets and enemies will pop.
- The arena border is a 2px rectangle inset by `ARENA_PADDING` (40px) from each edge. This defines the playable area.
- Grid lines at 60px intervals give the arena a subtle "floor tile" effect at only 3% opacity, so they are visible without being distracting.
- The player is drawn as a blue circle (`#42a5f5`) with a lighter outline glow (`#90caf9`). The outline makes the player stand out against the dark background.

---

### 3. Create the Engine

**File:** `src/contexts/canvas2d/games/topdown-shooter/ShooterEngine.ts`

The engine creates initial state, runs the game loop, and coordinates rendering.

```typescript
import type { ShooterState } from './types';
import { PLAYER_RADIUS, PLAYER_MAX_HP } from './types';
import { GameRenderer } from './renderers/GameRenderer';

export class ShooterEngine {
  private ctx: CanvasRenderingContext2D;
  private state: ShooterState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private gameRenderer: GameRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.createInitialState(canvas.width, canvas.height);
    this.gameRenderer = new GameRenderer();

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
    this.lastTime = performance.now();
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05); // cap at 50ms
    this.lastTime = now;

    this.gameRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private createInitialState(w: number, h: number): ShooterState {
    return {
      canvasW: w,
      canvasH: h,
      player: {
        pos: { x: w / 2, y: h / 2 },
        hp: PLAYER_MAX_HP,
        maxHp: PLAYER_MAX_HP,
        radius: PLAYER_RADIUS,
        shootCooldown: 0,
        invincibleTimer: 0,
      },
      bullets: [],
      enemies: [],
      particles: [],
      waveData: {
        wave: 0,
        enemiesRemaining: 0,
        spawnTimer: 0,
        spawnInterval: 1,
        betweenWaveTimer: 1.5,
        active: false,
      },
      score: 0,
      highScore: 0,
      kills: 0,
      gameOver: false,
      paused: false,
      started: true,
      keys: new Set(),
      mouse: { x: w / 2, y: h / 2 },
      mouseDown: false,
    };
  }
}
```

**What's happening:**
- The constructor sizes the canvas to fill the browser window and creates the initial state with the player centered.
- `createInitialState()` builds the full `ShooterState` with sensible defaults. The player starts at the center, all arrays are empty, and the game begins immediately (`started: true`).
- The game loop uses `requestAnimationFrame` and calculates `dt` (delta time in seconds) for frame-rate-independent updates. The `Math.min(..., 0.05)` cap prevents huge jumps if the tab is backgrounded.
- The resize handler keeps `canvasW` and `canvasH` in sync so rendering always uses the current window size.

---

### 4. Create the Platform Adapter

**File:** `src/contexts/canvas2d/games/topdown-shooter/adapters/PlatformAdapter.ts`

A thin wrapper so the game plugs into any host page.

```typescript
import { ShooterEngine } from '../ShooterEngine';

export class PlatformAdapter {
  private engine: ShooterEngine;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new ShooterEngine(canvas);
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

### 5. Create the Entry Point

**File:** `src/contexts/canvas2d/games/topdown-shooter/index.ts`

```typescript
import { PlatformAdapter } from './adapters/PlatformAdapter';

export function createTopDownShooter(canvas: HTMLCanvasElement): { destroy: () => void } {
  const adapter = new PlatformAdapter(canvas);
  adapter.start();
  return { destroy: () => adapter.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Top-Down Shooter game in your browser
3. **Observe:**
   - Dark navy background filling the entire window
   - A **rectangle border** inset 40px from each edge defining the arena
   - Faint **grid lines** every 60px inside the arena
   - A **blue circle** (the player) centered on screen with a lighter blue outline
   - **Resize the window** and confirm the arena and player adjust correctly

---

## Challenges

**Easy:**
- Change the player color from blue (`#42a5f5`) to green and see how it looks against the dark background.
- Increase `ARENA_PADDING` to 80 and notice how the playable area shrinks.

**Medium:**
- Add a small white dot at the center of the player circle to give it a "core" effect.

**Hard:**
- Draw concentric ring "ripples" radiating outward from the player that pulse using `Math.sin(performance.now())`.

---

## What You Learned

- Defining a complete game state type with player, bullet, enemy, and wave interfaces
- Drawing a top-down arena with background, border, and grid overlay
- Setting up a `requestAnimationFrame` game loop with delta-time calculation
- Structuring the project with separate types, renderer, engine, and adapter files

**Next:** WASD movement and mouse aiming -- make the player respond to keyboard and cursor input!
