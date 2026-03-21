# Step 2: Platform Sinking

**Goal:** Platforms begin sinking 2 seconds after the player lands on them, with a visual countdown and shake effect.

**Time:** ~15 minutes

---

## What You'll Build

- **Sink timer**: Each platform starts a 2-second countdown on first landing
- **Color shift**: Platforms fade from brown to red as the timer runs out
- **Shake warning**: Platforms shake when nearly sunk
- **Opacity fade**: Sunk platforms become transparent and disappear
- **Sinking motion**: Fully expired platforms slide downward off-screen

---

## Concepts

- **Per-object timers**: Each platform tracks its own `sinkTimer` independently
- **State transitions**: `idle` -> `sinking` -> `sunk` per platform
- **Visual urgency**: Map remaining time to color intensity

---

## Code

### 1. Update Types

**File:** `src/contexts/canvas2d/games/lava-floor/types.ts`

Add sink-related fields to `Platform` and new constants:

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
  sinkTimer: number;   // ms remaining before fully sunk
  sinking: boolean;     // countdown has started
  sunk: boolean;        // timer expired — platform is falling
  opacity: number;      // visual fade 1.0 -> 0.0
}

export type Phase = 'idle' | 'playing';

export interface LavaState {
  player: Player;
  platforms: Platform[];
  phase: Phase;
  canvasW: number;
  canvasH: number;
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
export const PLATFORM_HEIGHT = 14;
export const SINK_SPEED = 0.05;      // px/ms downward once sunk
export const SINK_DELAY = 2000;      // ms before platform sinks
```

Two new constants: `SINK_DELAY` sets the countdown length, and `SINK_SPEED` controls how fast a dead platform falls.

---

### 2. Create Platform System

**File:** `src/contexts/canvas2d/games/lava-floor/systems/PlatformSystem.ts`

Manage sink timers and remove dead platforms:

```typescript
import type { Updatable } from '@core/Updatable';
import type { LavaState } from '../types';
import { SINK_SPEED, SINK_DELAY } from '../types';

export class PlatformSystem implements Updatable<LavaState> {
  update(state: LavaState, dt: number): void {
    if (state.phase !== 'playing') return;

    for (const plat of state.platforms) {
      // Count down sinking platforms
      if (plat.sinking && !plat.sunk) {
        plat.sinkTimer -= dt;

        if (plat.sinkTimer <= 0) {
          plat.sunk = true;
        }

        // Opacity tracks remaining time (1.0 -> 0.3)
        plat.opacity = Math.max(0.3, plat.sinkTimer / SINK_DELAY);
      }

      // Sunk platforms fall and fade out
      if (plat.sunk) {
        plat.y += SINK_SPEED * dt;
        plat.opacity = Math.max(0, plat.opacity - 0.001 * dt);
      }
    }

    // Remove platforms that have fallen far enough or fully faded
    state.platforms = state.platforms.filter(
      (p) => p.y < state.canvasH + 100 && p.opacity > 0,
    );
  }
}
```

The opacity never drops below 0.3 while sinking — the platform stays visible until it is fully sunk. After that, it fades to zero while falling, then gets removed from the array.

---

### 3. Update Collision System

**File:** `src/contexts/canvas2d/games/lava-floor/systems/CollisionSystem.ts`

Trigger sinking on landing, skip sunk platforms:

```typescript
import type { Updatable } from '@core/Updatable';
import type { LavaState } from '../types';
import { PLATFORM_HEIGHT } from '../types';

export class CollisionSystem implements Updatable<LavaState> {
  update(state: LavaState, _dt: number): void {
    if (state.phase !== 'playing') return;

    const player = state.player;
    player.onGround = false;

    for (const plat of state.platforms) {
      // Cannot stand on a sunk platform
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

        // Start the sink countdown on first contact
        if (!plat.sinking) {
          plat.sinking = true;
        }
      }
    }
  }
}
```

The only change from step 1: `if (plat.sunk) continue` skips dead platforms, and `if (!plat.sinking) plat.sinking = true` arms the countdown on first landing.

---

### 4. Update Game Renderer

**File:** `src/contexts/canvas2d/games/lava-floor/renderers/GameRenderer.ts`

Add the sinking visual effects to platform drawing:

```typescript
import type { Renderable } from '@core/Renderable';
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

    this.drawPlatforms(ctx, state);
    this.drawPlayer(ctx, state);
  }

  private drawPlatforms(ctx: CanvasRenderingContext2D, state: LavaState): void {
    for (const plat of state.platforms) {
      ctx.globalAlpha = plat.opacity;

      // Gradient shifts from brown to red based on urgency
      const grad = ctx.createLinearGradient(
        plat.x, plat.y,
        plat.x, plat.y + PLATFORM_HEIGHT,
      );

      if (plat.sinking && !plat.sunk) {
        // urgency: 0 (just started) -> 1 (about to sink)
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

      // Edge highlight — orange for sinking, gray for stable
      ctx.strokeStyle = plat.sinking
        ? `rgba(255, 100, 50, ${plat.opacity})`
        : `rgba(188, 170, 164, ${plat.opacity})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(plat.x, plat.y, plat.w, PLATFORM_HEIGHT, 3);
      ctx.stroke();

      // Shake effect in the last 500ms before sinking
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

    // Body
    ctx.fillStyle = '#42a5f5';
    ctx.beginPath();
    ctx.roundRect(-hw, -hh, player.width, player.height, 4);
    ctx.fill();

    ctx.strokeStyle = '#1565c0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-hw, -hh, player.width, player.height, 4);
    ctx.stroke();

    // Eyes
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

    // Feet
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

The visual progression for a sinking platform:
1. **Brown** (stable, never touched)
2. **Brown -> Red gradient** (sinking countdown active, opacity fading)
3. **Shaking red overlay** (last 500ms warning)
4. **Falling and fading** (sunk, player falls through)

---

### 5. Update Game Engine

**File:** `src/contexts/canvas2d/games/lava-floor/LavaEngine.ts`

Add the `PlatformSystem` to the update loop. Update `initPlatforms` to include the new fields:

```typescript
import type { LavaState } from './types';
import { PLAYER_WIDTH, PLAYER_HEIGHT, SINK_DELAY } from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { PlatformSystem } from './systems/PlatformSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { GameRenderer } from './renderers/GameRenderer';

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
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;

    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const W = canvas.width;
    const H = canvas.height;

    this.state = {
      player: {
        x: W / 2,
        y: H * 0.5,
        vx: 0,
        vy: 0,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        onGround: false,
        facingRight: true,
      },
      platforms: [],
      phase: 'idle',
      canvasW: W,
      canvasH: H,
      leftHeld: false,
      rightHeld: false,
      jumpPressed: false,
    };

    this.initPlatforms();

    this.physicsSystem = new PhysicsSystem();
    this.platformSystem = new PlatformSystem();
    this.collisionSystem = new CollisionSystem();
    this.gameRenderer = new GameRenderer();

    this.inputSystem = new InputSystem(this.state, canvas, onExit);

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasW = canvas.width;
      this.state.canvasH = canvas.height;
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
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);
    this.gameRenderer.render(this.ctx, this.state);
  }

  private initPlatforms(): void {
    const { canvasW, canvasH } = this.state;

    // Starting platform under the player
    this.state.platforms.push({
      x: canvasW / 2 - 60,
      y: canvasH * 0.6,
      w: 120,
      sinkTimer: SINK_DELAY,
      sunk: false,
      sinking: false,
      opacity: 1,
    });

    // Scattered platforms
    for (let i = 0; i < 6; i++) {
      const w = 70 + Math.random() * 60;
      const x = Math.random() * (canvasW - w);
      const y = canvasH * 0.3 + Math.random() * (canvasH * 0.4);
      this.state.platforms.push({
        x,
        y,
        w,
        sinkTimer: SINK_DELAY,
        sunk: false,
        sinking: false,
        opacity: 1,
      });
    }
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Lava Floor"
3. **Observe:**
   - Land on any platform — it starts turning red
   - After ~2 seconds the platform becomes fully sunk and falls away
   - In the last 500ms, the platform shakes as a warning
   - Platforms the player never touches stay brown and stable
   - Eventually all reachable platforms disappear (the player falls off-screen for now)

---

## Challenges

**Easy:**
- Change `SINK_DELAY` to 3000ms for more forgiving gameplay
- Make the shake effect stronger (multiply by 4 instead of 2)
- Change the sinking color from red to purple

**Medium:**
- Add a cracking overlay texture as the platform sinks
- Make the platform shrink horizontally while sinking
- Play a rumble animation on the player when standing on a shaking platform

**Hard:**
- Add "safe" platforms (green) that never sink
- Make platforms sink faster if the player is standing still on them
- Create a chain reaction where sinking platforms pull nearby platforms down

---

## What You Learned

- Per-object countdown timers with `dt` subtraction
- State machine transitions on individual game objects
- Mapping a timer ratio to visual properties (color, opacity)
- Using `performance.now()` for frame-independent shake effects
- Filtering arrays to remove expired objects

**Next:** Lava and death!
