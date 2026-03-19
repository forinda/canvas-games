# Step 1: Player & Gravity

**Goal:** Draw a player character on screen with gravity pulling it down and left/right movement with horizontal screen wrapping.

**Time:** ~15 minutes

---

## What You'll Build

Foundation elements:
- **Graph paper background**: Light cream with grid lines
- **Player character**: A green doodle creature with eyes and feet
- **Gravity**: Constant downward acceleration
- **Horizontal movement**: Arrow keys or A/D to steer left and right
- **Screen wrapping**: Walk off one side, appear on the other

---

## Concepts

- **Gravity Accumulation**: `velocity.y += GRAVITY * deltaTime` each frame
- **Friction**: `velocity.x *= FRICTION` slows horizontal drift
- **Screen Wrapping**: When player exits one edge, reposition at the opposite edge
- **Facing Direction**: Flip the character sprite based on movement direction

---

## Code

### 1. Create Types

**File:** `src/games/doodle-jump/types.ts`

Define all game constants, interfaces, and state shape:

```typescript
export type PlatformType = 'normal' | 'moving' | 'breaking' | 'spring';

export type Phase = 'idle' | 'playing' | 'dead';

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  facingRight: boolean;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  type: PlatformType;
  /** For moving platforms: horizontal velocity */
  moveVx: number;
  /** For moving platforms: min x bound */
  moveMinX: number;
  /** For moving platforms: max x bound */
  moveMaxX: number;
  /** For breaking platforms: has been stepped on */
  broken: boolean;
  /** For breaking platforms: fall velocity after breaking */
  breakVy: number;
  /** For spring platforms: spring animation timer */
  springTimer: number;
}

export interface DoodleState {
  player: Player;
  platforms: Platform[];
  phase: Phase;
  score: number;
  highScore: number;
  canvasW: number;
  canvasH: number;
  cameraY: number;
  maxHeight: number;
}

// Physics
export const GRAVITY = 0.0012;
export const JUMP_FORCE = -0.55;
export const SPRING_FORCE = -0.85;
export const MOVE_SPEED = 0.28;
export const FRICTION = 0.92;

// Platforms
export const PLATFORM_COUNT = 12;
export const PLATFORM_WIDTH = 70;
export const PLATFORM_HEIGHT = 15;
export const MOVING_SPEED = 0.06;

// Player
export const PLAYER_WIDTH = 30;
export const PLAYER_HEIGHT = 40;

// Storage
export const HS_KEY = 'doodle_jump_highscore';
```

We define everything up front so later steps can import what they need without restructuring. The `Platform` interface has fields for all four platform types -- we will use those starting in Step 3.

---

### 2. Create the Physics System

**File:** `src/games/doodle-jump/systems/PhysicsSystem.ts`

Handle gravity, friction, movement, and screen wrapping:

```typescript
import type { DoodleState } from '../types';
import { GRAVITY, FRICTION } from '../types';

export class PhysicsSystem {
  update(state: DoodleState, dt: number): void {
    if (state.phase !== 'playing') return;

    const p = state.player;

    // Apply gravity
    p.vy += GRAVITY * dt;

    // Apply horizontal friction
    p.vx *= FRICTION;

    // Update position
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Screen wrap horizontally
    if (p.x + p.width < 0) {
      p.x = state.canvasW;
    } else if (p.x > state.canvasW) {
      p.x = -p.width;
    }
  }
}
```

**Key details:**
- `GRAVITY` is a small positive number -- it adds to `vy` each frame, pulling the player down
- `FRICTION` at 0.92 means the player loses 8% of horizontal speed per frame, creating a smooth deceleration
- Screen wrapping compares the full bounding box: the player must fully exit one side before appearing on the other

---

### 3. Create the Input System

**File:** `src/games/doodle-jump/systems/InputSystem.ts`

Listen for keyboard input and apply movement each frame:

```typescript
import type { DoodleState } from '../types';
import { MOVE_SPEED, JUMP_FORCE } from '../types';

export class InputSystem {
  private state: DoodleState;
  private onExit: () => void;
  private onRestart: () => void;

  private keys: Set<string>;
  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;

  constructor(
    state: DoodleState,
    onExit: () => void,
    onRestart: () => void,
  ) {
    this.state = state;
    this.onExit = onExit;
    this.onRestart = onRestart;
    this.keys = new Set();

    this.keyDownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.onExit();
        return;
      }

      this.keys.add(e.key.toLowerCase());

      if (this.state.phase === 'idle') {
        this.state.phase = 'playing';
        this.state.player.vy = JUMP_FORCE;
        return;
      }

      if (this.state.phase === 'dead' && (e.code === 'Space' || e.key === ' ' || e.key === 'Enter')) {
        this.onRestart();
      }
    };

    this.keyUpHandler = (e: KeyboardEvent) => {
      this.keys.delete(e.key.toLowerCase());
    };
  }

  /** Called each frame by the engine to apply continuous movement */
  applyMovement(): void {
    if (this.state.phase !== 'playing') return;

    const p = this.state.player;

    if (this.keys.has('arrowleft') || this.keys.has('a')) {
      p.vx = -MOVE_SPEED;
      p.facingRight = false;
    } else if (this.keys.has('arrowright') || this.keys.has('d')) {
      p.vx = MOVE_SPEED;
      p.facingRight = true;
    }
  }

  attach(): void {
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
    this.keys.clear();
  }
}
```

**Why a `Set<string>` for keys?** A Set lets us track multiple simultaneous key presses. We check the set every frame in `applyMovement()` rather than reacting to a single event -- this gives smooth, continuous movement.

When the game is in `idle` phase, any key press transitions to `playing` and gives the player an initial upward jump via `JUMP_FORCE`.

---

### 4. Create the Game Renderer

**File:** `src/games/doodle-jump/renderers/GameRenderer.ts`

Draw the background and the player character:

```typescript
import type { DoodleState } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: DoodleState): void {
    // Graph paper background
    this.drawBackground(ctx, state);

    ctx.save();
    // Apply camera translation (used in later steps)
    ctx.translate(0, -state.cameraY);

    // Draw player
    this.drawPlayer(ctx, state);

    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D, state: DoodleState): void {
    const { canvasW, canvasH, cameraY } = state;

    // Cream/white background like graph paper
    ctx.fillStyle = '#faf8ef';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Grid lines
    const gridSize = 30;
    ctx.strokeStyle = 'rgba(200, 210, 230, 0.4)';
    ctx.lineWidth = 0.5;

    const offsetY = -(cameraY % gridSize);
    for (let y = offsetY; y < canvasH; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasW, y);
      ctx.stroke();
    }

    for (let x = 0; x < canvasW; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasH);
      ctx.stroke();
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, state: DoodleState): void {
    const p = state.player;

    ctx.save();
    ctx.translate(p.x + p.width / 2, p.y + p.height / 2);

    if (!p.facingRight) {
      ctx.scale(-1, 1);
    }

    const hw = p.width / 2;
    const hh = p.height / 2;

    // Body (green doodle character)
    ctx.fillStyle = '#66bb6a';
    ctx.beginPath();
    ctx.ellipse(0, 2, hw, hh - 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#388e3c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Belly
    ctx.fillStyle = '#a5d6a7';
    ctx.beginPath();
    ctx.ellipse(0, 6, hw * 0.6, hh * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(-5, -8, 6, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(5, -8, 6, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-3, -8, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(7, -8, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Nose/snout
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.ellipse(2, -2, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nostrils
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.arc(-1, -2, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5, -2, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Legs (two little feet)
    ctx.fillStyle = '#66bb6a';
    ctx.beginPath();
    ctx.ellipse(-8, hh - 2, 6, 4, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(8, hh - 2, 6, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
```

The player is drawn entirely with canvas primitives -- no images needed. An ellipse body, white eyes with dark pupils, a small snout, and two feet. When `facingRight` is false, we flip the character with `ctx.scale(-1, 1)`.

The background draws a grid of light blue lines over a cream fill, offset by `cameraY` so the grid scrolls with the camera (we will use this in Step 2).

---

### 5. Create the Game Engine

**File:** `src/games/doodle-jump/DoodleEngine.ts`

Wire everything together with a game loop:

```typescript
import type { DoodleState } from './types';
import { PLAYER_WIDTH, PLAYER_HEIGHT } from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class DoodleEngine {
  private ctx: CanvasRenderingContext2D;
  private state: DoodleState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;

  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
  private gameRenderer: GameRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const W = canvas.width;
    const H = canvas.height;

    this.state = {
      player: {
        x: W / 2 - PLAYER_WIDTH / 2,
        y: H - 120,
        vx: 0,
        vy: 0,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        facingRight: true,
      },
      platforms: [],
      phase: 'idle',
      score: 0,
      highScore: 0,
      canvasW: W,
      canvasH: H,
      cameraY: 0,
      maxHeight: 0,
    };

    this.physicsSystem = new PhysicsSystem();
    this.gameRenderer = new GameRenderer();
    this.inputSystem = new InputSystem(
      this.state,
      onExit,
      () => {},
    );

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
    this.inputSystem.applyMovement();
    this.physicsSystem.update(this.state, dt);
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);
    this.gameRenderer.render(this.ctx, this.state);
  }
}
```

**Key patterns:**
- `Math.min(dt, 32)` caps the delta at ~32ms. If the browser tab loses focus and returns, we do not want a single huge physics step
- The `platforms` array is empty for now -- we add platforms in Step 2
- The `onRestart` callback is a no-op for now

---

### 6. Create the Platform Adapter

**File:** `src/games/doodle-jump/adapters/PlatformAdapter.ts`

```typescript
import type { GameInstance } from '@shared/GameInterface';
import { DoodleEngine } from '../DoodleEngine';

export class PlatformAdapter implements GameInstance {
  private engine: DoodleEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new DoodleEngine(canvas, onExit);
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

### 7. Create the Game Export

**File:** `src/games/doodle-jump/index.ts`

```typescript
import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const DoodleJumpGame: GameDefinition = {
  id: 'doodle-jump',
  category: 'arcade' as const,
  name: 'Doodle Jump',
  description: 'Bounce your way to the top in this endless vertical scroller!',
  icon: '🐸',
  color: '#66bb6a',
  help: {
    goal: 'Jump from platform to platform and climb as high as you can without falling.',
    controls: [
      { key: 'Arrow Left / A', action: 'Move left' },
      { key: 'Arrow Right / D', action: 'Move right' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: [
      'You wrap around the screen edges — use this to your advantage',
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
2. **Navigate:** Select "Doodle Jump"
3. **Observe:**
   - Cream graph paper background with light blue grid lines
   - Green doodle character near the bottom of the screen
   - Press any key -- the character jumps up, then gravity pulls it back down
   - Use Arrow Left / Arrow Right (or A / D) to move horizontally
   - Walk off the left edge -- the character appears on the right side
   - The character falls off the bottom (no platforms yet to bounce on)

---

## Challenges

**Easy:**
- Change `GRAVITY` to `0.002` and see how it feels heavier
- Change the player's body color from green to blue
- Make `FRICTION` 0.98 for an icy, slippery feel

**Medium:**
- Add a squash/stretch effect: scale the character vertically based on `vy`
- Draw a shadow under the player that shrinks as they rise

**Hard:**
- Add touch controls: tap left half of screen to go left, right half to go right
- Implement a tilt-based control using the DeviceOrientation API

---

## What You Learned

- Gravity as a constant acceleration added to vertical velocity each frame
- Friction as a multiplier that decays horizontal velocity toward zero
- Screen wrapping by repositioning the player when they exit one edge
- Drawing a multi-part character using only canvas ellipses and arcs
- Game loop with delta-time capping to prevent physics explosions

**Next:** Platforms and bouncing!
