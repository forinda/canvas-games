# Step 3: Camera Scrolling

**Goal:** Add a smooth side-scrolling camera that follows the player through the level, keeping them in view while the world scrolls past.

**Time:** ~15 minutes

---

## What You'll Build

- **Camera system** that smoothly tracks the player position
- **Lerp-based follow** with different horizontal and vertical speeds
- **Camera clamping** to prevent scrolling past the level boundary
- **HUD renderer** with a score bar that stays fixed on screen (not affected by camera)

---

## Concepts

- **Camera as an Offset**: The camera is not a separate object -- it is just a pair of numbers (`camX`, `camY`) that we subtract from every world position when rendering. `ctx.translate(-camX, -camY)` shifts the entire world so the player stays on screen.
- **Lerp (Linear Interpolation)**: Instead of snapping the camera to the player instantly, we move it a fraction of the way each frame: `camX += (targetX - camX) * 0.08`. The 0.08 factor means the camera covers 8% of the remaining distance per frame, creating a smooth elastic follow.
- **Horizontal vs Vertical Tracking**: The camera follows the player horizontally at 0.08 speed and vertically at 0.05. Slower vertical tracking prevents the camera from jittering during short jumps while still following large height changes.
- **Lead Offset**: Placing the target at `px - W/3` (one-third from the left) means the player sees more of the level ahead than behind. This gives the player more reaction time for upcoming obstacles.

---

## Code

### 1. Create the Camera System

**File:** `src/games/platformer/systems/CameraSystem.ts`

Smoothly follows the player with horizontal and vertical lerp.

```typescript
import type { Updatable } from "@shared/Updatable";
import type { PlatState } from "../types";

export class CameraSystem implements Updatable<PlatState> {
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  update(state: PlatState, _dt: number): void {
    const W = this.canvas.width;
    const H = this.canvas.height;

    state.camX += (state.px - W / 3 - state.camX) * 0.08;
    state.camY += (state.py - H / 2 - state.camY) * 0.05;
    state.camX = Math.max(0, state.camX);
  }
}
```

**What's happening:**
- The horizontal target is `state.px - W/3`. This positions the player one-third from the left edge. On a 1200px-wide screen, the player sits around x=400, giving 800px of visible level ahead.
- The vertical target is `state.py - H/2`, centering the player vertically. The slower lerp factor (0.05 vs 0.08) means vertical tracking is gentler, reducing bounce during jumps.
- `Math.max(0, state.camX)` clamps the camera so it never scrolls left of the level origin. Without this, the player would see empty void when standing at the start.

---

### 2. Create the HUD Renderer

**File:** `src/games/platformer/renderers/HUDRenderer.ts`

Draws the score bar, level number, lives, and game state overlays. The HUD is drawn in screen space (no camera offset).

```typescript
import type { Renderable } from "@shared/Renderable";
import type { PlatState } from "../types";

export class HUDRenderer implements Renderable<PlatState> {
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  render(ctx: CanvasRenderingContext2D, state: PlatState): void {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const s = state;

    // Score bar
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, W, 40);
    ctx.font = "bold 14px monospace";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#666";
    ctx.textAlign = "left";
    ctx.fillText("< EXIT", 12, 20);

    ctx.fillStyle = "#ffd700";
    ctx.textAlign = "center";
    ctx.fillText(`Score: ${s.score}  |  Level ${s.level}`, W / 2, 20);

    ctx.fillStyle = "#ef4444";
    ctx.textAlign = "right";
    ctx.fillText("\u2764\uFE0F".repeat(s.lives), W - 12, 20);

    // Overlays
    if (!s.started) {
      this.drawOverlay(
        ctx,
        W,
        H,
        "PLATFORMER",
        "Arrow keys / WASD to move, Space to jump\nClick to start",
        "#60a5fa",
      );
    } else if (s.gameOver) {
      this.drawOverlay(
        ctx,
        W,
        H,
        "GAME OVER",
        `Score: ${s.score}  |  Click to restart`,
        "#ef4444",
      );
    } else if (s.won) {
      this.drawOverlay(
        ctx,
        W,
        H,
        `LEVEL ${s.level} COMPLETE!`,
        `Score: ${s.score}  |  Click for next level`,
        "#4ade80",
      );
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
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${Math.min(56, W * 0.07)}px monospace`;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillText(title, W / 2, H * 0.35);
    ctx.shadowBlur = 0;

    ctx.font = `${Math.min(16, W * 0.02)}px monospace`;
    ctx.fillStyle = "#aaa";
    const lines = sub.split("\n");

    lines.forEach((line, i) => ctx.fillText(line, W / 2, H * 0.48 + i * 24));
  }
}
```

**What's happening:**
- The score bar is a semi-transparent black strip across the top. It displays "< EXIT" on the left, score and level centered, and heart emojis for lives on the right.
- The HUD renders *after* the world and entities, and *without* the camera translate, so it stays pinned to the screen.
- Three overlay states handle the title screen, game over, and level complete. Each uses a dark backdrop with a glowing title (via `shadowBlur`) and subtitle text.
- The `drawOverlay()` helper scales the font size responsively with `Math.min(56, W * 0.07)`.

---

### 3. Update the Engine

**File:** `src/games/platformer/PlatformerEngine.ts`

Add the camera system and HUD renderer. Also add click handling for game state transitions.

```typescript
import type { Updatable } from "@shared/Updatable";
import type { Renderable } from "@shared/Renderable";
import type { PlatState } from "./types";
import { buildLevel } from "./data/levels";
import { InputSystem } from "./systems/InputSystem";
import { PhysicsSystem } from "./systems/PhysicsSystem";
import { CollisionSystem } from "./systems/CollisionSystem";
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
- The camera system is added as the last update system. It must run after physics and collision so it follows the player's final position for the frame.
- The `HUDRenderer` is added as the last renderer. Render order matters: world first (background), entities second (player/coins/enemies), HUD third (on top of everything).
- `handleClick()` manages three transitions: clicking "< EXIT" exits the game, clicking on the title screen starts the game, and clicking after game over or win starts the next level (or restarts from level 1).
- The click coordinates are translated from CSS pixels to canvas pixels using the ratio `canvas.width / rect.width`, so it works correctly on HiDPI displays.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Platformer game in your browser
3. **Observe:**
   - A **title screen** overlay says "PLATFORMER" -- click to start
   - Run right and the **camera scrolls** smoothly to follow you
   - The camera keeps you roughly **one-third from the left edge**, showing more level ahead
   - Jump and notice the camera follows **gently vertically** (slower than horizontal)
   - The camera **does not scroll past** the left edge of the level
   - The **score bar** at the top stays fixed, showing score, level, and lives
   - Fall off the level -- after 3 deaths, a **GAME OVER** overlay appears
   - Click to restart from level 1

---

## Challenges

**Easy:**
- Change the horizontal lerp factor from 0.08 to 0.2 and observe how the camera feels more "snappy" but less smooth.
- Move the player target from `W/3` to `W/2` to center the player on screen.

**Medium:**
- Add camera bounds on the right side too: clamp `camX` so the camera never scrolls past `goalX + 200`, preventing the player from seeing void beyond the level end.

**Hard:**
- Implement a camera look-ahead system: when the player is moving right, offset the camera target further right by `vx * 0.5` so the camera anticipates movement direction. Reverse it when moving left.

---

## What You Learned

- Using `ctx.translate(-camX, -camY)` to implement side-scrolling camera movement
- Applying lerp (linear interpolation) for smooth camera following
- Using different lerp speeds for horizontal vs vertical tracking
- Clamping camera position to prevent scrolling past level boundaries
- Separating HUD rendering from world rendering (screen space vs world space)
- Managing game state transitions with click handlers

**Next:** Enemies & Stomping -- add patrolling enemies that the player can defeat by jumping on them!
