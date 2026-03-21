# Step 3: Lava & Death

**Goal:** Add animated lava at the bottom of the screen with bubbling effects, kill the player on contact, and enable horizontal screen wrapping.

**Time:** ~15 minutes

---

## What You'll Build

- **Lava pool**: Gradient-filled region at the bottom with a wavy surface
- **Bubbling effect**: Glowing circles bob along the lava surface
- **Heat haze**: Faint particles shimmer above the lava
- **Lava glow**: Upward gradient casts an orange glow
- **Death detection**: Player touching the lava triggers death
- **Screen wrap**: Player exiting one side reappears on the other

---

## Concepts

- **Sine-wave surface**: `Math.sin(x * freq + time)` creates a moving wave
- **Layered rendering**: Surface glow drawn on top of the lava body
- **Screen wrapping**: Offset position by canvas width when crossing edges
- **Phase-based game flow**: `'playing'` -> `'dead'` transition

---

## Code

### 1. Update Types

**File:** `src/contexts/canvas2d/games/lava-floor/types.ts`

Add lava bubbles, particles, death phase, and lava position:

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
  lavaBubbles: LavaBubble[];
  phase: Phase;
  canvasW: number;
  canvasH: number;
  lavaY: number;
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
export const SINK_SPEED = 0.05;
export const SINK_DELAY = 2000;

// Player
export const PLAYER_WIDTH = 24;
export const PLAYER_HEIGHT = 32;
```

`lavaY` marks the y-coordinate where the lava surface begins. Everything below it is molten death.

---

### 2. Update Physics System

**File:** `src/contexts/canvas2d/games/lava-floor/systems/PhysicsSystem.ts`

Add horizontal screen wrapping:

```typescript
import type { Updatable } from '@core/Updatable';
import type { LavaState } from '../types';
import { GRAVITY, JUMP_FORCE, MOVE_SPEED, MAX_FALL_SPEED } from '../types';

export class PhysicsSystem implements Updatable<LavaState> {
  update(state: LavaState, dt: number): void {
    if (state.phase !== 'playing') {
      if (state.phase === 'idle') {
        state.player.y =
          state.canvasH * 0.5 + Math.sin(performance.now() * 0.003) * 6;
      }
      return;
    }

    const player = state.player;

    // Horizontal movement
    player.vx = 0;
    if (state.leftHeld) {
      player.vx = -MOVE_SPEED;
      player.facingRight = false;
    }
    if (state.rightHeld) {
      player.vx = MOVE_SPEED;
      player.facingRight = true;
    }

    // Jump
    if (state.jumpPressed && player.onGround) {
      player.vy = JUMP_FORCE;
      player.onGround = false;
    }

    // Gravity
    player.vy += GRAVITY * dt;
    if (player.vy > MAX_FALL_SPEED) {
      player.vy = MAX_FALL_SPEED;
    }

    // Update position
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    // Screen wrap — exit left, appear right (and vice versa)
    if (player.x < -player.width) {
      player.x = state.canvasW + player.width;
    } else if (player.x > state.canvasW + player.width) {
      player.x = -player.width;
    }
  }
}
```

The wrap boundary is one full player width past the edge, so the character fully disappears before reappearing. This avoids a jarring visual pop.

---

### 3. Update Collision System

**File:** `src/contexts/canvas2d/games/lava-floor/systems/CollisionSystem.ts`

Add lava death detection:

```typescript
import type { Updatable } from '@core/Updatable';
import type { LavaState } from '../types';
import { PLATFORM_HEIGHT } from '../types';

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

    // Lava death — player center crosses below the lava surface
    if (player.y - player.height / 2 > state.lavaY) {
      this.die(state);
      return;
    }

    // Fallback — off the bottom of the screen entirely
    if (player.y > state.canvasH + 50) {
      this.die(state);
    }
  }

  private die(state: LavaState): void {
    state.phase = 'dead';
    state.leftHeld = false;
    state.rightHeld = false;
    state.jumpPressed = false;
  }
}
```

Death clears all held-key flags to prevent phantom movement when the player restarts.

---

### 4. Update Game Renderer

**File:** `src/contexts/canvas2d/games/lava-floor/renderers/GameRenderer.ts`

Add lava rendering with waves, bubbles, glow, and heat haze:

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

    // Heat haze above lava
    this.drawHeatHaze(ctx, state);

    // Platforms
    this.drawPlatforms(ctx, state);

    // Player (hidden when dead)
    if (state.phase !== 'dead') {
      this.drawPlayer(ctx, state);
    }

    // Lava body and surface
    this.drawLava(ctx, state);

    // Lava bubbles
    this.drawLavaBubbles(ctx, state);
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

  private drawLava(ctx: CanvasRenderingContext2D, state: LavaState): void {
    const { canvasW, canvasH, lavaY } = state;
    const time = performance.now() * 0.002;

    // Wavy surface path
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

    // Multi-stop lava gradient
    const lavaGrad = ctx.createLinearGradient(0, lavaY, 0, canvasH);
    lavaGrad.addColorStop(0, '#ff5722');
    lavaGrad.addColorStop(0.2, '#ff3d00');
    lavaGrad.addColorStop(0.5, '#dd2c00');
    lavaGrad.addColorStop(1, '#bf360c');
    ctx.fillStyle = lavaGrad;
    ctx.fill();

    // Bright yellow-orange highlight along the surface
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

    // Upward glow onto the play area
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

The lava surface uses two overlapping sine waves at different frequencies (`0.02` and `0.035`) to create an organic, irregular motion. The bright surface layer is drawn slightly above the body to simulate reflected light.

---

### 5. Update Game Engine

**File:** `src/contexts/canvas2d/games/lava-floor/LavaEngine.ts`

Add lava bubble initialization and update logic:

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
      lavaBubbles: [],
      phase: 'idle',
      canvasW: W,
      canvasH: H,
      lavaY: H * 0.82,
      leftHeld: false,
      rightHeld: false,
      jumpPressed: false,
    };

    this.initPlatforms();
    this.initLavaBubbles();

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
    this.updateLavaBubbles(dt);
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);
    this.gameRenderer.render(this.ctx, this.state);
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

      // Wrap bubbles horizontally
      if (bubble.x < -20) bubble.x = this.state.canvasW + 20;
      if (bubble.x > this.state.canvasW + 20) bubble.x = -20;
    }
  }

  private initPlatforms(): void {
    const { canvasW, canvasH } = this.state;

    this.state.platforms.push({
      x: canvasW / 2 - 60,
      y: canvasH * 0.6,
      w: 120,
      sinkTimer: SINK_DELAY,
      sunk: false,
      sinking: false,
      opacity: 1,
    });

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

### 6. Update Platform System Filter

**File:** `src/contexts/canvas2d/games/lava-floor/systems/PlatformSystem.ts`

Update the removal filter to use `lavaY`:

```typescript
import type { Updatable } from '@core/Updatable';
import type { LavaState } from '../types';
import { SINK_SPEED, SINK_DELAY } from '../types';

export class PlatformSystem implements Updatable<LavaState> {
  update(state: LavaState, dt: number): void {
    if (state.phase !== 'playing') return;

    for (const plat of state.platforms) {
      if (plat.sinking && !plat.sunk) {
        plat.sinkTimer -= dt;
        if (plat.sinkTimer <= 0) {
          plat.sunk = true;
        }
        plat.opacity = Math.max(0.3, plat.sinkTimer / SINK_DELAY);
      }

      if (plat.sunk) {
        plat.y += SINK_SPEED * dt;
        plat.opacity = Math.max(0, plat.opacity - 0.001 * dt);
      }
    }

    // Remove platforms that have sunk below the lava + buffer
    state.platforms = state.platforms.filter(
      (p) => p.y < state.lavaY + 100 && p.opacity > 0,
    );
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Lava Floor"
3. **Observe:**
   - Animated lava pool at the bottom ~82% of the screen height
   - Orange bubbles bob along the lava surface
   - Faint heat haze particles shimmer above the lava
   - Orange glow gradient rises above the lava surface
   - The lava surface ripples with overlapping sine waves
   - Fall into the lava and the game transitions to `'dead'` phase
   - Player disappears on death
   - Run off one side of the screen — reappear on the other side

---

## Challenges

**Easy:**
- Change the lava color scheme to blue (ice/water theme)
- Increase the number of bubbles from 12 to 20
- Move the lava higher (`0.7` instead of `0.82`) for harder gameplay

**Medium:**
- Add lava splash particles when a sunk platform hits the lava surface
- Make the lava glow pulse with a sine wave
- Add smoke particles that rise from the lava surface

**Hard:**
- Make the lava slowly rise over time (reduce `lavaY` each frame)
- Add lava fireballs that launch upward periodically
- Create convection current effects inside the lava body

---

## What You Learned

- Sine-wave compositing for organic surface animation
- Radial gradients for glowing bubble effects
- Layered rendering order (background, haze, platforms, player, lava, bubbles)
- Screen wrapping with a full-width buffer zone
- Phase transitions for game-over state

**Next:** Platform spawning to keep the game going!
