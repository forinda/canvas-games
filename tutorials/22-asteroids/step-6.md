# Step 6: Waves, Score & Polish

**Goal:** Add wave progression, scoring by asteroid size, a HUD with lives and high score, start/pause/game-over overlays, and a restart mechanism.

**Time:** ~15 minutes

---

## What You'll Build

The final layer of polish:
- **Wave system**: Clearing all asteroids advances to the next wave with more asteroids
- **Scoring**: Large = 20 pts, medium = 50 pts, small = 100 pts (smaller = harder = more reward)
- **High score**: Persisted to `localStorage`
- **HUD**: Score, wave number, high score, and small ship icons for remaining lives
- **Overlays**: Title screen ("Press SPACE to start"), pause screen, game-over screen with final score
- **Restart**: Press Space after game over to play again

---

## Concepts

- **Wave Progression**: When `asteroids.length === 0`, increment the wave counter and spawn `INITIAL_ASTEROIDS + (wave - 1) * 2` asteroids. Wave 1 has 4, wave 2 has 6, wave 3 has 8, and so on.
- **Score by Risk**: Smaller asteroids move faster and are harder to hit, so they are worth more points. This rewards skilled play.
- **HUD Rendering**: A separate renderer draws UI elements on top of the game. Lives are shown as tiny ship silhouettes rather than a number — a classic Asteroids touch.

---

## Code

### 1. Final Types File

**File:** `src/games/asteroids/types.ts`

Add scoring constants, high score key, and the remaining state fields:

```typescript
// ── Constants ──────────────────────────────────────────────
export const HS_KEY = 'asteroids_highscore';
export const SHIP_RADIUS = 15;
export const SHIP_THRUST = 0.12;
export const SHIP_DRAG = 0.99;
export const SHIP_ROTATION_SPEED = 0.065;
export const BULLET_SPEED = 7;
export const BULLET_LIFETIME = 60; // frames
export const MAX_BULLETS = 8;
export const SHOOT_COOLDOWN = 150; // ms
export const INVULN_DURATION = 3000; // ms
export const STARTING_LIVES = 3;
export const INITIAL_ASTEROIDS = 4;

export type AsteroidSize = 'large' | 'medium' | 'small';

export const ASTEROID_SPEEDS: Record<AsteroidSize, number> = {
  large: 1.2,
  medium: 2.0,
  small: 3.2,
};

export const ASTEROID_RADII: Record<AsteroidSize, number> = {
  large: 40,
  medium: 22,
  small: 12,
};

export const ASTEROID_SCORES: Record<AsteroidSize, number> = {
  large: 20,
  medium: 50,
  small: 100,
};

// ── Types ──────────────────────────────────────────────────
export interface Vec2 {
  x: number;
  y: number;
}

export interface Ship {
  pos: Vec2;
  vel: Vec2;
  angle: number; // radians, 0 = pointing up
  thrusting: boolean;
}

export interface Asteroid {
  pos: Vec2;
  vel: Vec2;
  size: AsteroidSize;
  radius: number;
  vertices: number; // count of polygon vertices
  offsets: number[]; // per-vertex radius jitter
}

export interface Bullet {
  pos: Vec2;
  vel: Vec2;
  life: number; // frames remaining
}

export interface Particle {
  pos: Vec2;
  vel: Vec2;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
}

export interface AsteroidsState {
  ship: Ship;
  asteroids: Asteroid[];
  bullets: Bullet[];
  particles: Particle[];
  score: number;
  highScore: number;
  lives: number;
  wave: number;
  gameOver: boolean;
  paused: boolean;
  started: boolean;
  invulnUntil: number; // timestamp
  lastShot: number; // timestamp
  width: number;
  height: number;
}
```

**What's happening:**
- `ASTEROID_SCORES` inverts the difficulty: large (easy) is worth 20, small (hard) is worth 100.
- `HS_KEY` is the localStorage key for persisting the high score between sessions.
- `started` controls the title screen: the game does not begin until the player presses Space.
- `paused` freezes all updates but keeps rendering so the player can see the pause overlay.
- `wave` tracks the current wave number, displayed in the HUD.

---

### 2. Create the Wave System

**File:** `src/games/asteroids/systems/WaveSystem.ts`

Detect when all asteroids are cleared and spawn the next wave:

```typescript
import type { AsteroidsState } from '../types';
import { INITIAL_ASTEROIDS } from '../types';
import { AsteroidSystem } from './AsteroidSystem';

export class WaveSystem {
  private asteroidSystem: AsteroidSystem;

  constructor(asteroidSystem: AsteroidSystem) {
    this.asteroidSystem = asteroidSystem;
  }

  update(state: AsteroidsState): void {
    if (!state.started || state.paused || state.gameOver) return;

    // When all asteroids are destroyed, advance to the next wave
    if (state.asteroids.length === 0) {
      state.wave++;
      const count = INITIAL_ASTEROIDS + (state.wave - 1) * 2;
      this.asteroidSystem.spawnWave(state, count);
    }
  }

  /** Start the first wave */
  startFirstWave(state: AsteroidsState): void {
    state.wave = 1;
    this.asteroidSystem.spawnWave(state, INITIAL_ASTEROIDS);
  }
}
```

**What's happening:**
- `update` checks every frame whether the asteroid array is empty. If so, it bumps the wave and spawns more.
- The formula `INITIAL_ASTEROIDS + (wave - 1) * 2` means: wave 1 = 4, wave 2 = 6, wave 3 = 8, etc. The screen gets progressively more crowded.
- `startFirstWave` is called once when the player presses Space on the title screen.

---

### 3. Add Scoring to the Collision System

**File:** `src/games/asteroids/systems/CollisionSystem.ts`

Add score tracking and high score persistence to `checkBulletAsteroid`:

```typescript
import type { AsteroidsState, Particle, AsteroidSize } from '../types';
import {
  SHIP_RADIUS,
  INVULN_DURATION,
  ASTEROID_SCORES,
  ASTEROID_SPEEDS,
  HS_KEY,
} from '../types';
import { AsteroidSystem } from './AsteroidSystem';

export class CollisionSystem {
  update(state: AsteroidsState): void {
    if (!state.started || state.paused || state.gameOver) return;

    this.checkBulletAsteroid(state);
    this.checkShipAsteroid(state);
  }

  private checkBulletAsteroid(state: AsteroidsState): void {
    for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
      const b = state.bullets[bi];
      for (let ai = state.asteroids.length - 1; ai >= 0; ai--) {
        const a = state.asteroids[ai];
        const dx = b.pos.x - a.pos.x;
        const dy = b.pos.y - a.pos.y;
        if (dx * dx + dy * dy < a.radius * a.radius) {
          // Remove bullet
          state.bullets.splice(bi, 1);
          // Award score
          state.score += ASTEROID_SCORES[a.size];
          if (state.score > state.highScore) {
            state.highScore = state.score;
            try { localStorage.setItem(HS_KEY, String(state.highScore)); } catch { /* noop */ }
          }
          // Particles
          this.spawnExplosion(state, a.pos.x, a.pos.y, a.radius);
          // Split
          this.splitAsteroid(state, ai);
          break;
        }
      }
    }
  }

  private checkShipAsteroid(state: AsteroidsState): void {
    const now = performance.now();
    if (now < state.invulnUntil) return;

    const ship = state.ship;
    for (let ai = state.asteroids.length - 1; ai >= 0; ai--) {
      const a = state.asteroids[ai];
      const dx = ship.pos.x - a.pos.x;
      const dy = ship.pos.y - a.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < SHIP_RADIUS + a.radius * 0.7) {
        state.lives--;
        this.spawnExplosion(state, ship.pos.x, ship.pos.y, 20);

        if (state.lives <= 0) {
          state.gameOver = true;
        } else {
          ship.pos.x = state.width / 2;
          ship.pos.y = state.height / 2;
          ship.vel.x = 0;
          ship.vel.y = 0;
          ship.angle = 0;
          state.invulnUntil = performance.now() + INVULN_DURATION;
        }
        return;
      }
    }
  }

  private splitAsteroid(state: AsteroidsState, index: number): void {
    const a = state.asteroids[index];
    state.asteroids.splice(index, 1);

    const nextSize: Record<AsteroidSize, AsteroidSize | null> = {
      large: 'medium',
      medium: 'small',
      small: null,
    };
    const ns = nextSize[a.size];
    if (!ns) return;

    for (let i = 0; i < 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = ASTEROID_SPEEDS[ns] * (0.8 + Math.random() * 0.4);
      state.asteroids.push(
        AsteroidSystem.createAsteroid(
          a.pos.x, a.pos.y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          ns,
        ),
      );
    }
  }

  private spawnExplosion(state: AsteroidsState, x: number, y: number, size: number): void {
    const count = Math.floor(size * 0.8);
    const colors = ['#fff', '#ffa', '#f84', '#f44', '#aaa'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 3;
      const life = 15 + Math.floor(Math.random() * 25);
      const p: Particle = {
        pos: { x, y },
        vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        life,
        maxLife: life,
        radius: 1 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
      state.particles.push(p);
    }
  }
}
```

**What's happening:**
- After removing a bullet and before splitting, we add `ASTEROID_SCORES[a.size]` to `state.score`.
- If the new score exceeds the high score, we update it and persist to `localStorage`. The `try/catch` handles private browsing or storage-full scenarios gracefully.
- The guard at the top now checks `started`, `paused`, and `gameOver` — no collisions should happen during any of those states.

---

### 4. Update the Input System for Start/Pause/Restart

**File:** `src/games/asteroids/systems/InputSystem.ts`

Add game state transitions:

```typescript
import type { AsteroidsState } from '../types';
import { SHOOT_COOLDOWN, MAX_BULLETS, BULLET_SPEED, BULLET_LIFETIME } from '../types';

export interface InputKeys {
  left: boolean;
  right: boolean;
  up: boolean;
  space: boolean;
}

export class InputSystem {
  private state: AsteroidsState;
  private onReset: () => void;
  readonly keys: InputKeys = { left: false, right: false, up: false, space: false };

  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;

  constructor(state: AsteroidsState, onReset: () => void) {
    this.state = state;
    this.onReset = onReset;
    this.keyDownHandler = (e) => this.handleKeyDown(e);
    this.keyUpHandler = (e) => this.handleKeyUp(e);
  }

  attach(): void {
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
  }

  /** Call once per frame to fire bullets based on held keys */
  processShooting(): void {
    const s = this.state;
    if (!s.started || s.paused || s.gameOver) return;
    if (!this.keys.space) return;

    const now = performance.now();
    if (now - s.lastShot < SHOOT_COOLDOWN) return;
    if (s.bullets.length >= MAX_BULLETS) return;

    s.lastShot = now;
    const angle = s.ship.angle;
    s.bullets.push({
      pos: { x: s.ship.pos.x, y: s.ship.pos.y },
      vel: {
        x: Math.sin(angle) * BULLET_SPEED,
        y: -Math.cos(angle) * BULLET_SPEED,
      },
      life: BULLET_LIFETIME,
    });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const s = this.state;

    // Pause toggle
    if (e.key === 'p' || e.key === 'P') {
      if (s.started && !s.gameOver) s.paused = !s.paused;
      return;
    }

    // Space or Enter: start game, restart after game over, or shoot
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (s.gameOver) { this.onReset(); return; }
      if (!s.started) { s.started = true; return; }
    }

    this.setKey(e.key, true);
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.setKey(e.key, false);
  }

  private setKey(key: string, down: boolean): void {
    switch (key) {
      case 'ArrowLeft': case 'a': case 'A': this.keys.left = down; break;
      case 'ArrowRight': case 'd': case 'D': this.keys.right = down; break;
      case 'ArrowUp': case 'w': case 'W': this.keys.up = down; break;
      case ' ': this.keys.space = down; break;
    }
  }
}
```

**What's happening:**
- **P key** toggles pause. Only works when the game is started and not game-over.
- **Space/Enter** on the title screen sets `started = true`, triggering the first wave.
- **Space/Enter** during game over calls `onReset`, a callback from the engine that resets all state.
- `processShooting` guards against paused and game-over states, so Space does not fire bullets while on the title screen or after death.

---

### 5. Update Physics to Guard on Game State

**File:** `src/games/asteroids/systems/PhysicsSystem.ts`

Add `started` and `paused` guards:

```typescript
import type { AsteroidsState } from '../types';
import { SHIP_THRUST, SHIP_DRAG, SHIP_ROTATION_SPEED } from '../types';
import type { InputKeys } from './InputSystem';

export class PhysicsSystem {
  private keys: InputKeys;

  constructor(keys: InputKeys) {
    this.keys = keys;
  }

  update(state: AsteroidsState): void {
    if (!state.started || state.paused || state.gameOver) return;

    this.updateShip(state);
    this.updateBullets(state);
    this.updateAsteroids(state);
    this.updateParticles(state);
  }

  private updateShip(state: AsteroidsState): void {
    const ship = state.ship;
    const { width, height } = state;

    if (this.keys.left) ship.angle -= SHIP_ROTATION_SPEED;
    if (this.keys.right) ship.angle += SHIP_ROTATION_SPEED;

    ship.thrusting = this.keys.up;
    if (ship.thrusting) {
      ship.vel.x += Math.sin(ship.angle) * SHIP_THRUST;
      ship.vel.y -= Math.cos(ship.angle) * SHIP_THRUST;
    }

    ship.vel.x *= SHIP_DRAG;
    ship.vel.y *= SHIP_DRAG;

    ship.pos.x += ship.vel.x;
    ship.pos.y += ship.vel.y;

    ship.pos.x = this.wrap(ship.pos.x, width);
    ship.pos.y = this.wrap(ship.pos.y, height);
  }

  private updateBullets(state: AsteroidsState): void {
    const { width, height } = state;
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      b.pos.x += b.vel.x;
      b.pos.y += b.vel.y;
      b.pos.x = this.wrap(b.pos.x, width);
      b.pos.y = this.wrap(b.pos.y, height);
      b.life--;
      if (b.life <= 0) {
        state.bullets.splice(i, 1);
      }
    }
  }

  private updateAsteroids(state: AsteroidsState): void {
    const { width, height } = state;
    for (const a of state.asteroids) {
      a.pos.x += a.vel.x;
      a.pos.y += a.vel.y;
      a.pos.x = this.wrap(a.pos.x, width);
      a.pos.y = this.wrap(a.pos.y, height);
    }
  }

  private updateParticles(state: AsteroidsState): void {
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.pos.x += p.vel.x;
      p.pos.y += p.vel.y;
      p.life--;
      if (p.life <= 0) {
        state.particles.splice(i, 1);
      }
    }
  }

  private wrap(val: number, max: number): number {
    if (val < 0) return val + max;
    if (val > max) return val - max;
    return val;
  }
}
```

**What's happening:**
- The single guard at the top of `update` stops all physics when the game has not started, is paused, or is over. This freezes everything in place for overlays.

---

### 6. Update the Game Renderer

**File:** `src/games/asteroids/renderers/GameRenderer.ts`

Guard drawing on game state:

```typescript
import type { AsteroidsState } from '../types';
import { SHIP_RADIUS } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: AsteroidsState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Clear
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    // Stars always visible
    this.drawStars(ctx, W, H);

    // Only draw game objects after the game has started
    if (!state.started) return;

    this.drawParticles(ctx, state);
    this.drawBullets(ctx, state);
    this.drawAsteroids(ctx, state);
    if (!state.gameOver) {
      this.drawShip(ctx, state);
    }
  }

  private drawStars(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    let seed = W * 137 + H * 251;
    const next = () => {
      seed = (seed * 16807 + 7) % 2147483647;
      return seed / 2147483647;
    };
    ctx.fillStyle = '#334';
    for (let i = 0; i < 120; i++) {
      const x = next() * W;
      const y = next() * H;
      const r = next() * 1.4;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawShip(ctx: CanvasRenderingContext2D, state: AsteroidsState): void {
    const ship = state.ship;
    const now = performance.now();

    // Invulnerability blink
    if (now < state.invulnUntil) {
      if (Math.floor(now / 100) % 2 === 0) return;
    }

    ctx.save();
    ctx.translate(ship.pos.x, ship.pos.y);
    ctx.rotate(ship.angle);

    ctx.strokeStyle = '#9b59b6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -SHIP_RADIUS);
    ctx.lineTo(-SHIP_RADIUS * 0.7, SHIP_RADIUS * 0.7);
    ctx.lineTo(0, SHIP_RADIUS * 0.4);
    ctx.lineTo(SHIP_RADIUS * 0.7, SHIP_RADIUS * 0.7);
    ctx.closePath();
    ctx.stroke();

    if (ship.thrusting) {
      ctx.strokeStyle = '#f80';
      ctx.lineWidth = 1.5;
      const flicker = 0.7 + Math.random() * 0.6;
      ctx.beginPath();
      ctx.moveTo(-SHIP_RADIUS * 0.35, SHIP_RADIUS * 0.5);
      ctx.lineTo(0, SHIP_RADIUS * (0.7 + 0.5 * flicker));
      ctx.lineTo(SHIP_RADIUS * 0.35, SHIP_RADIUS * 0.5);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawAsteroids(ctx: CanvasRenderingContext2D, state: AsteroidsState): void {
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1.5;
    for (const a of state.asteroids) {
      ctx.beginPath();
      for (let i = 0; i <= a.vertices; i++) {
        const idx = i % a.vertices;
        const angle = (idx / a.vertices) * Math.PI * 2;
        const r = a.radius * a.offsets[idx];
        const x = a.pos.x + Math.cos(angle) * r;
        const y = a.pos.y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  private drawBullets(ctx: CanvasRenderingContext2D, state: AsteroidsState): void {
    ctx.fillStyle = '#fff';
    for (const b of state.bullets) {
      ctx.beginPath();
      ctx.arc(b.pos.x, b.pos.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, state: AsteroidsState): void {
    for (const p of state.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.radius * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
```

---

### 7. Create the HUD Renderer

**File:** `src/games/asteroids/renderers/HUDRenderer.ts`

Draw the score bar, lives, wave indicator, and all overlays:

```typescript
import type { AsteroidsState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: AsteroidsState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Top bar background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, 40);

    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'middle';

    // Score (center)
    ctx.fillStyle = '#9b59b6';
    ctx.textAlign = 'center';
    ctx.fillText(`Score: ${state.score}`, W / 2, 20);

    // Wave (right of center)
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText(`Wave ${state.wave}`, W / 2 + 120, 20);

    // High score (far right)
    if (state.highScore > 0) {
      ctx.fillStyle = '#666';
      ctx.textAlign = 'right';
      ctx.fillText(`Best: ${state.highScore}`, W - 12, 20);
    }

    // Lives as small ship icons (left side)
    this.drawLives(ctx, state);

    // Overlays
    if (!state.started) {
      this.drawOverlay(ctx, W, H,
        'ASTEROIDS',
        'Arrow keys to move, SPACE to shoot\nPress SPACE or ENTER to start',
        '#9b59b6',
      );
    } else if (state.gameOver) {
      this.drawOverlay(ctx, W, H,
        'GAME OVER',
        `Score: ${state.score}  |  Press SPACE to restart`,
        '#ef4444',
      );
    } else if (state.paused) {
      this.drawOverlay(ctx, W, H,
        'PAUSED',
        'Press P to resume',
        '#f59e0b',
      );
    }
  }

  private drawLives(ctx: CanvasRenderingContext2D, state: AsteroidsState): void {
    const startX = 20;
    const y = 20;
    const size = 8;
    ctx.strokeStyle = '#9b59b6';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < state.lives; i++) {
      const x = startX + i * 22;
      ctx.beginPath();
      ctx.moveTo(x, y - size);                  // nose
      ctx.lineTo(x - size * 0.6, y + size * 0.5); // bottom-left
      ctx.lineTo(x, y + size * 0.2);              // notch
      ctx.lineTo(x + size * 0.6, y + size * 0.5); // bottom-right
      ctx.closePath();
      ctx.stroke();
    }
  }

  private drawOverlay(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    title: string,
    sub: string,
    color: string,
  ): void {
    // Dim the background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title with glow
    ctx.font = `bold ${Math.min(64, W * 0.08)}px monospace`;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillText(title, W / 2, H * 0.36);
    ctx.shadowBlur = 0;

    // Subtitle lines
    ctx.font = `${Math.min(18, W * 0.025)}px monospace`;
    ctx.fillStyle = '#aaa';
    const lines = sub.split('\n');
    lines.forEach((line, i) => {
      ctx.fillText(line, W / 2, H * 0.48 + i * 26);
    });
  }
}
```

**What's happening:**
- The top bar is a semi-transparent black strip that provides contrast for the HUD text.
- Lives are drawn as tiny ship outlines — the same shape as the real ship, just scaled down. This is more visually interesting than a number.
- `drawOverlay` dims the entire screen and centers a title with a colored glow and a subtitle. The glow uses `shadowColor` and `shadowBlur`, the same technique from Breakout.
- Font size is responsive: `Math.min(64, W * 0.08)` scales down on narrow screens.

---

### 8. Final Engine with All Systems

**File:** `src/games/asteroids/AsteroidsEngine.ts`

Wire everything together with start, pause, reset, and wave management:

```typescript
import type { AsteroidsState } from './types';
import { STARTING_LIVES, HS_KEY } from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { AsteroidSystem } from './systems/AsteroidSystem';
import { WaveSystem } from './systems/WaveSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class AsteroidsEngine {
  private ctx: CanvasRenderingContext2D;
  private state: AsteroidsState;
  private running = false;
  private rafId = 0;

  // Systems
  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
  private collisionSystem: CollisionSystem;
  private asteroidSystem: AsteroidSystem;
  private waveSystem: WaveSystem;

  // Renderers
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;

  private resizeHandler: () => void;
  private wasStarted = false;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let hs = 0;
    try {
      hs = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
    } catch { /* noop */ }

    this.state = {
      ship: {
        pos: { x: canvas.width / 2, y: canvas.height / 2 },
        vel: { x: 0, y: 0 },
        angle: 0,
        thrusting: false,
      },
      asteroids: [],
      bullets: [],
      particles: [],
      score: 0,
      highScore: hs,
      lives: STARTING_LIVES,
      wave: 0,
      gameOver: false,
      paused: false,
      started: false,
      invulnUntil: 0,
      lastShot: 0,
      width: canvas.width,
      height: canvas.height,
    };

    // Systems
    this.inputSystem = new InputSystem(this.state, () => this.reset());
    this.physicsSystem = new PhysicsSystem(this.inputSystem.keys);
    this.collisionSystem = new CollisionSystem();
    this.asteroidSystem = new AsteroidSystem();
    this.waveSystem = new WaveSystem(this.asteroidSystem);

    // Renderers
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    // Resize handler
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.width = canvas.width;
      this.state.height = canvas.height;
    };

    this.inputSystem.attach();
    window.addEventListener('resize', this.resizeHandler);
  }

  start(): void {
    this.running = true;
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

    // Detect when the game transitions from title to playing
    if (this.state.started && !this.wasStarted) {
      this.wasStarted = true;
      this.waveSystem.startFirstWave(this.state);
    }

    // Process input-driven shooting
    this.inputSystem.processShooting();

    // Update systems
    this.physicsSystem.update(this.state);
    this.collisionSystem.update(this.state);
    this.waveSystem.update(this.state);

    // Render
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private reset(): void {
    const s = this.state;
    s.ship.pos.x = s.width / 2;
    s.ship.pos.y = s.height / 2;
    s.ship.vel.x = 0;
    s.ship.vel.y = 0;
    s.ship.angle = 0;
    s.ship.thrusting = false;
    s.asteroids = [];
    s.bullets = [];
    s.particles = [];
    s.score = 0;
    s.lives = STARTING_LIVES;
    s.wave = 0;
    s.gameOver = false;
    s.paused = false;
    s.started = true;
    s.invulnUntil = performance.now() + 2000;
    s.lastShot = 0;
    this.wasStarted = false;
    // wasStarted=false + started=true triggers startFirstWave on the next frame
  }
}
```

**What's happening:**
- **High score loading**: On construction, we read from `localStorage`. If missing or corrupt, we default to 0.
- **First wave trigger**: `wasStarted` tracks whether we have already spawned the first wave. When the player presses Space (`started` becomes true) but `wasStarted` is still false, we call `startFirstWave` and flip the flag. This one-time trigger prevents re-spawning on every frame.
- **Reset**: Clears everything back to initial values. Setting `wasStarted = false` with `started = true` means the next loop iteration will spawn a fresh wave 1. The 2-second invulnerability after reset gives the player a moment to orient.
- **Resize handler**: Keeps the canvas full-screen on window resize.
- The loop order is: **check first wave** -> **shoot** -> **physics** -> **collision** -> **waves** -> **render game** -> **render HUD**.

---

### 9. Entry Point

**File:** `src/games/asteroids/index.ts`

Export the final game:

```typescript
import { AsteroidsEngine } from './AsteroidsEngine';

export function createAsteroids(canvas: HTMLCanvasElement): { destroy: () => void } {
  const engine = new AsteroidsEngine(canvas);
  engine.start();
  return { destroy: () => engine.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Asteroids game
3. **Observe:**
   - **Title screen**: "ASTEROIDS" with a purple glow over the starfield, instruction text below
   - Press **Space** and the game begins — 4 large asteroids spawn from the edges
   - **HUD**: Score centered at top, wave number to the right, tiny ship icons for lives on the left
   - Destroy all asteroids — "Wave 2" appears and 6 new asteroids spawn
   - Each destroyed asteroid adds to your score: large = 20, medium = 50, small = 100
   - Press **P** to pause — "PAUSED" overlay appears, all motion freezes
   - Press **P** again to resume
   - Crash into an asteroid — lose a life, ship blinks for 3 seconds at center
   - Lose all lives — "GAME OVER" overlay shows your score, "Press SPACE to restart"
   - Press **Space** — everything resets, new game begins
   - High score persists across games and browser sessions

**Try this:** Survive to wave 3 and count the asteroids. Wave 1 = 4, wave 2 = 6, wave 3 = 8. The screen gets crowded fast.

---

## Try It

- Change `INITIAL_ASTEROIDS` to `2` for an easier start, or `6` for immediate pressure.
- Change the scoring to `large: 100, medium: 50, small: 20` to reward safe play over precision.
- Change the overlay colors: try `#00ff88` for the title, `#ff6600` for game over.
- Modify the wave formula to `INITIAL_ASTEROIDS + wave * 3` for aggressive difficulty scaling.

---

## Challenges

**Easy:**
- Show the current wave number in the game-over overlay alongside the score.
- Make the title text pulse by oscillating `shadowBlur` with `Math.sin(performance.now() * 0.003)`.

**Medium:**
- Add a "wave clear" banner: when all asteroids are destroyed, flash "WAVE 2" (or current wave) at screen center for 60 frames before spawning the next wave.
- Add a combo multiplier: hitting asteroids in quick succession (within 1 second) increases a score multiplier that resets on miss or timeout.

**Hard:**
- Add a "hyperspace" ability: press Shift to teleport to a random location with zero velocity, with a 20% chance of spawning inside an asteroid (instant death).
- Implement a two-player mode: second ship with WASD controls, separate lives and scores, shared asteroid field.

---

## What You Learned

- Wave-based difficulty progression with a simple formula
- Scoring by difficulty (smaller = harder = more points)
- localStorage persistence for high scores
- HUD rendering: score, lives as icons, overlays with glow effects
- Game state machine: title -> playing -> paused -> game over -> restart
- Clean reset by zeroing state and re-triggering the first wave
- Responsive font sizing with `Math.min`

---

## Full Architecture

Here is the final file structure:

```
src/games/asteroids/
  types.ts              — Constants, interfaces, state shape
  AsteroidsEngine.ts    — Game loop, system wiring, reset
  index.ts              — Entry point
  systems/
    InputSystem.ts      — Keyboard tracking, shooting, start/pause/restart
    PhysicsSystem.ts    — Ship, bullet, asteroid, particle movement + wrapping
    CollisionSystem.ts  — Bullet-asteroid, ship-asteroid, splitting, particles
    AsteroidSystem.ts   — Asteroid creation and wave spawning
    WaveSystem.ts       — Wave progression detection
  renderers/
    GameRenderer.ts     — Stars, ship, asteroids, bullets, particles
    HUDRenderer.ts      — Score, lives, wave, overlays
```

**Congratulations!** You have built a complete Asteroids game with rotation, thrust, inertia, shooting, splitting asteroids, particle effects, wave progression, scoring, and full game state management.
