# Step 4: Asteroids & Splitting

**Goal:** Spawn large asteroids with random jagged polygon shapes. When shot, large asteroids split into 2 medium, medium into 2 small, and small asteroids are destroyed.

**Time:** ~15 minutes

---

## What You'll Build

Building on the ship and shooting from Step 3:
- **Asteroid data model**: Each asteroid has a size (large/medium/small), a random polygon shape, and a velocity
- **Random jagged shapes**: Polygons with 8-13 vertices, each at a randomized distance from center
- **Edge spawning**: Asteroids appear at random positions along screen edges, drifting roughly toward center
- **Splitting**: Large -> 2 medium, medium -> 2 small, small -> destroyed
- **Screen wrapping**: Asteroids wrap just like the ship and bullets

---

## Concepts

- **Jagged Polygon Generation**: For each asteroid, pick a random vertex count (8-13). For each vertex, compute an angle evenly spaced around the circle, then jitter the radius by a random factor (0.7 to 1.3). This creates the iconic rough rock shapes.
- **Size Tiers**: Three sizes with different radii and speeds. Smaller asteroids are faster and worth more points (we will add scoring in Step 6).
- **Splitting Chain**: When a bullet hits an asteroid, remove both, then spawn two asteroids of the next smaller size at the same position with random velocities.

---

## Code

### 1. Add Asteroid Types and Constants

**File:** `src/contexts/canvas2d/games/asteroids/types.ts`

Add asteroid-related types:

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
  vertices: number;   // count of polygon vertices
  offsets: number[];   // per-vertex radius jitter
}

export interface AsteroidsState {
  ship: Ship;
  bullets: Bullet[];
  asteroids: Asteroid[];
  lastShot: number;
  width: number;
  height: number;
}
```

**What's happening:**
- `ASTEROID_SPEEDS` maps each size to a base speed. Smaller asteroids move faster, making them harder to hit.
- `ASTEROID_RADII` maps each size to a collision/render radius. Large is 40px, small is 12px.
- Each `Asteroid` stores its `vertices` count and an `offsets` array. Each offset is a multiplier (0.7 to 1.3) applied to the base radius at that vertex angle, creating the jagged shape.

---

### 2. Create the Asteroid System

**File:** `src/contexts/canvas2d/games/asteroids/systems/AsteroidSystem.ts`

Handle asteroid creation and wave spawning:

```typescript
import type { AsteroidsState, Asteroid, AsteroidSize } from '../types';
import { ASTEROID_RADII, ASTEROID_SPEEDS } from '../types';

export class AsteroidSystem {
  /** Spawn asteroids at screen edges for a given count */
  spawnWave(state: AsteroidsState, count: number): void {
    const { width, height } = state;
    for (let i = 0; i < count; i++) {
      // Pick a random edge
      const edge = Math.floor(Math.random() * 4);
      let x: number, y: number;
      switch (edge) {
        case 0: x = 0; y = Math.random() * height; break;           // left
        case 1: x = width; y = Math.random() * height; break;       // right
        case 2: x = Math.random() * width; y = 0; break;            // top
        default: x = Math.random() * width; y = height; break;      // bottom
      }

      // Aim roughly toward center with randomness
      const angle = Math.atan2(height / 2 - y, width / 2 - x)
        + (Math.random() - 0.5) * 1.2;
      const speed = ASTEROID_SPEEDS.large * (0.6 + Math.random() * 0.6);

      state.asteroids.push(
        AsteroidSystem.createAsteroid(
          x, y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          'large',
        ),
      );
    }
  }

  static createAsteroid(
    x: number, y: number,
    vx: number, vy: number,
    size: AsteroidSize,
  ): Asteroid {
    const vertices = 8 + Math.floor(Math.random() * 6); // 8 to 13
    const offsets: number[] = [];
    for (let i = 0; i < vertices; i++) {
      offsets.push(0.7 + Math.random() * 0.6); // radius jitter 0.7-1.3
    }
    return {
      pos: { x, y },
      vel: { x: vx, y: vy },
      size,
      radius: ASTEROID_RADII[size],
      vertices,
      offsets,
    };
  }
}
```

**What's happening:**
- `spawnWave` places asteroids on random screen edges. `Math.atan2` computes the angle from the spawn point toward the screen center, then adds up to 0.6 radians of random deviation so they do not all converge on the exact same spot.
- `createAsteroid` is a static factory. The vertex count ranges from 8 to 13 for variety. Each vertex's `offset` jitters the radius between 70% and 130% of the base, producing a unique jagged shape every time.
- Speed gets a random factor of 0.6 to 1.2 times the base speed for that size tier.

---

### 3. Add Asteroid Physics and Bullet-Asteroid Collision

**File:** `src/contexts/canvas2d/games/asteroids/systems/PhysicsSystem.ts`

Add asteroid movement and collision detection:

```typescript
import type { AsteroidsState } from '../types';
import { SHIP_THRUST, SHIP_DRAG, SHIP_ROTATION_SPEED, ASTEROID_SPEEDS } from '../types';
import type { InputKeys } from './InputSystem';
import { AsteroidSystem } from './AsteroidSystem';
import type { AsteroidSize } from '../types';

export class PhysicsSystem {
  private keys: InputKeys;

  constructor(keys: InputKeys) {
    this.keys = keys;
  }

  update(state: AsteroidsState): void {
    this.updateShip(state);
    this.updateBullets(state);
    this.updateAsteroids(state);
    this.checkBulletAsteroidCollisions(state);
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

  private checkBulletAsteroidCollisions(state: AsteroidsState): void {
    for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
      const b = state.bullets[bi];
      for (let ai = state.asteroids.length - 1; ai >= 0; ai--) {
        const a = state.asteroids[ai];
        const dx = b.pos.x - a.pos.x;
        const dy = b.pos.y - a.pos.y;
        if (dx * dx + dy * dy < a.radius * a.radius) {
          // Remove bullet
          state.bullets.splice(bi, 1);
          // Split or destroy asteroid
          this.splitAsteroid(state, ai);
          break; // bullet consumed, move to next bullet
        }
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
    if (!ns) return; // small asteroid — just destroy it

    // Spawn two smaller asteroids at the same position
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

  private wrap(val: number, max: number): number {
    if (val < 0) return val + max;
    if (val > max) return val - max;
    return val;
  }
}
```

**What's happening:**
- `updateAsteroids` moves every asteroid by its velocity and wraps at screen edges, identical to ship and bullet wrapping.
- `checkBulletAsteroidCollisions` uses **circle-point collision**: if the distance from the bullet to the asteroid center is less than the asteroid's radius, it is a hit. We compare squared distances to avoid an expensive `Math.sqrt`.
- `splitAsteroid` removes the hit asteroid, looks up the next smaller size, and spawns two new asteroids at the same position with random directions. If the asteroid was already `small`, nothing spawns — it is simply destroyed.
- The two child asteroids inherit the parent's position but get new random velocities at the smaller tier's speed.

---

### 4. Add Asteroid Rendering

**File:** `src/contexts/canvas2d/games/asteroids/renderers/GameRenderer.ts`

Add a `drawAsteroids` method:

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
    this.drawBullets(ctx, state);
    this.drawAsteroids(ctx, state);
    this.drawShip(ctx, state);
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
}
```

**What's happening:**
- `drawAsteroids` iterates each asteroid's vertices. For each vertex, it computes the angle as `(index / total) * 2PI` (evenly spaced around the circle), then multiplies the base radius by that vertex's offset. The result is an irregular polygon.
- `i <= a.vertices` with `idx = i % a.vertices` ensures the path closes back to the first vertex before calling `closePath`.
- Grey outlines (`#aaa`) give the classic vector-graphics look.

---

### 5. Update the Engine

**File:** `src/contexts/canvas2d/games/asteroids/AsteroidsEngine.ts`

Add asteroids to initial state and spawn the first wave:

```typescript
import type { AsteroidsState } from './types';
import { INITIAL_ASTEROIDS } from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { AsteroidSystem } from './systems/AsteroidSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class AsteroidsEngine {
  private ctx: CanvasRenderingContext2D;
  private state: AsteroidsState;
  private running = false;
  private rafId = 0;

  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
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
      lastShot: 0,
      width: canvas.width,
      height: canvas.height,
    };

    this.inputSystem = new InputSystem(this.state);
    this.physicsSystem = new PhysicsSystem(this.inputSystem.keys);
    this.asteroidSystem = new AsteroidSystem();
    this.gameRenderer = new GameRenderer();

    this.inputSystem.attach();

    // Spawn the initial wave of asteroids
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
    this.gameRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Asteroids game
3. **Observe:**
   - 4 large grey asteroids drift in from the edges with unique jagged shapes
   - Asteroids wrap around screen edges seamlessly
   - Shoot a large asteroid — it splits into 2 medium asteroids that fly apart
   - Shoot a medium asteroid — it splits into 2 small, fast asteroids
   - Shoot a small asteroid — it is destroyed completely
   - Each asteroid has a different shape due to the random vertex offsets
   - Destroy all asteroids and the screen is clear (no new wave yet — that comes in Step 6)

**Try this:** Shoot a large asteroid and watch the chain reaction. One large becomes 2 medium, which become 4 small — a total of 7 asteroids from one. That is why the game gets hectic.

---

## Try It

- Change `INITIAL_ASTEROIDS` to `8` for immediate chaos.
- Set all `ASTEROID_SPEEDS` values to `0.5` for slow-motion asteroids.
- Set `ASTEROID_RADII.large` to `60` for massive boulders.
- In `createAsteroid`, change the offset range to `0.3 + Math.random() * 1.4` for extremely spiky asteroids.

---

## Challenges

**Easy:**
- Give each size tier a different stroke color: grey for large, light blue for medium, white for small.
- Make asteroid outlines thicker for large asteroids (`lineWidth = 2.5`) and thinner for small (`lineWidth = 1`).

**Medium:**
- Add slow rotation to asteroids: store a `rotAngle` and `rotSpeed` on each asteroid, increment `rotAngle` each frame, and use `ctx.save/translate/rotate/restore` to draw them spinning.
- Make asteroids split into 3 pieces instead of 2 for large asteroids only.

**Hard:**
- When an asteroid is destroyed (small), leave behind a faint ghost outline that fades over 30 frames.
- Generate asteroid shapes using Perlin noise offsets instead of random jitter for smoother, more natural rock shapes.

---

## What You Learned

- Generating random polygon shapes with vertex count and radius jitter
- Spawning entities at screen edges aimed toward center
- Circle-point collision detection using squared distances
- Asteroid splitting chain: large -> medium -> small -> gone
- Rendering irregular polygons from per-vertex angle and offset data

**Next:** Ship-asteroid collision, particle explosions, and invulnerability after death!
