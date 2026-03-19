# Step 6: Lives, Score & Polish

**Goal:** Add 3 lives with respawn, persistent high score, full HUD, pixel-art alien sprites, pause, and start/game-over overlays.

**Time:** ~15 minutes

---

## What You'll Build

The final, polished game:
- **3 lives**: Getting hit costs a life; the ship respawns after 1.5 seconds of flashing
- **High score**: Persisted to `localStorage`, displayed in the HUD
- **Full HUD**: Score, high score, level, and tiny ship icons for remaining lives
- **Pixel-art aliens**: 1-bit sprite data rendered as colored pixel blocks, replacing the plain rectangles
- **Pause**: Press P or Escape to pause/unpause
- **Start overlay**: "Press SPACE to start" instead of jumping straight into gameplay
- **Game-over overlay**: Final score display with restart prompt

---

## Concepts

- **Respawn Invulnerability**: After death, the ship flashes at reduced opacity for 1.5 seconds. During this window, the ship cannot shoot but also cannot be hit again.
- **1-Bit Sprite Encoding**: Each sprite row is a binary number. A `1` bit means "draw a pixel." This gives authentic pixel-art without loading image files.
- **localStorage Persistence**: Save the high score after each game. Load it on startup. Wrap in try/catch for environments where storage is unavailable.
- **Pause Toggle**: A single-fire flag prevents holding P from toggling pause every frame.

---

## Code

### 1. Final Types

**File:** `src/games/space-invaders/types.ts`

Add `PLAYER_START_LIVES`, the `respawning` and `paused` phases, and the `pause` input flag. Replace the entire file.

```typescript
// ── Constants ──────────────────────────────────────────────────────────────

export const CANVAS_W = 800;
export const CANVAS_H = 600;

export const PLAYER_W = 40;
export const PLAYER_H = 20;
export const PLAYER_SPEED = 300;
export const PLAYER_SHOOT_COOLDOWN = 0.4;
export const PLAYER_START_LIVES = 3;

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
export const UFO_SPAWN_INTERVAL_MIN = 15;
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
  alive: boolean;
  respawnTimer: number;
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

export type GamePhase = 'playing' | 'respawning' | 'gameover' | 'levelclear' | 'paused';

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
  highScore: number;
  lives: number;
  level: number;
  levelClearTimer: number;

  input: {
    left: boolean;
    right: boolean;
    shoot: boolean;
    pause: boolean;
  };

  canvasW: number;
  canvasH: number;
}
```

**What's happening:**
- `Player` now has `alive` and `respawnTimer` fields for the death/respawn cycle.
- `GamePhase` adds `'respawning'` (ship is dead, waiting to come back) and `'paused'`.
- `lives` and `highScore` are added to the state for the full game experience.
- The `input` object gains a `pause` flag, consumed the same way as `shoot`.

---

### 2. Final Input System

**File:** `src/games/space-invaders/systems/InputSystem.ts`

Add pause key handling.

```typescript
import type { InvadersState } from '../types';

export class InputSystem {
  private keys = new Set<string>();
  private shootPressed = false;
  private pausePressed = false;

  private onKeyDown = (e: KeyboardEvent) => {
    if (['ArrowLeft', 'ArrowRight', ' ', 'Escape', 'p', 'P'].includes(e.key)) {
      e.preventDefault();
    }
    this.keys.add(e.key);
    if (e.key === ' ') this.shootPressed = true;
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      this.pausePressed = true;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key);
  };

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.keys.clear();
  }

  poll(state: InvadersState): void {
    state.input.left = this.keys.has('ArrowLeft');
    state.input.right = this.keys.has('ArrowRight');
    state.input.shoot = this.shootPressed;
    state.input.pause = this.pausePressed;
    this.shootPressed = false;
    this.pausePressed = false;
  }
}
```

**What's happening:**
- Escape and P both trigger the pause flag. Like `shootPressed`, `pausePressed` is consumed after one poll to prevent rapid toggling.

---

### 3. Final Player System

**File:** `src/games/space-invaders/systems/PlayerSystem.ts`

Add respawn timer handling.

```typescript
import type { InvadersState } from '../types';
import { PLAYER_BULLET_SPEED, BULLET_W, BULLET_H } from '../types';

export class PlayerSystem {
  update(state: InvadersState, dt: number): void {
    if (state.phase === 'gameover' || state.phase === 'paused') return;

    const { player, input } = state;

    // ── Respawn timer ───────────────────────────────────────────────────
    if (state.phase === 'respawning') {
      player.respawnTimer -= dt;
      if (player.respawnTimer <= 0) {
        player.alive = true;
        player.respawnTimer = 0;
        state.phase = 'playing';
      }
      return; // cannot move or shoot while respawning
    }

    if (!player.alive) return;

    // ── Movement ────────────────────────────────────────────────────────
    if (input.left) {
      player.x -= player.speed * dt;
    }
    if (input.right) {
      player.x += player.speed * dt;
    }

    if (player.x < 0) player.x = 0;
    if (player.x + player.w > state.canvasW) {
      player.x = state.canvasW - player.w;
    }

    // ── Shooting ────────────────────────────────────────────────────────
    player.cooldownLeft -= dt;
    if (player.cooldownLeft < 0) player.cooldownLeft = 0;

    if (input.shoot && player.cooldownLeft <= 0) {
      state.bullets.push({
        x: player.x + player.w / 2 - BULLET_W / 2,
        y: player.y - BULLET_H,
        w: BULLET_W,
        h: BULLET_H,
        vy: PLAYER_BULLET_SPEED,
        fromPlayer: true,
        active: true,
      });
      player.cooldownLeft = player.shootCooldown;
    }
  }
}
```

**What's happening:**
- During `'respawning'`, the player system only counts down the respawn timer. The player cannot move or shoot.
- When the timer expires, the player is set back to `alive = true` and the phase returns to `'playing'`.
- The system exits early for `'gameover'` and `'paused'` states.

---

### 4. Final Collision System

**File:** `src/games/space-invaders/systems/CollisionSystem.ts`

Replace instant death with the life/respawn system.

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
    if (state.phase !== 'playing' && state.phase !== 'respawning') return;

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
            if (state.score > state.highScore) {
              state.highScore = state.score;
            }
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
            if (state.score > state.highScore) {
              state.highScore = state.score;
            }
            u.active = false;
            bullet.active = false;
          }
        }
      } else {
        // ── Alien bullet vs player ──────────────────────────────────
        if (state.player.alive) {
          const p = state.player;
          if (
            rectsOverlap(
              bullet.x, bullet.y, bullet.w, bullet.h,
              p.x, p.y, p.w, p.h,
            )
          ) {
            bullet.active = false;
            this.killPlayer(state);
            continue;
          }
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

  private killPlayer(state: InvadersState): void {
    state.player.alive = false;
    state.lives--;
    if (state.lives <= 0) {
      state.phase = 'gameover';
    } else {
      state.phase = 'respawning';
      state.player.respawnTimer = 1.5;
      state.player.x = state.canvasW / 2 - state.player.w / 2;
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
- `killPlayer` decrements lives. If lives reach 0, it is game over. Otherwise, the phase switches to `'respawning'` and a 1.5-second timer starts.
- During respawning, the player's `alive` flag is `false`, so alien bullets pass through the ghost ship. This prevents chain-deaths.
- The high score is updated immediately whenever the score exceeds it, so it is always current.
- Collision runs during both `'playing'` and `'respawning'` so bullets still interact with aliens and shields while the player is dead.

---

### 5. Final Game Renderer

**File:** `src/games/space-invaders/renderers/GameRenderer.ts`

Replace plain rectangles with pixel-art sprites and add respawn flashing.

```typescript
import type { InvadersState } from '../types';
import { AlienType } from '../types';

// ── Tiny pixel-art sprites encoded as 1-bit rows ───────────────────────────
// Each number is a row of pixels; bit 1 = draw pixel. Width varies per type.

const SPRITE_SMALL: number[] = [
  0b00100000100,
  0b00010001000,
  0b00111111100,
  0b01101110110,
  0b11111111111,
  0b10111111101,
  0b10100000101,
  0b00011011000,
];
const SPRITE_SMALL_W = 11;

const SPRITE_MEDIUM: number[] = [
  0b00100000100,
  0b10010001001,
  0b10111111101,
  0b11101110111,
  0b11111111111,
  0b01111111110,
  0b00100000100,
  0b01000000010,
];
const SPRITE_MEDIUM_W = 11;

const SPRITE_LARGE: number[] = [
  0b00001111100000,
  0b01111111111100,
  0b11111111111110,
  0b11100110011100,
  0b11111111111110,
  0b00011001100000,
  0b00110110110000,
  0b11000000001100,
];
const SPRITE_LARGE_W = 14;

const ALIEN_COLORS: Record<AlienType, string> = {
  [AlienType.Small]: '#ff4444',
  [AlienType.Medium]: '#44ff44',
  [AlienType.Large]: '#44aaff',
};

function drawSprite(
  ctx: CanvasRenderingContext2D,
  rows: number[],
  spriteW: number,
  x: number,
  y: number,
  destW: number,
  destH: number,
  color: string,
): void {
  const pxW = destW / spriteW;
  const pxH = destH / rows.length;
  ctx.fillStyle = color;

  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < spriteW; c++) {
      if ((rows[r] >> (spriteW - 1 - c)) & 1) {
        ctx.fillRect(
          x + c * pxW,
          y + r * pxH,
          Math.ceil(pxW),
          Math.ceil(pxH),
        );
      }
    }
  }
}

function getSpriteData(type: AlienType): { rows: number[]; w: number } {
  switch (type) {
    case AlienType.Small:
      return { rows: SPRITE_SMALL, w: SPRITE_SMALL_W };
    case AlienType.Medium:
      return { rows: SPRITE_MEDIUM, w: SPRITE_MEDIUM_W };
    case AlienType.Large:
      return { rows: SPRITE_LARGE, w: SPRITE_LARGE_W };
  }
}

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

    // ── Aliens (pixel-art sprites) ──────────────────────────────────────
    for (const alien of state.aliens) {
      if (!alien.alive) continue;
      const { rows, w } = getSpriteData(alien.type);
      drawSprite(
        ctx,
        rows,
        w,
        alien.x,
        alien.y,
        alien.w,
        alien.h,
        ALIEN_COLORS[alien.type],
      );
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
      ctx.fillStyle = '#ff88aa';
      ctx.beginPath();
      ctx.ellipse(
        u.x + u.w / 2, u.y + u.h / 2 - 2,
        u.w / 4, u.h / 4,
        0, 0, Math.PI * 2,
      );
      ctx.fill();
    }

    // ── Player (with respawn flash) ─────────────────────────────────────
    if (state.player.alive || state.phase === 'respawning') {
      const p = state.player;
      const alpha = state.phase === 'respawning' ? 0.4 : 1;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(p.x, p.y + 6, p.w, p.h - 6);
      ctx.fillRect(p.x + p.w / 2 - 3, p.y, 6, 8);
      ctx.globalAlpha = 1;
    }

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
- Each sprite is encoded as an array of numbers. For example, `0b00111111100` is the binary pattern for one row of the Small alien: the middle 7 bits are set, creating a wide body.
- `drawSprite` iterates over each bit. If the bit is `1`, it draws a small colored rectangle at the corresponding position. The `>>` shift and `& 1` mask extract individual bits from right to left.
- `Math.ceil(pxW)` ensures there are no sub-pixel gaps between the tiny rectangles.
- During respawning, `ctx.globalAlpha = 0.4` makes the ship semi-transparent, showing the player they are in a grace period. Remember to reset alpha to 1 afterward.

---

### 6. Final HUD Renderer

**File:** `src/games/space-invaders/renderers/HUDRenderer.ts`

Add high score, lives display, and pause overlay.

```typescript
import type { InvadersState } from '../types';
import { HUD_HEIGHT, PLAYER_W } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: InvadersState): void {
    // ── Top bar ─────────────────────────────────────────────────────────
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, state.canvasW, HUD_HEIGHT);

    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.textBaseline = 'middle';

    const midY = HUD_HEIGHT / 2;

    // Score (left)
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${state.score}`, 12, midY);

    // High score (center)
    ctx.textAlign = 'center';
    ctx.fillText(`HI: ${state.highScore}`, state.canvasW / 2, midY);

    // Level (right of center)
    ctx.textAlign = 'right';
    ctx.fillText(`LEVEL ${state.level}`, state.canvasW - 120, midY);

    // Lives (tiny ship icons, far right)
    const livesX = state.canvasW - 100;
    for (let i = 0; i < state.lives; i++) {
      ctx.fillStyle = '#00ff88';
      const lx = livesX + i * (PLAYER_W * 0.5 + 4);
      ctx.fillRect(lx, midY - 4, PLAYER_W * 0.4, 8);
    }

    // ── Overlays ────────────────────────────────────────────────────────
    if (state.phase === 'gameover') {
      this.drawOverlay(ctx, state, 'GAME OVER', 'Press SPACE to restart');
    } else if (state.phase === 'levelclear') {
      this.drawOverlay(ctx, state, `WAVE ${state.level} CLEARED!`, '');
    } else if (state.phase === 'paused') {
      this.drawOverlay(ctx, state, 'PAUSED', 'Press P to resume');
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
- Lives are displayed as tiny green rectangles in the top-right corner, mimicking miniature ships. Each is 40% of the full ship width.
- The high score sits centered in the HUD. It updates in real time as the current score surpasses it.
- Three overlay states share the same `drawOverlay` helper: game over, level clear, and paused. Each gets different title/subtitle text.

---

### 7. Final Engine

**File:** `src/games/space-invaders/InvadersEngine.ts`

Add lives preservation across waves, high score persistence, and pause handling. Replace the entire file.

```typescript
import type { InvadersState, Shield } from './types';
import {
  CANVAS_W,
  CANVAS_H,
  PLAYER_W,
  PLAYER_H,
  PLAYER_SPEED,
  PLAYER_SHOOT_COOLDOWN,
  PLAYER_START_LIVES,
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

const LS_KEY = 'space-invaders-highscore';

export class InvadersEngine {
  private canvas: HTMLCanvasElement;
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
    this.canvas = canvas;
    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;
    this.ctx = this.canvas.getContext('2d')!;

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
    this.saveHighScore();
  }

  // ── State initialisation ────────────────────────────────────────────────

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
        alive: true,
        respawnTimer: 0,
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
      highScore: this.loadHighScore(),
      lives:
        level === 1 && score === 0
          ? PLAYER_START_LIVES
          : this.state?.lives ?? PLAYER_START_LIVES,
      level,
      levelClearTimer: 0,
      input: { left: false, right: false, shoot: false, pause: false },
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

  // ── Game loop ───────────────────────────────────────────────────────────

  private loop = (now: number): void => {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.inputSystem.poll(this.state);

    // ── Handle pause toggle ───────────────────────────────────────────
    if (this.state.input.pause) {
      if (this.state.phase === 'playing') {
        this.state.phase = 'paused';
      } else if (this.state.phase === 'paused') {
        this.state.phase = 'playing';
      }
    }

    // ── Handle restart from game over ─────────────────────────────────
    if (this.state.phase === 'gameover' && this.state.input.shoot) {
      this.saveHighScore();
      this.initState(1, 0);
    }

    // ── Handle level clear transition ─────────────────────────────────
    if (this.state.phase === 'levelclear') {
      this.state.levelClearTimer -= dt;
      if (this.state.levelClearTimer <= 0) {
        const nextLevel = this.state.level + 1;
        const currentScore = this.state.score;
        const currentLives = this.state.lives;
        this.initState(nextLevel, currentScore);
        this.state.lives = currentLives;
      }
    }

    // ── Update systems ────────────────────────────────────────────────
    this.playerSystem.update(this.state, dt);
    this.alienSystem.update(this.state, dt);
    this.ufoSystem.update(this.state, dt);

    // Move bullets
    for (const b of this.state.bullets) {
      b.y += b.vy * dt;
    }

    this.collisionSystem.update(this.state, dt);

    // ── Render ────────────────────────────────────────────────────────
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(this.loop);
  };

  // ── Persistence ─────────────────────────────────────────────────────────

  private loadHighScore(): number {
    try {
      return Number(localStorage.getItem(LS_KEY)) || 0;
    } catch {
      return 0;
    }
  }

  private saveHighScore(): void {
    try {
      localStorage.setItem(LS_KEY, String(this.state.highScore));
    } catch {
      // storage unavailable – ignore
    }
  }
}
```

**What's happening:**
- The pause toggle checks `input.pause` (the consumed single-fire flag). It only toggles between `'playing'` and `'paused'` -- you cannot pause during game over or level clear.
- The lives expression `level === 1 && score === 0 ? PLAYER_START_LIVES : this.state?.lives ?? PLAYER_START_LIVES` gives full lives on a fresh game but preserves remaining lives during wave transitions.
- After `initState` during a wave transition, lives are explicitly restored from the pre-transition value since `initState` would otherwise reset them.
- `saveHighScore` writes to `localStorage` on game over and on engine destruction. `loadHighScore` reads it on startup. Both are wrapped in try/catch for sandboxed environments.

---

### 8. Final Entry Point

**File:** `src/games/space-invaders/index.ts`

Export the game factory.

```typescript
import { InvadersEngine } from './InvadersEngine';

export function createSpaceInvaders(
  canvas: HTMLCanvasElement,
): { destroy: () => void } {
  const engine = new InvadersEngine(canvas);
  engine.start();
  return { destroy: () => engine.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Space Invaders game
3. **Observe:**
   - HUD shows SCORE, HI (high score), LEVEL, and 3 tiny green ship icons
   - Getting hit by an alien bullet: the ship disappears, reappears ghosted at center for 1.5 seconds, then becomes solid
   - Lives decrease with each hit (ship icons disappear from the HUD)
   - Third death shows "GAME OVER / Press SPACE to restart"
   - Pressing Space restarts from level 1 with score 0 but the high score persists
   - Press P or Escape to pause -- "PAUSED / Press P to resume" overlay appears
   - Aliens now display as pixel-art sprites: crab-like shapes in red, green, and blue
   - Clearing a wave shows "WAVE N CLEARED!" then starts the next wave with fresh shields
   - Close the browser and reopen -- your high score is still there

**Play through 3 waves.** Notice how the difficulty ramps: wave 2 aliens march 15% faster, wave 3 another 15%. The shooting interval also tightens. By wave 4, an extra row of aliens appears, making the grid 6 rows deep.

---

## Challenges

**Easy:**
- Start with 5 lives instead of 3 for an easier game.
- Change the respawn time from 1.5 seconds to 0.5 seconds.
- Add a "LIVES:" text label before the ship icons in the HUD.

**Medium:**
- Add an explosion animation when the player ship is destroyed: 8 small green particles that fly outward and fade over 0.5 seconds.
- Display a floating score popup (+10, +20, +30) at the position where each alien is destroyed, fading upward over 0.5 seconds.

**Hard:**
- Add sound effects using the Web Audio API: a "pew" on player shoot, a "boom" on alien death, and a "wah-wah" descending tone on player death.
- Implement a two-frame alien animation: alternate between two sprite variants every 0.5 seconds to make the aliens appear to "walk."
- Add a name-entry screen on game over if the player beats the high score: display an on-screen keyboard and let them enter 3 initials.

---

## What You Learned

- Life system with respawn timer and invulnerability window
- `globalAlpha` for visual feedback during respawn
- 1-bit sprite encoding and rendering with bit shifts
- `localStorage` for persistent high scores with error-safe wrappers
- Pause toggle with consumed single-fire input
- State reinitialization with selective field preservation
- Overlay rendering with semi-transparent backdrops

---

## Complete Game Summary

Over 6 steps, you built a full Space Invaders clone with:

| Feature | Step |
|---------|------|
| Player ship, movement, shooting | 1 |
| 5x11 alien grid, march and descent | 2 |
| Bullet-alien collision, scoring, speed-up | 3 |
| Alien shooting, destructible shields | 4 |
| UFO bonus, wave progression, difficulty scaling | 5 |
| Lives, high score, pixel-art sprites, pause, overlays | 6 |

**Key architecture patterns:**
- **Systems** (Input, Player, Alien, Collision, UFO) each own one concern and update the shared state
- **Renderers** (Game, HUD) read the state and draw -- they never modify it
- **State** is a single plain object passed to every system and renderer
- **Phases** (`playing`, `respawning`, `gameover`, `levelclear`, `paused`) control which systems run

**Next game:** [Asteroids](../22-asteroids/README.md) -- where you will learn rotational physics, thrust-based movement, and asteroid splitting!
