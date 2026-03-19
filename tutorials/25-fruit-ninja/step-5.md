# Step 5: Score, Waves & Polish

**Goal:** Add persistent high scores, a wave-based difficulty system, a start screen, pause support, window resize handling, and final visual polish.

**Time:** ~15 minutes

---

## What You'll Build

Building on Step 4:
- **High score persistence**: Save and load the best score using `localStorage`
- **Wave system**: Difficulty increases with score — more fruits per wave, faster launch intervals, higher bomb chance
- **Start overlay**: Title screen shown before the first swipe
- **Pause overlay**: Press P to freeze the game
- **Keyboard controls**: Space to restart, Escape to exit, P to pause
- **Window resize**: Canvas adapts when the browser window changes size
- **HUD polish**: High score display, combo indicator moved to HUD, clean layering

---

## Concepts

- **Wave Difficulty Curve**: `wave = floor(score / 15)` means every 15 points the difficulty ticks up. Waves affect fruit count per launch, launch interval, and bomb probability — three knobs that all make the game harder.
- **localStorage Persistence**: Wrap reads and writes in `try/catch` since `localStorage` may be unavailable in private browsing or sandboxed contexts.
- **State Machine Overlays**: The game has four phases: not-started, playing, paused, game-over. Each phase renders a different overlay (or none). The update loop only runs during "playing."

---

## Code

### 1. Final Types

**File:** `src/games/fruit-ninja/types.ts`

Add the `paused` flag and localStorage key:

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
  paused: boolean;
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
export const TRAIL_LIFETIME = 150; // ms a trail point lives
export const FRUIT_RADIUS = 30;
export const BOMB_RADIUS = 28;
export const COMBO_WINDOW = 600; // ms to chain combos
export const LAUNCH_INTERVAL_MIN = 0.8; // seconds
export const LAUNCH_INTERVAL_MAX = 2.0;
export const PARTICLE_COUNT = 8;
export const HS_KEY = 'fruit-ninja-hs';
```

**What changed from Step 4:**
- `paused` boolean added to the state.
- `HS_KEY` is the localStorage key for the high score.

---

### 2. Final Input System

**File:** `src/games/fruit-ninja/systems/InputSystem.ts`

Add keyboard handling for pause, restart, and start-on-click:

```typescript
import type { FruitNinjaState, SlicePoint } from '../types';
import { TRAIL_LIFETIME } from '../types';

export class InputSystem {
  private state: FruitNinjaState;
  private canvas: HTMLCanvasElement;
  private onRestart: () => void;

  private boundMouseDown = this.handleMouseDown.bind(this);
  private boundMouseMove = this.handleMouseMove.bind(this);
  private boundMouseUp = this.handleMouseUp.bind(this);
  private boundKeyDown = this.handleKeyDown.bind(this);

  constructor(
    state: FruitNinjaState,
    canvas: HTMLCanvasElement,
    onRestart: () => void,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.onRestart = onRestart;
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

    // Start the game on first click
    if (!this.state.started) {
      this.state.started = true;
      return;
    }

    // Restart on click after game over
    if (this.state.gameOver) {
      this.onRestart();
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
    if (e.key === ' ' && this.state.gameOver) {
      e.preventDefault();
      this.onRestart();
      return;
    }
    if (e.key === 'p' || e.key === 'P') {
      if (!this.state.gameOver && this.state.started) {
        this.state.paused = !this.state.paused;
      }
    }
  }
}
```

**What changed from Step 4:**
- Constructor accepts an `onRestart` callback so the engine controls the restart logic.
- `mousedown` now starts the game on first click and triggers restart on game-over click.
- `keydown` handles Space for restart and P for pause toggle.
- Pause only works when the game is started and not over.

---

### 3. Final Fruit System

**File:** `src/games/fruit-ninja/systems/FruitSystem.ts`

Add wave-based difficulty scaling:

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

    // Remove off-screen fruits — lose a life if unsliced
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
    state.halves = state.halves.filter((h) => h.alpha > 0 && h.y < state.height + 200);

    // Increment wave based on score — every 15 points = 1 wave
    state.wave = Math.floor(state.score / 15);
  }

  private launchWave(state: FruitNinjaState): void {
    // More fruits per wave as difficulty increases (1-2 at start, up to 1-6 later)
    const count = 1 + Math.floor(Math.random() * (2 + Math.min(state.wave, 4)));
    for (let i = 0; i < count; i++) {
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

**What changed from Step 4:**
- `state.wave = Math.floor(state.score / 15)` dynamically adjusts difficulty. At score 0 the wave is 0; at score 30 the wave is 2; at score 75 the wave is 5.
- Wave affects three things:
  1. **Fruits per launch**: `1 + random(2 + min(wave, 4))` means up to 6 fruits at once by wave 4.
  2. **Launch interval**: Divided by `1 + wave * 0.05`, so wave 10 launches 50% faster.
  3. **Bomb chance**: `0.12 + wave * 0.005` increases from 12% to ~17% by wave 10.

---

### 4. Final Slice System

**File:** `src/games/fruit-ninja/systems/SliceSystem.ts`

No changes from Step 3 — the slice system is already complete. For reference, here is the final version:

```typescript
import type { FruitNinjaState, FruitHalf, JuiceParticle } from '../types';
import { COMBO_WINDOW, PARTICLE_COUNT } from '../types';

export class SliceSystem {
  update(state: FruitNinjaState, dt: number): void {
    const dtSec = dt;

    // Decay combo timer
    if (state.comboTimer > 0) {
      state.comboTimer -= dt * 1000;
      if (state.comboTimer <= 0) {
        state.combo = 0;
      }
    }

    // Update particles
    for (const p of state.particles) {
      p.x += p.vx * dtSec;
      p.vy += 400 * dtSec;
      p.y += p.vy * dtSec;
      p.life -= dtSec;
      p.alpha = Math.max(0, p.life / p.maxLife);
    }
    state.particles = state.particles.filter((p) => p.life > 0);

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

        if (fruit.isBomb) {
          continue;
        }

        state.swipeSliceCount++;
        state.combo++;
        state.comboTimer = COMBO_WINDOW;

        const comboMultiplier = state.swipeSliceCount >= 3 ? state.swipeSliceCount : 1;
        state.score += fruit.type.points * comboMultiplier;

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

---

### 5. Final Bomb System

**File:** `src/games/fruit-ninja/systems/BombSystem.ts`

No changes from Step 4 — already complete. For reference:

```typescript
import type { FruitNinjaState } from '../types';
import { PARTICLE_COUNT } from '../types';

export class BombSystem {
  update(state: FruitNinjaState, _dt: number): void {
    for (const fruit of state.fruits) {
      if (!fruit.sliced || !fruit.isBomb) continue;

      state.gameOver = true;
      this.spawnExplosion(state, fruit.x, fruit.y);
      break;
    }

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

---

### 6. Final Game Renderer

**File:** `src/games/fruit-ninja/renderers/GameRenderer.ts`

Complete version with all visual layers:

```typescript
import type { FruitNinjaState } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: FruitNinjaState): void {
    const W = state.width;
    const H = state.height;

    // Wooden background
    this.drawBackground(ctx, W, H);

    // Juice particles (behind fruits)
    this.drawParticles(ctx, state);

    // Fruit halves (behind active fruits)
    this.drawHalves(ctx, state);

    // Active fruits
    this.drawFruits(ctx, state);

    // Slice trail
    this.drawTrail(ctx, state);
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

  private drawFruits(ctx: CanvasRenderingContext2D, state: FruitNinjaState): void {
    for (const fruit of state.fruits) {
      if (fruit.sliced) continue;

      ctx.save();
      ctx.translate(fruit.x, fruit.y);
      ctx.rotate(fruit.rotation);

      const r = fruit.type.radius;

      if (fruit.isBomb) {
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#555';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#a97030';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.quadraticCurveTo(8, -r - 15, 4, -r - 22);
        ctx.stroke();

        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(4, -r - 22, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = `bold ${r * 0.8}px sans-serif`;
        ctx.fillStyle = '#c62828';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('X', 0, 0);
      } else {
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
}
```

---

### 7. Final HUD Renderer

**File:** `src/games/fruit-ninja/renderers/HUDRenderer.ts`

Add start overlay, pause overlay, high score display, and combo indicator:

```typescript
import type { FruitNinjaState } from '../types';
import { MAX_LIVES } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: FruitNinjaState): void {
    const W = state.width;
    const H = state.height;

    this.drawScore(ctx, state);
    this.drawLives(ctx, state, W);
    this.drawCombo(ctx, state, W);

    if (!state.started) {
      this.drawStartOverlay(ctx, W, H);
    } else if (state.gameOver) {
      this.drawGameOverOverlay(ctx, state, W, H);
    } else if (state.paused) {
      this.drawPausedOverlay(ctx, W, H);
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

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#ccc';
    ctx.fillText(`Best: ${state.highScore}`, 20, 58);
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

  private drawCombo(
    ctx: CanvasRenderingContext2D,
    state: FruitNinjaState,
    W: number,
  ): void {
    if (state.combo < 2 || state.comboTimer <= 0) return;

    ctx.save();
    const scale = 1 + Math.sin(performance.now() * 0.01) * 0.1;
    ctx.font = `bold ${Math.floor(40 * scale)}px sans-serif`;
    ctx.fillStyle = '#ffeb3b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,152,0,0.7)';
    ctx.shadowBlur = 15;
    ctx.fillText(`${state.combo}x COMBO!`, W / 2, 80);
    ctx.restore();
  }

  private drawStartOverlay(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
  ): void {
    ctx.save();

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title
    ctx.font = 'bold 56px sans-serif';
    ctx.fillStyle = '#e91e63';
    ctx.shadowColor = 'rgba(233,30,99,0.5)';
    ctx.shadowBlur = 20;
    ctx.fillText('Fruit Ninja', W / 2, H / 2 - 60);

    // Subtitle
    ctx.shadowBlur = 0;
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('Swipe to slice fruits!', W / 2, H / 2);

    // Start instruction
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Click or tap to start', W / 2, H / 2 + 40);

    // Controls
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText('[P] Pause  |  [SPACE] Restart', W / 2, H / 2 + 80);

    ctx.restore();
  }

  private drawGameOverOverlay(
    ctx: CanvasRenderingContext2D,
    state: FruitNinjaState,
    W: number,
    H: number,
  ): void {
    ctx.save();

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 52px sans-serif';
    ctx.fillStyle = '#f44336';
    ctx.shadowColor = 'rgba(244,67,54,0.5)';
    ctx.shadowBlur = 15;
    ctx.fillText('GAME OVER', W / 2, H / 2 - 70);

    ctx.shadowBlur = 0;
    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Score: ${state.score}`, W / 2, H / 2 - 10);

    if (state.score >= state.highScore && state.score > 0) {
      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = '#ffeb3b';
      ctx.fillText('New High Score!', W / 2, H / 2 + 30);
    } else {
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#aaa';
      ctx.fillText(`Best: ${state.highScore}`, W / 2, H / 2 + 30);
    }

    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#ccc';
    ctx.fillText('Press SPACE or click to restart', W / 2, H / 2 + 80);

    ctx.restore();
  }

  private drawPausedOverlay(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('PAUSED', W / 2, H / 2 - 20);

    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Press [P] to resume', W / 2, H / 2 + 30);
    ctx.restore();
  }
}
```

**What's happening:**
- The HUD renders four possible overlays based on state: start screen, game-over screen, pause screen, or none (during gameplay).
- Score and high score are always visible, drawn with a drop shadow for contrast.
- The combo indicator from Step 3 is now part of the HUD, centered at the top.
- The start overlay uses a pink title with a glow shadow, matching the Fruit Ninja theme.
- The game-over overlay checks if the current score beats the high score and shows a "New High Score!" message in yellow.

---

### 8. Final Engine

**File:** `src/games/fruit-ninja/FruitNinjaEngine.ts`

Complete engine with high score persistence, resize handling, and all systems:

```typescript
import type { FruitNinjaState } from './types';
import { MAX_LIVES, HS_KEY, LAUNCH_INTERVAL_MAX } from './types';
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
  private resizeHandler: () => void;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Load high score from localStorage
    let hs = 0;
    try {
      hs = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
    } catch {
      /* noop — localStorage may be unavailable */
    }

    this.state = this.createInitialState(canvas.width, canvas.height, hs);

    // Systems
    this.fruitSystem = new FruitSystem();
    this.sliceSystem = new SliceSystem();
    this.bombSystem = new BombSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      () => this.restart(),
    );

    // Handle window resize
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.width = canvas.width;
      this.state.height = canvas.height;
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

    if (this.state.started && !this.state.paused && !this.state.gameOver) {
      this.update(dt);
    }

    // Always prune trail for visual smoothness
    this.inputSystem.pruneTrail();

    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    this.fruitSystem.update(this.state, dt);
    this.sliceSystem.update(this.state, dt);
    this.bombSystem.update(this.state, dt);

    // Save high score
    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      try {
        localStorage.setItem(HS_KEY, String(this.state.highScore));
      } catch {
        /* noop */
      }
    }
  }

  private render(): void {
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }

  private restart(): void {
    const hs = this.state.highScore;
    const w = this.state.width;
    const h = this.state.height;
    Object.assign(this.state, this.createInitialState(w, h, hs));
    this.state.started = true;
  }

  private createInitialState(
    width: number,
    height: number,
    highScore: number,
  ): FruitNinjaState {
    return {
      fruits: [],
      halves: [],
      particles: [],
      trail: { points: [] },
      score: 0,
      highScore,
      combo: 0,
      comboTimer: 0,
      lives: MAX_LIVES,
      gameOver: false,
      started: false,
      paused: false,
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

**What changed from Step 4:**
- **High score persistence**: Loaded from `localStorage` on construction, saved whenever `score > highScore` during update.
- **Resize handler**: Updates both the canvas element and the state's cached dimensions when the window resizes.
- **Pause support**: The loop only calls `update()` when `started && !paused && !gameOver`.
- **Start screen**: `started` defaults to `false`. The game shows the title overlay until the first click.
- `destroy()` removes the resize listener to prevent memory leaks.

---

### 9. Final Entry Point

**File:** `src/games/fruit-ninja/index.ts`

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
   - Title screen appears: "Fruit Ninja — Swipe to slice fruits!"
   - Click to start — fruits begin launching
   - Score and high score display in the top-left
   - Lives display as apple icons in the top-right
   - Slicing fruits produces juice particles and updates the score
   - Slicing 3+ fruits in one swipe shows "3x COMBO!" and multiplies points
   - Bombs appear with a dark body, fuse, and red X
   - Slicing a bomb triggers an explosion and GAME OVER
   - Missing 3 fruits also triggers GAME OVER
   - Press P to pause, press P again to resume
   - Press SPACE or click to restart after game over
   - High score persists across page reloads
   - Resize the browser window — the game adapts smoothly
   - Difficulty increases as your score grows — more fruits, faster launches, more bombs

**Play until score 30+ and notice the difficulty shift.** Waves launch more fruits at once and the intervals between waves shrink. Bombs become slightly more common.

---

## Try It

- Change `HS_KEY` to a different string and notice the high score resets (it is stored under a new key).
- Set `state.wave = 10` in `createInitialState` to start at high difficulty.
- Open the browser console and run `localStorage.getItem('fruit-ninja-hs')` to see your saved high score.

---

## Challenges

**Easy:**
- Add a "Wave: X" display to the HUD showing the current difficulty level.
- Change the start screen background color from black overlay to a gradient.
- Add a brief fade-in animation when the game starts (animate an overlay alpha from 1 to 0 over 0.5 seconds).

**Medium:**
- Add a "best combo" tracker that persists to localStorage alongside the high score.
- Implement a "fever mode" that activates at combo 5+ — the background tints red and all fruits are worth double points until the combo ends.

**Hard:**
- Add a global leaderboard using a simple REST API (`fetch` to POST scores and GET top 10).
- Implement a "zen mode" with no bombs and no lives — just endless slicing with a timer countdown.
- Add sound effects: a slice whoosh, a juice splat, a bomb explosion, and background music using the Web Audio API.

---

## What You Learned

- `localStorage` for persistent high scores with `try/catch` safety
- Wave-based difficulty scaling with multiple parameters (count, speed, bomb chance)
- Game state machine with start/playing/paused/gameover phases
- Overlay rendering for each game phase
- Window resize handling for responsive canvas
- Clean engine architecture: systems update state, renderers draw it, engine orchestrates the loop
- `Object.assign` for in-place state reset preserving references

---

## Complete Architecture

Here is how all the pieces fit together:

```
FruitNinjaEngine (game loop, state management)
├── InputSystem (mouse/keyboard → state.trail, state.mouseDown)
├── FruitSystem (launch timer, gravity, off-screen cleanup, wave scaling)
├── SliceSystem (trail-circle intersection, halves, particles, combos)
├── BombSystem (sliced bomb → game over, explosion particles)
├── GameRenderer (background, particles, halves, fruits, trail)
└── HUDRenderer (score, lives, combo, overlays)
```

Each system reads and writes to the shared `FruitNinjaState` object. The engine calls them in order: input prune, fruit update, slice update, bomb update, then render. This flat, predictable pipeline makes debugging straightforward — you can inspect the state after any system runs.

**Congratulations!** You have built a complete Fruit Ninja game with slicing physics, juice particles, combo scoring, bombs, lives, wave difficulty, and persistent high scores. Continue to the next game to learn something completely different!
