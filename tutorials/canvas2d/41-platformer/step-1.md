# Step 1: Project Setup & Tile Map

**Goal:** Define all game types and render a tile-based level with platforms, a sky gradient, and a ground surface.

**Time:** ~15 minutes

---

## What You'll Build

- **Type definitions** for the entire platformer: player, platforms, coins, enemies, camera, and game state
- **Level builder** that procedurally creates platforms, coins, enemies, and a goal flag
- **Sky gradient background** with a starfield
- **Platform rendering** with solid, moving, and crumble tile types
- **Goal flag** drawn at the end of the level
- **Platform adapter** and entry point so the game plugs into the launcher

---

## Concepts

- **Tile-Based Levels**: Instead of hand-placing every pixel, platformers define levels as collections of rectangular tiles (platforms). Each platform has a position, size, type, and color. A `buildLevel()` function generates them procedurally based on the level number.
- **Platform Types**: Solid platforms are static and reliable. Moving platforms oscillate on a sine wave. Crumble platforms collapse after the player stands on them. Using a discriminated `type` field lets us handle each variant differently.
- **State-Driven Architecture**: All game data lives in a single `PlatState` object -- player position, velocity, platforms, coins, enemies, camera offset, score, lives, and game status. Systems read and write this state each frame.
- **Parallax Starfield**: Stars scroll at a fraction of the camera speed (`camX * 0.1`), creating a parallax depth effect with almost no code.

---

## Code

### 1. Create Types

**File:** `src/contexts/canvas2d/games/platformer/types.ts`

All the types and physics constants for the entire game, defined up front so later files never need modification.

```typescript
export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  type: 'solid' | 'moving' | 'crumble';
  origX?: number;
  moveRange?: number;
  moveSpeed?: number;
  crumbleTimer?: number;
}

export interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

export interface Enemy {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  dir: number;
  minX: number;
  maxX: number;
}

export interface PlatState {
  // Player
  px: number;
  py: number;
  vx: number;
  vy: number;
  pw: number;
  ph: number;
  onGround: boolean;
  jumping: boolean;
  facing: number;
  // World
  platforms: Platform[];
  coins: Coin[];
  enemies: Enemy[];
  // Camera
  camX: number;
  camY: number;
  // Game
  score: number;
  lives: number;
  level: number;
  gameOver: boolean;
  won: boolean;
  started: boolean;
  goalX: number;
  goalY: number;
}

export const GRAVITY = 1200;
export const JUMP_SPEED = -480;
export const MOVE_SPEED = 260;
export const PLAYER_W = 24;
export const PLAYER_H = 32;
```

**What's happening:**
- `Platform` supports three types via a discriminated union: `'solid'`, `'moving'`, and `'crumble'`. Moving platforms store `origX`, `moveRange`, and `moveSpeed`. Crumble platforms track a `crumbleTimer`.
- `PlatState` is the single source of truth for the entire game. Player physics (`px`, `py`, `vx`, `vy`), world data (arrays of platforms, coins, enemies), camera offset, score, lives, and game status all live here.
- Physics constants are exported so every system uses the same values: `GRAVITY` pulls the player down at 1200 px/s^2, `JUMP_SPEED` launches at -480 px/s, and `MOVE_SPEED` runs at 260 px/s.

---

### 2. Create the Level Builder

**File:** `src/contexts/canvas2d/games/platformer/data/levels.ts`

Procedurally generates a level with platforms, coins, enemies, and a goal position.

```typescript
import type { Platform, Coin, Enemy, PlatState } from "../types";
import { PLAYER_W, PLAYER_H } from "../types";

export function buildLevel(level: number): PlatState {
  const platforms: Platform[] = [];
  const coins: Coin[] = [];
  const enemies: Enemy[] = [];

  // Ground
  platforms.push({
    x: 0,
    y: 500,
    w: 2400,
    h: 40,
    color: "#4a6741",
    type: "solid",
  });

  // Platforms - procedural based on level
  const count = 8 + level * 3;

  for (let i = 0; i < count; i++) {
    const px = 200 + i * 250 + Math.random() * 100;
    const py = 300 + Math.sin(i * 0.7) * 150 - level * 10;
    const w = 80 + Math.random() * 100;
    const type: Platform["type"] =
      i % 5 === 0 ? "moving" : i % 7 === 0 ? "crumble" : "solid";
    const p: Platform = {
      x: px,
      y: py,
      w,
      h: 16,
      color:
        type === "crumble"
          ? "#8b5e3c"
          : type === "moving"
            ? "#4a7ab5"
            : "#5a7a5a",
      type,
    };

    if (type === "moving") {
      p.origX = px;
      p.moveRange = 80;
      p.moveSpeed = 60 + Math.random() * 40;
    }

    platforms.push(p);

    // Coins on platforms
    if (Math.random() > 0.3) {
      coins.push({ x: px + w / 2, y: py - 25, collected: false });
    }
  }

  // Enemies
  for (let i = 0; i < 3 + level; i++) {
    const ex = 400 + i * 500;

    enemies.push({
      x: ex,
      y: 474,
      w: 24,
      h: 24,
      speed: 50 + level * 10,
      dir: 1,
      minX: ex - 100,
      maxX: ex + 100,
    });
  }

  const goalX = 200 + count * 250;

  return {
    px: 60,
    py: 460,
    vx: 0,
    vy: 0,
    pw: PLAYER_W,
    ph: PLAYER_H,
    onGround: false,
    jumping: false,
    facing: 1,
    platforms,
    coins,
    enemies,
    camX: 0,
    camY: 0,
    score: 0,
    lives: 3,
    level,
    gameOver: false,
    won: false,
    started: false,
    goalX,
    goalY: 460,
  };
}
```

**What's happening:**
- The ground is a single wide platform at y=500. Floating platforms are spaced 250px apart with sine-wave height variation, getting higher each level (`- level * 10`).
- Every 5th platform is `'moving'` (blue), every 7th is `'crumble'` (brown), and the rest are `'solid'` (green). This gives variety without complex level design.
- Coins spawn on ~70% of platforms, positioned 25px above the platform surface.
- Enemies patrol 200px-wide zones on the ground, getting faster each level.
- The goal flag is placed past the last platform, so the player must traverse the entire level.

---

### 3. Create the World Renderer

**File:** `src/contexts/canvas2d/games/platformer/renderers/WorldRenderer.ts`

Draws the sky, stars, platforms, and goal flag.

```typescript
import type { Renderable } from "@core/Renderable";
import type { PlatState } from "../types";

export class WorldRenderer implements Renderable<PlatState> {
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  render(ctx: CanvasRenderingContext2D, state: PlatState): void {
    const W = this.canvas.width;
    const H = this.canvas.height;

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H);

    sky.addColorStop(0, "#1a1a3e");
    sky.addColorStop(1, "#2d1b4e");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Stars
    ctx.fillStyle = "rgba(255,255,255,0.3)";

    for (let i = 0; i < 50; i++) {
      const sx = (((i * 137 + 50) % W) + state.camX * 0.1) % W;
      const sy = (i * 89 + 30) % (H * 0.6);

      ctx.fillRect(sx, sy, 2, 2);
    }

    ctx.save();
    ctx.translate(-state.camX, -state.camY);

    // Platforms
    for (const p of state.platforms) {
      if (p.y > 900) continue;

      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillRect(p.x, p.y, p.w, 3);
    }

    // Goal flag
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(state.goalX, state.goalY - 60, 4, 60);
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(state.goalX + 4, state.goalY - 60);
    ctx.lineTo(state.goalX + 34, state.goalY - 45);
    ctx.lineTo(state.goalX + 4, state.goalY - 30);
    ctx.fill();

    ctx.restore();
  }
}
```

**What's happening:**
- The sky uses a linear gradient from dark blue (`#1a1a3e`) to dark purple (`#2d1b4e`).
- 50 stars are placed deterministically using modular arithmetic (`i * 137 + 50`), so they look random but stay consistent between frames. Multiplying `camX` by 0.1 creates a subtle parallax scroll.
- `ctx.save()` and `ctx.translate(-camX, -camY)` shift the entire world by the camera offset, then `ctx.restore()` resets it. This is the core of side-scrolling rendering.
- Platforms with `y > 900` are skipped (they were "removed" by crumbling). Each platform gets a thin highlight strip on top (`rgba(255,255,255,0.1)`) for a 3D edge effect.
- The goal flag is a gold pole with a red triangular pennant.

---

### 4. Create the Platform Adapter

**File:** `src/contexts/canvas2d/games/platformer/adapters/PlatformAdapter.ts`

A thin wrapper so the game implements the standard `GameInstance` interface.

```typescript
import type { GameInstance } from '@core/GameInterface';
import { PlatformerEngine } from '../PlatformerEngine';

export class PlatformAdapter implements GameInstance {
  private engine: PlatformerEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new PlatformerEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.stop();
  }
}
```

---

### 5. Create the Engine (Minimal)

**File:** `src/contexts/canvas2d/games/platformer/PlatformerEngine.ts`

For this step, the engine just builds a level and renders it. No input, no physics yet.

```typescript
import type { PlatState } from "./types";
import { buildLevel } from "./data/levels";
import { WorldRenderer } from "./renderers/WorldRenderer";

export class PlatformerEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: PlatState;
  private rafId = 0;
  private running = false;

  private worldRenderer: WorldRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, _onExit: () => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = buildLevel(1);
    this.state.started = true;

    this.worldRenderer = new WorldRenderer(canvas);

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
  }

  start(): void {
    window.addEventListener("resize", this.resizeHandler);
    this.running = true;
    this.loop();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;
    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    this.worldRenderer.render(this.ctx, this.state);
  }
}
```

**What's happening:**
- The constructor creates the canvas context, builds level 1, and sets `started = true` so we skip the title screen for now.
- The game loop calls `render()` on every animation frame but has no `update()` yet -- that comes in Step 2.
- Only the `WorldRenderer` is wired up. We will add entity and HUD renderers in later steps.

---

### 6. Create the Entry Point

**File:** `src/contexts/canvas2d/games/platformer/index.ts`

```typescript
import type { GameDefinition } from "@core/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const PlatformerGame: GameDefinition = {
  id: "platformer",
  category: "action" as const,
  name: "Platformer",
  description: "Jump, collect coins, reach the flag!",
  icon: "\u{1F3C3}",
  color: "#60a5fa",
  help: {
    goal: "Reach the flag at the end of each level.",
    controls: [
      { key: "Arrow Keys / WASD", action: "Move left/right" },
      { key: "Space / W / Up", action: "Jump" },
    ],
    tips: ["Platforms are color-coded: green=solid, blue=moving, brown=crumble"],
  },
  create(canvas, onExit) {
    const inst = new PlatformAdapter(canvas, onExit);
    inst.start();
    return inst;
  },
};
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Platformer game in your browser
3. **Observe:**
   - A dark blue-to-purple **sky gradient** fills the background
   - Tiny **white stars** scattered across the upper portion
   - A long **green ground platform** spanning the bottom
   - **Floating platforms** in green, blue, and brown above the ground
   - A **red flag** on a gold pole at the far right end of the level
   - **Resize the window** and watch the canvas adapt

---

## Challenges

**Easy:**
- Change the sky gradient colors to a sunrise palette (orange to light blue).
- Increase the ground width from 2400 to 4000 and observe the flag moving further right.

**Medium:**
- Add a second ground segment with a gap between them (two separate ground platforms with empty space in between).

**Hard:**
- Add a background mountain silhouette layer that scrolls at `camX * 0.3` speed (faster than stars but slower than the world) for a two-layer parallax effect.

---

## What You Learned

- Defining a complete platformer state type covering player, world, camera, and game status
- Procedurally generating levels with platforms, coins, enemies, and a goal
- Rendering a parallax starfield with deterministic pseudo-random placement
- Using `ctx.save()` / `ctx.translate()` / `ctx.restore()` for camera-relative rendering
- Drawing platform types with color-coded visual distinction

**Next:** Player Movement & Gravity -- add keyboard input, gravity, and ground collision so the player can run and jump!
