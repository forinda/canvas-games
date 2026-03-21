# Step 5: UFO Bonus & Waves

**Goal:** Add a random UFO that flies across the top for bonus points, and implement wave progression with increasing difficulty.

**Time:** ~15 minutes

---

## What You'll Build

Risk-reward and replayability:
- **Mystery UFO**: A saucer appears randomly every 15-30 seconds, flying across the top of the screen
- **Bonus points**: Shooting the UFO awards 300 points
- **Wave progression**: Clearing all aliens starts the next wave after a brief "WAVE CLEARED" message
- **Increasing difficulty**: Each new wave has 15% faster aliens and 10% faster alien shooting
- **Level tracking**: A level counter tracks which wave you are on

---

## Concepts

- **Random Spawn Timer**: Generate a random delay between a min and max interval. When it expires, spawn the UFO and reset the timer.
- **Off-Screen Cleanup**: The UFO starts just off one edge and travels to the other. Once fully off-screen, deactivate it.
- **Level Transition State**: A dedicated `'levelclear'` phase pauses gameplay, shows a message, then reinitializes the alien formation.
- **Difficulty Scaling**: Multiply base speeds and intervals by level-dependent factors.

---

## Code

### 1. Update Types

**File:** `src/contexts/canvas2d/games/space-invaders/types.ts`

Add UFO constants, the `UFO` interface, and new game phases. Replace the entire file.

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
export const ALIEN_SHOOT_INTERVAL = 1.2;

export const BULLET_W = 4;
export const BULLET_H = 12;
export const PLAYER_BULLET_SPEED = -450;
export const ALIEN_BULLET_SPEED = 250;

export const SHIELD_COLS = 4;
export const SHIELD_BLOCK_SIZE = 4;
export const SHIELD_W = 44;
export const SHIELD_H = 32;
export const SHIELD_Y = CANVAS_H - 100;

export const UFO_W = 40;
export const UFO_H = 16;
export const UFO_SPEED = 120;
export const UFO_SPAWN_INTERVAL_MIN = 15; // seconds
export const UFO_SPAWN_INTERVAL_MAX = 30;
export const UFO_POINTS = 300;

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

export interface Shield {
  x: number;
  y: number;
  grid: boolean[][];
  rows: number;
  cols: number;
  blockSize: number;
}

export interface UFO {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  active: boolean;
  points: number;
}

// ── Aggregate game state ───────────────────────────────────────────────────

export type GamePhase = 'playing' | 'gameover' | 'levelclear';

export interface InvadersState {
  phase: GamePhase;
  player: Player;
  aliens: Alien[];
  bullets: Bullet[];
  shields: Shield[];
  ufo: UFO | null;
  ufoTimer: number;

  alienDir: 1 | -1;
  alienSpeedMultiplier: number;
  alienShootTimer: number;

  score: number;
  level: number;
  levelClearTimer: number;

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
- `UFO` has a horizontal velocity (`vx`) that can be positive (going right) or negative (going left). It has no vertical movement.
- `ufoTimer` counts down until the next UFO spawn. `ufo` is `null` when no UFO is active.
- `GamePhase` now includes `'levelclear'` for the brief transition between waves.
- `level` tracks the current wave number, and `levelClearTimer` controls how long the "WAVE CLEARED" message displays.

---

### 2. Create the UFO System

**File:** `src/contexts/canvas2d/games/space-invaders/systems/UFOSystem.ts`

Manage the UFO spawn timer and movement.

```typescript
import type { InvadersState } from '../types';
import {
  UFO_W,
  UFO_H,
  UFO_SPEED,
  UFO_SPAWN_INTERVAL_MIN,
  UFO_SPAWN_INTERVAL_MAX,
  UFO_POINTS,
  HUD_HEIGHT,
} from '../types';

function randomInterval(): number {
  return (
    UFO_SPAWN_INTERVAL_MIN +
    Math.random() * (UFO_SPAWN_INTERVAL_MAX - UFO_SPAWN_INTERVAL_MIN)
  );
}

export class UFOSystem {
  update(state: InvadersState, dt: number): void {
    if (state.phase !== 'playing') return;

    // ── Move active UFO ─────────────────────────────────────────────────
    if (state.ufo?.active) {
      state.ufo.x += state.ufo.vx * dt;
      // Off-screen check
      if (state.ufo.x > state.canvasW + UFO_W || state.ufo.x + UFO_W < 0) {
        state.ufo.active = false;
        state.ufo = null;
      }
      return; // only one UFO at a time
    }

    // ── Spawn timer ─────────────────────────────────────────────────────
    state.ufoTimer -= dt;
    if (state.ufoTimer <= 0) {
      const goingRight = Math.random() > 0.5;
      state.ufo = {
        x: goingRight ? -UFO_W : state.canvasW,
        y: HUD_HEIGHT + 6,
        w: UFO_W,
        h: UFO_H,
        vx: goingRight ? UFO_SPEED : -UFO_SPEED,
        active: true,
        points: UFO_POINTS,
      };
      state.ufoTimer = randomInterval();
    }
  }
}

export { randomInterval as resetUfoTimer };
```

**What's happening:**
- The UFO spawns just off-screen on either the left or right side (50/50 chance) and flies to the opposite side at 120 px/s.
- If not shot, the UFO disappears once it is fully past the far edge and the timer resets.
- `randomInterval()` returns a value between 15 and 30 seconds. We export it as `resetUfoTimer` so the engine can set the initial timer.
- Only one UFO exists at a time. While one is active, the timer does not count down.

---

### 3. Update the Alien System

**File:** `src/contexts/canvas2d/games/space-invaders/systems/AlienSystem.ts`

Add level-based speed scaling to the alien movement and shooting.

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

    // ── Speed scales with remaining aliens AND level ────────────────────
    const totalAliens = state.aliens.length;
    const ratio = alive.length / totalAliens;
    state.alienSpeedMultiplier = 1 + (1 - ratio) * 3;

    const speed =
      ALIEN_BASE_SPEED *
      state.alienSpeedMultiplier *
      (1 + (state.level - 1) * 0.15); // 15% faster per level

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

    // ── Alien shooting (faster at higher levels) ────────────────────────
    const shootInterval =
      ALIEN_SHOOT_INTERVAL / (1 + (state.level - 1) * 0.1);
    state.alienShootTimer -= dt;

    if (state.alienShootTimer <= 0) {
      state.alienShootTimer = shootInterval * (0.5 + Math.random());

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
- Movement speed now includes a level factor: `(1 + (level - 1) * 0.15)`. Level 1 is baseline, level 2 is 15% faster, level 5 is 60% faster.
- The shoot interval shrinks by 10% per level: at level 1 the base is 1.2s, at level 5 it is about 0.86s. Combined with the random multiplier, this makes later waves noticeably more aggressive.

---

### 4. Update the Collision System

**File:** `src/contexts/canvas2d/games/space-invaders/systems/CollisionSystem.ts`

Add player-bullet vs UFO collision and level-clear detection that triggers `'levelclear'` instead of `'gameover'`.

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

        // ── Player bullet vs UFO ────────────────────────────────────
        if (bullet.active && state.ufo?.active) {
          const u = state.ufo;
          if (
            rectsOverlap(
              bullet.x, bullet.y, bullet.w, bullet.h,
              u.x, u.y, u.w, u.h,
            )
          ) {
            state.score += u.points;
            u.active = false;
            bullet.active = false;
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
    if (state.aliens.every((a) => !a.alive) && state.phase === 'playing') {
      state.phase = 'levelclear';
      state.levelClearTimer = 2.0;
    }
  }

  private checkShields(bullet: Bullet, shields: Shield[]): void {
    for (const shield of shields) {
      const shieldPxW = shield.cols * shield.blockSize;
      const shieldPxH = shield.rows * shield.blockSize;

      if (
        !rectsOverlap(
          bullet.x, bullet.y, bullet.w, bullet.h,
          shield.x, shield.y, shieldPxW, shieldPxH,
        )
      ) {
        continue;
      }

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
        return;
      }
    }
  }
}
```

**What's happening:**
- UFO collision follows the same AABB pattern as alien collision. The 300-point bonus makes it worth the risk of shooting at a fast-moving target.
- Level clear now sets `state.phase = 'levelclear'` and starts a 2-second timer, instead of immediately ending the game.

---

### 5. Update the Game Renderer

**File:** `src/contexts/canvas2d/games/space-invaders/renderers/GameRenderer.ts`

Add UFO drawing.

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

    // ── UFO ─────────────────────────────────────────────────────────────
    if (state.ufo?.active) {
      const u = state.ufo;
      ctx.fillStyle = '#ff2277';
      ctx.beginPath();
      ctx.ellipse(
        u.x + u.w / 2, u.y + u.h / 2,
        u.w / 2, u.h / 2,
        0, 0, Math.PI * 2,
      );
      ctx.fill();
      // Dome
      ctx.fillStyle = '#ff88aa';
      ctx.beginPath();
      ctx.ellipse(
        u.x + u.w / 2, u.y + u.h / 2 - 2,
        u.w / 4, u.h / 4,
        0, 0, Math.PI * 2,
      );
      ctx.fill();
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
- The UFO is drawn as two ellipses: a large pink body and a smaller lighter dome on top. This creates a classic flying saucer look with just two canvas calls.
- `ctx.ellipse` takes center coordinates, X radius, Y radius, rotation, and start/end angles. We use the full circle (0 to 2pi).

---

### 6. Update the HUD Renderer

**File:** `src/contexts/canvas2d/games/space-invaders/renderers/HUDRenderer.ts`

Add level display and wave-cleared overlay.

```typescript
import type { InvadersState } from '../types';
import { HUD_HEIGHT } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: InvadersState): void {
    // ── Top bar ─────────────────────────────────────────────────────────
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, state.canvasW, HUD_HEIGHT);

    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.textBaseline = 'middle';

    const midY = HUD_HEIGHT / 2;

    // Score
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${state.score}`, 12, midY);

    // Level
    ctx.textAlign = 'right';
    ctx.fillText(`LEVEL ${state.level}`, state.canvasW - 12, midY);

    // ── Overlays ────────────────────────────────────────────────────────
    if (state.phase === 'gameover') {
      this.drawOverlay(ctx, state, 'GAME OVER', 'Press SPACE to restart');
    } else if (state.phase === 'levelclear') {
      this.drawOverlay(ctx, state, `WAVE ${state.level} CLEARED!`, '');
    }
  }

  private drawOverlay(
    ctx: CanvasRenderingContext2D,
    state: InvadersState,
    title: string,
    subtitle: string,
  ): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, state.canvasW, state.canvasH);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px monospace';
    ctx.fillText(title, state.canvasW / 2, state.canvasH / 2 - 20);

    if (subtitle) {
      ctx.font = '18px monospace';
      ctx.fillStyle = '#aaa';
      ctx.fillText(subtitle, state.canvasW / 2, state.canvasH / 2 + 24);
    }
  }
}
```

**What's happening:**
- The level number appears on the right side of the HUD bar.
- The `drawOverlay` helper is reused for both game-over and wave-cleared states. It draws a semi-transparent backdrop and centered text.
- The wave-cleared message shows which wave was just completed. The subtitle is empty because the next wave starts automatically.

---

### 7. Update the Formation Builder

**File:** `src/contexts/canvas2d/games/space-invaders/data/formations.ts`

Accept a level parameter so higher levels can add extra rows.

```typescript
import type { Alien } from '../types';
import { AlienType, ALIEN_W, ALIEN_H, ALIEN_PADDING, HUD_HEIGHT } from '../types';

export function buildFormation(level: number, canvasW: number): Alien[] {
  const rowTypes: AlienType[] = [
    AlienType.Small,
    AlienType.Medium,
    AlienType.Medium,
    AlienType.Large,
    AlienType.Large,
  ];

  const pointsMap: Record<AlienType, number> = {
    [AlienType.Small]: 30,
    [AlienType.Medium]: 20,
    [AlienType.Large]: 10,
  };

  // Extra rows at higher levels (1 extra every 3 levels, capped at +2)
  const extraRows = Math.min(Math.floor((level - 1) / 3), 2);
  const rows = 5 + extraRows;
  const cols = 11;

  const totalW = cols * (ALIEN_W + ALIEN_PADDING) - ALIEN_PADDING;
  const startX = (canvasW - totalW) / 2;
  const startY = HUD_HEIGHT + 30;

  const aliens: Alien[] = [];

  for (let r = 0; r < rows; r++) {
    const typeIndex = Math.min(r, rowTypes.length - 1);
    const type = rowTypes[typeIndex];
    const points = pointsMap[type];

    for (let c = 0; c < cols; c++) {
      aliens.push({
        row: r,
        col: c,
        x: startX + c * (ALIEN_W + ALIEN_PADDING),
        y: startY + r * (ALIEN_H + ALIEN_PADDING),
        w: ALIEN_W,
        h: ALIEN_H,
        type,
        alive: true,
        points,
      });
    }
  }

  return aliens;
}
```

**What's happening:**
- Level 1-3 has 5 rows (55 aliens), level 4-6 has 6 rows (66 aliens), level 7+ has 7 rows (77 aliens).
- Extra rows use the last type in `rowTypes` (Large), so they appear at the bottom of the formation.
- The `typeIndex` clamp ensures we do not go out of bounds when rows exceed the `rowTypes` array length.

---

### 8. Update the Engine

**File:** `src/contexts/canvas2d/games/space-invaders/InvadersEngine.ts`

Add the UFO system, wave transitions, and restart-on-Space. Replace the entire file.

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
import { UFOSystem, resetUfoTimer } from './systems/UFOSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class InvadersEngine {
  private ctx: CanvasRenderingContext2D;
  private state!: InvadersState;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private playerSystem = new PlayerSystem();
  private alienSystem = new AlienSystem();
  private collisionSystem = new CollisionSystem();
  private ufoSystem = new UFOSystem();
  private gameRenderer = new GameRenderer();
  private hudRenderer = new HUDRenderer();

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    this.ctx = canvas.getContext('2d')!;

    this.inputSystem = new InputSystem();
    this.initState(1, 0);
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

  private initState(level: number, score: number): void {
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
      aliens: buildFormation(level, CANVAS_W),
      bullets: [],
      shields: this.buildShields(),
      ufo: null,
      ufoTimer: resetUfoTimer(),
      alienDir: 1,
      alienSpeedMultiplier: 1,
      alienShootTimer: 1,
      score,
      level,
      levelClearTimer: 0,
      input: { left: false, right: false, shoot: false },
      canvasW: CANVAS_W,
      canvasH: CANVAS_H,
    };
  }

  private buildShields(): Shield[] {
    const shields: Shield[] = [];
    const gap = CANVAS_W / (SHIELD_COLS + 1);

    const cols = Math.floor(SHIELD_W / SHIELD_BLOCK_SIZE);
    const rows = Math.floor(SHIELD_H / SHIELD_BLOCK_SIZE);

    for (let i = 0; i < SHIELD_COLS; i++) {
      const grid: boolean[][] = [];
      for (let r = 0; r < rows; r++) {
        grid[r] = [];
        for (let c = 0; c < cols; c++) {
          const isNotch =
            r >= rows - 3 &&
            c >= Math.floor(cols / 2) - 2 &&
            c <= Math.floor(cols / 2) + 1;
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

    // Handle restart from game over
    if (this.state.phase === 'gameover' && this.state.input.shoot) {
      this.initState(1, 0);
    }

    // Handle level clear transition
    if (this.state.phase === 'levelclear') {
      this.state.levelClearTimer -= dt;
      if (this.state.levelClearTimer <= 0) {
        const nextLevel = this.state.level + 1;
        const currentScore = this.state.score;
        this.initState(nextLevel, currentScore);
      }
    }

    // Update systems
    this.playerSystem.update(this.state, dt);
    this.alienSystem.update(this.state, dt);
    this.ufoSystem.update(this.state, dt);

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
- `initState` is now a method that can be called for both the initial start and wave transitions. It preserves the score when starting a new wave.
- When `phase === 'levelclear'`, the timer counts down for 2 seconds, then `initState` is called with the next level and current score. Shields are rebuilt fresh for each wave.
- Pressing Space during `'gameover'` resets everything to level 1 with score 0.
- The UFO system runs alongside the alien and player systems, managing its own spawn timer independently.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Space Invaders game
3. **Observe:**
   - After 15-30 seconds, a pink saucer flies across the top of the screen
   - Shooting the UFO awards 300 points (check the score jump)
   - Missing the UFO causes it to fly off-screen harmlessly
   - Clear all aliens and "WAVE 1 CLEARED!" appears for 2 seconds
   - Wave 2 starts with a fresh alien grid and rebuilt shields
   - Wave 2 aliens march noticeably faster and shoot more often
   - The level counter in the top-right updates
   - Game over still works -- press Space to restart from level 1

**Try reaching level 4.** You will see a 6th row of aliens added to the formation. The extra row plus the speed increase makes the game significantly harder.

---

## Challenges

**Easy:**
- Change the UFO to be worth 500 points instead of 300.
- Make the wave-cleared message display for 3 seconds instead of 2.
- Change the UFO color to yellow (`#ffff00`).

**Medium:**
- Make the UFO speed increase by 20% per level so it becomes harder to hit.
- Display a floating "+300" text that fades upward when the UFO is hit.

**Hard:**
- Randomize the UFO point value: 100, 200, or 300 points, revealed only after hitting it.
- Add a "bonus round" every 5 levels where only UFOs appear (no alien grid) and the player has 15 seconds to shoot as many as possible.

---

## What You Learned

- Random spawn timers with min/max interval ranges
- Off-screen entity cleanup
- Level transition with a timed intermediate phase
- Difficulty scaling through multiplicative speed and interval factors
- State reinitialization that preserves score across waves
- Drawing ellipses for the classic flying saucer shape

**Next:** Lives, high score, and visual polish to complete the game!
