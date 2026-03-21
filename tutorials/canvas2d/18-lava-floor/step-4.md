# Step 4: Platform Spawning

**Goal:** New platforms slide in from the screen edges on a timer. Spawn rate increases over time. Sunk platforms are cleaned up automatically.

**Time:** ~15 minutes

---

## What You'll Build

- **Timed spawning**: New platforms appear at regular intervals
- **Slide-in animation**: Platforms glide from off-screen to their resting position
- **Difficulty scaling**: Spawn interval shrinks as survival time grows
- **Speed increase**: Overall game pace ramps up gradually
- **Automatic cleanup**: Platforms that sink into the lava are removed from memory

---

## Concepts

- **RAF-based animation**: Per-platform `requestAnimationFrame` loop for sliding
- **Difficulty curve**: `Math.max(MIN, BASE - time * rate)` clamps the interval
- **Spawn distribution**: Random side selection and vertical placement within a safe zone

---

## Code

### 1. Update Types

**File:** `src/contexts/canvas2d/games/lava-floor/types.ts`

Add spawn timer, scroll speed, and spawning constants:

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
  survivalTime: number;
  canvasW: number;
  canvasH: number;
  lavaY: number;
  scrollSpeed: number;
  spawnTimer: number;
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
export const BASE_SPAWN_INTERVAL = 1800;   // ms between spawns at start
export const MIN_SPAWN_INTERVAL = 700;     // fastest spawn rate
export const SPEED_INCREASE_RATE = 0.00002;

// Player
export const PLAYER_WIDTH = 24;
export const PLAYER_HEIGHT = 32;
```

`BASE_SPAWN_INTERVAL` starts at 1.8 seconds between platforms. Over time, the interval decreases toward `MIN_SPAWN_INTERVAL` (700ms), forcing the player to move faster as more platforms appear and disappear.

---

### 2. Update Platform System

**File:** `src/contexts/canvas2d/games/lava-floor/systems/PlatformSystem.ts`

Add spawning logic with slide-in animation and difficulty scaling:

```typescript
import type { Updatable } from '@core/Updatable';
import type { LavaState, Platform } from '../types';
import {
  SINK_SPEED,
  SINK_DELAY,
  PLATFORM_MIN_W,
  PLATFORM_MAX_W,
  BASE_SPAWN_INTERVAL,
  MIN_SPAWN_INTERVAL,
  SPEED_INCREASE_RATE,
} from '../types';

export class PlatformSystem implements Updatable<LavaState> {
  update(state: LavaState, dt: number): void {
    if (state.phase !== 'playing') return;

    // Gradually increase difficulty
    state.scrollSpeed = Math.min(
      0.12,
      0.02 + state.survivalTime * SPEED_INCREASE_RATE,
    );

    // Update sink timers
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

    // Remove fully sunk platforms
    state.platforms = state.platforms.filter(
      (p) => p.y < state.lavaY + 100 && p.opacity > 0,
    );

    // Spawn timer countdown
    state.spawnTimer -= dt;
    const currentInterval = Math.max(
      MIN_SPAWN_INTERVAL,
      BASE_SPAWN_INTERVAL - state.survivalTime * 0.05,
    );

    if (state.spawnTimer <= 0) {
      state.spawnTimer = currentInterval;
      this.spawnPlatform(state);
    }
  }

  initPlatforms(state: LavaState): void {
    state.platforms = [];

    // Starting platform under the player
    state.platforms.push({
      x: state.canvasW / 2 - 60,
      y: state.canvasH * 0.6,
      w: 120,
      sinkTimer: SINK_DELAY,
      sunk: false,
      sinking: false,
      opacity: 1,
    });

    // Scattered initial platforms
    const count = 6;
    for (let i = 0; i < count; i++) {
      const w = PLATFORM_MIN_W + Math.random() * (PLATFORM_MAX_W - PLATFORM_MIN_W);
      const x = Math.random() * (state.canvasW - w);
      const y = state.canvasH * 0.3 + Math.random() * (state.canvasH * 0.4);
      state.platforms.push({
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

  private spawnPlatform(state: LavaState): void {
    const w =
      PLATFORM_MIN_W + Math.random() * (PLATFORM_MAX_W - PLATFORM_MIN_W);

    // Pick a random side
    const fromLeft = Math.random() < 0.5;
    const x = fromLeft ? -w - 10 : state.canvasW + 10;

    // Spawn in the upper 60% — above the lava with some margin
    const minY = state.canvasH * 0.15;
    const maxY = state.lavaY - 60;
    const y = minY + Math.random() * (maxY - minY);

    const plat: Platform = {
      x,
      y,
      w,
      sinkTimer: SINK_DELAY,
      sunk: false,
      sinking: false,
      opacity: 1,
    };

    state.platforms.push(plat);

    // Calculate where the platform should stop
    const targetX = fromLeft
      ? 20 + Math.random() * (state.canvasW * 0.4)
      : state.canvasW * 0.4 + Math.random() * (state.canvasW * 0.5 - w);

    this.animatePlatformIn(plat, targetX, fromLeft);
  }

  private animatePlatformIn(
    plat: Platform,
    targetX: number,
    fromLeft: boolean,
  ): void {
    const speed = 0.15; // px per ms (applied per frame at ~16ms)

    const step = () => {
      if (fromLeft) {
        plat.x += speed * 16;
        if (plat.x < targetX) {
          requestAnimationFrame(step);
        } else {
          plat.x = targetX;
        }
      } else {
        plat.x -= speed * 16;
        if (plat.x > targetX) {
          requestAnimationFrame(step);
        } else {
          plat.x = targetX;
        }
      }
    };

    requestAnimationFrame(step);
  }
}
```

The slide-in animation runs its own mini RAF loop, separate from the main game loop. Each frame it moves the platform ~2.4px (`0.15 * 16`) toward its target. Once it arrives, the RAF loop stops and the platform sits in place.

Platforms from the left land in the left 40% of the screen. Platforms from the right land in the right 50%. This prevents them from always clustering in the center.

---

### 3. Update Physics System

**File:** `src/contexts/canvas2d/games/lava-floor/systems/PhysicsSystem.ts`

Add survival time tracking:

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

    // Screen wrap
    if (player.x < -player.width) {
      player.x = state.canvasW + player.width;
    } else if (player.x > state.canvasW + player.width) {
      player.x = -player.width;
    }

    // Track survival time
    state.survivalTime += dt;
  }
}
```

`survivalTime` drives both the difficulty curve and the player's score. It accumulates in milliseconds.

---

### 4. Update Game Engine

**File:** `src/contexts/canvas2d/games/lava-floor/LavaEngine.ts`

Use `PlatformSystem.initPlatforms` and add `survivalTime` and `spawnTimer` to state:

```typescript
import type { LavaState } from './types';
import { PLAYER_WIDTH, PLAYER_HEIGHT } from './types';
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
      survivalTime: 0,
      canvasW: W,
      canvasH: H,
      lavaY: H * 0.82,
      scrollSpeed: 0.02,
      spawnTimer: 1000,
      leftHeld: false,
      rightHeld: false,
      jumpPressed: false,
    };

    this.physicsSystem = new PhysicsSystem();
    this.platformSystem = new PlatformSystem();
    this.collisionSystem = new CollisionSystem();
    this.gameRenderer = new GameRenderer();

    // Initialize platforms through the system
    this.platformSystem.initPlatforms(this.state);
    this.initLavaBubbles();

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

      if (bubble.x < -20) bubble.x = this.state.canvasW + 20;
      if (bubble.x > this.state.canvasW + 20) bubble.x = -20;
    }
  }
}
```

The `spawnTimer` starts at 1000ms so the first new platform appears 1 second into gameplay, giving the player a moment to orient before things start changing.

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Lava Floor"
3. **Observe:**
   - Start the game — new platforms begin sliding in from the left and right edges
   - Platforms arrive at varied heights between 15% and the lava line
   - Early game: platforms spawn every ~1.8 seconds
   - After 20-30 seconds: platforms spawn noticeably faster
   - Sunk platforms disappear once they fall below the lava surface
   - The game is now playable as a survival challenge (but no score yet)
   - Watch the platform count: old ones sink away, new ones slide in

---

## Challenges

**Easy:**
- Make platforms spawn every 1 second from the start (`BASE_SPAWN_INTERVAL = 1000`)
- Increase platform width range to 150-200px for easier gameplay
- Spawn platforms from only one side (always left)

**Medium:**
- Add a platform entrance sound effect
- Make platforms slide in with easing (slow down as they approach target)
- Color newly spawned platforms with a brief green highlight

**Hard:**
- Spawn moving platforms that oscillate horizontally after arriving
- Add "crumbling" platforms that break into pieces instead of sinking
- Implement platform chains — spawning 2-3 platforms at once in a staircase pattern

---

## What You Learned

- Timer-based spawning with variable intervals
- Difficulty curves using `Math.max` clamping
- Per-object animation loops with `requestAnimationFrame`
- Horizontal distribution strategies for spawn placement
- Array filtering for object lifecycle management

**Next:** Timer, score, and final polish!
