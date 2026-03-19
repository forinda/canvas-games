# Step 5: Timer, Score & Polish

**Goal:** Add a survival timer as the score, localStorage best time persistence, death particles, screen flash, idle/death overlay screens, and restart flow.

**Time:** ~15 minutes

---

## What You'll Build

- **Survival timer**: Counts up during gameplay, displayed top-center
- **Best time**: Persisted in localStorage, shown in the corner and on overlays
- **Death particles**: Burst of orange/red particles when the player dies
- **Screen flash**: Brief orange flash on death
- **Idle overlay**: Title screen with pulsing "press to start" instruction
- **Death overlay**: Panel showing time survived, best time, new-best indicator
- **Restart flow**: Space bar resets the entire game state

---

## Concepts

- **localStorage persistence**: Read on load, write on new best
- **Particle burst**: Spawn N particles in a radial pattern with random speeds
- **Screen flash**: Full-screen semi-transparent fill that fades over time
- **State reset**: Rebuild the entire state object while keeping the `InputSystem` reference valid

---

## Code

### 1. Final Types

**File:** `src/games/lava-floor/types.ts`

Add particles, flash timer, best time, and the storage key:

```typescript
export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  onGround: boolean;
  facingRight: boolean;
}

export interface Platform {
  x: number;
  y: number;
  w: number;
  sinkTimer: number;
  sunk: boolean;
  sinking: boolean;
  opacity: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface LavaBubble {
  x: number;
  y: number;
  radius: number;
  speed: number;
  phase: number;
}

export type Phase = 'idle' | 'playing' | 'dead';

export interface LavaState {
  player: Player;
  platforms: Platform[];
  particles: Particle[];
  lavaBubbles: LavaBubble[];
  phase: Phase;
  survivalTime: number;
  bestTime: number;
  canvasW: number;
  canvasH: number;
  lavaY: number;
  scrollSpeed: number;
  spawnTimer: number;
  flashTimer: number;
  leftHeld: boolean;
  rightHeld: boolean;
  jumpPressed: boolean;
}

// Physics
export const GRAVITY = 0.0015;
export const JUMP_FORCE = -0.55;
export const MOVE_SPEED = 0.28;
export const MAX_FALL_SPEED = 0.6;

// Platforms
export const SINK_SPEED = 0.05;
export const SINK_DELAY = 2000;
export const PLATFORM_MIN_W = 70;
export const PLATFORM_MAX_W = 130;
export const PLATFORM_HEIGHT = 14;
export const BASE_SPAWN_INTERVAL = 1800;
export const MIN_SPAWN_INTERVAL = 700;
export const SPEED_INCREASE_RATE = 0.00002;

// Player
export const PLAYER_WIDTH = 24;
export const PLAYER_HEIGHT = 32;

// Storage
export const HS_KEY = 'lava_floor_best_time';
```

---

### 2. Update Collision System — Death Particles

**File:** `src/games/lava-floor/systems/CollisionSystem.ts`

Add particle burst on death, save best time to localStorage:

```typescript
import type { Updatable } from '@shared/Updatable';
import type { LavaState, Particle } from '../types';
import { PLATFORM_HEIGHT, HS_KEY } from '../types';

export class CollisionSystem implements Updatable<LavaState> {
  update(state: LavaState, _dt: number): void {
    if (state.phase !== 'playing') return;

    const player = state.player;
    player.onGround = false;

    // Platform collision
    for (const plat of state.platforms) {
      if (plat.sunk) continue;

      const playerBottom = player.y + player.height / 2;
      const playerLeft = player.x - player.width / 2;
      const playerRight = player.x + player.width / 2;

      const platTop = plat.y;
      const platBottom = plat.y + PLATFORM_HEIGHT;
      const platLeft = plat.x;
      const platRight = plat.x + plat.w;

      if (
        player.vy >= 0 &&
        playerBottom >= platTop &&
        playerBottom <= platBottom + 4 &&
        playerRight > platLeft + 4 &&
        playerLeft < platRight - 4
      ) {
        player.y = platTop - player.height / 2;
        player.vy = 0;
        player.onGround = true;

        if (!plat.sinking) {
          plat.sinking = true;
        }
      }
    }

    // Lava death
    if (player.y - player.height / 2 > state.lavaY) {
      this.die(state);
      return;
    }

    // Off-screen death
    if (player.y > state.canvasH + 50) {
      this.die(state);
    }
  }

  private die(state: LavaState): void {
    state.phase = 'dead';
    state.flashTimer = 200;
    state.leftHeld = false;
    state.rightHeld = false;
    state.jumpPressed = false;

    // Spawn death particles
    this.spawnDeathParticles(state);

    // Check and save best time
    const time = Math.floor(state.survivalTime / 100) / 10;
    if (time > state.bestTime) {
      state.bestTime = time;
      try {
        localStorage.setItem(HS_KEY, String(state.bestTime));
      } catch {
        /* localStorage may be unavailable */
      }
    }
  }

  private spawnDeathParticles(state: LavaState): void {
    const colors = ['#ff5722', '#ff9800', '#ffeb3b', '#f44336', '#ff6f00'];

    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30;
      const speed = 0.1 + Math.random() * 0.3;

      const particle: Particle = {
        x: state.player.x,
        y: state.player.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.15, // bias upward
        life: 600 + Math.random() * 400,
        maxLife: 0, // set below
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 5,
      };
      particle.maxLife = particle.life;

      state.particles.push(particle);
    }
  }
}
```

The 30 particles are evenly spaced around a full circle (`angle = 2*PI * i/30`). Each has a random speed multiplier and a slight upward bias (`-0.15`) so the burst fans upward rather than being perfectly symmetric. The lava-themed color palette (orange, red, yellow) matches the game aesthetic.

---

### 3. Create HUD Renderer

**File:** `src/games/lava-floor/renderers/HUDRenderer.ts`

Render the timer, idle overlay, and death overlay:

```typescript
import type { Renderable } from '@shared/Renderable';
import type { LavaState } from '../types';

export class HUDRenderer implements Renderable<LavaState> {
  render(ctx: CanvasRenderingContext2D, state: LavaState): void {
    const { phase } = state;

    if (phase === 'playing') {
      this.drawTimer(ctx, state);
    } else if (phase === 'idle') {
      this.drawIdleOverlay(ctx, state);
    } else if (phase === 'dead') {
      this.drawTimer(ctx, state);
      this.drawDeathOverlay(ctx, state);
    }
  }

  private formatTime(ms: number): string {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const tenths = Math.floor((totalSeconds * 10) % 10);

    if (minutes > 0) {
      return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
    }
    return `${seconds}.${tenths}s`;
  }

  private drawTimer(ctx: CanvasRenderingContext2D, state: LavaState): void {
    const text = this.formatTime(state.survivalTime);
    const x = state.canvasW / 2;
    const y = 45;

    // Black outline for readability
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);

    ctx.fillStyle = '#ff5722';
    ctx.fillText(text, x, y);

    // Best time in the top-right corner
    if (state.bestTime > 0) {
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'right';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(
        `Best: ${state.bestTime.toFixed(1)}s`,
        state.canvasW - 16,
        30,
      );
      ctx.fillStyle = '#ffab40';
      ctx.fillText(
        `Best: ${state.bestTime.toFixed(1)}s`,
        state.canvasW - 16,
        30,
      );
    }
  }

  private drawIdleOverlay(
    ctx: CanvasRenderingContext2D,
    state: LavaState,
  ): void {
    const cx = state.canvasW / 2;
    const cy = state.canvasH * 0.3;

    // Title
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.strokeText('Lava Floor', cx, cy);
    ctx.fillStyle = '#ff5722';
    ctx.fillText('Lava Floor', cx, cy);

    // Subtitle
    ctx.font = 'bold 18px monospace';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText('The Floor is Lava!', cx, cy + 45);
    ctx.fillStyle = '#ffab40';
    ctx.fillText('The Floor is Lava!', cx, cy + 45);

    // Pulsing start instruction
    const alpha = 0.5 + 0.5 * Math.sin(performance.now() * 0.004);
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 20px monospace';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(
      'Press Arrow Keys or Space to Start',
      cx,
      state.canvasH * 0.6,
    );
    ctx.fillStyle = '#fff';
    ctx.fillText(
      'Press Arrow Keys or Space to Start',
      cx,
      state.canvasH * 0.6,
    );
    ctx.globalAlpha = 1;

    // Controls hint
    ctx.font = '14px monospace';
    ctx.fillStyle = '#999';
    ctx.fillText(
      'Arrows: Move  |  Space: Jump  |  ESC: Exit',
      cx,
      state.canvasH * 0.67,
    );

    // Best time (if any)
    if (state.bestTime > 0) {
      ctx.font = 'bold 18px monospace';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(
        `Best: ${state.bestTime.toFixed(1)}s`,
        cx,
        state.canvasH * 0.74,
      );
      ctx.fillStyle = '#ffab40';
      ctx.fillText(
        `Best: ${state.bestTime.toFixed(1)}s`,
        cx,
        state.canvasH * 0.74,
      );
    }
  }

  private drawDeathOverlay(
    ctx: CanvasRenderingContext2D,
    state: LavaState,
  ): void {
    const cx = state.canvasW / 2;
    const cy = state.canvasH / 2;
    const survived = Math.floor(state.survivalTime / 100) / 10;

    // Dim the screen
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, state.canvasW, state.canvasH);

    // Panel background
    const panelW = 300;
    const panelH = 220;
    const px = cx - panelW / 2;
    const py = cy - panelH / 2 - 10;

    ctx.fillStyle = '#2d1200';
    ctx.strokeStyle = '#ff5722';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 12);
    ctx.fill();
    ctx.stroke();

    // "Burned!" title
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f44336';
    ctx.fillText('Burned!', cx, py + 40);

    // Survived time
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Survived: ${survived.toFixed(1)}s`, cx, cy);

    // Best time
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#ffab40';
    ctx.fillText(`Best: ${state.bestTime.toFixed(1)}s`, cx, cy + 30);

    // New best indicator
    if (survived > 0 && survived >= state.bestTime) {
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#ffeb3b';
      ctx.fillText('NEW BEST!', cx, cy + 55);
    }

    // Pulsing restart instruction
    const alpha = 0.5 + 0.5 * Math.sin(performance.now() * 0.004);
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#ccc';
    ctx.fillText('Press Space to Restart', cx, py + panelH - 20);
    ctx.globalAlpha = 1;
  }
}
```

The timer format switches from `"12.3s"` to `"1:05.2"` once the player survives past 60 seconds. The text uses a black stroke outline so it remains readable against both dark backgrounds and bright lava.

---

### 4. Update Game Renderer — Particles & Flash

**File:** `src/games/lava-floor/renderers/GameRenderer.ts`

Add particle rendering and the death flash effect:

```typescript
import type { Renderable } from '@shared/Renderable';
import type { LavaState } from '../types';
import { PLATFORM_HEIGHT } from '../types';

export class GameRenderer implements Renderable<LavaState> {
  render(ctx: CanvasRenderingContext2D, state: LavaState): void {
    const { canvasW, canvasH } = state;

    // Dark volcanic background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvasH);
    bgGrad.addColorStop(0, '#1a0a00');
    bgGrad.addColorStop(0.5, '#2d1200');
    bgGrad.addColorStop(1, '#1a0a00');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Heat haze
    this.drawHeatHaze(ctx, state);

    // Platforms
    this.drawPlatforms(ctx, state);

    // Player (hidden when dead)
    if (state.phase !== 'dead') {
      this.drawPlayer(ctx, state);
    }

    // Death particles
    this.drawParticles(ctx, state);

    // Lava
    this.drawLava(ctx, state);

    // Lava bubbles
    this.drawLavaBubbles(ctx, state);

    // Death flash overlay
    if (state.flashTimer > 0) {
      const alpha = state.flashTimer / 200;
      ctx.fillStyle = `rgba(255, 80, 20, ${alpha * 0.6})`;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }
  }

  private drawHeatHaze(ctx: CanvasRenderingContext2D, state: LavaState): void {
    const time = performance.now() * 0.001;
    ctx.fillStyle = 'rgba(255, 100, 0, 0.03)';
    for (let i = 0; i < 15; i++) {
      const x = ((i * 97 + time * 20) % (state.canvasW + 40)) - 20;
      const y = state.lavaY - 50 - Math.sin(time + i) * 30;
      const size = 15 + Math.sin(time * 2 + i) * 8;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, state: LavaState): void {
    for (const p of state.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawLava(ctx: CanvasRenderingContext2D, state: LavaState): void {
    const { canvasW, canvasH, lavaY } = state;
    const time = performance.now() * 0.002;

    ctx.beginPath();
    ctx.moveTo(0, canvasH);
    ctx.lineTo(0, lavaY);

    for (let x = 0; x <= canvasW; x += 8) {
      const wave =
        Math.sin(x * 0.02 + time) * 4 +
        Math.sin(x * 0.035 + time * 1.3) * 3;
      ctx.lineTo(x, lavaY + wave);
    }

    ctx.lineTo(canvasW, canvasH);
    ctx.closePath();

    const lavaGrad = ctx.createLinearGradient(0, lavaY, 0, canvasH);
    lavaGrad.addColorStop(0, '#ff5722');
    lavaGrad.addColorStop(0.2, '#ff3d00');
    lavaGrad.addColorStop(0.5, '#dd2c00');
    lavaGrad.addColorStop(1, '#bf360c');
    ctx.fillStyle = lavaGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, lavaY + 5);
    for (let x = 0; x <= canvasW; x += 6) {
      const wave =
        Math.sin(x * 0.02 + time) * 4 +
        Math.sin(x * 0.035 + time * 1.3) * 3;
      ctx.lineTo(x, lavaY + wave);
    }
    ctx.lineTo(canvasW, lavaY + 5);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 200, 50, 0.4)';
    ctx.fill();

    const glowGrad = ctx.createLinearGradient(0, lavaY - 80, 0, lavaY);
    glowGrad.addColorStop(0, 'rgba(255, 80, 0, 0)');
    glowGrad.addColorStop(1, 'rgba(255, 80, 0, 0.15)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, lavaY - 80, canvasW, 80);
  }

  private drawLavaBubbles(
    ctx: CanvasRenderingContext2D,
    state: LavaState,
  ): void {
    for (const bubble of state.lavaBubbles) {
      const alpha = 0.6 + Math.sin(bubble.phase) * 0.3;
      ctx.globalAlpha = alpha;

      const grad = ctx.createRadialGradient(
        bubble.x, bubble.y, 0,
        bubble.x, bubble.y, bubble.radius,
      );
      grad.addColorStop(0, '#ffab00');
      grad.addColorStop(0.6, '#ff6d00');
      grad.addColorStop(1, 'rgba(255, 61, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawPlatforms(ctx: CanvasRenderingContext2D, state: LavaState): void {
    for (const plat of state.platforms) {
      ctx.globalAlpha = plat.opacity;

      const grad = ctx.createLinearGradient(
        plat.x, plat.y,
        plat.x, plat.y + PLATFORM_HEIGHT,
      );
      if (plat.sinking && !plat.sunk) {
        const urgency = 1 - plat.sinkTimer / 2000;
        const r = Math.floor(100 + urgency * 155);
        const g = Math.floor(80 - urgency * 60);
        const b = Math.floor(60 - urgency * 40);
        grad.addColorStop(0, `rgb(${r}, ${g}, ${b})`);
        grad.addColorStop(1, `rgb(${Math.floor(r * 0.7)}, ${Math.floor(g * 0.7)}, ${Math.floor(b * 0.7)})`);
      } else {
        grad.addColorStop(0, '#8d6e63');
        grad.addColorStop(1, '#5d4037');
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(plat.x, plat.y, plat.w, PLATFORM_HEIGHT, 3);
      ctx.fill();

      ctx.strokeStyle = plat.sinking
        ? `rgba(255, 100, 50, ${plat.opacity})`
        : `rgba(188, 170, 164, ${plat.opacity})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(plat.x, plat.y, plat.w, PLATFORM_HEIGHT, 3);
      ctx.stroke();

      if (plat.sinking && !plat.sunk && plat.sinkTimer < 500) {
        const shake = Math.sin(performance.now() * 0.05) * 2;
        ctx.fillStyle = 'rgba(255, 50, 0, 0.3)';
        ctx.fillRect(plat.x + shake, plat.y, plat.w, PLATFORM_HEIGHT);
      }

      ctx.globalAlpha = 1;
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, state: LavaState): void {
    const player = state.player;
    const px = player.x;
    const py = player.y;
    const hw = player.width / 2;
    const hh = player.height / 2;

    ctx.save();
    ctx.translate(px, py);

    ctx.fillStyle = '#42a5f5';
    ctx.beginPath();
    ctx.roundRect(-hw, -hh, player.width, player.height, 4);
    ctx.fill();

    ctx.strokeStyle = '#1565c0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-hw, -hh, player.width, player.height, 4);
    ctx.stroke();

    const eyeDir = player.facingRight ? 1 : -1;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-4 * eyeDir, -hh + 10, 4, 0, Math.PI * 2);
    ctx.arc(4 * eyeDir, -hh + 10, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(-4 * eyeDir + eyeDir * 1.5, -hh + 10, 2, 0, Math.PI * 2);
    ctx.arc(4 * eyeDir + eyeDir * 1.5, -hh + 10, 2, 0, Math.PI * 2);
    ctx.fill();

    if (state.leftHeld || state.rightHeld) {
      const legOffset = Math.sin(performance.now() * 0.01) * 3;
      ctx.fillStyle = '#1565c0';
      ctx.fillRect(-hw + 2, hh - 4, 8, 4 + legOffset);
      ctx.fillRect(hw - 10, hh - 4, 8, 4 - legOffset);
    } else {
      ctx.fillStyle = '#1565c0';
      ctx.fillRect(-hw + 2, hh - 4, 8, 4);
      ctx.fillRect(hw - 10, hh - 4, 8, 4);
    }

    ctx.restore();
  }
}
```

Particles shrink as they die (`p.size * alpha`) and fade via `ctx.globalAlpha`, creating a natural dissipation effect. The flash overlay uses a fixed 200ms duration that maps linearly to opacity.

---

### 5. Update Input System — Restart Support

**File:** `src/games/lava-floor/systems/InputSystem.ts`

Add restart callback for the death screen:

```typescript
import type { InputHandler } from '@shared/InputHandler';
import type { LavaState } from '../types';

export class InputSystem implements InputHandler {
  private state: LavaState;
  private onExit: () => void;
  private onRestart: () => void;

  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;

  constructor(
    state: LavaState,
    _canvas: HTMLCanvasElement,
    onExit: () => void,
    onRestart: () => void,
  ) {
    this.state = state;
    this.onExit = onExit;
    this.onRestart = onRestart;

    this.keyDownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.onExit();
        return;
      }

      // Restart from death screen
      if (this.state.phase === 'dead') {
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          this.onRestart();
        }
        return;
      }

      // Start from idle screen
      if (this.state.phase === 'idle') {
        if (
          e.code === 'Space' ||
          e.key === ' ' ||
          e.key === 'ArrowLeft' ||
          e.key === 'ArrowRight'
        ) {
          e.preventDefault();
          this.state.phase = 'playing';
        }
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.state.leftHeld = true;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.state.rightHeld = true;
      }
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        this.state.jumpPressed = true;
      }
    };

    this.keyUpHandler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') this.state.leftHeld = false;
      if (e.key === 'ArrowRight') this.state.rightHeld = false;
      if (e.code === 'Space' || e.key === ' ') this.state.jumpPressed = false;
    };
  }

  attach(): void {
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
  }
}
```

The `return` after the death-screen check prevents Space from also setting `jumpPressed`, which would cause an immediate jump on restart.

---

### 6. Final Game Engine

**File:** `src/games/lava-floor/LavaEngine.ts`

Complete engine with particle updates, flash timer, localStorage, and reset:

```typescript
import type { LavaState } from './types';
import {
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  HS_KEY,
} from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { PlatformSystem } from './systems/PlatformSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class LavaEngine {
  private ctx: CanvasRenderingContext2D;
  private state: LavaState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;

  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
  private platformSystem: PlatformSystem;
  private collisionSystem: CollisionSystem;
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;

    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Load best time from localStorage
    let best = 0;
    try {
      best = parseFloat(localStorage.getItem(HS_KEY) ?? '0') || 0;
    } catch {
      /* noop */
    }

    this.state = this.createInitialState(canvas.width, canvas.height, best);

    // Systems
    this.physicsSystem = new PhysicsSystem();
    this.platformSystem = new PlatformSystem();
    this.collisionSystem = new CollisionSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    // Initialize world
    this.platformSystem.initPlatforms(this.state);
    this.initLavaBubbles();

    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      onExit,
      () => this.reset(),
    );

    // Resize
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasW = canvas.width;
      this.state.canvasH = canvas.height;
      this.state.lavaY = canvas.height * 0.82;
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
    const dt = Math.min(now - this.lastTime, 32);
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    this.physicsSystem.update(this.state, dt);
    this.platformSystem.update(this.state, dt);
    this.collisionSystem.update(this.state, dt);

    // Update particles
    this.updateParticles(dt);

    // Update lava bubbles
    this.updateLavaBubbles(dt);

    // Flash timer countdown
    if (this.state.flashTimer > 0) {
      this.state.flashTimer = Math.max(0, this.state.flashTimer - dt);
    }
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }

  private updateParticles(dt: number): void {
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const p = this.state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.0005 * dt; // particles fall under light gravity
      p.life -= dt;
      if (p.life <= 0) {
        this.state.particles.splice(i, 1);
      }
    }
  }

  private initLavaBubbles(): void {
    this.state.lavaBubbles = [];
    for (let i = 0; i < 12; i++) {
      this.state.lavaBubbles.push({
        x: Math.random() * this.state.canvasW,
        y: this.state.lavaY + Math.random() * 40,
        radius: 4 + Math.random() * 10,
        speed: 0.01 + Math.random() * 0.03,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private updateLavaBubbles(dt: number): void {
    for (const bubble of this.state.lavaBubbles) {
      bubble.phase += bubble.speed * dt;
      bubble.y = this.state.lavaY + Math.sin(bubble.phase) * 8 + 10;
      bubble.x += Math.sin(bubble.phase * 0.5) * 0.3;

      if (bubble.x < -20) bubble.x = this.state.canvasW + 20;
      if (bubble.x > this.state.canvasW + 20) bubble.x = -20;
    }
  }

  private reset(): void {
    const best = this.state.bestTime;
    const w = this.state.canvasW;
    const h = this.state.canvasH;
    const newState = this.createInitialState(w, h, best);
    newState.phase = 'idle';

    // Copy into existing state object so InputSystem's reference stays valid
    Object.assign(this.state, newState);

    // Re-initialize platforms and bubbles
    this.platformSystem.initPlatforms(this.state);
    this.initLavaBubbles();
  }

  private createInitialState(
    canvasW: number,
    canvasH: number,
    bestTime: number,
  ): LavaState {
    return {
      player: {
        x: canvasW / 2,
        y: canvasH * 0.5,
        vx: 0,
        vy: 0,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        onGround: false,
        facingRight: true,
      },
      platforms: [],
      particles: [],
      lavaBubbles: [],
      phase: 'idle',
      survivalTime: 0,
      bestTime,
      canvasW,
      canvasH,
      lavaY: canvasH * 0.82,
      scrollSpeed: 0.02,
      spawnTimer: 1000,
      flashTimer: 0,
      leftHeld: false,
      rightHeld: false,
      jumpPressed: false,
    };
  }
}
```

The `reset()` method uses `Object.assign(this.state, newState)` rather than replacing `this.state` with a new object. This is critical because `InputSystem` holds a direct reference to the state object. Replacing it would leave `InputSystem` mutating an orphaned object.

---

### 7. Final Platform Adapter & Export

These files remain unchanged from step 4. For completeness:

**File:** `src/games/lava-floor/adapters/PlatformAdapter.ts`

```typescript
import type { GameInstance } from '@shared/GameInterface';
import { LavaEngine } from '../LavaEngine';

export class PlatformAdapter implements GameInstance {
  private engine: LavaEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new LavaEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

**File:** `src/games/lava-floor/index.ts`

```typescript
import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const LavaFloorGame: GameDefinition = {
  id: 'lava-floor',
  category: 'action' as const,
  name: 'Lava Floor',
  description: 'Jump between sinking platforms — the floor is lava!',
  icon: '\u{1F30B}',
  color: '#ff5722',
  help: {
    goal: 'Survive as long as possible by jumping between platforms before they sink into the lava.',
    controls: [
      { key: 'Arrow Left / Right', action: 'Move horizontally' },
      { key: 'Space', action: 'Jump' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: [
      'Platforms sink 2 seconds after you land on them',
      'New platforms slide in from the sides — keep moving',
      'You can wrap around the screen edges horizontally',
      'Difficulty increases over time — platforms spawn faster',
      'Time your jumps carefully to land on fresh platforms',
    ],
  },
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Lava Floor"
3. **Observe the full game loop:**
   - **Idle screen**: Title, subtitle, pulsing "Press to Start", controls hint
   - **Gameplay**: Timer counting up top-center, best time in top-right
   - **Sinking platforms**: Brown to red, shake, fall into lava
   - **New platforms**: Slide in from edges at increasing frequency
   - **Death**: Orange flash, particle burst, player disappears
   - **Death overlay**: "Burned!" panel with survived time, best time, NEW BEST indicator
   - **Restart**: Press Space, game resets to idle screen
   - **Persistence**: Refresh the browser — best time is preserved

---

## Challenges

**Easy:**
- Change the death message from "Burned!" to "Melted!"
- Make the flash timer longer (500ms) for a more dramatic effect
- Change the particle colors to blue and white

**Medium:**
- Add a combo counter that increases for each platform you land on consecutively
- Show the survival timer in the death panel with the `formatTime` style
- Add a screen shake effect on death (offset the canvas translate)

**Hard:**
- Add a global leaderboard using a simple REST API
- Implement a replay system that records player inputs and plays them back
- Add achievements ("Survive 30 seconds", "Land on 20 platforms", etc.)

---

## What You Learned

- localStorage for persistent high scores with error handling
- Radial particle bursts with angular distribution
- Screen flash effects using timed alpha overlays
- HUD rendering with outlined text for readability
- Full game state reset using `Object.assign` to preserve references
- Complete game loop: idle -> playing -> dead -> restart

---

## Final Architecture

```
src/games/lava-floor/
  types.ts                    — Interfaces and constants
  LavaEngine.ts               — Game loop, state, particle/bubble updates
  systems/
    InputSystem.ts            — Keyboard -> state flags
    PhysicsSystem.ts          — Gravity, movement, screen wrap
    PlatformSystem.ts         — Sink timers, spawning, slide-in animation
    CollisionSystem.ts        — Landing detection, lava death, particles
  renderers/
    GameRenderer.ts           — Background, platforms, player, lava, effects
    HUDRenderer.ts            — Timer, overlays, death panel
  adapters/
    PlatformAdapter.ts        — GameInstance bridge
  index.ts                    — GameDefinition export
```

The game follows an ECS-inspired pattern: **state** is a plain data object, **systems** mutate it each frame, and **renderers** read it to draw. This separation makes each piece testable in isolation and easy to extend.

**Congratulations — Lava Floor is complete!**
