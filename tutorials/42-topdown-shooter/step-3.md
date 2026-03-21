# Step 3: Shooting & Bullets

**Goal:** Click to fire bullets toward the cursor with a cooldown timer, and render them as glowing projectiles.

**Time:** ~15 minutes

---

## What You'll Build

- **Click-to-shoot** mechanic that fires bullets toward the mouse cursor
- **Shoot cooldown** preventing full-auto spam (0.15s between shots)
- **Bullet rendering** with yellow circles and a glow effect
- **Bullet lifetime** -- bullets disappear after 1.5 seconds
- **Arena bounds removal** -- bullets that leave the arena are cleaned up
- **BulletSystem** that updates positions and handles removal

---

## Concepts

- **Velocity from Direction**: To fire a bullet toward the cursor, we compute the unit direction vector from player to mouse, then multiply by `BULLET_SPEED`. This gives a velocity vector `{ x, y }` in pixels per second.
- **Cooldown Timer**: `shootCooldown` decreases by `dt` each frame. When the player clicks and cooldown is <= 0, we fire and reset cooldown to `SHOOT_COOLDOWN` (0.15s). This prevents firing 60 bullets per second at 60 FPS.
- **Object Pooling via Splice**: Bullets are stored in an array. Dead bullets are removed with `splice()`. For a small shooter this is fine; large-scale games would use object pools.
- **Canvas Glow Effect**: Setting `ctx.shadowColor` and `ctx.shadowBlur` before a `fill()` creates a bloom/glow around the shape. Resetting `shadowBlur = 0` afterward prevents the glow from bleeding into other draws.

---

## Code

### 1. Update the Player System

**File:** `src/games/topdown-shooter/systems/PlayerSystem.ts`

Add shooting logic to the existing movement system.

```typescript
import type { ShooterState, Vec2 } from '../types';
import {
  PLAYER_SPEED,
  SHOOT_COOLDOWN,
  BULLET_SPEED,
  BULLET_RADIUS,
  ARENA_PADDING,
} from '../types';

export class PlayerSystem {
  update(state: ShooterState, dt: number): void {
    const { player, keys } = state;

    // ── Movement ──────────────────────────────────────────────────
    let dx = 0;
    let dy = 0;

    if (keys.has('w') || keys.has('arrowup')) dy -= 1;
    if (keys.has('s') || keys.has('arrowdown')) dy += 1;
    if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
    if (keys.has('d') || keys.has('arrowright')) dx += 1;

    // Normalize diagonal
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > 0) {
      dx /= mag;
      dy /= mag;
    }

    player.pos.x += dx * PLAYER_SPEED * dt;
    player.pos.y += dy * PLAYER_SPEED * dt;

    // Clamp inside arena
    const pad = ARENA_PADDING + player.radius;
    player.pos.x = Math.max(pad, Math.min(state.canvasW - pad, player.pos.x));
    player.pos.y = Math.max(pad, Math.min(state.canvasH - pad, player.pos.y));

    // ── Shooting ─────────────────────────────────────────────────
    player.shootCooldown -= dt;

    if (state.mouseDown && player.shootCooldown <= 0) {
      player.shootCooldown = SHOOT_COOLDOWN;
      this.shoot(state);
    }
  }

  private shoot(state: ShooterState): void {
    const { player, mouse, bullets } = state;
    const aim: Vec2 = {
      x: mouse.x - player.pos.x,
      y: mouse.y - player.pos.y,
    };
    const len = Math.sqrt(aim.x * aim.x + aim.y * aim.y);

    if (len === 0) return;

    bullets.push({
      pos: { x: player.pos.x, y: player.pos.y },
      vel: {
        x: (aim.x / len) * BULLET_SPEED,
        y: (aim.y / len) * BULLET_SPEED,
      },
      age: 0,
      radius: BULLET_RADIUS,
      fromPlayer: true,
    });
  }
}
```

**What's happening:**
- `shootCooldown` ticks down by `dt` every frame. When the mouse is held and cooldown reaches zero, we fire.
- `shoot()` computes the aim vector `(mouse - player)`, normalizes it, and multiplies by `BULLET_SPEED` (600 px/s) to create the velocity.
- The bullet spawns at the player's position with `fromPlayer: true`. Later, enemy bullets will use `fromPlayer: false` so the collision system knows what to damage.
- If the aim length is zero (mouse is exactly on the player), we skip firing to avoid division by zero.

---

### 2. Create the Bullet System

**File:** `src/games/topdown-shooter/systems/BulletSystem.ts`

Moves bullets each frame and removes expired or out-of-bounds ones.

```typescript
import type { ShooterState } from '../types';
import { BULLET_LIFETIME, ARENA_PADDING } from '../types';

export class BulletSystem {
  update(state: ShooterState, dt: number): void {
    const { bullets } = state;

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];

      b.pos.x += b.vel.x * dt;
      b.pos.y += b.vel.y * dt;
      b.age += dt;

      // Remove if expired or out of arena
      if (
        b.age > BULLET_LIFETIME ||
        b.pos.x < ARENA_PADDING ||
        b.pos.x > state.canvasW - ARENA_PADDING ||
        b.pos.y < ARENA_PADDING ||
        b.pos.y > state.canvasH - ARENA_PADDING
      ) {
        bullets.splice(i, 1);
      }
    }
  }
}
```

**What's happening:**
- We iterate **backwards** (`i--`) because `splice(i, 1)` removes elements in-place. Iterating forwards would skip the element after a removed one.
- Each bullet moves by `vel * dt` and ages by `dt`.
- Bullets are removed if they exceed `BULLET_LIFETIME` (1.5s) or leave the arena bounds. This prevents an ever-growing array of off-screen bullets.
- No collision logic yet -- that comes in Step 4 when enemies arrive.

---

### 3. Update the Game Renderer

**File:** `src/games/topdown-shooter/renderers/GameRenderer.ts`

Add bullet rendering with glow effects.

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

    // ── Bullets ──────────────────────────────────────────────────
    for (const b of state.bullets) {
      ctx.fillStyle = b.fromPlayer ? '#ffeb3b' : '#e040fb';
      ctx.beginPath();
      ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2);
      ctx.fill();

      // Glow
      ctx.shadowColor = b.fromPlayer ? '#ffeb3b' : '#e040fb';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // ── Player ───────────────────────────────────────────────────
    const { player, mouse } = state;

    // Aim line
    const aimDx = mouse.x - player.pos.x;
    const aimDy = mouse.y - player.pos.y;
    const aimLen = Math.sqrt(aimDx * aimDx + aimDy * aimDy);

    if (aimLen > 0) {
      const nx = aimDx / aimLen;
      const ny = aimDy / aimLen;

      ctx.strokeStyle = 'rgba(255,235,59,0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(
        player.pos.x + nx * PLAYER_RADIUS,
        player.pos.y + ny * PLAYER_RADIUS,
      );
      ctx.lineTo(player.pos.x + nx * 60, player.pos.y + ny * 60);
      ctx.stroke();
      ctx.setLineDash([]);
    }

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

    // Gun direction indicator
    if (aimLen > 0) {
      const nx = aimDx / aimLen;
      const ny = aimDy / aimLen;

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(
        player.pos.x + nx * (player.radius - 4),
        player.pos.y + ny * (player.radius - 4),
        4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
}
```

**What's happening:**
- Bullets are drawn **before** the player so they appear to fly out from underneath the player circle.
- Player bullets are yellow (`#ffeb3b`); enemy bullets (coming in a later step) will be purple (`#e040fb`). The `fromPlayer` flag determines the color.
- The glow effect uses `shadowColor` + `shadowBlur = 8` and calls `fill()` a second time. The shadow system in Canvas applies blur around filled shapes, creating a bloom effect.
- `shadowBlur = 0` immediately after prevents the glow from applying to everything drawn afterward.

---

### 4. Update the Engine

**File:** `src/games/topdown-shooter/ShooterEngine.ts`

Add BulletSystem to the update loop.

```typescript
import type { ShooterState } from './types';
import { PLAYER_RADIUS, PLAYER_MAX_HP } from './types';
import { InputSystem } from './systems/InputSystem';
import { PlayerSystem } from './systems/PlayerSystem';
import { BulletSystem } from './systems/BulletSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class ShooterEngine {
  private ctx: CanvasRenderingContext2D;
  private state: ShooterState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private playerSystem: PlayerSystem;
  private bulletSystem: BulletSystem;
  private gameRenderer: GameRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.createInitialState(canvas.width, canvas.height);

    this.playerSystem = new PlayerSystem();
    this.bulletSystem = new BulletSystem();
    this.gameRenderer = new GameRenderer();
    this.inputSystem = new InputSystem(this.state, canvas);

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasW = canvas.width;
      this.state.canvasH = canvas.height;
    };

    this.inputSystem.attach();
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
    this.inputSystem.detach();
    window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (!this.state.paused && !this.state.gameOver) {
      this.playerSystem.update(this.state, dt);
      this.bulletSystem.update(this.state, dt);
    }

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
- `BulletSystem` is now instantiated and called in the update loop after `PlayerSystem`. Order matters: the player shoots first, then bullets move.
- Both systems are gated behind `!paused && !gameOver` so bullets freeze when the game is paused.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Top-Down Shooter game in your browser
3. **Observe:**
   - **Click** anywhere -- a yellow bullet fires from the player toward the cursor
   - **Hold the mouse button** -- bullets fire rapidly (~6.7 per second with the 0.15s cooldown)
   - Bullets have a **yellow glow** effect making them easy to track
   - Bullets **disappear** when they hit the arena border or after 1.5 seconds
   - Move with WASD while shooting -- bullets always fly toward the cursor position
   - **Press P** to pause -- bullets freeze in place

---

## Challenges

**Easy:**
- Change `BULLET_SPEED` to 300 (slower) or 900 (faster) and observe how it affects gameplay feel.
- Change the bullet color from yellow to cyan (`#00e5ff`).

**Medium:**
- Add a bullet count display in the top-left corner showing how many active bullets are on screen.

**Hard:**
- Implement a "spread shot" that fires 3 bullets at once: one toward the cursor and two at +/- 15 degrees offset.

---

## What You Learned

- Computing velocity vectors from direction and speed for projectile motion
- Implementing a cooldown timer to rate-limit shooting
- Iterating arrays backwards when using `splice()` for safe in-place removal
- Adding canvas glow effects with `shadowColor` and `shadowBlur`
- Removing bullets that exceed lifetime or leave the arena

**Next:** Enemies and waves -- spawning enemies that chase the player and can be destroyed by bullets!
