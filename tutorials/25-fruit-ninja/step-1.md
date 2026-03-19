# Step 1: Fruit & Gravity

**Goal:** Define six fruit types, launch them upward from the bottom of the screen, and let gravity pull them back down in parabolic arcs.

**Time:** ~15 minutes

---

## What You'll Build

Foundation elements:
- **Six colorful fruit types**: Watermelon, orange, apple, banana, pineapple, kiwi — each with outer color, inner flesh color, radius, and point value
- **Fruit launching**: Fruits spawn below the canvas and fly upward with random horizontal arcs
- **Gravity physics**: A constant downward acceleration creates natural parabolic trajectories
- **Spinning rotation**: Each fruit spins as it flies through the air
- **Off-screen cleanup**: Fruits that fall below the canvas are removed

---

## Concepts

- **Data-Driven Design**: Define fruit varieties as plain data objects so adding new fruits never touches game logic
- **Parabolic Motion**: Launch with a negative (upward) `vy`, then add `GRAVITY * dt` every frame — the fruit rises, slows, and falls
- **Peak Height Calculation**: Use `vy = -sqrt(2 * g * height)` from kinematics to ensure fruits reach a visible peak
- **Delta-Time Physics**: `position += velocity * dt` for consistent speed on any monitor

---

## Code

### 1. Create Types

**File:** `src/games/fruit-ninja/types.ts`

Define the full state shape up front. We only use a subset now, but having the complete type avoids refactoring later.

```typescript
/** Fruit Ninja — shared types and constants */

export interface FruitType {
  name: string;
  color: string;
  innerColor: string;
  icon: string;
  radius: number;
  points: number;
}

export interface Fruit {
  type: FruitType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  sliced: boolean;
  isBomb: boolean;
  /** Unique id for tracking */
  id: number;
}

export interface FruitNinjaState {
  fruits: Fruit[];
  score: number;
  gameOver: boolean;
  started: boolean;
  /** Next fruit id counter */
  nextId: number;
  /** Timer until next fruit launch wave */
  launchTimer: number;
  /** Current difficulty wave */
  wave: number;
  /** Canvas dimensions cached */
  width: number;
  height: number;
}

// ——— Constants ———

export const GRAVITY = 980;
export const FRUIT_RADIUS = 30;
export const LAUNCH_INTERVAL_MIN = 0.8; // seconds
export const LAUNCH_INTERVAL_MAX = 2.0;
```

**What's happening:**
- `FruitType` is pure data — color, size, point value. The game logic never cares *which* fruit it is, only these properties.
- `Fruit` tracks runtime state: position, velocity, rotation, and whether it has been sliced.
- `GRAVITY` at 980 px/s^2 matches real-world `g` scaled to screen pixels, giving a natural feel.
- `launchTimer` counts down each frame. When it hits zero, we spawn a wave and reset it.

---

### 2. Create the Fruit Data

**File:** `src/games/fruit-ninja/data/fruits.ts`

Define the six fruit varieties and a helper to pick one at random:

```typescript
import type { FruitType } from '../types';
import { FRUIT_RADIUS } from '../types';

export const FRUIT_TYPES: FruitType[] = [
  {
    name: 'watermelon',
    color: '#2e7d32',
    innerColor: '#ef5350',
    icon: '🍉',
    radius: FRUIT_RADIUS + 6,
    points: 3,
  },
  {
    name: 'orange',
    color: '#e65100',
    innerColor: '#ffb74d',
    icon: '🍊',
    radius: FRUIT_RADIUS,
    points: 1,
  },
  {
    name: 'apple',
    color: '#c62828',
    innerColor: '#fff9c4',
    icon: '🍎',
    radius: FRUIT_RADIUS - 2,
    points: 1,
  },
  {
    name: 'banana',
    color: '#f9a825',
    innerColor: '#fffde7',
    icon: '🍌',
    radius: FRUIT_RADIUS - 4,
    points: 1,
  },
  {
    name: 'pineapple',
    color: '#f57f17',
    innerColor: '#fff176',
    icon: '🍍',
    radius: FRUIT_RADIUS + 4,
    points: 2,
  },
  {
    name: 'kiwi',
    color: '#558b2f',
    innerColor: '#aed581',
    icon: '🥝',
    radius: FRUIT_RADIUS - 4,
    points: 1,
  },
];

/** Pick a random fruit type */
export function randomFruitType(): FruitType {
  return FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
}
```

**What's happening:**
- Watermelon is the biggest (`FRUIT_RADIUS + 6`) and worth the most (3 points). Kiwi and banana are small.
- Each fruit has an outer skin `color` and an `innerColor` for the flesh — we will use both when slicing in Step 2.
- `randomFruitType()` gives us uniform random selection. You could weight this later to make watermelons rarer.

---

### 3. Create the Fruit System

**File:** `src/games/fruit-ninja/systems/FruitSystem.ts`

Handle the launch timer, spawning, physics, and off-screen cleanup:

```typescript
import type { FruitNinjaState, Fruit } from '../types';
import {
  GRAVITY,
  LAUNCH_INTERVAL_MIN,
  LAUNCH_INTERVAL_MAX,
} from '../types';
import { randomFruitType } from '../data/fruits';

export class FruitSystem {
  update(state: FruitNinjaState, dt: number): void {
    // Update launch timer and spawn fruits
    state.launchTimer -= dt;
    if (state.launchTimer <= 0) {
      this.launchWave(state);
      state.launchTimer =
        LAUNCH_INTERVAL_MIN +
        Math.random() * (LAUNCH_INTERVAL_MAX - LAUNCH_INTERVAL_MIN);
    }

    // Update fruit physics
    for (const fruit of state.fruits) {
      fruit.x += fruit.vx * dt;
      fruit.vy += GRAVITY * dt;
      fruit.y += fruit.vy * dt;
      fruit.rotation += fruit.rotationSpeed * dt;
    }

    // Remove off-screen fruits (fell below canvas)
    state.fruits = state.fruits.filter((f) => f.y <= state.height + 100);
  }

  private launchWave(state: FruitNinjaState): void {
    const count = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      this.launchFruit(state);
    }
  }

  private launchFruit(state: FruitNinjaState): void {
    const W = state.width;
    const H = state.height;

    // Random horizontal position in middle 80%
    const x = W * 0.1 + Math.random() * W * 0.8;
    const y = H + 40;

    // Horizontal velocity: aim toward a random target in the middle 60%
    const targetX = W * 0.2 + Math.random() * W * 0.6;
    const flightTime = 1.2 + Math.random() * 0.6;
    const vx = (targetX - x) / flightTime;

    // Vertical velocity: need to reach top 15-45% of screen
    const peakY = H * (0.15 + Math.random() * 0.3);
    const vy = -(Math.sqrt(2 * GRAVITY * (y - peakY)) || 600);

    const fruit: Fruit = {
      type: randomFruitType(),
      x,
      y,
      vx,
      vy,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 6,
      sliced: false,
      isBomb: false,
      id: state.nextId++,
    };

    state.fruits.push(fruit);
  }
}
```

**What's happening:**
- `launchTimer` decreases by `dt` every frame. When it crosses zero, we fire a wave of 1-3 fruits and reset the timer to a random interval.
- Each fruit spawns at `y = H + 40` (just below the visible canvas) so it appears to fly in from off-screen.
- The key physics line for vertical velocity is `vy = -sqrt(2 * g * h)`. This is the kinematic equation solved for the initial speed needed to reach height `h` under gravity `g`. The negative sign means "upward."
- `vx` is calculated so the fruit drifts toward a random target over `flightTime` seconds, creating varied arcs.
- `rotationSpeed` is random between -3 and +3 radians/sec, so fruits spin both directions.

---

### 4. Create the Game Renderer

**File:** `src/games/fruit-ninja/renderers/GameRenderer.ts`

Draw the background and the fruits:

```typescript
import type { FruitNinjaState } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: FruitNinjaState): void {
    const W = state.width;
    const H = state.height;

    // Wooden background
    this.drawBackground(ctx, W, H);

    // Active fruits
    this.drawFruits(ctx, state);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    // Base wood color gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#5d3a1a');
    grad.addColorStop(0.5, '#7a4a25');
    grad.addColorStop(1, '#4a2c10');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Wood grain lines
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      const y = (i / 30) * H + Math.sin(i * 0.7) * 10;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < W; x += 20) {
        ctx.lineTo(x, y + Math.sin(x * 0.01 + i) * 5);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawFruits(ctx: CanvasRenderingContext2D, state: FruitNinjaState): void {
    for (const fruit of state.fruits) {
      if (fruit.sliced) continue;

      ctx.save();
      ctx.translate(fruit.x, fruit.y);
      ctx.rotate(fruit.rotation);

      const r = fruit.type.radius;

      // Fruit outer skin
      ctx.fillStyle = fruit.type.color;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Inner highlight
      ctx.fillStyle = fruit.type.innerColor;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(-r * 0.15, -r * 0.15, r * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Shine spot
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(-r * 0.25, -r * 0.3, r * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Leaf on top
      ctx.fillStyle = '#2e7d32';
      ctx.beginPath();
      ctx.ellipse(0, -r + 2, 5, 10, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // Small stem
      ctx.strokeStyle = '#5d3a1a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -r + 2);
      ctx.lineTo(0, -r - 4);
      ctx.stroke();

      ctx.restore();
    }
  }
}
```

**What's happening:**
- The background uses a vertical gradient from dark brown to lighter brown, simulating a wooden cutting board.
- Wood grain lines are drawn at 8% opacity with `Math.sin` offsets so they wave slightly — cheap but effective.
- Each fruit is drawn with `save()`/`translate()`/`rotate()`/`restore()` so the rotation is applied around the fruit's center.
- Three layers build the fruit: outer skin circle, a slightly offset inner flesh circle at 30% opacity, and a small white shine circle for a 3D highlight.
- The leaf and stem sit at the top of the fruit (`-r`), giving it a recognizable silhouette.

---

### 5. Create the Engine

**File:** `src/games/fruit-ninja/FruitNinjaEngine.ts`

Wire the state, system, and renderer together with the game loop:

```typescript
import type { FruitNinjaState } from './types';
import { LAUNCH_INTERVAL_MAX } from './types';
import { FruitSystem } from './systems/FruitSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class FruitNinjaEngine {
  private ctx: CanvasRenderingContext2D;
  private state: FruitNinjaState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private fruitSystem: FruitSystem;
  private gameRenderer: GameRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = {
      fruits: [],
      score: 0,
      gameOver: false,
      started: true,
      nextId: 0,
      launchTimer: LAUNCH_INTERVAL_MAX,
      wave: 0,
      width: canvas.width,
      height: canvas.height,
    };

    this.fruitSystem = new FruitSystem();
    this.gameRenderer = new GameRenderer();
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    const dt = Math.min(rawDt, 0.05); // Clamp to prevent explosion on tab-switch
    this.lastTime = now;

    if (!this.state.gameOver) {
      this.fruitSystem.update(this.state, dt);
    }

    this.gameRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

**What's happening:**
- `canvas.width = window.innerWidth` sizes the canvas to fill the viewport.
- The state starts with `started: true` so fruits launch immediately. We will add a start screen in Step 5.
- We clamp `dt` to 50 ms maximum. If the user switches tabs and comes back, the browser may report a huge delta; clamping prevents fruits from teleporting.
- The game loop is: **update** (move things) then **render** (draw things), every animation frame.
- Delta time is in **seconds** here (divided by 1000). The FruitSystem expects seconds because `GRAVITY` is in px/s^2.

---

### 6. Create the Entry Point

**File:** `src/games/fruit-ninja/index.ts`

Export the game so the menu can launch it:

```typescript
import { FruitNinjaEngine } from './FruitNinjaEngine';

export function createFruitNinja(canvas: HTMLCanvasElement): { destroy: () => void } {
  const engine = new FruitNinjaEngine(canvas);
  engine.start();
  return { destroy: () => engine.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Fruit Ninja game
3. **Observe:**
   - Warm wooden background with faint grain lines
   - Colorful fruits launching upward from below the screen
   - Each fruit follows a smooth parabolic arc — rising, slowing, and falling
   - Fruits spin as they fly
   - Different sizes and colors appear randomly
   - Fruits disappear once they fall back below the canvas

**Watch a single fruit carefully.** It should rise quickly, decelerate near the peak, hang for a moment, then accelerate downward — exactly like a ball tossed in the air.

---

## Try It

- Change `GRAVITY` to `400` and watch the fruits float in slow motion.
- Change `LAUNCH_INTERVAL_MIN` to `0.1` for a chaotic rain of fruit.
- Add a `console.log(fruit.vy)` inside the update loop to see the velocity flip from negative (rising) to positive (falling).

---

## Challenges

**Easy:**
- Add a seventh fruit type (strawberry, mango, or grape).
- Make watermelons always launch from the center third of the screen.
- Draw a faint shadow circle below each fruit on the "ground" (bottom of canvas).

**Medium:**
- Make the launch arc height depend on the fruit's weight — heavy watermelons don't fly as high.
- Add a slight horizontal wobble by applying `sin(time)` to each fruit's `x` as it flies.

**Hard:**
- Implement a trail of afterimages behind each fruit (store last 5 positions, draw with decreasing alpha).
- Make fruits that reach exactly the peak of their arc glow briefly (detect when `vy` crosses zero).

---

## What You Learned

- Data-driven fruit type definitions with `FruitType` interfaces
- Parabolic launch physics using `vy = -sqrt(2 * g * h)`
- Delta-time integration: `position += velocity * dt`, `velocity += gravity * dt`
- Wave-based spawning with a countdown timer
- Canvas `save()`/`translate()`/`rotate()`/`restore()` for spinning objects
- Layered circle drawing for 3D-looking fruit rendering

**Next:** Mouse trail tracking and slicing fruits with line-circle intersection!
