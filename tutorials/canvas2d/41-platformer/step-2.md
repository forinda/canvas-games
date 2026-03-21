# Step 2: Player Movement & Gravity

**Goal:** Add keyboard input, gravity, and platform collision so the player can run, jump, and land on solid tiles.

**Time:** ~15 minutes

---

## What You'll Build

- **Keyboard input system** that tracks arrow keys, WASD, and Space
- **Physics system** that applies gravity and velocity each frame
- **Collision system** that detects landing on platforms and prevents falling through
- **Player rendering** with a colored rectangle, eyes, and directional facing
- **Fall death** that costs a life and respawns the player

---

## Concepts

- **Delta Time (dt)**: The elapsed time between frames in seconds. Multiplying velocity by `dt` makes movement frame-rate independent: `px += vx * dt`. We cap `dt` at 0.05s to prevent physics explosions after a tab switch.
- **Gravity as Acceleration**: Each frame we add `GRAVITY * dt` to the vertical velocity (`vy`). This produces natural parabolic jump arcs. The player accelerates downward continuously unless standing on a platform.
- **AABB Collision**: Axis-Aligned Bounding Box collision checks whether two rectangles overlap. For platform landing, we check if the player's bottom edge (`py + ph`) intersects the platform's top edge while falling downward (`vy >= 0`).
- **Input Polling vs Events**: Rather than responding to keydown events directly, we store which keys are currently held in a `Set<string>` and read the set each frame. This avoids timing issues and makes movement feel smooth.

---

## Code

### 1. Create the Input System

**File:** `src/contexts/canvas2d/games/platformer/systems/InputSystem.ts`

Tracks held keys and translates them into player velocity each frame.

```typescript
import type { InputHandler } from "@core/InputHandler";
import type { Updatable } from "@core/Updatable";
import type { PlatState } from "../types";
import { MOVE_SPEED, JUMP_SPEED } from "../types";

export class InputSystem implements InputHandler, Updatable<PlatState> {
  private keys: Set<string> = new Set();
  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;
  private onExit: () => void;

  constructor(onExit: () => void) {
    this.onExit = onExit;
    this.keyDownHandler = (e: KeyboardEvent) => {
      this.keys.add(e.key);

      if (e.key === "Escape") this.onExit();
    };
    this.keyUpHandler = (e: KeyboardEvent) => {
      this.keys.delete(e.key);
    };
  }

  attach(): void {
    window.addEventListener("keydown", this.keyDownHandler);
    window.addEventListener("keyup", this.keyUpHandler);
  }

  detach(): void {
    window.removeEventListener("keydown", this.keyDownHandler);
    window.removeEventListener("keyup", this.keyUpHandler);
  }

  update(state: PlatState, _dt: number): void {
    state.vx = 0;

    if (this.keys.has("ArrowLeft") || this.keys.has("a")) {
      state.vx = -MOVE_SPEED;
      state.facing = -1;
    }

    if (this.keys.has("ArrowRight") || this.keys.has("d")) {
      state.vx = MOVE_SPEED;
      state.facing = 1;
    }

    if (
      (this.keys.has("ArrowUp") || this.keys.has("w") || this.keys.has(" ")) &&
      state.onGround
    ) {
      state.vy = JUMP_SPEED;
      state.onGround = false;
    }
  }
}
```

**What's happening:**
- `attach()` and `detach()` follow the `InputHandler` interface, ensuring clean listener cleanup when the game is destroyed.
- The `keys` set holds raw key strings. On each `update()`, we read the set to decide velocity. Left/right set `vx` to `MOVE_SPEED` and update `facing` for directional rendering.
- Jumping sets `vy` to `JUMP_SPEED` (-480) but only when `onGround` is true. This prevents infinite mid-air jumps. Setting `onGround = false` immediately stops repeated jumps from held keys.

---

### 2. Create the Physics System

**File:** `src/contexts/canvas2d/games/platformer/systems/PhysicsSystem.ts`

Applies gravity and integrates velocity into position.

```typescript
import type { Updatable } from '@core/Updatable';
import type { PlatState } from '../types';
import { GRAVITY } from '../types';

export class PhysicsSystem implements Updatable<PlatState> {
  update(state: PlatState, dt: number): void {
    state.vy += GRAVITY * dt;
    state.px += state.vx * dt;
    state.py += state.vy * dt;
  }
}
```

**What's happening:**
- This is the entire physics engine: three lines. Gravity increases `vy` by 1200 px/s each second. Then both axes integrate velocity into position.
- Because `JUMP_SPEED` is -480 and `GRAVITY` is 1200, the player reaches peak height in 0.4 seconds and the full jump arc takes 0.8 seconds. This feels snappy for a platformer.

---

### 3. Create the Collision System

**File:** `src/contexts/canvas2d/games/platformer/systems/CollisionSystem.ts`

Resolves player-vs-platform collisions and handles fall death.

```typescript
import type { Updatable } from "@core/Updatable";
import type { PlatState } from "../types";

export class CollisionSystem implements Updatable<PlatState> {
  update(state: PlatState, dt: number): void {
    const s = state;

    // Platform collision
    s.onGround = false;

    for (const p of s.platforms) {
      // Moving platforms (update position)
      if (
        p.type === "moving" &&
        p.origX !== undefined &&
        p.moveRange &&
        p.moveSpeed
      ) {
        p.x =
          p.origX +
          Math.sin(performance.now() * 0.001 * (p.moveSpeed / 60)) *
            p.moveRange;
      }

      if (
        s.px + s.pw > p.x &&
        s.px < p.x + p.w &&
        s.py + s.ph > p.y &&
        s.py + s.ph < p.y + p.h + s.vy * dt + 10
      ) {
        if (s.vy >= 0) {
          s.py = p.y - s.ph;
          s.vy = 0;
          s.onGround = true;

          if (p.type === "crumble") {
            p.crumbleTimer = (p.crumbleTimer ?? 0) + dt;

            if (p.crumbleTimer > 0.8) {
              p.y = 9999; // remove
            }
          }
        }
      }
    }

    // Fall death
    if (s.py > 700) {
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
```

**What's happening:**
- Each frame, `onGround` resets to `false`. It only becomes `true` if the player is landing on a platform this frame. This ensures the jump check in `InputSystem` stays accurate.
- The AABB check has four conditions: horizontal overlap (`px+pw > p.x` and `px < p.x+p.w`) plus vertical landing (`py+ph > p.y` and `py+ph < p.y+p.h+margin`). The margin (`s.vy * dt + 10`) prevents tunneling through thin platforms at high speed.
- When landing (`vy >= 0`), we snap the player to the platform surface (`py = p.y - ph`) and zero out vertical velocity. For crumble platforms, we start a timer and "remove" the platform after 0.8 seconds by moving it offscreen.
- Moving platforms update their x position using `Math.sin()`, oscillating around `origX` by `moveRange` pixels.
- If the player falls below y=700, they lose a life and respawn at the start. At zero lives, the game ends.

---

### 4. Create the Entity Renderer

**File:** `src/contexts/canvas2d/games/platformer/renderers/EntityRenderer.ts`

Draws the player character with directional eyes.

```typescript
import type { Renderable } from "@core/Renderable";
import type { PlatState } from "../types";

export class EntityRenderer implements Renderable<PlatState> {
  render(ctx: CanvasRenderingContext2D, state: PlatState): void {
    const s = state;

    ctx.save();
    ctx.translate(-s.camX, -s.camY);

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
- The player is a colored rectangle: blue (`#60a5fa`) when grounded, lighter blue (`#93c5fd`) when airborne. This gives instant visual feedback about jump state.
- Eyes are positioned based on `facing` direction. The white eye rectangle is 5x6px, and a 3x3px black pupil sits inside, offset toward the facing direction.
- Everything is drawn in camera space (`translate(-camX, -camY)`) so the player moves with the world.

---

### 5. Update the Engine

**File:** `src/contexts/canvas2d/games/platformer/PlatformerEngine.ts`

Wire up input, physics, collision, and the entity renderer.

```typescript
import type { Updatable } from "@core/Updatable";
import type { Renderable } from "@core/Renderable";
import type { PlatState } from "./types";
import { buildLevel } from "./data/levels";
import { InputSystem } from "./systems/InputSystem";
import { PhysicsSystem } from "./systems/PhysicsSystem";
import { CollisionSystem } from "./systems/CollisionSystem";
import { WorldRenderer } from "./renderers/WorldRenderer";
import { EntityRenderer } from "./renderers/EntityRenderer";

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

  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.canvas = canvas;
    this.onExit = onExit;
    this.ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = buildLevel(1);
    this.state.started = true;

    this.inputSystem = new InputSystem(onExit);

    this.systems = [
      this.inputSystem,
      new PhysicsSystem(),
      new CollisionSystem(),
    ];

    this.renderers = [
      new WorldRenderer(canvas),
      new EntityRenderer(),
    ];

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
  }

  start(): void {
    this.inputSystem.attach();
    window.addEventListener("resize", this.resizeHandler);
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
    window.removeEventListener("resize", this.resizeHandler);
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
- The engine now has a proper game loop with delta time. `performance.now()` gives millisecond precision, divided by 1000 for seconds. The `Math.min(..., 0.05)` cap prevents physics explosions if the browser tab was inactive.
- Systems run in order: Input first (reads keys), Physics second (applies gravity and velocity), Collision third (resolves landing). Order matters -- if collision ran before physics, the player would clip through platforms.
- If any system sets `gameOver = true`, the update loop exits early.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Platformer game in your browser
3. **Observe:**
   - A **blue rectangle** (the player) stands on the green ground
   - Press **left/right arrows** or **A/D** to run -- the player slides along the ground
   - Press **Space**, **W**, or **Up** to jump -- the player arcs upward and falls back down
   - The **eyes** face the direction you are moving
   - The player turns **lighter blue** while airborne
   - Run off the edge of the ground -- the player falls and **respawns** at the start
   - Stand on a **brown platform** -- it crumbles after 0.8 seconds
   - **Blue platforms** slide left and right

---

## Challenges

**Easy:**
- Change `JUMP_SPEED` to `-600` for a higher jump and see how it changes the feel.
- Make the player wider (increase `PLAYER_W` to 32) and observe the collision changes.

**Medium:**
- Add a double-jump: let the player jump once more in mid-air before needing to land. Track a `jumpCount` to limit it to 2.

**Hard:**
- Add horizontal wall collision so the player cannot walk through the sides of platforms. Check for horizontal AABB overlap and push the player out.

---

## What You Learned

- Building a keyboard input system with a `Set<string>` for smooth key polling
- Applying gravity as continuous acceleration with delta-time integration
- Detecting AABB collisions between the player and platform surfaces
- Ordering systems correctly: input before physics before collision
- Using delta time to make movement frame-rate independent

**Next:** Camera Scrolling -- make the camera follow the player through the level so you can explore the whole map!
