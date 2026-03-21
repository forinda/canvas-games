# Step 3: Click to Pop & Scoring

**Goal:** Detect clicks on balloons, pop them, and calculate scores with combo multipliers.

**Time:** ~15 minutes

---

## What You'll Build

Click balloons to pop them and earn points:
- **Base Points**: 10 per balloon
- **Size Bonus**: Up to +19 for smaller balloons
- **Combo Multiplier**: Up to 10x for consecutive hits
- **Missed Clicks**: Reset combo streak

```
Small balloon, 5x combo: (10 + 19) × 5 = 145 points!
Large balloon, no combo: (10 + 0) × 1 = 10 points
```

---

## Concepts

- **Circle Collision Detection**: Distance formula
- **Hit Priority**: Front-to-back checking (last balloon first)
- **Combo Windows**: Time-based streak system
- **Size Scoring**: Incentivize popping smaller (harder) targets
- **localStorage Persistence**: Save high scores

---

## Code

### 1. Create Input System

**File:** `src/contexts/canvas2d/games/balloon-pop/systems/InputSystem.ts`

```typescript
import type { BalloonState } from '../types';
import {
  BASE_POINTS,
  SIZE_BONUS_FACTOR,
  BALLOON_RADIUS_MAX,
  COMBO_WINDOW,
  HS_KEY,
} from '../types';

export class InputSystem {
  private canvas: HTMLCanvasElement;
  private boundClick: (e: MouseEvent) => void;
  private boundTouch: (e: TouchEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.boundClick = (e: MouseEvent) => this.handleClick(e);
    this.boundTouch = (e: TouchEvent) => this.handleTouch(e);
  }

  attach(state: BalloonState): void {
    this.canvas.addEventListener('click', this.boundClick);
    this.canvas.addEventListener('touchstart', this.boundTouch);
    (this.canvas as any).__balloonState = state;
  }

  detach(): void {
    this.canvas.removeEventListener('click', this.boundClick);
    this.canvas.removeEventListener('touchstart', this.boundTouch);
  }

  private handleClick(e: MouseEvent): void {
    const state: BalloonState = (this.canvas as any).__balloonState;
    if (!state || state.phase !== 'playing' || state.paused) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    this.processHit(state, mx, my);
  }

  private handleTouch(e: TouchEvent): void {
    const state: BalloonState = (this.canvas as any).__balloonState;
    if (!state || state.phase !== 'playing' || state.paused) return;

    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const mx = (touch.clientX - rect.left) * scaleX;
    const my = (touch.clientY - rect.top) * scaleY;

    this.processHit(state, mx, my);
  }

  private processHit(state: BalloonState, mx: number, my: number): void {
    let hitAny = false;

    // Check balloons front-to-back (last = on top)
    for (let i = state.balloons.length - 1; i >= 0; i--) {
      const b = state.balloons[i];
      if (b.popped) continue;

      // Circle collision detection
      const dx = mx - b.x;
      const dy = my - b.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= b.radius * b.radius) {
        // Hit!
        b.popped = true;
        hitAny = true;

        // Calculate score
        const sizeBonus = Math.round(SIZE_BONUS_FACTOR * (BALLOON_RADIUS_MAX - b.radius));
        const comboMultiplier = Math.min(state.combo + 1, 10);
        const points = (BASE_POINTS + sizeBonus) * comboMultiplier;

        state.score += points;
        state.combo += 1;
        state.comboTimer = COMBO_WINDOW;

        if (state.combo > state.maxCombo) {
          state.maxCombo = state.combo;
        }

        // Update high score
        if (state.score > state.highScore) {
          state.highScore = state.score;
          try {
            localStorage.setItem(HS_KEY, String(state.highScore));
          } catch (e) {
            console.warn('Could not save high score');
          }
        }

        console.log(`Pop! +${points} points (${comboMultiplier}x combo)`);

        // Only pop one balloon per click
        break;
      }
    }

    // Missed click resets combo
    if (!hitAny) {
      state.combo = 0;
      state.comboTimer = 0;
    }
  }
}
```

**Key Logic:**
- **Hit Detection**: `dx² + dy² ≤ radius²` (distance formula, avoiding sqrt)
- **Front-to-Back**: Loop backwards so top balloon is checked first
- **One-Click Rule**: `break` after first hit
- **Combo Reset**: Missing resets both combo and timer

---

### 2. Create Score System

**File:** `src/contexts/canvas2d/games/balloon-pop/systems/ScoreSystem.ts`

```typescript
import type { BalloonState } from '../types';
import { HS_KEY } from '../types';

export class ScoreSystem {
  /** Update timer and combo decay */
  update(state: BalloonState, dt: number): void {
    if (state.phase !== 'playing' || state.paused) return;

    // Countdown timer
    state.timeRemaining -= dt / 1000;

    if (state.timeRemaining <= 0) {
      state.timeRemaining = 0;
      state.phase = 'gameover';

      // Save high score
      if (state.score > state.highScore) {
        state.highScore = state.score;
        try {
          localStorage.setItem(HS_KEY, String(state.highScore));
        } catch (e) {
          console.warn('Could not save high score');
        }
      }
    }

    // Combo decay (window timer)
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.comboTimer = 0;
        state.combo = 0;
      }
    }
  }
}
```

**Combo Window Logic:**
- Timer resets to 1500ms on each pop
- Decrements every frame
- When reaches 0 → combo resets
- Provides urgency: "Pop quickly to maintain streak!"

---

### 3. Update HUD Renderer with Combo Display

**File:** `src/contexts/canvas2d/games/balloon-pop/renderers/HUDRenderer.ts`

```typescript
import type { BalloonState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: BalloonState): void {
    this.drawTopBar(ctx, state);
    this.drawCombo(ctx, state);

    // Overlays will be added in Step 4
  }

  private drawTopBar(ctx: CanvasRenderingContext2D, state: BalloonState): void {
    const W = ctx.canvas.width;

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

  private drawCombo(ctx: CanvasRenderingContext2D, state: BalloonState): void {
    if (state.combo < 2) return; // Only show for 2+ combo

    const W = ctx.canvas.width;

    // Fade out as timer decreases
    const alpha = Math.min(1, state.comboTimer / 500);
    ctx.globalAlpha = alpha;

    // Golden color
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;

    // Font grows with combo
    const fontSize = 24 + state.combo * 2;
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText(`x${state.combo} COMBO!`, W / 2, 90);

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}
```

**Combo Visual:**
- Only appears at 2+ combo
- Fades out as timer decreases
- Font size increases with combo (visual excitement)
- Golden color with shadow for emphasis

---

### 4. Update Game Engine

**File:** `src/contexts/canvas2d/games/balloon-pop/BalloonEngine.ts`

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
import { ScoreSystem } from './systems/ScoreSystem';
import { InputSystem } from './systems/InputSystem';

export class BalloonEngine {
  private ctx: CanvasRenderingContext2D;
  private state: BalloonState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;

  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;
  private balloonSystem: BalloonSystem;
  private scoreSystem: ScoreSystem;
  private inputSystem: InputSystem;

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
      phase: 'playing',
      paused: false,
      particles: [],
      spawnTimer: 0,
      spawnInterval: SPAWN_INTERVAL_BASE,
      elapsed: 0,
    };

    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();
    this.balloonSystem = new BalloonSystem();
    this.scoreSystem = new ScoreSystem();
    this.inputSystem = new InputSystem(canvas);

    this.inputSystem.attach(this.state);
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
    this.scoreSystem.update(this.state, dt);
  }

  private render(): void {
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Balloon Pop"
3. **Gameplay:**
   - Click/tap balloons to pop them
   - Watch score increase
   - Pop multiple in a row → combo multiplier appears
   - Miss a balloon → "x_ COMBO!" disappears (combo reset)
4. **Scoring Test:**
   - Pop large balloon (radius ~42): +10 points (1x)
   - Pop small balloon (radius ~18): +29 points (1x)
   - Build 5x combo with small balloons: +145 points each!
5. **Combo Window:**
   - Pop a balloon → wait 2 seconds without popping
   - Combo resets (notice combo text fades out)
6. **Timer:**
   - Wait for timer to reach 0:00
   - Game transitions to game over (console log)

---

## Scoring Breakdown

### Formula:
```typescript
sizeBonus = 0.8 × (42 - radius)
points = (10 + sizeBonus) × min(combo + 1, 10)
```

### Examples:

| Balloon Size | Radius | Size Bonus | No Combo | 5x Combo | 10x Combo |
|--------------|--------|------------|----------|----------|-----------|
| Large        | 42     | 0          | 10       | 50       | 100       |
| Medium       | 30     | 10         | 20       | 100      | 200       |
| Small        | 18     | 19         | 29       | 145      | 290       |

**Strategy Tip:** Focus on small balloons for maximum points!

---

## Collision Detection

### Distance Formula (Optimized):
```typescript
// Standard formula: distance = sqrt((x2-x1)² + (y2-y1)²)
// Optimized (avoid sqrt):
distSq = dx² + dy²
if (distSq <= radius²) { hit }
```

**Why This Works:**
- Comparing squared distances is equivalent
- Avoids expensive `Math.sqrt()` call
- Same result, less computation

---

## What You Learned

✅ Circle-point collision detection  
✅ Distance formula optimization (avoid sqrt)  
✅ Front-to-back hit priority  
✅ Combo streak mechanics with time windows  
✅ Size-based scoring logic  
✅ localStorage high score persistence  
✅ Touch event handling for mobile

---

## Next Step

→ [Step 4: Particles, Lives, Polish & Game Loop](./step-4.md) — Add particle effects, lives system, and full game flow
