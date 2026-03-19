# Step 4: Bombs & Lives

**Goal:** Mix bomb fruits into the waves. Slicing a bomb triggers a game-over explosion. Missing (not slicing) a regular fruit costs a life. Three missed fruits and the game ends.

**Time:** ~15 minutes

---

## What You'll Build

Building on Step 3:
- **Bomb fruits**: Dark spheres with a fuse and spark, mixed randomly into launch waves
- **Bomb explosion**: Slicing a bomb triggers an orange/dark particle burst and instant game over
- **Lives system**: Start with 3 lives. Each unsliced fruit that falls off-screen costs one life
- **Life display**: Apple icons in the top-right corner show remaining lives
- **Game over screen**: Overlay showing final score with restart instructions

---

## Concepts

- **Bomb as a Fruit Variant**: Bombs reuse the same `Fruit` interface with `isBomb: true`. This means existing launch, physics, and rendering logic works without modification — only the slice handler and renderer need bomb-specific branches.
- **Separation of Concerns**: The `BombSystem` handles only bomb-slice detection and explosion. The `FruitSystem` handles life deduction on miss. Each system does one job.
- **Probability Scaling**: Bomb spawn chance starts at 12% and increases slightly with wave number, keeping early play safe and late play tense.

---

## Code

### 1. Expand the Types

**File:** `src/games/fruit-ninja/types.ts`

Add lives, high score, and bomb constants:

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
  highScore: number;
  combo: number;
  comboTimer: number;
  lives: number;
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
export const MAX_LIVES = 3;
export const FRUIT_RADIUS = 30;
export const BOMB_RADIUS = 28;
export const TRAIL_LIFETIME = 150;
export const LAUNCH_INTERVAL_MIN = 0.8;
export const LAUNCH_INTERVAL_MAX = 2.0;
export const COMBO_WINDOW = 600;
export const PARTICLE_COUNT = 8;
```

**What changed:**
- `lives` starts at `MAX_LIVES` (3). When it reaches zero, `gameOver` becomes true.
- `highScore` persists across restarts (we will save it to localStorage in Step 5).
- `BOMB_RADIUS` at 28 is slightly smaller than fruits, making bombs a tighter target.

---

### 2. Update the Fruit System

**File:** `src/games/fruit-ninja/systems/FruitSystem.ts`

Add bomb spawning and life deduction for missed fruits:

```typescript
import type { FruitNinjaState, Fruit } from '../types';
import {
  GRAVITY,
  LAUNCH_INTERVAL_MIN,
  LAUNCH_INTERVAL_MAX,
  BOMB_RADIUS,
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
      // Speed up launches as wave increases
      state.launchTimer /= 1 + state.wave * 0.05;
    }

    // Update fruit physics
    for (const fruit of state.fruits) {
      fruit.x += fruit.vx * dt;
      fruit.vy += GRAVITY * dt;
      fruit.y += fruit.vy * dt;
      fruit.rotation += fruit.rotationSpeed * dt;
    }

    // Update halves physics
    for (const half of state.halves) {
      half.x += half.vx * dt;
      half.vy += GRAVITY * dt;
      half.y += half.vy * dt;
      half.rotation += half.rotationSpeed * dt;
      half.alpha -= dt * 0.5;
    }

    // Remove off-screen fruits — lose a life if unsliced (and not a bomb)
    const toRemove: Fruit[] = [];
    for (const fruit of state.fruits) {
      if (fruit.y > state.height + 100) {
        toRemove.push(fruit);
      }
    }

    for (const fruit of toRemove) {
      if (!fruit.sliced && !fruit.isBomb) {
        state.lives -= 1;
        if (state.lives <= 0) {
          state.gameOver = true;
        }
      }
    }

    state.fruits = state.fruits.filter((f) => f.y <= state.height + 100);

    // Remove faded halves
    state.halves = state.halves.filter((h) => h.alpha > 0 && h.y < state.height + 200);
  }

  private launchWave(state: FruitNinjaState): void {
    const count = 1 + Math.floor(Math.random() * (2 + Math.min(state.wave, 4)));
    for (let i = 0; i < count; i++) {
      // Bomb chance: 12% base + 0.5% per wave
      const isBomb = Math.random() < 0.12 + state.wave * 0.005;
      this.launchFruit(state, isBomb);
    }
  }

  private launchFruit(state: FruitNinjaState, isBomb: boolean): void {
    const W = state.width;
    const H = state.height;

    const x = W * 0.1 + Math.random() * W * 0.8;
    const y = H + 40;

    const targetX = W * 0.2 + Math.random() * W * 0.6;
    const flightTime = 1.2 + Math.random() * 0.6;
    const vx = (targetX - x) / flightTime;

    const peakY = H * (0.15 + Math.random() * 0.3);
    const vy = -(Math.sqrt(2 * GRAVITY * (y - peakY)) || 600);

    const fruitType = randomFruitType();

    const fruit: Fruit = {
      type: fruitType,
      x,
      y,
      vx,
      vy,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 6,
      sliced: false,
      isBomb,
      id: state.nextId++,
    };

    if (isBomb) {
      fruit.type = {
        name: 'bomb',
        color: '#333',
        innerColor: '#111',
        icon: '💣',
        radius: BOMB_RADIUS,
        points: 0,
      };
    }

    state.fruits.push(fruit);
  }
}
```

**What changed from Step 1:**
- `launchWave` now rolls a random chance for each fruit to be a bomb. The `0.12 + wave * 0.005` formula means wave 0 has 12% bomb chance, wave 10 has 17%.
- `launchFruit` accepts an `isBomb` parameter. When true, it overrides the `type` with bomb-specific data — dark colors, zero points, slightly smaller radius.
- The off-screen check now deducts a life for unsliced non-bomb fruits. Bombs that fall off-screen are harmless (you are supposed to *avoid* them).
- Wave count in `launchWave` increases with `state.wave`, spawning more fruits per wave as difficulty rises.

---

### 3. Create the Bomb System

**File:** `src/games/fruit-ninja/systems/BombSystem.ts`

Detect sliced bombs and trigger game over with an explosion:

```typescript
import type { FruitNinjaState } from '../types';
import { PARTICLE_COUNT } from '../types';

export class BombSystem {
  update(state: FruitNinjaState, _dt: number): void {
    for (const fruit of state.fruits) {
      if (!fruit.sliced || !fruit.isBomb) continue;

      // Bomb was sliced — game over
      state.gameOver = true;

      // Spawn explosion particles (dark/orange)
      this.spawnExplosion(state, fruit.x, fruit.y);

      break;
    }

    // Clean up sliced bombs
    state.fruits = state.fruits.filter((f) => !(f.sliced && f.isBomb));
  }

  private spawnExplosion(state: FruitNinjaState, x: number, y: number): void {
    const colors = ['#ff6600', '#ff3300', '#ffcc00', '#333', '#666'];
    for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 400;
      const life = 0.6 + Math.random() * 1.0;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 150,
        radius: 3 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life,
        maxLife: life,
      });
    }
  }
}
```

**What's happening:**
- Every frame, the system scans for any fruit with both `sliced === true` and `isBomb === true`. The `SliceSystem` sets `sliced = true` on intersection but skips scoring for bombs — it leaves the consequence to this system.
- `spawnExplosion` creates 24 particles (3x the normal juice count) with fire colors: orange, red, yellow, dark gray. The larger radius range (3-8 vs 2-5) and higher speed (up to 500 vs 330) make the explosion visually distinct from juice splashes.
- After processing, sliced bombs are removed from the fruits array.

---

### 4. Update the Slice System

**File:** `src/games/fruit-ninja/systems/SliceSystem.ts`

Skip scoring for bombs (the BombSystem handles them):

Add this guard inside the intersection handler, right after `fruit.sliced = true`:

```typescript
        fruit.sliced = true;

        if (fruit.isBomb) {
          // Bomb handling is done by BombSystem
          continue;
        }

        // Score, halves, particles (unchanged from Step 3)
```

The full `SliceSystem` is identical to Step 3 except for this `continue` guard. When a bomb is hit, we mark it as sliced and skip all the fruit-specific logic (scoring, halves, juice particles). The `BombSystem` picks it up on its next update.

---

### 5. Update the Game Renderer

**File:** `src/games/fruit-ninja/renderers/GameRenderer.ts`

Add bomb drawing to the fruit renderer. Insert this branch before the regular fruit drawing:

```typescript
  private drawFruits(ctx: CanvasRenderingContext2D, state: FruitNinjaState): void {
    for (const fruit of state.fruits) {
      if (fruit.sliced) continue;

      ctx.save();
      ctx.translate(fruit.x, fruit.y);
      ctx.rotate(fruit.rotation);

      const r = fruit.type.radius;

      if (fruit.isBomb) {
        // Bomb: dark circle with fuse
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // Border ring
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();

        // Fuse
        ctx.strokeStyle = '#a97030';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.quadraticCurveTo(8, -r - 15, 4, -r - 22);
        ctx.stroke();

        // Spark at tip
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(4, -r - 22, 4, 0, Math.PI * 2);
        ctx.fill();

        // X mark
        ctx.font = `bold ${r * 0.8}px sans-serif`;
        ctx.fillStyle = '#c62828';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('X', 0, 0);
      } else {
        // Regular fruit (unchanged from Step 3)
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
      }

      ctx.restore();
    }
  }
```

**What's happening:**
- The bomb is a dark circle (`#222`) with a gray border ring for depth.
- A curved fuse extends upward using `quadraticCurveTo`, with a yellow spark circle at the tip.
- A bold red "X" in the center warns the player not to slice it.
- All bomb drawing happens inside the same `save()`/`translate()`/`rotate()`/`restore()` block, so the bomb spins like fruits do.

---

### 6. Create the HUD Renderer

**File:** `src/games/fruit-ninja/renderers/HUDRenderer.ts`

Draw score, lives, and game-over overlay:

```typescript
import type { FruitNinjaState } from '../types';
import { MAX_LIVES } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: FruitNinjaState): void {
    const W = state.width;
    const H = state.height;

    this.drawScore(ctx, state);
    this.drawLives(ctx, state, W);

    if (state.gameOver) {
      this.drawGameOverOverlay(ctx, state, W, H);
    }
  }

  private drawScore(ctx: CanvasRenderingContext2D, state: FruitNinjaState): void {
    ctx.save();
    ctx.font = 'bold 32px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 6;
    ctx.fillText(`Score: ${state.score}`, 20, 20);
    ctx.restore();
  }

  private drawLives(
    ctx: CanvasRenderingContext2D,
    state: FruitNinjaState,
    W: number,
  ): void {
    ctx.save();
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;

    let display = '';
    for (let i = 0; i < MAX_LIVES; i++) {
      display += i < state.lives ? '🍎 ' : '✖ ';
    }

    ctx.fillText(display.trim(), W - 20, 20);
    ctx.restore();
  }

  private drawGameOverOverlay(
    ctx: CanvasRenderingContext2D,
    state: FruitNinjaState,
    W: number,
    H: number,
  ): void {
    ctx.save();

    // Semi-transparent dark overlay
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title
    ctx.font = 'bold 52px sans-serif';
    ctx.fillStyle = '#f44336';
    ctx.shadowColor = 'rgba(244,67,54,0.5)';
    ctx.shadowBlur = 15;
    ctx.fillText('GAME OVER', W / 2, H / 2 - 70);

    // Final score
    ctx.shadowBlur = 0;
    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Score: ${state.score}`, W / 2, H / 2 - 10);

    // High score check
    if (state.score >= state.highScore && state.score > 0) {
      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = '#ffeb3b';
      ctx.fillText('New High Score!', W / 2, H / 2 + 30);
    } else {
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#aaa';
      ctx.fillText(`Best: ${state.highScore}`, W / 2, H / 2 + 30);
    }

    // Restart prompt
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#ccc';
    ctx.fillText('Press SPACE or click to restart', W / 2, H / 2 + 80);

    ctx.restore();
  }
}
```

**What's happening:**
- Score is drawn top-left with a drop shadow for readability against the wooden background.
- Lives use apple emojis for filled lives and "X" for lost ones, drawn top-right. The loop builds the string dynamically based on `state.lives` vs `MAX_LIVES`.
- The game-over overlay uses a 70% black fill to dim the background, then layers the title, score, high-score notification, and restart instructions.

---

### 7. Update the Engine

**File:** `src/games/fruit-ninja/FruitNinjaEngine.ts`

Wire in BombSystem, HUDRenderer, and restart logic:

```typescript
import type { FruitNinjaState } from './types';
import { MAX_LIVES, LAUNCH_INTERVAL_MAX } from './types';
import { InputSystem } from './systems/InputSystem';
import { FruitSystem } from './systems/FruitSystem';
import { SliceSystem } from './systems/SliceSystem';
import { BombSystem } from './systems/BombSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class FruitNinjaEngine {
  private ctx: CanvasRenderingContext2D;
  private state: FruitNinjaState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private fruitSystem: FruitSystem;
  private sliceSystem: SliceSystem;
  private bombSystem: BombSystem;
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.createInitialState(canvas.width, canvas.height);

    this.fruitSystem = new FruitSystem();
    this.sliceSystem = new SliceSystem();
    this.bombSystem = new BombSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    this.inputSystem = new InputSystem(this.state, canvas);
    this.inputSystem.attach();

    // Listen for restart clicks
    canvas.addEventListener('mousedown', () => {
      if (this.state.gameOver) {
        this.restart();
      }
    });
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

    if (this.state.started && !this.state.gameOver) {
      this.fruitSystem.update(this.state, dt);
      this.sliceSystem.update(this.state, dt);
      this.bombSystem.update(this.state, dt);
    }

    this.inputSystem.pruneTrail();

    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private restart(): void {
    const hs = this.state.highScore;
    const w = this.state.width;
    const h = this.state.height;
    Object.assign(this.state, this.createInitialState(w, h));
    this.state.highScore = hs;
    this.state.started = true;
  }

  private createInitialState(width: number, height: number): FruitNinjaState {
    return {
      fruits: [],
      halves: [],
      particles: [],
      trail: { points: [] },
      score: 0,
      highScore: 0,
      combo: 0,
      comboTimer: 0,
      lives: MAX_LIVES,
      gameOver: false,
      started: true,
      nextId: 0,
      launchTimer: LAUNCH_INTERVAL_MAX,
      wave: 0,
      width,
      height,
      mouseDown: false,
      mouseX: 0,
      mouseY: 0,
      swipeSliceCount: 0,
    };
  }
}
```

**What changed from Step 3:**
- `BombSystem` is created and updated each frame after `SliceSystem`.
- `HUDRenderer` is created and rendered after `GameRenderer`.
- `restart()` uses `Object.assign` to reset the state in-place (the `InputSystem` holds a reference to the same object, so replacing the object would break it). The high score is preserved across restarts.
- A `mousedown` listener on the canvas triggers restart when `gameOver` is true.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Fruit Ninja game
3. **Observe:**
   - Score displays in the top-left corner
   - Three apple icons in the top-right show your remaining lives
   - Occasional dark bombs appear among the fruits
   - Slicing a bomb triggers a large orange/dark explosion and the GAME OVER screen appears
   - Letting a fruit fall off-screen without slicing it removes one apple icon
   - After 3 missed fruits, GAME OVER appears
   - Click or press Space to restart with fresh lives

**Deliberately let 3 fruits fall.** Watch the apple icons change to X marks one by one, then the game-over overlay appears.

---

## Try It

- Change `MAX_LIVES` to `1` for a brutal one-miss-and-done mode.
- Set the bomb chance to `0.5` (50%) for a dangerous minefield.
- Change the explosion colors array to all pink for a confetti explosion.

---

## Challenges

**Easy:**
- Flash the screen red briefly when a life is lost (draw a red semi-transparent rectangle that fades over 0.3 seconds).
- Make the bomb fuse spark flicker by randomizing the spark circle radius each frame.
- Add a "lives lost" sound by creating a short descending tone with `AudioContext`.

**Medium:**
- Add a "freeze bomb" variant (blue color) that pauses all fruits for 2 seconds instead of ending the game.
- Animate the life icon disappearing (make the lost apple shrink and fade over 0.5 seconds instead of instantly switching to X).

**Hard:**
- Add a warning indicator when a bomb is about to enter the screen (a red glow at the bottom edge near its spawn point).
- Implement a "shield" power-up that protects against one bomb hit (spawns rarely as a special golden fruit).

---

## What You Learned

- Using a shared interface (`Fruit`) with a boolean flag (`isBomb`) for variant objects
- Separate system classes for different game logic (BombSystem vs FruitSystem)
- Life deduction on off-screen exit with game-over threshold
- Bomb rendering with fuse, spark, and warning mark
- HUD overlay rendering with semi-transparent backgrounds
- In-place state reset with `Object.assign` for restart without breaking references

**Next:** Score tracking, wave difficulty system, high score persistence, and final polish!
