# Step 4: Enemies & Stomping

**Goal:** Add patrolling enemies that hurt the player on contact but can be defeated by jumping on them from above.

**Time:** ~15 minutes

---

## What You'll Build

- **Enemy system** with patrol AI that walks back and forth within a zone
- **Stomp detection** that kills enemies when the player lands on them from above
- **Damage handling** that costs a life and respawns the player on side collision
- **Enemy rendering** with a red body and alien emoji face
- **Bounce reward** that pops the player upward after a stomp

---

## Concepts

- **Patrol AI**: Each enemy has a `minX` and `maxX` defining its patrol zone. It walks in one direction at a constant speed until it reaches a boundary, then reverses. This creates predictable patterns the player can learn.
- **Stomp vs Hit Detection**: When the player collides with an enemy, the outcome depends on approach direction. If the player is falling (`vy > 0`) and their feet are above the enemy's midpoint (`py + ph < e.y + e.h * 0.5`), it is a stomp. Otherwise, the player takes damage. This is exactly how classic platformers like Super Mario Bros. work.
- **Bounce on Stomp**: After stomping, the player receives a small upward velocity (`JUMP_SPEED * 0.6`) so they bounce off the enemy. This feels satisfying and gives the player time to reposition.
- **Entity Removal Pattern**: Rather than removing enemies from the array (which would shift indices), we move defeated enemies offscreen (`y = 9999`). The renderer skips anything with `y > 900`. This avoids array mutation bugs.

---

## Code

### 1. Create the Enemy System

**File:** `src/contexts/canvas2d/games/platformer/systems/EnemySystem.ts`

Moves enemies along their patrol routes and handles player-enemy collision.

```typescript
import type { Updatable } from "@core/Updatable";
import type { PlatState } from "../types";
import { JUMP_SPEED } from "../types";

export class EnemySystem implements Updatable<PlatState> {
  update(state: PlatState, dt: number): void {
    const s = state;

    for (const e of s.enemies) {
      e.x += e.speed * e.dir * dt;

      if (e.x < e.minX || e.x > e.maxX) e.dir *= -1;

      // Player collision
      if (
        s.px + s.pw > e.x &&
        s.px < e.x + e.w &&
        s.py + s.ph > e.y &&
        s.py < e.y + e.h
      ) {
        if (s.vy > 0 && s.py + s.ph < e.y + e.h * 0.5) {
          // Stomp
          e.y = 9999;
          s.vy = JUMP_SPEED * 0.6;
          s.score += 100;
        } else {
          // Hit
          s.lives--;

          if (s.lives <= 0) {
            s.gameOver = true;

            return;
          }

          s.px = 60;
          s.py = 460;
          s.vx = 0;
          s.vy = 0;
        }
      }
    }
  }
}
```

**What's happening:**
- Each frame, every enemy moves by `speed * dir * dt`. When it reaches `minX` or `maxX`, `dir` flips from 1 to -1 (or vice versa), reversing direction. The `dt` multiplier keeps patrol speed consistent regardless of frame rate.
- The stomp check has two conditions beyond the basic AABB overlap: the player must be falling (`vy > 0`) and their bottom edge must be above the enemy's midpoint (`py + ph < e.y + e.h * 0.5`). This prevents "side stomps" that would feel unfair.
- A successful stomp awards 100 points and sets the player's velocity to `JUMP_SPEED * 0.6` (-288 px/s) -- a shorter bounce than a full jump.
- A side hit costs one life and respawns the player at the start position. At zero lives, the game ends immediately with an early return.

---

### 2. Update the Entity Renderer

**File:** `src/contexts/canvas2d/games/platformer/renderers/EntityRenderer.ts`

Add enemy rendering alongside the existing player rendering.

```typescript
import type { Renderable } from "@core/Renderable";
import type { PlatState } from "../types";

export class EntityRenderer implements Renderable<PlatState> {
  render(ctx: CanvasRenderingContext2D, state: PlatState): void {
    const s = state;

    ctx.save();
    ctx.translate(-s.camX, -s.camY);

    // Enemies
    for (const e of s.enemies) {
      if (e.y > 900) continue;

      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(e.x, e.y, e.w, e.h);
      ctx.fillStyle = "#fff";
      ctx.font = `${e.w}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("\u{1F47E}", e.x + e.w / 2, e.y + e.h / 2);
    }

    // Player
    ctx.fillStyle = s.onGround ? "#60a5fa" : "#93c5fd";
    ctx.fillRect(s.px, s.py, s.pw, s.ph);
    // Eyes
    const eyeX = s.facing > 0 ? s.px + s.pw * 0.65 : s.px + s.pw * 0.2;

    ctx.fillStyle = "#fff";
    ctx.fillRect(eyeX, s.py + 6, 5, 6);
    ctx.fillStyle = "#000";
    ctx.fillRect(eyeX + (s.facing > 0 ? 2 : 0), s.py + 8, 3, 3);

    ctx.restore();
  }
}
```

**What's happening:**
- Enemies render as a red rectangle (`#e74c3c`) with an alien emoji centered on top. The emoji font size matches the enemy width for proportional scaling.
- Enemies with `y > 900` are skipped -- these have been stomped and moved offscreen. This is cheaper than filtering the array.
- Enemies are drawn before the player so the player always appears on top, making stomps visually clear.

---

### 3. Update the Engine

**File:** `src/contexts/canvas2d/games/platformer/PlatformerEngine.ts`

Add the `EnemySystem` to the systems array. It must run after `CollisionSystem` (so the player's position is resolved) but the order is flexible.

```typescript
import type { Updatable } from "@core/Updatable";
import type { Renderable } from "@core/Renderable";
import type { PlatState } from "./types";
import { buildLevel } from "./data/levels";
import { InputSystem } from "./systems/InputSystem";
import { PhysicsSystem } from "./systems/PhysicsSystem";
import { CollisionSystem } from "./systems/CollisionSystem";
import { EnemySystem } from "./systems/EnemySystem";
import { CameraSystem } from "./systems/CameraSystem";
import { WorldRenderer } from "./renderers/WorldRenderer";
import { EntityRenderer } from "./renderers/EntityRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";

export class PlatformerEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: PlatState;
  private onExit: () => void;
  private rafId = 0;
  private running = false;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private systems: Updatable<PlatState>[];
  private renderers: Renderable<PlatState>[];

  private clickHandler: (e: MouseEvent) => void;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.canvas = canvas;
    this.onExit = onExit;
    this.ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = buildLevel(1);

    this.inputSystem = new InputSystem(onExit);

    this.systems = [
      this.inputSystem,
      new PhysicsSystem(),
      new CollisionSystem(),
      new EnemySystem(),
      new CameraSystem(canvas),
    ];

    this.renderers = [
      new WorldRenderer(canvas),
      new EntityRenderer(),
      new HUDRenderer(canvas),
    ];

    this.clickHandler = (e: MouseEvent) => this.handleClick(e);
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
  }

  start(): void {
    this.inputSystem.attach();
    this.canvas.addEventListener("click", this.clickHandler);
    window.addEventListener("resize", this.resizeHandler);
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
    this.canvas.removeEventListener("click", this.clickHandler);
    window.removeEventListener("resize", this.resizeHandler);
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    if (x < 80 && y < 40) {
      this.onExit();

      return;
    }

    const s = this.state;

    if (!s.started) {
      s.started = true;

      return;
    }

    if (s.gameOver || s.won) {
      this.state = buildLevel(s.won ? s.level + 1 : 1);
      this.state.started = true;
    }
  }

  private loop(timestamp: number): void {
    if (!this.running) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);

    this.lastTime = timestamp;

    if (this.state.started && !this.state.gameOver && !this.state.won) {
      this.update(dt);
    }

    this.render();
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number): void {
    for (const system of this.systems) {
      system.update(this.state, dt);

      if (this.state.gameOver) return;
    }
  }

  private render(): void {
    for (const renderer of this.renderers) {
      renderer.render(this.ctx, this.state);
    }
  }
}
```

**What's happening:**
- The only change from Step 3 is adding `new EnemySystem()` to the systems array, positioned after `CollisionSystem` and before `CameraSystem`.
- The system pipeline is now: Input -> Physics -> Collision -> Enemy -> Camera. Each system reads and modifies the shared `PlatState`, and the engine short-circuits if `gameOver` becomes true.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Platformer game in your browser
3. **Observe:**
   - **Red enemies** with alien emoji faces patrol back and forth on the ground
   - Walk into an enemy from the side -- you **lose a life** and respawn
   - Jump on an enemy from above -- it **disappears**, you get **+100 points**, and you **bounce upward**
   - Lose all 3 lives -- **GAME OVER** screen appears
   - The score in the HUD increases when you stomp enemies
   - Enemies near the edges of their patrol zone **reverse direction**

---

## Challenges

**Easy:**
- Change the stomp reward from 100 to 200 points.
- Change the bounce multiplier from 0.6 to 1.0 for a full-height bounce after stomping.

**Medium:**
- Add an invincibility period after taking damage: for 1.5 seconds after a hit, the player cannot be damaged again. Flash the player sprite by toggling visibility every 100ms during invincibility.

**Hard:**
- Add a chase behavior: when the player is within 150px horizontally of an enemy, the enemy doubles its speed and moves toward the player instead of patrolling. Revert to patrol behavior when the player moves away.

---

## What You Learned

- Implementing patrol AI with boundary-based direction reversal
- Detecting stomp vs side collision using vertical position and velocity checks
- Using the offscreen removal pattern (`y = 9999`) to "delete" entities without array mutation
- Providing bounce feedback after a successful stomp for satisfying game feel
- Ordering systems in the update pipeline so each reads resolved positions

**Next:** Collectibles & Score -- add golden coins scattered across the level that the player can pick up for points!
