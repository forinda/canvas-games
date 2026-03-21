# Step 3: Juice Particles & Combos

**Goal:** Spawn colorful juice particles when a fruit is sliced. Track multi-slice combos within a single swipe and display a combo indicator.

**Time:** ~15 minutes

---

## What You'll Build

Building on Step 2:
- **Juice splash particles**: A burst of small colored circles explodes from the slice point, matching the fruit's inner color
- **Particle physics**: Each particle has its own velocity, gravity, and lifespan with alpha fade
- **Swipe combo tracking**: Slicing 3+ fruits in one swipe multiplies the score
- **Combo display**: A pulsing "3x COMBO!" label appears on screen when combos are active

---

## Concepts

- **Particle Spawning Pattern**: Create N particles at the same origin, each with a random angle, random speed, and random lifespan. Update them with the same gravity as fruits.
- **Radial Burst**: `vx = cos(angle) * speed`, `vy = sin(angle) * speed` with random `angle` in `[0, 2PI]` gives a uniform circular burst.
- **Combo Window**: A timer resets each time you slice. If you slice again before the timer expires, the combo counter increments. When the timer runs out, the combo resets.

---

## Code

### 1. Expand the Types

**File:** `src/contexts/canvas2d/games/fruit-ninja/types.ts`

Add particle and combo fields:

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

export interface FruitHalf {
  type: FruitType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  isBomb: boolean;
  /** Which half: -1 = left, 1 = right */
  side: -1 | 1;
  alpha: number;
}

export interface JuiceParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface SlicePoint {
  x: number;
  y: number;
  time: number;
}

export interface SliceTrail {
  points: SlicePoint[];
}

export interface FruitNinjaState {
  fruits: Fruit[];
  halves: FruitHalf[];
  particles: JuiceParticle[];
  trail: SliceTrail;
  score: number;
  combo: number;
  comboTimer: number;
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
  /** Mouse state for input */
  mouseDown: boolean;
  mouseX: number;
  mouseY: number;
  /** Fruits sliced in current swipe for combo tracking */
  swipeSliceCount: number;
}

// ——— Constants ———

export const GRAVITY = 980;
export const FRUIT_RADIUS = 30;
export const TRAIL_LIFETIME = 150;
export const LAUNCH_INTERVAL_MIN = 0.8;
export const LAUNCH_INTERVAL_MAX = 2.0;
export const COMBO_WINDOW = 600; // ms to chain combos
export const PARTICLE_COUNT = 8;
```

**What changed:**
- `JuiceParticle` stores position, velocity, radius, color, alpha, and a `life` / `maxLife` pair. Alpha is derived from the ratio `life / maxLife` so particles fade linearly.
- `combo` and `comboTimer` track the chain across frames. `swipeSliceCount` tracks slices within a single mouse-down-to-mouse-up swipe.
- `COMBO_WINDOW` at 600 ms means the player has just over half a second to keep the combo alive.
- `PARTICLE_COUNT` at 8 gives a satisfying burst without overwhelming the frame budget.

---

### 2. Update the Input System

**File:** `src/contexts/canvas2d/games/fruit-ninja/systems/InputSystem.ts`

Reset `swipeSliceCount` on mouse down and mouse up:

```typescript
import type { FruitNinjaState, SlicePoint } from '../types';
import { TRAIL_LIFETIME } from '../types';

export class InputSystem {
  private state: FruitNinjaState;
  private canvas: HTMLCanvasElement;

  private boundMouseDown = this.handleMouseDown.bind(this);
  private boundMouseMove = this.handleMouseMove.bind(this);
  private boundMouseUp = this.handleMouseUp.bind(this);
  private boundKeyDown = this.handleKeyDown.bind(this);

  constructor(state: FruitNinjaState, canvas: HTMLCanvasElement) {
    this.state = state;
    this.canvas = canvas;
  }

  attach(): void {
    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    this.canvas.addEventListener('mouseup', this.boundMouseUp);
    window.addEventListener('keydown', this.boundKeyDown);
  }

  detach(): void {
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('mouseup', this.boundMouseUp);
    window.removeEventListener('keydown', this.boundKeyDown);
  }

  pruneTrail(): void {
    const now = performance.now();
    this.state.trail.points = this.state.trail.points.filter(
      (p) => now - p.time < TRAIL_LIFETIME,
    );
  }

  private getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * this.canvas.width,
      y: ((clientY - rect.top) / rect.height) * this.canvas.height,
    };
  }

  private addTrailPoint(x: number, y: number): void {
    const point: SlicePoint = { x, y, time: performance.now() };
    this.state.trail.points.push(point);
  }

  private handleMouseDown(e: MouseEvent): void {
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.state.mouseDown = true;
    this.state.mouseX = pos.x;
    this.state.mouseY = pos.y;
    this.state.trail.points = [];
    this.state.swipeSliceCount = 0;
    this.addTrailPoint(pos.x, pos.y);

    if (!this.state.started) {
      this.state.started = true;
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.state.mouseX = pos.x;
    this.state.mouseY = pos.y;
    if (this.state.mouseDown) {
      this.addTrailPoint(pos.x, pos.y);
    }
  }

  private handleMouseUp(_e: MouseEvent): void {
    this.state.mouseDown = false;
    this.state.swipeSliceCount = 0;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'p' || e.key === 'P') {
      // Pause support added in Step 5
    }
  }
}
```

**What changed from Step 2:**
- `swipeSliceCount` resets to 0 on both `mousedown` and `mouseup`, so each swipe starts with a clean combo counter.

---

### 3. Update the Slice System

**File:** `src/contexts/canvas2d/games/fruit-ninja/systems/SliceSystem.ts`

Add particle spawning and combo scoring:

```typescript
import type { FruitNinjaState, FruitHalf, JuiceParticle } from '../types';
import { COMBO_WINDOW, PARTICLE_COUNT } from '../types';

export class SliceSystem {
  update(state: FruitNinjaState, dt: number): void {
    const dtSec = dt;

    // Decay combo timer
    if (state.comboTimer > 0) {
      state.comboTimer -= dt * 1000; // comboTimer is in ms, dt is in seconds
      if (state.comboTimer <= 0) {
        state.combo = 0;
      }
    }

    // Update particles
    for (const p of state.particles) {
      p.x += p.vx * dtSec;
      p.vy += 400 * dtSec; // particle gravity (lighter than fruit gravity)
      p.y += p.vy * dtSec;
      p.life -= dtSec;
      p.alpha = Math.max(0, p.life / p.maxLife);
    }
    state.particles = state.particles.filter((p) => p.life > 0);

    // Update halves physics
    for (const half of state.halves) {
      half.x += half.vx * dtSec;
      half.vy += 980 * dtSec;
      half.y += half.vy * dtSec;
      half.rotation += half.rotationSpeed * dtSec;
      half.alpha -= dtSec * 0.5;
    }
    state.halves = state.halves.filter((h) => h.alpha > 0 && h.y < state.height + 200);

    // Check slicing only when mouse is down
    if (!state.mouseDown) return;
    const trail = state.trail.points;
    if (trail.length < 2) return;

    const p1 = trail[trail.length - 2];
    const p2 = trail[trail.length - 1];

    for (const fruit of state.fruits) {
      if (fruit.sliced) continue;

      const r = fruit.type.radius;
      if (this.segmentIntersectsCircle(p1.x, p1.y, p2.x, p2.y, fruit.x, fruit.y, r)) {
        fruit.sliced = true;

        // Combo tracking
        state.swipeSliceCount++;
        state.combo++;
        state.comboTimer = COMBO_WINDOW;

        // Score: multiply by swipe count if 3+ in one swipe
        const comboMultiplier = state.swipeSliceCount >= 3 ? state.swipeSliceCount : 1;
        state.score += fruit.type.points * comboMultiplier;

        // Spawn halves
        const sliceAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const perpX = Math.cos(sliceAngle + Math.PI / 2) * 60;
        const perpY = Math.sin(sliceAngle + Math.PI / 2) * 60;

        const halfBase = {
          type: fruit.type,
          x: fruit.x,
          y: fruit.y,
          rotation: fruit.rotation,
          rotationSpeed: fruit.rotationSpeed,
          isBomb: false,
          alpha: 1,
        };

        const leftHalf: FruitHalf = {
          ...halfBase,
          vx: fruit.vx - perpX,
          vy: fruit.vy - Math.abs(perpY),
          rotationSpeed: -4 - Math.random() * 3,
          side: -1,
        };
        const rightHalf: FruitHalf = {
          ...halfBase,
          vx: fruit.vx + perpX,
          vy: fruit.vy - Math.abs(perpY),
          rotationSpeed: 4 + Math.random() * 3,
          side: 1,
        };

        state.halves.push(leftHalf, rightHalf);

        // Spawn juice particles
        this.spawnParticles(state, fruit.x, fruit.y, fruit.type.innerColor);
      }
    }
  }

  private spawnParticles(
    state: FruitNinjaState,
    x: number,
    y: number,
    color: string,
  ): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 250;
      const life = 0.5 + Math.random() * 0.8;
      const particle: JuiceParticle = {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100,
        radius: 2 + Math.random() * 5,
        color,
        alpha: 1,
        life,
        maxLife: life,
      };
      state.particles.push(particle);
    }
  }

  private segmentIntersectsCircle(
    x1: number, y1: number,
    x2: number, y2: number,
    cx: number, cy: number,
    r: number,
  ): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const fx = x1 - cx;
    const fy = y1 - cy;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;

    let discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return false;

    discriminant = Math.sqrt(discriminant);
    const t1 = (-b - discriminant) / (2 * a);
    const t2 = (-b + discriminant) / (2 * a);

    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
  }
}
```

**What changed from Step 2:**
- **Combo timer decay**: Each frame, `comboTimer` counts down. When it hits zero, `combo` resets.
- **Combo scoring**: If `swipeSliceCount >= 3`, the fruit's points are multiplied by the swipe count. Slicing 4 fruits in one swipe means the 4th fruit is worth 4x points.
- **`spawnParticles()`**: Creates 8 particles at the fruit's position. Each gets a random direction (`angle`), random speed (80-330 px/s), and a slight upward bias (`-100` on `vy`) so the burst looks like juice splashing upward.
- **Particle update**: Particles have their own lighter gravity (400 vs 980) so they hang in the air longer than fruits. `life` decreases by `dt` each frame, and `alpha` is derived as `life / maxLife` for linear fade.

---

### 4. Update the Game Renderer

**File:** `src/contexts/canvas2d/games/fruit-ninja/renderers/GameRenderer.ts`

Add particle drawing (insert between background and halves):

```typescript
import type { FruitNinjaState } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: FruitNinjaState): void {
    const W = state.width;
    const H = state.height;

    this.drawBackground(ctx, W, H);

    // Juice particles (behind fruits)
    this.drawParticles(ctx, state);

    // Fruit halves (behind active fruits)
    this.drawHalves(ctx, state);

    // Active fruits
    this.drawFruits(ctx, state);

    // Slice trail
    this.drawTrail(ctx, state);

    // Combo display
    this.drawCombo(ctx, state);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#5d3a1a');
    grad.addColorStop(0.5, '#7a4a25');
    grad.addColorStop(1, '#4a2c10');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

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

  private drawParticles(ctx: CanvasRenderingContext2D, state: FruitNinjaState): void {
    for (const p of state.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawHalves(ctx: CanvasRenderingContext2D, state: FruitNinjaState): void {
    for (const half of state.halves) {
      ctx.save();
      ctx.translate(half.x, half.y);
      ctx.rotate(half.rotation);
      ctx.globalAlpha = Math.max(0, half.alpha);

      const r = half.type.radius;

      ctx.beginPath();
      if (half.side === -1) {
        ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
      } else {
        ctx.arc(0, 0, r, Math.PI / 2, -Math.PI / 2);
      }
      ctx.closePath();
      ctx.fillStyle = half.type.color;
      ctx.fill();

      ctx.beginPath();
      if (half.side === -1) {
        ctx.arc(0, 0, r * 0.75, -Math.PI / 2, Math.PI / 2);
      } else {
        ctx.arc(0, 0, r * 0.75, Math.PI / 2, -Math.PI / 2);
      }
      ctx.closePath();
      ctx.fillStyle = half.type.innerColor;
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  private drawFruits(ctx: CanvasRenderingContext2D, state: FruitNinjaState): void {
    for (const fruit of state.fruits) {
      if (fruit.sliced) continue;

      ctx.save();
      ctx.translate(fruit.x, fruit.y);
      ctx.rotate(fruit.rotation);

      const r = fruit.type.radius;

      ctx.fillStyle = fruit.type.color;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = fruit.type.innerColor;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(-r * 0.15, -r * 0.15, r * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(-r * 0.25, -r * 0.3, r * 0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#2e7d32';
      ctx.beginPath();
      ctx.ellipse(0, -r + 2, 5, 10, -0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#5d3a1a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -r + 2);
      ctx.lineTo(0, -r - 4);
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawTrail(ctx: CanvasRenderingContext2D, state: FruitNinjaState): void {
    const points = state.trail.points;
    if (points.length < 2) return;

    const now = performance.now();

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const age = now - p1.time;
      const alpha = Math.max(0, 1 - age / 150);

      if (alpha <= 0) continue;

      ctx.globalAlpha = alpha;

      ctx.strokeStyle = 'rgba(200,220,255,0.5)';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private drawCombo(ctx: CanvasRenderingContext2D, state: FruitNinjaState): void {
    if (state.combo < 2 || state.comboTimer <= 0) return;

    ctx.save();
    const scale = 1 + Math.sin(performance.now() * 0.01) * 0.1;
    ctx.font = `bold ${Math.floor(40 * scale)}px sans-serif`;
    ctx.fillStyle = '#ffeb3b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,152,0,0.7)';
    ctx.shadowBlur = 15;
    ctx.fillText(`${state.combo}x COMBO!`, state.width / 2, 80);
    ctx.restore();
  }
}
```

**What changed from Step 2:**
- **`drawParticles()`** iterates over all particles, drawing each as a filled circle with its current alpha. Drawn first (behind everything) so particles don't obscure fruits.
- **`drawCombo()`** only appears when `combo >= 2`. The font size oscillates with `Math.sin(performance.now() * 0.01)` for a pulsing effect. Yellow text with an orange shadow glow makes it pop against the wooden background.
- The combo only shows while `comboTimer > 0`. Once it expires, the text disappears.

---

### 5. Update the Engine

**File:** `src/contexts/canvas2d/games/fruit-ninja/FruitNinjaEngine.ts`

Add the new state fields:

```typescript
import type { FruitNinjaState } from './types';
import { LAUNCH_INTERVAL_MAX } from './types';
import { InputSystem } from './systems/InputSystem';
import { FruitSystem } from './systems/FruitSystem';
import { SliceSystem } from './systems/SliceSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class FruitNinjaEngine {
  private ctx: CanvasRenderingContext2D;
  private state: FruitNinjaState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private fruitSystem: FruitSystem;
  private sliceSystem: SliceSystem;
  private gameRenderer: GameRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = {
      fruits: [],
      halves: [],
      particles: [],
      trail: { points: [] },
      score: 0,
      combo: 0,
      comboTimer: 0,
      gameOver: false,
      started: true,
      nextId: 0,
      launchTimer: LAUNCH_INTERVAL_MAX,
      wave: 0,
      width: canvas.width,
      height: canvas.height,
      mouseDown: false,
      mouseX: 0,
      mouseY: 0,
      swipeSliceCount: 0,
    };

    this.fruitSystem = new FruitSystem();
    this.sliceSystem = new SliceSystem();
    this.gameRenderer = new GameRenderer();
    this.inputSystem = new InputSystem(this.state, canvas);

    this.inputSystem.attach();
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
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    const dt = Math.min(rawDt, 0.05);
    this.lastTime = now;

    if (!this.state.gameOver) {
      this.fruitSystem.update(this.state, dt);
      this.sliceSystem.update(this.state, dt);
    }

    this.inputSystem.pruneTrail();
    this.gameRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

**What changed from Step 2:**
- State now includes `particles`, `combo`, `comboTimer`, and `swipeSliceCount`.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Fruit Ninja game
3. **Observe:**
   - Slicing a fruit produces a burst of colored particles matching the fruit's flesh
   - Watermelon splashes red, orange splashes orange, kiwi splashes green
   - Particles arc outward and upward, then fall and fade
   - Slicing 3+ fruits in one swipe shows a yellow pulsing "3x COMBO!" label
   - Score increases faster during combos

**Try a long diagonal swipe through a cluster of fruits.** The combo counter should climb with each fruit, and the score multiplier should escalate.

---

## Try It

- Change `PARTICLE_COUNT` to `20` for an over-the-top juice explosion.
- Set `COMBO_WINDOW` to `2000` (2 seconds) to make combos much easier to chain.
- Change the particle gravity from `400` to `0` so juice floats in zero gravity.

---

## Challenges

**Easy:**
- Make particles slightly larger for watermelons (scale particle radius by `fruit.type.radius / 30`).
- Change the combo text color based on the combo count (yellow for 2-4, orange for 5-7, red for 8+).
- Add a particle trail behind the blade cursor (spawn 1-2 tiny white particles each frame while swiping).

**Medium:**
- Add a "splash" ring — a single expanding circle at the slice point that fades out over 0.3 seconds.
- Make the combo text float upward and fade out when the combo ends, instead of disappearing instantly.

**Hard:**
- Implement a "critical slice" when the blade passes through the exact center of a fruit (distance < 5px). Award double points and spawn twice as many particles.
- Add screen shake on large combos (offset the canvas translation by a decaying random amount for 0.2 seconds).

---

## What You Learned

- Particle system architecture: spawn, update (physics + decay), prune dead particles
- Radial burst spawning with `cos(angle) * speed` / `sin(angle) * speed`
- Alpha fade tied to remaining lifetime ratio
- Swipe-based combo tracking with a per-swipe counter and a timed global combo
- Score multipliers based on combo count
- Pulsing text animation with `Math.sin(performance.now())`

**Next:** Bombs that end the game and a lives system for missed fruits!
