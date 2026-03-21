# Step 3: Shooting

**Goal:** Press Space to fire bullets in the direction the ship is facing. Bullets travel in a straight line, wrap around the screen, and expire after a set lifetime.

**Time:** ~15 minutes

---

## What You'll Build

Building on the flying ship from Step 2:
- **Bullet spawning**: Space bar fires a bullet from the ship's nose
- **Bullet velocity**: Bullets inherit the ship's facing direction but not its momentum
- **Bullet lifetime**: Each bullet lives for 60 frames, then disappears
- **Cooldown**: A 150ms cooldown between shots prevents bullet spam
- **Max bullets**: No more than 8 bullets on screen at once
- **Screen wrapping**: Bullets wrap around edges just like the ship

---

## Concepts

- **Bullet Velocity from Ship Angle**: Same `sin/cos` trick as thrust, but at a fixed high speed. The bullet flies where the ship is pointing, regardless of the ship's drift direction.
- **Lifetime Counter**: Each bullet has a `life` field that decrements every frame. When it hits zero, the bullet is removed. This prevents bullets from orbiting the screen forever.
- **Cooldown via Timestamp**: Store `lastShot` as a `performance.now()` timestamp. Only allow a new shot when `now - lastShot >= SHOOT_COOLDOWN`.

---

## Code

### 1. Add Bullet Types and Constants

**File:** `src/contexts/canvas2d/games/asteroids/types.ts`

Add bullet-related constants and the `Bullet` interface:

```typescript
// ── Constants ──────────────────────────────────────────────
export const SHIP_RADIUS = 15;
export const SHIP_THRUST = 0.12;
export const SHIP_DRAG = 0.99;
export const SHIP_ROTATION_SPEED = 0.065;
export const BULLET_SPEED = 7;
export const BULLET_LIFETIME = 60; // frames
export const MAX_BULLETS = 8;
export const SHOOT_COOLDOWN = 150; // ms

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
  life: number; // frames remaining
}

export interface AsteroidsState {
  ship: Ship;
  bullets: Bullet[];
  lastShot: number; // timestamp
  width: number;
  height: number;
}
```

**What's happening:**
- `BULLET_SPEED` at `7` pixels per frame is significantly faster than the ship, so bullets always fly ahead.
- `BULLET_LIFETIME` at `60` frames means a bullet travels roughly 420 pixels before vanishing (7 * 60).
- `MAX_BULLETS` at `8` forces the player to aim instead of holding Space and spraying.
- `lastShot` is stored in the state so the cooldown persists across frames.

---

### 2. Add Shooting to the Input System

**File:** `src/contexts/canvas2d/games/asteroids/systems/InputSystem.ts`

Add a `processShooting` method that fires bullets when Space is held:

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
  readonly keys: InputKeys = { left: false, right: false, up: false, space: false };

  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;

  constructor(state: AsteroidsState) {
    this.state = state;
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
    if (e.key === ' ') e.preventDefault(); // prevent page scroll
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
- `processShooting` is called once per frame from the engine. If Space is held, it checks the cooldown and bullet count before spawning.
- The bullet spawns at the ship's position with velocity `(sin(angle) * BULLET_SPEED, -cos(angle) * BULLET_SPEED)` — the same direction formula as thrust, but at a fixed speed.
- `e.preventDefault()` on Space stops the browser from scrolling the page when shooting.

---

### 3. Add Bullet Physics

**File:** `src/contexts/canvas2d/games/asteroids/systems/PhysicsSystem.ts`

Add bullet movement, lifetime countdown, and wrapping:

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
    this.updateShip(state);
    this.updateBullets(state);
  }

  private updateShip(state: AsteroidsState): void {
    const ship = state.ship;
    const { width, height } = state;

    // Rotation
    if (this.keys.left) ship.angle -= SHIP_ROTATION_SPEED;
    if (this.keys.right) ship.angle += SHIP_ROTATION_SPEED;

    // Thrust
    ship.thrusting = this.keys.up;
    if (ship.thrusting) {
      ship.vel.x += Math.sin(ship.angle) * SHIP_THRUST;
      ship.vel.y -= Math.cos(ship.angle) * SHIP_THRUST;
    }

    // Drag
    ship.vel.x *= SHIP_DRAG;
    ship.vel.y *= SHIP_DRAG;

    // Move
    ship.pos.x += ship.vel.x;
    ship.pos.y += ship.vel.y;

    // Wrap
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

  private wrap(val: number, max: number): number {
    if (val < 0) return val + max;
    if (val > max) return val - max;
    return val;
  }
}
```

**What's happening:**
- `updateBullets` iterates backwards so we can safely `splice` expired bullets without skipping any.
- Each bullet moves by its velocity, wraps around edges, and has its `life` decremented. When `life` hits zero, the bullet is removed.
- Bullets use the same `wrap` helper as the ship, so they seamlessly reappear on the opposite edge.

---

### 4. Add Bullet Rendering

**File:** `src/contexts/canvas2d/games/asteroids/renderers/GameRenderer.ts`

Add a `drawBullets` method:

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
- Bullets are tiny white circles (radius 2). Simple, classic, and fast to render.
- We draw bullets **before** the ship so the ship always appears on top.
- No transform stack needed for bullets — they are just circles at absolute positions.

---

### 5. Update the Engine

**File:** `src/contexts/canvas2d/games/asteroids/AsteroidsEngine.ts`

Add `bullets` and `lastShot` to the initial state, and call `processShooting`:

```typescript
import type { AsteroidsState } from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class AsteroidsEngine {
  private ctx: CanvasRenderingContext2D;
  private state: AsteroidsState;
  private running = false;
  private rafId = 0;

  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
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
      lastShot: 0,
      width: canvas.width,
      height: canvas.height,
    };

    this.inputSystem = new InputSystem(this.state);
    this.physicsSystem = new PhysicsSystem(this.inputSystem.keys);
    this.gameRenderer = new GameRenderer();

    this.inputSystem.attach();
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

**What's happening:**
- `inputSystem.processShooting()` is called **before** physics so newly spawned bullets get their first movement update in the same frame.
- The loop is now: **spawn bullets** -> **update physics** -> **render**.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Asteroids game
3. **Observe:**
   - Rotate the ship and press **Space** — white dots fly out from the ship's nose
   - Bullets travel in a straight line in the direction the ship was facing when it fired
   - Bullets wrap around edges and reappear on the opposite side
   - Bullets vanish after about one second (60 frames)
   - Hold Space and bullets fire at a steady rate (not every frame)
   - Fire 8 bullets quickly — you cannot fire a 9th until one expires
   - Thrust while shooting: the bullets always go where the nose points, regardless of drift

**Try this:** Fly in one direction, then rotate 180 degrees and shoot. The bullets fly opposite to your movement. This is key to Asteroids strategy.

---

## Try It

- Change `BULLET_SPEED` to `12` for faster, more arcade-like bullets.
- Change `MAX_BULLETS` to `3` for a more challenging ammo limit.
- Change `SHOOT_COOLDOWN` to `50` for rapid fire, or `500` for careful, deliberate shots.
- Make bullets larger (radius 4) in `drawBullets` for a more visible projectile.

---

## Challenges

**Easy:**
- Change the bullet color from white to bright green.
- Make the bullet radius shrink as `life` decreases, so bullets fade out.

**Medium:**
- Add a muzzle flash: draw a brief bright circle at the ship's nose for 3 frames after firing.
- Make bullets inherit some of the ship's velocity so they fly faster when the ship is moving forward.

**Hard:**
- Add a "triple shot" power-up that fires three bullets in a spread pattern (center, +15 degrees, -15 degrees).
- Make bullets bounce off screen edges once instead of wrapping, then expire on the second edge hit.

---

## What You Learned

- Spawning projectiles from an entity's position with velocity derived from its facing angle
- Frame-based lifetime for automatic projectile cleanup
- Cooldown using `performance.now()` timestamps
- Backwards iteration with `splice` for safe removal during update
- Bullet rendering as simple filled circles

**Next:** Spawning asteroids with random jagged shapes and splitting them when hit!
