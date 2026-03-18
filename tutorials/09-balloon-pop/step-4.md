# Step 4: Particles, Lives, Polish & Game Loop

**Goal:** Add particle effects, lives system, game overlays, and complete game flow.

**Time:** ~20 minutes

---

## What You'll Build

Final polish features:
- **Particle Burst**: Colorful explosion when popping balloons
- **Lives System**: Lose 1 heart when balloon escapes (5 hearts total)
- **Game States**: Ready → Playing → Game Over
- **Overlays**: Start screen, pause menu, game-over screen
- **Keyboard Controls**: Space (start/restart), P (pause), ESC (exit)
- **Background Gradient**: Sky with subtle cloud effect

---

## Concepts

- **Particle Systems**: Physics simulation with lifecycle
- **Game State Machine**: Phase transitions
- **Modal Overlays**: Non-intrusive UI
- **Keyboard Shortcuts**: Convenience controls

---

## Code

### 1. Update Input System with Particles & Keyboard

**File:** `src/games/balloon-pop/systems/InputSystem.ts`

Add particle spawning and keyboard controls:

```typescript
import type { BalloonState, PopParticle } from '../types';
import {
  BASE_POINTS,
  SIZE_BONUS_FACTOR,
  BALLOON_RADIUS_MAX,
  COMBO_WINDOW,
  HS_KEY,
} from '../types';

export class InputSystem {
  private canvas: HTMLCanvasElement;
  private onExit: () => void;
  private boundClick: (e: MouseEvent) => void;
  private boundTouch: (e: TouchEvent) => void;
  private boundKey: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.canvas = canvas;
    this.onExit = onExit;
    this.boundClick = (e: MouseEvent) => this.handleClick(e);
    this.boundTouch = (e: TouchEvent) => this.handleTouch(e);
    this.boundKey = (e: KeyboardEvent) => this.handleKey(e);
  }

  attach(state: BalloonState): void {
    this.canvas.addEventListener('click', this.boundClick);
    this.canvas.addEventListener('touchstart', this.boundTouch);
    window.addEventListener('keydown', this.boundKey);
    (this.canvas as any).__balloonState = state;
  }

  detach(): void {
    this.canvas.removeEventListener('click', this.boundClick);
    this.canvas.removeEventListener('touchstart', this.boundTouch);
    window.removeEventListener('keydown', this.boundKey);
  }

  private handleKey(e: KeyboardEvent): void {
    const state: BalloonState = (this.canvas as any).__balloonState;
    if (!state) return;

    if (e.key === 'Escape') {
      this.onExit();
    } else if (e.key === 'p' || e.key === 'P') {
      if (state.phase === 'playing') {
        state.paused = !state.paused;
      }
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (state.phase === 'ready') {
        this.startGame(state);
      } else if (state.phase === 'gameover') {
        this.restartGame(state);
      }
    }
  }

  private handleClick(e: MouseEvent): void {
    const state: BalloonState = (this.canvas as any).__balloonState;
    if (!state) return;

    // Handle overlay clicks
    if (state.phase === 'ready') {
      this.startGame(state);
      return;
    } else if (state.phase === 'gameover') {
      this.restartGame(state);
      return;
    }

    if (state.phase !== 'playing' || state.paused) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    this.processHit(state, mx, my);
  }

  private handleTouch(e: TouchEvent): void {
    const state: BalloonState = (this.canvas as any).__balloonState;
    if (!state) return;

    e.preventDefault();

    if (state.phase === 'ready') {
      this.startGame(state);
      return;
    } else if (state.phase === 'gameover') {
      this.restartGame(state);
      return;
    }

    if (state.phase !== 'playing' || state.paused) return;

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

    for (let i = state.balloons.length - 1; i >= 0; i--) {
      const b = state.balloons[i];
      if (b.popped) continue;

      const dx = mx - b.x;
      const dy = my - b.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= b.radius * b.radius) {
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

        if (state.score > state.highScore) {
          state.highScore = state.score;
          try {
            localStorage.setItem(HS_KEY, String(state.highScore));
          } catch (e) {
            console.warn('Could not save high score');
          }
        }

        // Spawn particles
        this.spawnPopParticles(state, b.x, b.y, b.radius, b.color);

        break;
      }
    }

    if (!hitAny) {
      state.combo = 0;
      state.comboTimer = 0;
    }
  }

  private spawnPopParticles(
    state: BalloonState,
    x: number,
    y: number,
    radius: number,
    color: string
  ): void {
    const count = Math.floor(8 + radius * 0.3);

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 100 + Math.random() * 180;

      const particle: PopParticle = {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 400 + Math.random() * 300,
        color,
        size: 3 + Math.random() * 5,
      };

      state.particles.push(particle);
    }
  }

  private startGame(state: BalloonState): void {
    state.phase = 'playing';
  }

  private restartGame(state: BalloonState): void {
    state.balloons = [];
    state.particles = [];
    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.comboTimer = 0;
    state.lives = 5;
    state.timeRemaining = 90;
    state.elapsed = 0;
    state.spawnTimer = 0;
    state.spawnInterval = 1200;
    state.phase = 'playing';
    state.paused = false;
  }
}
```

---

### 2. Update Score System with Particle Physics

**File:** `src/games/balloon-pop/systems/ScoreSystem.ts`

```typescript
import type { BalloonState } from '../types';
import { HS_KEY } from '../types';

export class ScoreSystem {
  update(state: BalloonState, dt: number): void {
    // Update particles (always, even during overlays)
    this.updateParticles(state, dt);

    if (state.phase !== 'playing' || state.paused) return;

    // Countdown timer
    state.timeRemaining -= dt / 1000;

    if (state.timeRemaining <= 0) {
      state.timeRemaining = 0;
      state.phase = 'gameover';

      if (state.score > state.highScore) {
        state.highScore = state.score;
        try {
          localStorage.setItem(HS_KEY, String(state.highScore));
        } catch (e) {
          console.warn('Could not save high score');
        }
      }
    }

    // Combo decay
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.comboTimer = 0;
        state.combo = 0;
      }
    }
  }

  private updateParticles(state: BalloonState, dt: number): void {
    const dtSec = dt / 1000;

    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }

      // Physics
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.vy += 300 * dtSec; // Gravity
    }
  }
}
```

---

### 3. Update Balloon System with Lives

**File:** `src/games/balloon-pop/systems/BalloonSystem.ts`

Update the escape detection:

```typescript
// In update method, replace escape detection with:

// Update existing balloons
for (let i = state.balloons.length - 1; i >= 0; i--) {
  const b = state.balloons[i];

  // Move upward
  b.y -= b.speed * dtSec;

  // Wobble side-to-side
  b.wobbleOffset += dtSec * 2;
  b.x += Math.sin(b.wobbleOffset) * 0.5;

  // Remove if escaped off-screen
  if (b.y + b.radius < -10) {
    state.balloons.splice(i, 1);

    // Lose a life (only for un-popped balloons)
    if (!b.popped) {
      state.lives -= 1;
      state.combo = 0;
      state.comboTimer = 0;

      if (state.lives <= 0) {
        state.phase = 'gameover';
      }
    }
  }
}
```

---

### 4. Update Game Renderer with Background & Particles

**File:** `src/games/balloon-pop/renderers/GameRenderer.ts`

```typescript
import type { BalloonState, Balloon, PopParticle } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: BalloonState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Draw background gradient
    this.drawBackground(ctx, W, H);

    // Draw balloons
    for (const balloon of state.balloons) {
      if (!balloon.popped) {
        this.drawBalloon(ctx, balloon);
      }
    }

    // Draw particles
    for (const particle of state.particles) {
      this.drawParticle(ctx, particle);
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    // Sky gradient (light blue at top, lighter at bottom)
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#4fc3f7');
    grad.addColorStop(1, '#b3e5fc');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  private drawBalloon(ctx: CanvasRenderingContext2D, b: Balloon): void {
    const { x, y, radius, color } = b;

    // Shadow
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x, y + radius + 5, radius * 0.6, radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // String
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y + radius);
    ctx.bezierCurveTo(x - 4, y + radius + 20, x + 4, y + radius + 35, x - 2, y + radius + 50);
    ctx.stroke();

    // Knot
    ctx.fillStyle = this.darken(color, 40);
    ctx.beginPath();
    ctx.ellipse(x, y + radius, radius * 0.15, radius * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body with gradient
    const bodyGrad = ctx.createRadialGradient(
      x - radius * 0.3,
      y - radius * 0.3,
      radius * 0.1,
      x,
      y,
      radius
    );
    bodyGrad.addColorStop(0, this.lighten(color, 60));
    bodyGrad.addColorStop(0.7, color);
    bodyGrad.addColorStop(1, this.darken(color, 40));

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(x - radius * 0.35, y - radius * 0.4, radius * 0.2, radius * 0.3, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawParticle(ctx: CanvasRenderingContext2D, p: PopParticle): void {
    ctx.globalAlpha = Math.min(1, p.life / 600);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private lighten(hex: string, percent: number): string {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + percent);
    const g = Math.min(255, ((num >> 8) & 0xff) + percent);
    const b = Math.min(255, (num & 0xff) + percent);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  private darken(hex: string, percent: number): string {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.max(0, ((num >> 16) & 0xff) - percent);
    const g = Math.max(0, ((num >> 8) & 0xff) - percent);
    const b = Math.max(0, (num & 0xff) - percent);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
}
```

---

### 5. Update HUD Renderer with Overlays

**File:** `src/games/balloon-pop/renderers/HUDRenderer.ts`

```typescript
import type { BalloonState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: BalloonState): void {
    this.drawTopBar(ctx, state);
    this.drawCombo(ctx, state);

    if (state.phase === 'ready') {
      this.drawReadyOverlay(ctx, state);
    } else if (state.phase === 'gameover') {
      this.drawGameOverOverlay(ctx, state);
    } else if (state.paused) {
      this.drawPausedOverlay(ctx, state);
    }
  }

  private drawTopBar(ctx: CanvasRenderingContext2D, state: BalloonState): void {
    if (state.phase === 'ready') return; // Hide during ready screen

    const W = ctx.canvas.width;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, W, 45);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Score: ${state.score}`, W / 2, 24);

    const secs = Math.ceil(state.timeRemaining);
    const mins = Math.floor(secs / 60);
    const secsDisplay = (secs % 60).toString().padStart(2, '0');
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`⏱️ ${mins}:${secsDisplay}`, W - 20, 24);

    ctx.font = '24px sans-serif';
    ctx.textAlign = 'left';
    const hearts = '❤️'.repeat(state.lives);
    ctx.fillText(hearts, W - 160, 24);
  }

  private drawCombo(ctx: CanvasRenderingContext2D, state: BalloonState): void {
    if (state.combo < 2 || state.phase !== 'playing') return;

    const W = ctx.canvas.width;
    const alpha = Math.min(1, state.comboTimer / 500);
    ctx.globalAlpha = alpha;

    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;

    const fontSize = 24 + state.combo * 2;
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText(`x${state.combo} COMBO!`, W / 2, 90);

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  private drawReadyOverlay(ctx: CanvasRenderingContext2D, state: BalloonState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    ctx.fillStyle = 'rgba(15, 15, 26, 0.85)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#e91e63';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Balloon Pop', W / 2, H / 2 - 80);

    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('Pop balloons before they escape!', W / 2, H / 2 - 20);
    ctx.fillText('Smaller balloons = more points', W / 2, H / 2 + 15);
    ctx.fillText('Build combos for multipliers', W / 2, H / 2 + 50);

    if (state.highScore > 0) {
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.fillText(`🏆 High Score: ${state.highScore}`, W / 2, H / 2 + 100);
    }

    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Click or press SPACE to start', W / 2, H / 2 + 150);
  }

  private drawGameOverOverlay(ctx: CanvasRenderingContext2D, state: BalloonState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    ctx.fillStyle = 'rgba(15, 15, 26, 0.85)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Game Over!', W / 2, H / 2 - 80);

    ctx.font = '32px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Final Score: ${state.score}`, W / 2, H / 2 - 20);

    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`Best Combo: x${state.maxCombo}`, W / 2, H / 2 + 20);

    if (state.score === state.highScore && state.score > 0) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('🎉 New High Score! 🎉', W / 2, H / 2 + 70);
    }

    ctx.fillStyle = '#aaa';
    ctx.font = '20px sans-serif';
    ctx.fillText('Click or press SPACE to restart', W / 2, H / 2 + 130);
  }

  private drawPausedOverlay(ctx: CanvasRenderingContext2D, state: BalloonState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', W / 2, H / 2);

    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Press P to resume', W / 2, H / 2 + 50);
  }
}
```

---

### 6. Update Game Engine

**File:** `src/games/balloon-pop/BalloonEngine.ts`

Update constructor to pass `onExit` to InputSystem and set initial phase to `'ready'`:

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

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
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
      phase: 'ready', // Start at ready screen
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
    this.inputSystem = new InputSystem(canvas, onExit);

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

### 7. Update Platform Adapter

**File:** `src/games/balloon-pop/adapters/PlatformAdapter.ts`

```typescript
import type { GameInstance } from '@shared/GameInterface';
import { BalloonEngine } from '../BalloonEngine';

export class PlatformAdapter implements GameInstance {
  private engine: BalloonEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new BalloonEngine(canvas, onExit);
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

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Balloon Pop"
3. **Ready Screen:**
   - Shows title, instructions, high score
   - Click or press Space to start
4. **Gameplay:**
   - Pop balloons → colorful particle burst
   - Miss a balloon escaping → lose a heart
   - Lose all 5 hearts → game over
   - Timer runs out → game over
5. **Keyboard:**
   - **P** → Pause/resume
   - **ESC** → Exit to menu
   - **Space** → Start/restart
6. **Particles:**
   - Radial burst of colored circles
   - Fall with gravity
   - Fade out over time

---

## Congratulations! 🎉

You've built a complete Balloon Pop game with:
- ✅ Beautiful gradient balloons with highlights
- ✅ Physics-based floating with wobble
- ✅ Progressive spawn rate difficulty
- ✅ Click detection with size-based scoring
- ✅ Combo multipliers (up to 10x)
- ✅ Particle effects with gravity
- ✅ Lives system (5 hearts)
- ✅ 90-second timer countdown
- ✅ Complete game flow (ready → playing → gameover)
- ✅ Pause functionality
- ✅ High score persistence
- ✅ Keyboard + touch controls

---

## Next Challenges

**Easy:**
- Add sound effects (pop, escape, combo)
- Power-ups (slow time, double points, freeze balloons)
- Different balloon types (golden = bonus, black = penalty)

**Medium:**
- Multiple rounds with increasing difficulty
- Achievements system (pop 100, reach 10x combo)
- Special effects (screen shake, slow-motion on combo)

**Hard:**
- Leaderboard with backend API
- Multiplayer (competitive scoring)
- Custom game modes (time attack, survival, target score)

---

## What You Learned Overall

✅ Radial gradients for 3D effects  
✅ Bezier curves for organic shapes  
✅ Delta-time physics simulation  
✅ Sine wave animations  
✅ Circle collision detection  
✅ Particle systems with lifecycle  
✅ Combo mechanics with time windows  
✅ Game state machines  
✅ Modal overlay design  
✅ Keyboard + touch input handling

**Great job!** 🎈
