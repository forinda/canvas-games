# Step 1: Player & Platforms

**Goal:** Draw a player character on platforms with gravity, jumping, and horizontal movement.

**Time:** ~15 minutes

---

## What You'll Build

Foundation elements:
- **Dark volcanic background**: Gradient from dark brown to black
- **Rectangular platforms**: Brown stone-like ledges scattered across the screen
- **Player character**: Blue rectangle with eyes and animated feet
- **Gravity**: Player falls when not on a platform
- **Jump mechanic**: Space bar launches the player upward
- **Horizontal movement**: Arrow keys move left and right

---

## Concepts

- **Gravity accumulation**: `vy += GRAVITY * dt` each frame
- **Ground detection**: Reset `vy` and set `onGround` when landing
- **Jump gating**: Only allow jump when `onGround` is true
- **Delta-time movement**: `position += velocity * dt`

---

## Code

### 1. Create Types

**File:** `src/games/lava-floor/types.ts`

Define the player, platforms, and game state:

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

// Player
export const PLAYER_WIDTH = 24;
export const PLAYER_HEIGHT = 32;
```

The player's `x, y` represent the center of the character. Velocities are in pixels per millisecond because `dt` arrives in milliseconds from `performance.now()`.

---

### 2. Create Input System

**File:** `src/games/lava-floor/systems/InputSystem.ts`

Map keyboard events to state flags:

```typescript
import type { InputHandler } from '@shared/InputHandler';
import type { LavaState } from '../types';

export class InputSystem implements InputHandler {
  private state: LavaState;
  private onExit: () => void;

  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;

  constructor(
    state: LavaState,
    _canvas: HTMLCanvasElement,
    onExit: () => void,
  ) {
    this.state = state;
    this.onExit = onExit;

    this.keyDownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.onExit();
        return;
      }

      // Transition from idle to playing on first input
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

We store held-key booleans rather than reacting to individual key events. This avoids the classic problem where holding two keys and releasing one cancels all movement.

---

### 3. Create Physics System

**File:** `src/games/lava-floor/systems/PhysicsSystem.ts`

Apply gravity, horizontal movement, and jumping:

```typescript
import type { Updatable } from '@shared/Updatable';
import type { LavaState } from '../types';
import { GRAVITY, JUMP_FORCE, MOVE_SPEED, MAX_FALL_SPEED } from '../types';

export class PhysicsSystem implements Updatable<LavaState> {
  update(state: LavaState, dt: number): void {
    if (state.phase !== 'playing') {
      // Idle bobbing animation
      if (state.phase === 'idle') {
        state.player.y =
          state.canvasH * 0.5 + Math.sin(performance.now() * 0.003) * 6;
      }
      return;
    }

    const player = state.player;

    // Horizontal movement — instant response, no acceleration
    player.vx = 0;
    if (state.leftHeld) {
      player.vx = -MOVE_SPEED;
      player.facingRight = false;
    }
    if (state.rightHeld) {
      player.vx = MOVE_SPEED;
      player.facingRight = true;
    }

    // Jump — only when standing on a platform
    if (state.jumpPressed && player.onGround) {
      player.vy = JUMP_FORCE;
      player.onGround = false;
    }

    // Gravity — accumulates every frame
    player.vy += GRAVITY * dt;
    if (player.vy > MAX_FALL_SPEED) {
      player.vy = MAX_FALL_SPEED;
    }

    // Update position
    player.x += player.vx * dt;
    player.y += player.vy * dt;
  }
}
```

`JUMP_FORCE` is negative because the y-axis points downward. Gravity adds a positive value each frame, decelerating the jump, pausing at the apex, then accelerating the fall. `MAX_FALL_SPEED` caps fall velocity so the player cannot clip through thin platforms.

---

### 4. Create Collision System

**File:** `src/games/lava-floor/systems/CollisionSystem.ts`

Detect landing on platforms:

```typescript
import type { Updatable } from '@shared/Updatable';
import type { LavaState } from '../types';
import { PLATFORM_HEIGHT } from '../types';

export class CollisionSystem implements Updatable<LavaState> {
  update(state: LavaState, _dt: number): void {
    if (state.phase !== 'playing') return;

    const player = state.player;
    player.onGround = false;

    for (const plat of state.platforms) {
      const playerBottom = player.y + player.height / 2;
      const playerLeft = player.x - player.width / 2;
      const playerRight = player.x + player.width / 2;

      const platTop = plat.y;
      const platBottom = plat.y + PLATFORM_HEIGHT;
      const platLeft = plat.x;
      const platRight = plat.x + plat.w;

      // Landing check: player is falling, feet overlap the platform top
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
      }
    }
  }
}
```

The collision is one-directional: the player can jump through platforms from below and only lands when falling downward (`vy >= 0`). The 4px inset on the horizontal check prevents the player from "catching" a platform edge while barely overlapping.

---

### 5. Create Game Renderer

**File:** `src/games/lava-floor/renderers/GameRenderer.ts`

Draw the background, platforms, and player:

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

    // Platforms
    this.drawPlatforms(ctx, state);

    // Player
    this.drawPlayer(ctx, state);
  }

  private drawPlatforms(ctx: CanvasRenderingContext2D, state: LavaState): void {
    for (const plat of state.platforms) {
      // Stone-like gradient
      const grad = ctx.createLinearGradient(
        plat.x, plat.y,
        plat.x, plat.y + PLATFORM_HEIGHT,
      );
      grad.addColorStop(0, '#8d6e63');
      grad.addColorStop(1, '#5d4037');
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.roundRect(plat.x, plat.y, plat.w, PLATFORM_HEIGHT, 3);
      ctx.fill();

      // Edge highlight
      ctx.strokeStyle = 'rgba(188, 170, 164, 1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(plat.x, plat.y, plat.w, PLATFORM_HEIGHT, 3);
      ctx.stroke();
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

    // Eyes — shift toward facing direction
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

    // Feet — animate when moving
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

The player is drawn centered on its `(x, y)` position using `ctx.translate`. The eye pupils shift toward the facing direction, and the feet alternate heights when moving to create a walk cycle.

---

### 6. Create Game Engine

**File:** `src/games/lava-floor/LavaEngine.ts`

Wire everything together with a game loop:

```typescript
import type { LavaState } from './types';
import { PLAYER_WIDTH, PLAYER_HEIGHT } from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
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

    // Scatter initial platforms
    this.initPlatforms();

    // Systems
    this.physicsSystem = new PhysicsSystem();
    this.collisionSystem = new CollisionSystem();
    this.gameRenderer = new GameRenderer();

    this.inputSystem = new InputSystem(this.state, canvas, onExit);

    // Resize handler
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
    const dt = Math.min(now - this.lastTime, 32); // Cap at ~30fps minimum
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    this.physicsSystem.update(this.state, dt);
    this.collisionSystem.update(this.state, dt);
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);
    this.gameRenderer.render(this.ctx, this.state);
  }

  private initPlatforms(): void {
    const { canvasW, canvasH } = this.state;

    // Starting platform directly under the player
    this.state.platforms.push({
      x: canvasW / 2 - 60,
      y: canvasH * 0.6,
      w: 120,
    });

    // Scatter 6 more platforms around the screen
    for (let i = 0; i < 6; i++) {
      const w = 70 + Math.random() * 60;
      const x = Math.random() * (canvasW - w);
      const y = canvasH * 0.3 + Math.random() * (canvasH * 0.4);
      this.state.platforms.push({ x, y, w });
    }
  }
}
```

The delta-time cap (`Math.min(dt, 32)`) prevents physics explosions when the tab regains focus after being backgrounded.

---

### 7. Create Platform Adapter

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

---

### 8. Create Game Export

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
    goal: 'Survive as long as possible by jumping between platforms.',
    controls: [
      { key: 'Arrow Left / Right', action: 'Move horizontally' },
      { key: 'Space', action: 'Jump' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: ['Jump between platforms to stay alive'],
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
3. **Observe:**
   - Dark volcanic background
   - 7 brown platforms scattered across the screen
   - Blue player character bobbing gently (idle animation)
   - Press any arrow key or Space to start
   - Player falls under gravity and lands on platforms
   - Space bar jumps, arrow keys move left/right
   - Player's eyes track facing direction
   - Feet animate when moving

---

## Challenges

**Easy:**
- Change the player color from blue to green
- Make the player jump higher by adjusting `JUMP_FORCE`
- Add more initial platforms (10 instead of 7)

**Medium:**
- Add double-jump (allow one extra jump while airborne)
- Make the player accelerate instead of moving at instant full speed
- Draw a shadow beneath the player on platforms

**Hard:**
- Add wall-jump off the screen edges
- Implement variable jump height (short tap = low jump, hold = high jump)
- Add coyote time (allow jump briefly after walking off a platform edge)

---

## What You Learned

- Gravity as per-frame velocity accumulation
- One-directional platform collision (pass through from below, land from above)
- Held-key flags for responsive movement
- Delta-time physics with a frame cap for stability
- Character rendering with directional eyes and animated feet

**Next:** Platform sinking mechanic!
