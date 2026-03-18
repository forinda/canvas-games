# Step 2: Floating Movement & Spawning

**Goal:** Make balloons float upward with wobble animation and spawn continuously.

**Time:** ~15 minutes

---

## What You'll Build

Balloons spawn at the bottom, float upward at varied speeds, and gently sway side-to-side:

```
Animation:
  t=0s: Balloon spawns at bottom
  t=1s: Floats up with wobble
  t=5s: Reaches top and disappears
  
Spawn Rate: 1200ms → 350ms (gets faster over time)
```

---

## Concepts

- **Delta-Time Physics**: Frame-independent movement
- **Sine Wave Animation**: Natural horizontal sway
- **Random Generation**: Varied balloon properties
- **Spawn Ramping**: Difficulty increases over time
- **HUD Display**: Score and timer overlay

---

## Code

### 1. Create Balloon System

**File:** `src/games/balloon-pop/systems/BalloonSystem.ts`

```typescript
import type { BalloonState, Balloon } from '../types';
import {
  BALLOON_COLORS,
  BALLOON_RADIUS_MIN,
  BALLOON_RADIUS_MAX,
  BALLOON_SPEED_MIN,
  BALLOON_SPEED_MAX,
  SPAWN_INTERVAL_BASE,
  SPAWN_INTERVAL_MIN,
  SPAWN_RAMP_RATE,
} from '../types';

export class BalloonSystem {
  /** Update balloon movement and spawning */
  update(state: BalloonState, dt: number, canvasWidth: number, canvasHeight: number): void {
    if (state.phase !== 'playing' || state.paused) return;

    const dtSec = dt / 1000;
    state.elapsed += dtSec;

    // Update spawn rate (gets faster over time)
    state.spawnInterval = Math.max(
      SPAWN_INTERVAL_MIN,
      SPAWN_INTERVAL_BASE - state.elapsed * SPAWN_RAMP_RATE
    );

    // Spawn new balloons
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      state.spawnTimer = state.spawnInterval;
      this.spawnBalloon(state, canvasWidth, canvasHeight);
    }

    // Update existing balloons
    for (let i = state.balloons.length - 1; i >= 0; i--) {
      const b = state.balloons[i];

      // Move upward
      b.y -= b.speed * dtSec;

      // Wobble side-to-side
      b.wobbleOffset += dtSec * 2;
      b.x += Math.sin(b.wobbleOffset) * 0.5; // ±0.5px horizontal sway

      // Remove if escaped off-screen
      if (b.y + b.radius < -10) {
        state.balloons.splice(i, 1);
        // Lives will be handled in Step 4
      }
    }
  }

  private spawnBalloon(state: BalloonState, canvasWidth: number, canvasHeight: number): void {
    const margin = 50;

    // Random properties
    const radius =
      BALLOON_RADIUS_MIN + Math.random() * (BALLOON_RADIUS_MAX - BALLOON_RADIUS_MIN);
    const speed =
      BALLOON_SPEED_MIN + Math.random() * (BALLOON_SPEED_MAX - BALLOON_SPEED_MIN);
    const color = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
    const x = margin + Math.random() * (canvasWidth - margin * 2);

    const balloon: Balloon = {
      x,
      y: canvasHeight + radius + 10, // Start below canvas
      radius,
      color,
      speed,
      wobbleOffset: Math.random() * Math.PI * 2, // Random initial phase
      popped: false,
      popParticles: [],
    };

    state.balloons.push(balloon);
  }
}
```

**Key Logic:**
- **Spawn Ramping**: `SPAWN_INTERVAL_BASE - elapsed * SPAWN_RAMP_RATE`
  - Decreases 8ms per second
  - Starts at 1200ms, reaches 350ms minimum
- **Wobble Animation**: `Math.sin(wobbleOffset)` creates smooth side-to-side motion
- **Random Phase**: Each balloon starts at different wobble point for natural variation

---

### 2. Create HUD Renderer

**File:** `src/games/balloon-pop/renderers/HUDRenderer.ts`

```typescript
import type { BalloonState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: BalloonState): void {
    this.drawTopBar(ctx, state);

    // Overlays will be added in Step 4
  }

  private drawTopBar(ctx: CanvasRenderingContext2D, state: BalloonState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Background bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, W, 45);

    // Score (center)
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Score: ${state.score}`, W / 2, 24);

    // Timer (top right)
    const secs = Math.ceil(state.timeRemaining);
    const mins = Math.floor(secs / 60);
    const secsDisplay = (secs % 60).toString().padStart(2, '0');
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`⏱️ ${mins}:${secsDisplay}`, W - 20, 24);

    // Lives (hearts, top right)
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'left';
    const hearts = '❤️'.repeat(state.lives);
    ctx.fillText(hearts, W - 160, 24);
  }
}
```

---

### 3. Update Game Engine

**File:** `src/games/balloon-pop/BalloonEngine.ts`

```typescript
import type { BalloonState } from './types';
import {
  GAME_DURATION,
  MAX_LIVES,
  SPAWN_INTERVAL_BASE,
  HS_KEY,
} from './types';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';
import { BalloonSystem } from './systems/BalloonSystem';

export class BalloonEngine {
  private ctx: CanvasRenderingContext2D;
  private state: BalloonState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;

  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;
  private balloonSystem: BalloonSystem;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let highScore = 0;
    try {
      highScore = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
    } catch (e) {
      console.warn('Could not load high score');
    }

    this.state = {
      balloons: [],
      score: 0,
      highScore,
      combo: 0,
      maxCombo: 0,
      comboTimer: 0,
      lives: MAX_LIVES,
      timeRemaining: GAME_DURATION,
      phase: 'playing', // Start playing immediately for testing
      paused: false,
      particles: [],
      spawnTimer: 0,
      spawnInterval: SPAWN_INTERVAL_BASE,
      elapsed: 0,
    };

    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();
    this.balloonSystem = new BalloonSystem();
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
    const dt = now - this.lastTime;
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    const W = this.ctx.canvas.width;
    const H = this.ctx.canvas.height;

    this.balloonSystem.update(this.state, dt, W, H);
  }

  private render(): void {
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }
}
```

**Changes:**
- Added `BalloonSystem` and `HUDRenderer`
- Delta-time tracking with `lastTime`
- Set `phase = 'playing'` for immediate testing
- Removed test balloons (spawning system handles it now)

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Balloon Pop"
3. **Observe:**
   - Balloons spawn at bottom every ~1.2 seconds
   - They float upward at different speeds
   - Gentle side-to-side wobble
   - Different sizes and colors
   - HUD shows: Score, Timer (1:30), Lives (5 hearts)
4. **Wait 30 seconds:**
   - Notice spawn rate increases (balloons appear faster)
5. **Watch balloons:**
   - They disappear when reaching top of screen

---

## Physics Breakdown

### Upward Movement:
```typescript
b.y -= b.speed * dtSec
// Example: speed=100 px/s, dtSec=0.016s (60fps)
//   → b.y -= 100 * 0.016 = 1.6px per frame
```

### Wobble Animation:
```typescript
b.wobbleOffset += dtSec * 2  // Advance phase
b.x += Math.sin(wobbleOffset) * 0.5

// sine wave: -1 to +1
// Result: ±0.5px horizontal movement
// Period: ~3.14 seconds (2π / 2)
```

### Spawn Rate Scaling:
```typescript
Initial: 1200ms (0.83 balloons/second)
After 30s: 1200 - (30 * 8) = 960ms (1.04 balloons/second)
After 60s: 1200 - (60 * 8) = 720ms (1.39 balloons/second)
After 90s: 1200 - (90 * 8) = 480ms (2.08 balloons/second)
Minimum: 350ms (2.86 balloons/second)
```

---

## What You Learned

✅ Delta-time independent physics (`* dtSec`)  
✅ Sine wave for smooth oscillation  
✅ Random property generation for variety  
✅ Time-based difficulty ramping  
✅ HUD overlay rendering  
✅ Array management (push/splice)

---

## Next Step

→ [Step 3: Click to Pop & Scoring](./step-3.md) — Add click detection, popping, and combo-based scoring
