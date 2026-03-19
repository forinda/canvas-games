# Step 2: Platforms & Bouncing

**Goal:** Generate a field of platforms, bounce the player when landing on one (only while falling), and scroll the camera upward as the player rises.

**Time:** ~15 minutes

---

## What You'll Build

Building on Step 1:
- **Static platforms**: Green rectangles spread across the screen
- **Auto-bounce**: Player bounces automatically when their feet hit a platform
- **Fall-only collision**: Bouncing only triggers when the player is moving downward
- **Camera scrolling**: The view follows the player upward as they climb

---

## Concepts

- **One-Way Collision**: Only check `player.vy > 0` (falling). This lets the player pass through platforms from below -- a core Doodle Jump mechanic.
- **Camera Offset**: Instead of moving every object, shift the canvas drawing origin with `ctx.translate(0, -cameraY)`. All world positions stay the same; only the viewport moves.
- **Platform Seeding**: Distribute platforms evenly across the screen height at game start, with the first one guaranteed under the player.

---

## Code

### 1. Create the Platform System

**File:** `src/games/doodle-jump/systems/PlatformSystem.ts`

Generate the initial set of platforms and scroll the camera:

```typescript
import type { DoodleState, Platform } from '../types';
import {
  PLATFORM_COUNT,
  PLATFORM_WIDTH,
  PLATFORM_HEIGHT,
} from '../types';

export class PlatformSystem {
  update(state: DoodleState, dt: number): void {
    if (state.phase !== 'playing') return;

    const p = state.player;

    // Scroll camera up when player rises above 40% from top
    const midY = state.cameraY + state.canvasH * 0.4;
    if (p.y < midY) {
      const diff = midY - p.y;
      state.cameraY -= diff;

      // Track max height for score
      const height = -state.cameraY;
      if (height > state.maxHeight) {
        state.maxHeight = height;
        state.score = Math.floor(state.maxHeight / 10);
      }
    }
  }

  /** Generate the initial set of platforms for a new game */
  generateInitial(canvasW: number, canvasH: number): Platform[] {
    const platforms: Platform[] = [];
    const gap = canvasH / PLATFORM_COUNT;

    for (let i = 0; i < PLATFORM_COUNT; i++) {
      const y = canvasH - (i + 1) * gap;

      // First platform is always normal and centered under the player
      if (i === 0) {
        platforms.push({
          x: canvasW / 2 - PLATFORM_WIDTH / 2,
          y: canvasH - 80,
          width: PLATFORM_WIDTH,
          height: PLATFORM_HEIGHT,
          type: 'normal',
          moveVx: 0,
          moveMinX: 0,
          moveMaxX: canvasW,
          broken: false,
          breakVy: 0,
          springTimer: 0,
        });
      } else {
        platforms.push({
          x: Math.random() * (canvasW - PLATFORM_WIDTH),
          y,
          width: PLATFORM_WIDTH,
          height: PLATFORM_HEIGHT,
          type: 'normal',
          moveVx: 0,
          moveMinX: 0,
          moveMaxX: canvasW,
          broken: false,
          breakVy: 0,
          springTimer: 0,
        });
      }
    }

    return platforms;
  }
}
```

The camera logic is the most important part. We pick a threshold at 40% from the top of the screen. Whenever the player rises above that line, we shift `cameraY` down (which is negative in world space -- up means smaller y values). This keeps the player from drifting to the top of the screen.

The score is derived directly from `maxHeight`: every 10 pixels of climb equals 1 point.

---

### 2. Create the Collision System

**File:** `src/games/doodle-jump/systems/CollisionSystem.ts`

Detect when the player's feet land on a platform:

```typescript
import type { DoodleState } from '../types';
import { JUMP_FORCE } from '../types';

export class CollisionSystem {
  update(state: DoodleState, _dt: number): void {
    if (state.phase !== 'playing') return;

    const p = state.player;

    // Only check collisions when falling
    if (p.vy <= 0) return;

    const playerBottom = p.y + p.height;
    const playerLeft = p.x;
    const playerRight = p.x + p.width;

    for (const plat of state.platforms) {
      const platTop = plat.y;
      const platBottom = plat.y + plat.height;
      const platLeft = plat.x;
      const platRight = plat.x + plat.width;

      // Check if player feet are within platform vertical range
      const verticalOverlap =
        playerBottom >= platTop &&
        playerBottom <= platBottom + p.vy * 16;

      // Check horizontal overlap
      const horizontalOverlap =
        playerRight > platLeft &&
        playerLeft < platRight;

      if (verticalOverlap && horizontalOverlap) {
        // Land on platform — snap and bounce
        p.y = platTop - p.height;
        p.vy = JUMP_FORCE;

        // Only land on one platform per frame
        return;
      }
    }
  }
}
```

**Why `p.vy * 16` in the vertical check?** At high speeds the player can fall several pixels per frame. This tolerance prevents the player from phasing through thin platforms. The multiplier of 16 accounts for roughly one frame of travel at typical falling speeds.

The `if (p.vy <= 0) return` guard is what makes this a one-way platform. When the player is moving upward (`vy` is negative), we skip all collision checks entirely. The player passes cleanly through any platform from below.

---

### 3. Update the Game Renderer

**File:** `src/games/doodle-jump/renderers/GameRenderer.ts`

Add platform drawing between the camera transform and the player:

```typescript
import type { DoodleState } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: DoodleState): void {
    // Graph paper background
    this.drawBackground(ctx, state);

    ctx.save();
    // Apply camera translation
    ctx.translate(0, -state.cameraY);

    // Draw platforms
    this.drawPlatforms(ctx, state);

    // Draw player
    this.drawPlayer(ctx, state);

    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D, state: DoodleState): void {
    const { canvasW, canvasH, cameraY } = state;

    ctx.fillStyle = '#faf8ef';
    ctx.fillRect(0, 0, canvasW, canvasH);

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

  private drawPlatforms(ctx: CanvasRenderingContext2D, state: DoodleState): void {
    for (const plat of state.platforms) {
      ctx.save();

      // All platforms are green for now
      ctx.fillStyle = '#4caf50';
      ctx.beginPath();
      ctx.roundRect(plat.x, plat.y, plat.width, plat.height, 4);
      ctx.fill();

      // Top highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(plat.x + 2, plat.y + 1, plat.width - 4, 3);

      // Border
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(plat.x, plat.y, plat.width, plat.height, 4);
      ctx.stroke();

      ctx.restore();
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

    // Body
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

    // Legs
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

Platforms are drawn as rounded rectangles with a subtle highlight on top and a thin border. They sit inside the `ctx.translate(0, -state.cameraY)` block, so they scroll with the world.

---

### 4. Update the Game Engine

**File:** `src/games/doodle-jump/DoodleEngine.ts`

Add the PlatformSystem and CollisionSystem:

```typescript
import type { DoodleState } from './types';
import { PLAYER_WIDTH, PLAYER_HEIGHT } from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { PlatformSystem } from './systems/PlatformSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class DoodleEngine {
  private ctx: CanvasRenderingContext2D;
  private state: DoodleState;
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
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const W = canvas.width;
    const H = canvas.height;

    this.platformSystem = new PlatformSystem();

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
      platforms: this.platformSystem.generateInitial(W, H),
      phase: 'idle',
      score: 0,
      highScore: 0,
      canvasW: W,
      canvasH: H,
      cameraY: 0,
      maxHeight: 0,
    };

    this.physicsSystem = new PhysicsSystem();
    this.collisionSystem = new CollisionSystem();
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
    this.platformSystem.update(this.state, dt);
    this.collisionSystem.update(this.state, dt);
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);
    this.gameRenderer.render(this.ctx, this.state);
  }
}
```

**System ordering matters.** We run physics first (apply gravity and move the player), then the platform system (scroll the camera), then collisions (check if the player landed). If we checked collisions before moving the player, we would be testing against the previous frame's position.

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Doodle Jump"
3. **Observe:**
   - Green platforms spread across the screen
   - Press any key -- the character jumps upward
   - When falling, the character bounces off any platform it lands on
   - Moving upward through a platform from below does not trigger a bounce
   - The camera scrolls upward as you rise, keeping the character in the upper portion of the screen
   - The score increases in the top-left as you climb (we will add the HUD display in Step 5, but the number is tracked internally)

---

## Challenges

**Easy:**
- Change `JUMP_FORCE` to `-0.7` for higher bounces
- Change the camera threshold from `0.4` to `0.5` (player stays more centered)
- Make the platforms wider (change `PLATFORM_WIDTH` to 100)

**Medium:**
- Add a particle burst when the player lands on a platform
- Make the first bounce after idle slightly stronger than subsequent bounces

**Hard:**
- Implement a "sticky" platform that holds the player for 300ms before bouncing
- Add a subtle screen shake when the player lands at high velocity

---

## What You Learned

- One-way platform collision using a velocity direction guard
- Vertical tolerance in collision detection to prevent pass-through at high speeds
- Camera scrolling with `ctx.translate()` -- objects stay in world space, only the viewport moves
- Initial platform generation with guaranteed safe starting position
- System execution order and why it matters for physics accuracy

**Next:** Platform types with different behaviors!
