# Step 5: Collision & Particles

**Goal:** Add ship-asteroid collision (with lives and respawn), particle explosions when anything is destroyed, and invulnerability blinking after death.

**Time:** ~15 minutes

---

## What You'll Build

Building on the splitting asteroids from Step 4:
- **Ship-asteroid collision**: Circle-circle check between the ship and each asteroid
- **Particle explosions**: Burst of colored dots when an asteroid is destroyed or the ship is hit
- **Lives system**: 3 lives; losing all ends the game
- **Respawn**: Ship resets to center with zero velocity after a death
- **Invulnerability**: 3-second grace period after respawning, shown by the ship blinking
- **Asteroid explosion particles**: Different-colored burst when bullets hit asteroids

---

## Concepts

- **Circle-Circle Collision**: Distance between ship center and asteroid center < `SHIP_RADIUS + asteroid.radius * 0.7`. The `0.7` shrink factor makes the hit box slightly forgiving — the visual outline extends past the true collision boundary.
- **Particle System**: Each particle has position, velocity, lifetime, and color. Every frame, particles move and decrement life. Dead particles are removed. Alpha fades based on remaining life.
- **Invulnerability Window**: After respawn, store a timestamp `invulnUntil`. Skip ship-asteroid checks until `performance.now()` passes that time. Blink the ship by skipping render on alternating 100ms intervals.

---

## Code

### 1. Add Particle and Life Types

**File:** `src/contexts/canvas2d/games/asteroids/types.ts`

Add particle interface, lives, and invulnerability:

```typescript
// ── Constants ──────────────────────────────────────────────
export const SHIP_RADIUS = 15;
export const SHIP_THRUST = 0.12;
export const SHIP_DRAG = 0.99;
export const SHIP_ROTATION_SPEED = 0.065;
export const BULLET_SPEED = 7;
export const BULLET_LIFETIME = 60;
export const MAX_BULLETS = 8;
export const SHOOT_COOLDOWN = 150;
export const INITIAL_ASTEROIDS = 4;
export const STARTING_LIVES = 3;
export const INVULN_DURATION = 3000; // ms

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

// ── Types ──────────────────────────────────────────────────
export interface Vec2 {
  x: number;
  y: number;
}

export interface Ship {
  pos: Vec2;
  vel: Vec2;
  angle: number;
  thrusting: boolean;
}

export interface Bullet {
  pos: Vec2;
  vel: Vec2;
  life: number;
}

export interface Asteroid {
  pos: Vec2;
  vel: Vec2;
  size: AsteroidSize;
  radius: number;
  vertices: number;
  offsets: number[];
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
  bullets: Bullet[];
  asteroids: Asteroid[];
  particles: Particle[];
  lives: number;
  gameOver: boolean;
  invulnUntil: number; // timestamp
  lastShot: number;
  width: number;
  height: number;
}
```

**What's happening:**
- `Particle` stores `life` and `maxLife` so we can compute alpha as `life / maxLife` for a smooth fade.
- `radius` and `color` per particle allow variation within each explosion.
- `INVULN_DURATION` at 3000ms gives the player three seconds to get clear after respawning.

---

### 2. Extract Collision into Its Own System

**File:** `src/contexts/canvas2d/games/asteroids/systems/CollisionSystem.ts`

Separate collision detection from physics for cleaner organization:

```typescript
import type { AsteroidsState, Particle, AsteroidSize } from '../types';
import { SHIP_RADIUS, INVULN_DURATION, ASTEROID_SPEEDS } from '../types';
import { AsteroidSystem } from './AsteroidSystem';

export class CollisionSystem {
  update(state: AsteroidsState): void {
    if (state.gameOver) return;

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
          // Spawn explosion particles
          this.spawnExplosion(state, a.pos.x, a.pos.y, a.radius);
          // Split asteroid
          this.splitAsteroid(state, ai);
          break;
        }
      }
    }
  }

  private checkShipAsteroid(state: AsteroidsState): void {
    const now = performance.now();
    if (now < state.invulnUntil) return; // invulnerable

    const ship = state.ship;
    for (let ai = state.asteroids.length - 1; ai >= 0; ai--) {
      const a = state.asteroids[ai];
      const dx = ship.pos.x - a.pos.x;
      const dy = ship.pos.y - a.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < SHIP_RADIUS + a.radius * 0.7) {
        // Ship hit!
        state.lives--;
        this.spawnExplosion(state, ship.pos.x, ship.pos.y, 20);

        if (state.lives <= 0) {
          state.gameOver = true;
        } else {
          // Respawn at center
          ship.pos.x = state.width / 2;
          ship.pos.y = state.height / 2;
          ship.vel.x = 0;
          ship.vel.y = 0;
          ship.angle = 0;
          state.invulnUntil = performance.now() + INVULN_DURATION;
        }
        return; // only process one hit per frame
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
- `checkBulletAsteroid` is moved here from PhysicsSystem, keeping physics pure (movement only) and collisions separate.
- `checkShipAsteroid` checks `invulnUntil` first. If the ship is still invulnerable, skip entirely. Otherwise, for each asteroid, compute the real distance (we use `sqrt` here since we need the actual distance for the combined-radius check).
- `spawnExplosion` creates `size * 0.8` particles, so a large asteroid (radius 40) produces ~32 particles while the ship explosion produces ~16. Each particle gets a random direction, speed, lifetime, size, and color from a warm palette.
- On death, the ship resets to center with zero velocity. `invulnUntil` is set to 3 seconds from now.

---

### 3. Update Physics to Handle Particles (Remove Collision)

**File:** `src/contexts/canvas2d/games/asteroids/systems/PhysicsSystem.ts`

Remove collision logic (now in CollisionSystem), add particle updates:

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
    if (state.gameOver) return;

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
- `updateParticles` follows the same pattern as bullets: move, decrement life, remove when expired.
- Particles do **not** wrap — they simply drift off-screen if they reach an edge. Their short lifetime means this rarely matters.
- Collision checks are removed from here; they now live in `CollisionSystem`.

---

### 4. Add Particle Rendering and Invulnerability Blink

**File:** `src/contexts/canvas2d/games/asteroids/renderers/GameRenderer.ts`

Add particle rendering and make the ship blink when invulnerable:

```typescript
import type { AsteroidsState } from '../types';
import { SHIP_RADIUS } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: AsteroidsState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    this.drawStars(ctx, W, H);
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

    // Invulnerability blink — skip rendering every other 100ms
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

**What's happening:**
- **Invulnerability blink**: `Math.floor(now / 100) % 2` alternates between 0 and 1 every 100ms. When it is 0, we skip drawing the ship entirely, creating a rapid blink effect.
- **Particle rendering**: Each particle's alpha fades from 1.0 to 0.0 as `life` approaches zero. The particle's visual radius also shrinks (`radius * alpha`), so particles appear to shrink and fade simultaneously.
- `ctx.globalAlpha` is reset to `1` after drawing particles so subsequent draws are fully opaque.
- Particles are drawn **first** (before bullets and asteroids) so they appear behind everything.
- When `gameOver` is true, the ship is not drawn at all.

---

### 5. Update the Engine

**File:** `src/contexts/canvas2d/games/asteroids/AsteroidsEngine.ts`

Add the CollisionSystem and new state fields:

```typescript
import type { AsteroidsState } from './types';
import { INITIAL_ASTEROIDS, STARTING_LIVES } from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { AsteroidSystem } from './systems/AsteroidSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class AsteroidsEngine {
  private ctx: CanvasRenderingContext2D;
  private state: AsteroidsState;
  private running = false;
  private rafId = 0;

  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
  private collisionSystem: CollisionSystem;
  private asteroidSystem: AsteroidSystem;
  private gameRenderer: GameRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = {
      ship: {
        pos: { x: canvas.width / 2, y: canvas.height / 2 },
        vel: { x: 0, y: 0 },
        angle: 0,
        thrusting: false,
      },
      bullets: [],
      asteroids: [],
      particles: [],
      lives: STARTING_LIVES,
      gameOver: false,
      invulnUntil: 0,
      lastShot: 0,
      width: canvas.width,
      height: canvas.height,
    };

    this.inputSystem = new InputSystem(this.state);
    this.physicsSystem = new PhysicsSystem(this.inputSystem.keys);
    this.collisionSystem = new CollisionSystem();
    this.asteroidSystem = new AsteroidSystem();
    this.gameRenderer = new GameRenderer();

    this.inputSystem.attach();

    // Spawn the initial wave
    this.asteroidSystem.spawnWave(this.state, INITIAL_ASTEROIDS);
  }

  start(): void {
    this.running = true;
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
  }

  private loop(): void {
    if (!this.running) return;

    this.inputSystem.processShooting();
    this.physicsSystem.update(this.state);
    this.collisionSystem.update(this.state);
    this.gameRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

**What's happening:**
- The loop now runs three systems: shooting, physics, collision — then renders.
- `CollisionSystem.update()` runs **after** physics so positions are up to date before checking overlaps.
- `lives` starts at 3, `gameOver` starts false, `invulnUntil` starts at 0 (no invulnerability at game start).

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Asteroids game
3. **Observe:**
   - Shoot an asteroid and watch the explosion: colored particles burst outward and fade away
   - Fly into an asteroid and the ship explodes in a particle burst
   - The ship reappears at center, blinking for 3 seconds
   - During the blink, asteroids pass through the ship harmlessly
   - After the blink stops, you are vulnerable again
   - Lose all 3 lives and the ship disappears (game over — we will add the overlay in Step 6)
   - Asteroid explosions are larger for bigger asteroids (more particles)

**Try this:** Intentionally crash into an asteroid while blinking. Nothing happens — invulnerability works. Wait for the blink to stop, then crash again — you lose another life.

---

## Try It

- Change `INVULN_DURATION` to `5000` for a long safety window, or `1000` for a tense one.
- Change `STARTING_LIVES` to `1` for instant-death difficulty.
- In `spawnExplosion`, change the particle count formula to `size * 2` for massive explosions.
- Add `'#0ff', '#f0f'` to the explosion color palette for neon particles.

---

## Challenges

**Easy:**
- Change the blink speed from 100ms to 50ms for a faster flicker.
- Make ship explosion particles a different color than asteroid particles (e.g., purple to match the ship).

**Medium:**
- Add a screen shake effect: on ship death, offset all rendering by a random `(-5, 5)` amount for 10 frames.
- Make particles inherit the asteroid's velocity so the explosion drifts in the same direction the asteroid was moving.

**Hard:**
- Add a "debris" effect: when a small asteroid is destroyed, spawn 2-3 tiny non-collidable asteroids that drift and fade.
- Implement ship debris: on death, break the ship triangle into 3 separate line segments that fly apart with physics.

---

## What You Learned

- Circle-circle collision detection with a forgiving shrink factor
- Particle systems: spawn, update (move + age), render (fade + shrink), remove
- Invulnerability using a timestamp comparison
- Visual feedback through blinking (skip rendering on alternating intervals)
- Separating collision logic into its own system for clean architecture

**Next:** Wave progression, scoring, lives display, HUD, and start/game-over overlays!
