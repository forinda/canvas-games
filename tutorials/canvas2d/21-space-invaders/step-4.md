# Step 4: Alien Shooting & Shields

**Goal:** Aliens shoot back at the player randomly, and 4 destructible shield barriers protect the player.

**Time:** ~15 minutes

---

## What You'll Build

The defensive layer:
- **Alien shooting**: The bottom-most alien in each column periodically fires a bullet downward
- **Shoot timer**: Aliens fire on a randomized interval, creating unpredictable patterns
- **4 shield barriers**: Evenly spaced arch-shaped shields above the player
- **Pixel-by-pixel destruction**: Bullets erode shield pixels on contact, both from above and below
- **Bullet-player collision**: Alien bullets hitting the player triggers a game-over (lives come in Step 6)

---

## Concepts

- **Bottom-Row Shooter Selection**: For each column, find the lowest alive alien -- only it can shoot. This prevents bullets firing from behind other aliens.
- **Randomized Timer**: Reset the shoot timer with a random multiplier so aliens do not fire in a predictable rhythm.
- **Boolean Grid Shields**: Each shield is a 2D grid of booleans. `true` means that pixel-block is intact; setting it to `false` erodes it.
- **Local Coordinate Mapping**: Convert bullet world-position to shield-local position to determine which grid cells are hit.

---

## Code

### 1. Update Types

**File:** `src/contexts/canvas2d/games/space-invaders/types.ts`

Add alien shooting constants, the `Shield` interface, and shield layout constants. Replace the entire file.

```typescript
// ── Constants ──────────────────────────────────────────────────────────────

export const CANVAS_W = 800;
export const CANVAS_H = 600;

export const PLAYER_W = 40;
export const PLAYER_H = 20;
export const PLAYER_SPEED = 300;
export const PLAYER_SHOOT_COOLDOWN = 0.4;

export const ALIEN_W = 30;
export const ALIEN_H = 24;
export const ALIEN_PADDING = 14;
export const ALIEN_BASE_SPEED = 40;
export const ALIEN_DROP = 16;
export const ALIEN_SHOOT_INTERVAL = 1.2; // base seconds between alien shots

export const BULLET_W = 4;
export const BULLET_H = 12;
export const PLAYER_BULLET_SPEED = -450;
export const ALIEN_BULLET_SPEED = 250; // positive = down

export const SHIELD_COLS = 4;
export const SHIELD_BLOCK_SIZE = 4; // each shield "pixel" in real pixels
export const SHIELD_W = 44; // total shield width in pixels
export const SHIELD_H = 32;
export const SHIELD_Y = CANVAS_H - 100;

export const HUD_HEIGHT = 36;

// ── Entity types ───────────────────────────────────────────────────────────

export const AlienType = {
  Small: 0,
  Medium: 1,
  Large: 2,
} as const;

export type AlienType = (typeof AlienType)[keyof typeof AlienType];

export interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  shootCooldown: number;
  cooldownLeft: number;
}

export interface Alien {
  row: number;
  col: number;
  x: number;
  y: number;
  w: number;
  h: number;
  type: AlienType;
  alive: boolean;
  points: number;
}

export interface Bullet {
  x: number;
  y: number;
  w: number;
  h: number;
  vy: number;
  fromPlayer: boolean;
  active: boolean;
}

/** A shield is a grid of boolean "pixels". When hit, pixels are removed. */
export interface Shield {
  x: number;
  y: number;
  grid: boolean[][]; // [row][col] – true = intact
  rows: number;
  cols: number;
  blockSize: number;
}

// ── Aggregate game state ───────────────────────────────────────────────────

export type GamePhase = 'playing' | 'gameover';

export interface InvadersState {
  phase: GamePhase;
  player: Player;
  aliens: Alien[];
  bullets: Bullet[];
  shields: Shield[];

  alienDir: 1 | -1;
  alienSpeedMultiplier: number;
  alienShootTimer: number;

  score: number;

  input: {
    left: boolean;
    right: boolean;
    shoot: boolean;
  };

  canvasW: number;
  canvasH: number;
}
```

**What's happening:**
- `ALIEN_SHOOT_INTERVAL` of 1.2 seconds is the base delay. It will be multiplied by a random factor each time, so shots come irregularly.
- `ALIEN_BULLET_SPEED` is positive (250 px/s downward), the opposite of the player's negative bullet speed.
- The `Shield` interface stores a 2D boolean grid. With `SHIELD_W=44` and `SHIELD_BLOCK_SIZE=4`, each shield is an 11x8 grid of destructible blocks.
- `alienShootTimer` is added to the state so it persists across frames.

---

### 2. Update the Alien System

**File:** `src/contexts/canvas2d/games/space-invaders/systems/AlienSystem.ts`

Add the shooting logic that picks a random bottom-row alien to fire.

```typescript
import type { Alien, InvadersState } from '../types';
import {
  ALIEN_BASE_SPEED,
  ALIEN_DROP,
  ALIEN_SHOOT_INTERVAL,
  ALIEN_BULLET_SPEED,
  BULLET_W,
  BULLET_H,
} from '../types';

export class AlienSystem {
  update(state: InvadersState, dt: number): void {
    if (state.phase !== 'playing') return;

    const alive = state.aliens.filter((a) => a.alive);
    if (alive.length === 0) return;

    // ── Speed scales with how many aliens remain ────────────────────────
    const totalAliens = state.aliens.length;
    const ratio = alive.length / totalAliens;
    state.alienSpeedMultiplier = 1 + (1 - ratio) * 3;

    const speed = ALIEN_BASE_SPEED * state.alienSpeedMultiplier;

    // ── Horizontal movement ─────────────────────────────────────────────
    const dx = speed * state.alienDir * dt;
    let shouldDrop = false;

    for (const a of alive) {
      a.x += dx;
      if (a.x + a.w > state.canvasW - 4 || a.x < 4) {
        shouldDrop = true;
      }
    }

    if (shouldDrop) {
      state.alienDir = (state.alienDir * -1) as 1 | -1;
      for (const a of alive) {
        a.y += ALIEN_DROP;
      }
      for (const a of alive) {
        if (a.y + a.h >= state.player.y) {
          state.phase = 'gameover';
          return;
        }
      }
    }

    // ── Alien shooting ──────────────────────────────────────────────────
    state.alienShootTimer -= dt;

    if (state.alienShootTimer <= 0) {
      // Reset with randomized delay
      state.alienShootTimer = ALIEN_SHOOT_INTERVAL * (0.5 + Math.random());

      // Pick a random alien from the bottom of each column
      const bottomAliens = this.getBottomAliens(alive);
      if (bottomAliens.length > 0) {
        const shooter =
          bottomAliens[Math.floor(Math.random() * bottomAliens.length)];
        state.bullets.push({
          x: shooter.x + shooter.w / 2 - BULLET_W / 2,
          y: shooter.y + shooter.h,
          w: BULLET_W,
          h: BULLET_H,
          vy: ALIEN_BULLET_SPEED,
          fromPlayer: false,
          active: true,
        });
      }
    }
  }

  /** For each column, find the lowest alive alien. */
  private getBottomAliens(alive: Alien[]): Alien[] {
    const cols = new Map<number, Alien>();
    for (const a of alive) {
      const existing = cols.get(a.col);
      if (!existing || a.row > existing.row) {
        cols.set(a.col, a);
      }
    }
    return [...cols.values()];
  }
}
```

**What's happening:**
- `getBottomAliens` groups alive aliens by column and keeps the one with the highest row index (lowest on screen). Only these can shoot, preventing bullets from appearing in the middle of the formation.
- The timer resets to `ALIEN_SHOOT_INTERVAL * (0.5 + Math.random())`, giving a range of 0.6 to 1.4 seconds. This randomness makes the threat feel organic.
- Each alien bullet spawns centered below the shooter and travels downward at 250 px/s.

---

### 3. Update the Collision System

**File:** `src/contexts/canvas2d/games/space-invaders/systems/CollisionSystem.ts`

Add alien-bullet-to-player collision and bullet-to-shield collision.

```typescript
import type { InvadersState, Bullet, Shield } from '../types';

function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export class CollisionSystem {
  update(state: InvadersState, _dt: number): void {
    if (state.phase !== 'playing') return;

    for (const bullet of state.bullets) {
      if (!bullet.active) continue;

      // ── Off-screen removal ──────────────────────────────────────────
      if (bullet.y + bullet.h < 0 || bullet.y > state.canvasH) {
        bullet.active = false;
        continue;
      }

      if (bullet.fromPlayer) {
        // ── Player bullet vs aliens ─────────────────────────────────
        for (const alien of state.aliens) {
          if (!alien.alive) continue;
          if (
            rectsOverlap(
              bullet.x, bullet.y, bullet.w, bullet.h,
              alien.x, alien.y, alien.w, alien.h,
            )
          ) {
            alien.alive = false;
            bullet.active = false;
            state.score += alien.points;
            break;
          }
        }
      } else {
        // ── Alien bullet vs player ──────────────────────────────────
        const p = state.player;
        if (
          rectsOverlap(
            bullet.x, bullet.y, bullet.w, bullet.h,
            p.x, p.y, p.w, p.h,
          )
        ) {
          bullet.active = false;
          state.phase = 'gameover'; // lives come in Step 6
          continue;
        }
      }

      // ── Any bullet vs shields ─────────────────────────────────────
      if (bullet.active) {
        this.checkShields(bullet, state.shields);
      }
    }

    // Purge inactive bullets
    state.bullets = state.bullets.filter((b) => b.active);

    // ── Check level clear ─────────────────────────────────────────────
    if (state.aliens.every((a) => !a.alive)) {
      state.phase = 'gameover'; // wave progression comes in Step 5
    }
  }

  private checkShields(bullet: Bullet, shields: Shield[]): void {
    for (const shield of shields) {
      const shieldPxW = shield.cols * shield.blockSize;
      const shieldPxH = shield.rows * shield.blockSize;

      // Quick bounding-box check against the whole shield
      if (
        !rectsOverlap(
          bullet.x, bullet.y, bullet.w, bullet.h,
          shield.x, shield.y, shieldPxW, shieldPxH,
        )
      ) {
        continue;
      }

      // Convert bullet position to shield-local coordinates
      const localX = bullet.x - shield.x;
      const localY = bullet.y - shield.y;

      const colStart = Math.max(0, Math.floor(localX / shield.blockSize));
      const colEnd = Math.min(
        shield.cols - 1,
        Math.floor((localX + bullet.w) / shield.blockSize),
      );
      const rowStart = Math.max(0, Math.floor(localY / shield.blockSize));
      const rowEnd = Math.min(
        shield.rows - 1,
        Math.floor((localY + bullet.h) / shield.blockSize),
      );

      let hit = false;
      for (let r = rowStart; r <= rowEnd; r++) {
        for (let c = colStart; c <= colEnd; c++) {
          if (shield.grid[r][c]) {
            shield.grid[r][c] = false;
            hit = true;
          }
        }
      }

      if (hit) {
        bullet.active = false;
        return; // bullet consumed by shield
      }
    }
  }
}
```

**What's happening:**
- Alien bullets now check against the player. A hit is currently instant game-over; we will add lives in Step 6.
- Both player bullets and alien bullets check against shields. This means you can accidentally destroy your own cover by shooting through it, just like the original game.
- Shield collision converts the bullet's world position to shield-local coordinates, then maps those to grid cells. Every intact cell the bullet overlaps gets set to `false` (destroyed), and the bullet is consumed.
- The two-phase approach (bounding-box check first, then grid-cell check) avoids expensive per-pixel math for bullets nowhere near a shield.

---

### 4. Update the Game Renderer

**File:** `src/contexts/canvas2d/games/space-invaders/renderers/GameRenderer.ts`

Add shield drawing and color alien bullets differently from player bullets.

```typescript
import type { InvadersState } from '../types';
import { AlienType } from '../types';

const ALIEN_COLORS: Record<AlienType, string> = {
  [AlienType.Small]: '#ff4444',
  [AlienType.Medium]: '#44ff44',
  [AlienType.Large]: '#44aaff',
};

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: InvadersState): void {
    // ── Clear ───────────────────────────────────────────────────────────
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, state.canvasW, state.canvasH);

    // ── Shields ─────────────────────────────────────────────────────────
    ctx.fillStyle = '#33cc33';
    for (const shield of state.shields) {
      for (let r = 0; r < shield.rows; r++) {
        for (let c = 0; c < shield.cols; c++) {
          if (shield.grid[r][c]) {
            ctx.fillRect(
              shield.x + c * shield.blockSize,
              shield.y + r * shield.blockSize,
              shield.blockSize,
              shield.blockSize,
            );
          }
        }
      }
    }

    // ── Aliens ──────────────────────────────────────────────────────────
    for (const alien of state.aliens) {
      if (!alien.alive) continue;
      ctx.fillStyle = ALIEN_COLORS[alien.type];
      ctx.fillRect(alien.x, alien.y, alien.w, alien.h);
    }

    // ── Player ──────────────────────────────────────────────────────────
    const p = state.player;
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(p.x, p.y + 6, p.w, p.h - 6);
    ctx.fillRect(p.x + p.w / 2 - 3, p.y, 6, 8);

    // ── Bullets ─────────────────────────────────────────────────────────
    for (const b of state.bullets) {
      if (!b.active) continue;
      ctx.fillStyle = b.fromPlayer ? '#ffffff' : '#ff6644';
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
  }
}
```

**What's happening:**
- Shields are drawn as a grid of small green squares. Each intact cell (`grid[r][c] === true`) renders a 4x4 pixel block.
- Player bullets are white, alien bullets are orange-red. This makes it easy to tell friend from foe at a glance.
- Shields are drawn before aliens and the player so they appear behind bullets in the z-order.

---

### 5. Update the Engine

**File:** `src/contexts/canvas2d/games/space-invaders/InvadersEngine.ts`

Add shield building and the `alienShootTimer` to the state. Replace the entire file.

```typescript
import type { InvadersState, Shield } from './types';
import {
  CANVAS_W,
  CANVAS_H,
  PLAYER_W,
  PLAYER_H,
  PLAYER_SPEED,
  PLAYER_SHOOT_COOLDOWN,
  SHIELD_COLS,
  SHIELD_BLOCK_SIZE,
  SHIELD_W,
  SHIELD_H,
  SHIELD_Y,
} from './types';
import { buildFormation } from './data/formations';
import { InputSystem } from './systems/InputSystem';
import { PlayerSystem } from './systems/PlayerSystem';
import { AlienSystem } from './systems/AlienSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class InvadersEngine {
  private ctx: CanvasRenderingContext2D;
  private state: InvadersState;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private playerSystem = new PlayerSystem();
  private alienSystem = new AlienSystem();
  private collisionSystem = new CollisionSystem();
  private gameRenderer = new GameRenderer();
  private hudRenderer = new HUDRenderer();

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    this.ctx = canvas.getContext('2d')!;

    this.inputSystem = new InputSystem();

    this.state = {
      phase: 'playing',
      player: {
        x: CANVAS_W / 2 - PLAYER_W / 2,
        y: CANVAS_H - 40,
        w: PLAYER_W,
        h: PLAYER_H,
        speed: PLAYER_SPEED,
        shootCooldown: PLAYER_SHOOT_COOLDOWN,
        cooldownLeft: 0,
      },
      aliens: buildFormation(CANVAS_W),
      bullets: [],
      shields: this.buildShields(),
      alienDir: 1,
      alienSpeedMultiplier: 1,
      alienShootTimer: 1,
      score: 0,
      input: { left: false, right: false, shoot: false },
      canvasW: CANVAS_W,
      canvasH: CANVAS_H,
    };
  }

  start(): void {
    this.inputSystem.attach();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
  }

  private buildShields(): Shield[] {
    const shields: Shield[] = [];
    const gap = CANVAS_W / (SHIELD_COLS + 1);

    const cols = Math.floor(SHIELD_W / SHIELD_BLOCK_SIZE); // 11
    const rows = Math.floor(SHIELD_H / SHIELD_BLOCK_SIZE); // 8

    for (let i = 0; i < SHIELD_COLS; i++) {
      const grid: boolean[][] = [];
      for (let r = 0; r < rows; r++) {
        grid[r] = [];
        for (let c = 0; c < cols; c++) {
          // Arch shape: remove the bottom-center notch
          const isNotch =
            r >= rows - 3 &&
            c >= Math.floor(cols / 2) - 2 &&
            c <= Math.floor(cols / 2) + 1;
          // Round the top corners
          const isCorner = r === 0 && (c === 0 || c === cols - 1);
          grid[r][c] = !isNotch && !isCorner;
        }
      }

      shields.push({
        x: gap * (i + 1) - SHIELD_W / 2,
        y: SHIELD_Y,
        grid,
        rows,
        cols,
        blockSize: SHIELD_BLOCK_SIZE,
      });
    }

    return shields;
  }

  private loop = (now: number): void => {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.inputSystem.poll(this.state);

    // Update systems
    this.playerSystem.update(this.state, dt);
    this.alienSystem.update(this.state, dt);

    // Move bullets
    for (const b of this.state.bullets) {
      b.y += b.vy * dt;
    }

    // Collision detection
    this.collisionSystem.update(this.state, dt);

    // Render
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(this.loop);
  };
}
```

**What's happening:**
- `buildShields` creates 4 shields evenly spaced across the canvas. Each shield is an 11x8 grid of boolean pixels.
- The arch shape is carved by removing the bottom-center 4-wide, 3-tall notch and rounding two top-corner pixels. This matches the classic Space Invaders shield silhouette.
- Shields sit at `SHIELD_Y = 500` (100px from the bottom), between the aliens above and the player below.
- `alienShootTimer` starts at 1 second so aliens do not fire immediately on game start.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Space Invaders game
3. **Observe:**
   - Four green arch-shaped shields appear above the player
   - Aliens periodically fire orange-red bullets downward
   - Alien bullets hit shields and erode them pixel by pixel
   - Your own bullets also erode shields from below if you shoot through them
   - An alien bullet hitting your ship triggers game over
   - Shields gradually crumble under sustained fire from both sides

**Try shooting a hole through your own shield.** Fire repeatedly at one spot and you will bore a tunnel through it. Then watch as alien bullets find the same gap. Shields are a shared resource that both sides consume.

---

## Challenges

**Easy:**
- Change the shield color from green to blue.
- Increase the number of shields from 4 to 6 by changing `SHIELD_COLS`.
- Make alien bullets faster (change `ALIEN_BULLET_SPEED` to `400`).

**Medium:**
- Make alien fire rate increase as more aliens die (divide `ALIEN_SHOOT_INTERVAL` by `alienSpeedMultiplier`).
- Add a larger erosion radius: when a bullet hits a shield, also destroy the 8 neighboring pixels around each hit cell.

**Hard:**
- Implement shield regeneration: every 10 seconds, restore one random destroyed pixel per shield.
- Make aliens avoid shooting when a shield is directly below them (check if any shield pixel is between the shooter and the player).

---

## What You Learned

- Bottom-row alien selection for realistic downward shooting
- Randomized timers for organic-feeling enemy behavior
- Boolean-grid shields with pixel-level destruction
- World-to-local coordinate conversion for grid collision
- Two-phase collision (broad bounding-box, then narrow grid-cell)
- Both player and enemy bullets interacting with the same destructible objects

**Next:** A UFO bonus target and wave progression!
