# Step 1: Project Setup & Lake Scene

**Goal:** Draw the lake, dock, and fishing rod with an animated sky and water scene.

**Time:** ~15 minutes

---

## What You'll Build

- **Sky gradient** with sun and drifting clouds
- **Water surface** with animated wave lines
- **Wooden dock** with support poles and plank details
- **Stick-figure fisher** holding a curved fishing rod
- **Type definitions** for the entire game state
- **Engine scaffold** with resize handling and render loop

---

## Concepts

- **Scene Layering**: The scene is drawn back-to-front -- sky, water, dock, then character. This painter's algorithm ensures foreground elements cover background ones naturally.
- **Gradient Fills**: `createLinearGradient` produces smooth color transitions for both the sky (dark blue to sunset orange) and the water (light blue to deep blue).
- **Sine-Wave Animation**: Water waves use `Math.sin()` with an offset that increases each frame, creating smooth horizontal wave motion without sprite sheets.
- **Quadratic Bezier Curves**: The fishing rod is drawn with `quadraticCurveTo()`, which bends a line through a control point to produce a natural curve.
- **State Machine Phases**: The game uses a `CatchPhase` type (`'idle' | 'casting' | 'waiting' | 'hooking' | 'reeling'`) to control what gets drawn and updated each frame.

---

## Code

### 1. Create Types

**File:** `src/contexts/canvas2d/games/fishing/types.ts`

All the types we need across every step, defined up front so later files never need modification.

```typescript
/** Rarity tiers for fish species */
export type FishRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

/** Catch phase state machine */
export type CatchPhase = 'idle' | 'casting' | 'waiting' | 'hooking' | 'reeling';

/** Definition of a fish species */
export interface Fish {
  name: string;
  rarity: FishRarity;
  /** Min/max size in cm */
  sizeRange: [number, number];
  icon: string;
  color: string;
  /** Base points awarded on catch */
  points: number;
  /** Probability weight (lower = rarer) */
  weight: number;
  /** How hard the fish fights (0-1), affects reel tension */
  fight: number;
}

/** A specific caught fish instance */
export interface CaughtFish {
  fish: Fish;
  size: number;
  timestamp: number;
}

/** Serializable catalog entry for localStorage */
export interface CatalogEntry {
  name: string;
  count: number;
  bestSize: number;
  totalPoints: number;
  firstCaught: number;
}

/** Complete game state */
export interface FishingState {
  phase: CatchPhase;
  /** Canvas dimensions */
  width: number;
  height: number;

  /* Casting */
  castPower: number;       // 0-1 power meter
  castCharging: boolean;
  castDistance: number;     // resulting distance 0-1

  /* Waiting */
  waitTimer: number;       // seconds until bite
  waitElapsed: number;
  bobberX: number;
  bobberY: number;
  bobberBobTime: number;   // animation accumulator
  fishBiting: boolean;

  /* Hooking */
  hookWindowTimer: number; // seconds remaining to click
  hookWindowDuration: number;
  hookSuccess: boolean;

  /* Reeling */
  reelTension: number;     // 0-1, green zone is 0.3-0.7
  reelProgress: number;    // 0-1, fish reeled in
  reelHolding: boolean;
  currentFish: Fish | null;
  currentFishSize: number;
  fishFightTimer: number;
  fishFightDir: number;    // -1 or 1

  /* Results */
  lastCatch: CaughtFish | null;
  catchPopupTimer: number;

  /* Catalog / Score */
  catalog: Map<string, CatalogEntry>;
  totalScore: number;
  totalCaught: number;

  /* UI */
  paused: boolean;
  showCatalog: boolean;
  time: number;            // total elapsed time for animations

  /* Water animation */
  waterOffset: number;
}

export const RARITY_COLORS: Record<FishRarity, string> = {
  common: '#aaaaaa',
  uncommon: '#4fc3f7',
  rare: '#ab47bc',
  legendary: '#ffd54f',
};

export const STORAGE_KEY = 'fishing_catalog';
export const SCORE_KEY = 'fishing_highscore';
```

**What's happening:**
- `CatchPhase` is a union of five literal strings that form the game's state machine. Every system checks which phase is active before doing any work.
- `Fish` defines a species template with rarity, size range, points, probability weight, and a `fight` value (0-1) that controls how aggressively the fish resists reeling.
- `FishingState` is a flat object holding everything: phase, casting power, bobber position, reel tension, catalog data, and animation timers. Keeping state flat makes it easy for systems to read and write without deep nesting.
- `RARITY_COLORS` maps each rarity tier to a display color used across the HUD and catalog.

---

### 2. Create the Scene Renderer

**File:** `src/contexts/canvas2d/games/fishing/renderers/SceneRenderer.ts`

Draws the sky, water, dock, fisher, and (later) the fishing line and bobber.

```typescript
import type { FishingState } from '../types';

export class SceneRenderer {
  render(ctx: CanvasRenderingContext2D, state: FishingState): void {
    const W = state.width;
    const H = state.height;

    // ── Sky gradient ──
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.45);
    skyGrad.addColorStop(0, '#0d47a1');
    skyGrad.addColorStop(0.5, '#1976d2');
    skyGrad.addColorStop(1, '#ff8f00');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H * 0.45);

    // Sun
    ctx.fillStyle = '#ffee58';
    ctx.beginPath();
    ctx.arc(W * 0.8, H * 0.12, 40, 0, Math.PI * 2);
    ctx.fill();

    // Clouds (drift with sine wave)
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    this.drawCloud(ctx, W * 0.15 + Math.sin(state.time * 0.1) * 20, H * 0.08, 50);
    this.drawCloud(ctx, W * 0.5 + Math.sin(state.time * 0.07 + 1) * 15, H * 0.15, 40);
    this.drawCloud(ctx, W * 0.7 + Math.sin(state.time * 0.12 + 2) * 25, H * 0.06, 35);

    // ── Water ──
    const waterY = H * 0.45;
    const waterGrad = ctx.createLinearGradient(0, waterY, 0, H);
    waterGrad.addColorStop(0, '#0277bd');
    waterGrad.addColorStop(0.4, '#01579b');
    waterGrad.addColorStop(1, '#002f6c');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, waterY, W, H - waterY);

    // Water waves
    this.drawWaves(ctx, state, waterY, W);

    // ── Dock ──
    this.drawDock(ctx, state);
  }

  private drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r * 0.8, y - r * 0.3, r * 0.7, 0, Math.PI * 2);
    ctx.arc(x + r * 1.4, y, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawWaves(
    ctx: CanvasRenderingContext2D, state: FishingState, waterY: number, W: number
  ): void {
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2;

    for (let row = 0; row < 6; row++) {
      const y = waterY + 20 + row * 30;
      ctx.beginPath();
      for (let x = 0; x < W; x += 4) {
        const wave = Math.sin((x + state.waterOffset + row * 40) * 0.02) * 5;
        if (x === 0) ctx.moveTo(x, y + wave);
        else ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }
  }

  private drawDock(ctx: CanvasRenderingContext2D, state: FishingState): void {
    const W = state.width;
    const H = state.height;
    const dockY = H * 0.38;
    const dockW = W * 0.18;
    const dockH = H * 0.12;

    // Dock planks
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(0, dockY, dockW, dockH);

    // Plank lines
    ctx.strokeStyle = '#4e342e';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const px = (dockW / 4) * i;
      ctx.beginPath();
      ctx.moveTo(px, dockY);
      ctx.lineTo(px, dockY + dockH);
      ctx.stroke();
    }

    // Support poles
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(dockW * 0.2, dockY + dockH, 8, H - dockY - dockH);
    ctx.fillRect(dockW * 0.7, dockY + dockH, 8, H - dockY - dockH);

    // Person (simple stick figure)
    const px = dockW * 0.75;
    const py = dockY - 5;

    // Body
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px, py - 30);
    ctx.lineTo(px, py - 10);
    ctx.stroke();

    // Head
    ctx.fillStyle = '#ffcc80';
    ctx.beginPath();
    ctx.arc(px, py - 35, 7, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(px, py - 10);
    ctx.lineTo(px - 8, py);
    ctx.moveTo(px, py - 10);
    ctx.lineTo(px + 8, py);
    ctx.stroke();

    // Fishing rod (quadratic bezier curve)
    const rodTipX = dockW + 30;
    const rodTipY = dockY - 30;
    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px + 2, py - 25);
    ctx.quadraticCurveTo(px + 30, py - 50, rodTipX, rodTipY);
    ctx.stroke();
  }
}
```

**What's happening:**
- The sky uses a three-stop linear gradient transitioning from deep blue through lighter blue to sunset orange at the horizon line (45% down the canvas).
- Clouds are built from three overlapping circles filled with semi-transparent white. Each cloud's x-position oscillates via `Math.sin(state.time * speed)` at different frequencies so they drift independently.
- Six rows of water waves are drawn as polylines. Each point's y-coordinate is offset by `Math.sin((x + waterOffset) * 0.02) * 5`, and `waterOffset` increases every frame so waves scroll smoothly.
- The dock is a brown rectangle with vertical plank lines and two support poles extending to the bottom of the canvas. The fisher is a minimal stick figure: a circle head, a body line, and two leg lines.
- The fishing rod uses `quadraticCurveTo()` with a control point above and to the right of the figure, creating a natural downward curve toward the rod tip.

---

### 3. Create the Engine

**File:** `src/contexts/canvas2d/games/fishing/FishingEngine.ts`

The engine creates initial state, runs the game loop, and wires systems together.

```typescript
import type { FishingState } from './types';
import { SceneRenderer } from './renderers/SceneRenderer';

export class FishingEngine {
  private ctx: CanvasRenderingContext2D;
  private state: FishingState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private sceneRenderer: SceneRenderer;
  private resizeHandler: () => void;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.createInitialState();
    this.sceneRenderer = new SceneRenderer();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.width = canvas.width;
      this.state.height = canvas.height;
    };
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
    window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    this.state.time += dt;
    this.state.waterOffset += dt * 40;
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.state.width, this.state.height);
    this.sceneRenderer.render(this.ctx, this.state);
  }

  private createInitialState(): FishingState {
    return {
      phase: 'idle',
      width: this.canvas.width,
      height: this.canvas.height,

      castPower: 0,
      castCharging: false,
      castDistance: 0,

      waitTimer: 0,
      waitElapsed: 0,
      bobberX: 0,
      bobberY: 0,
      bobberBobTime: 0,
      fishBiting: false,

      hookWindowTimer: 0,
      hookWindowDuration: 1.5,
      hookSuccess: false,

      reelTension: 0.5,
      reelProgress: 0,
      reelHolding: false,
      currentFish: null,
      currentFishSize: 0,
      fishFightTimer: 0,
      fishFightDir: 1,

      lastCatch: null,
      catchPopupTimer: 0,

      catalog: new Map(),
      totalScore: 0,
      totalCaught: 0,

      paused: false,
      showCatalog: false,
      time: 0,

      waterOffset: 0,
    };
  }
}
```

**What's happening:**
- `createInitialState()` returns a flat object with every field the game will ever need. Starting with all values zeroed/defaulted means later steps can start using new fields without restructuring.
- The game loop uses `performance.now()` for precise timing. Delta time is capped at 100ms (`Math.min(..., 0.1)`) so the game does not jump forward when a browser tab is backgrounded and then resumed.
- `update()` only advances the animation timers for now. Each subsequent step will add system updates here.
- `waterOffset += dt * 40` scrolls the wave pattern at 40 pixels per second, which looks natural without being distracting.

---

### 4. Create the Platform Adapter

**File:** `src/contexts/canvas2d/games/fishing/adapters/PlatformAdapter.ts`

A thin wrapper so the game plugs into any host page.

```typescript
import { FishingEngine } from '../FishingEngine';

export class PlatformAdapter {
  private engine: FishingEngine;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new FishingEngine(canvas);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

---

### 5. Create the Entry Point

**File:** `src/contexts/canvas2d/games/fishing/index.ts`

```typescript
import { PlatformAdapter } from './adapters/PlatformAdapter';

export function createFishing(canvas: HTMLCanvasElement): { destroy: () => void } {
  const adapter = new PlatformAdapter(canvas);
  adapter.start();
  return { destroy: () => adapter.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Fishing game in your browser
3. **Observe:**
   - A **sunset sky** gradient with a yellow sun and three drifting clouds
   - **Animated water** with six rows of sine-wave lines scrolling to the right
   - A **brown wooden dock** on the left side with plank details and support poles
   - A **stick-figure fisher** standing on the dock, holding a **curved fishing rod**
   - **Resize the window** and watch the entire scene scale proportionally

---

## Challenges

**Easy:**
- Change the sky gradient colors to simulate a nighttime scene (dark blues and purples).
- Add more cloud layers at different heights and drift speeds.

**Medium:**
- Draw small fish silhouettes beneath the water surface that drift left and right using sine waves.

**Hard:**
- Add a parallax effect: draw distant mountains behind the water that shift slightly as the clouds move, creating depth.

---

## What You Learned

- Structuring a complete game state type with fields for every phase of gameplay
- Drawing layered scenes with sky gradients, animated water waves, and foreground objects
- Using `quadraticCurveTo()` for natural curves like a fishing rod
- Setting up a `requestAnimationFrame` game loop with delta-time capping
- Animating elements with `Math.sin()` and a time accumulator

**Next:** Casting Mechanic -- add a power gauge so the player can hold SPACE to charge and release to cast their line into the water!
