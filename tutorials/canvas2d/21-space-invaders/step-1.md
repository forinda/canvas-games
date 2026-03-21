# Step 1: Player Ship & Movement

**Goal:** Draw a player ship at the bottom of the screen with left/right keyboard movement and upward bullet firing.

**Time:** ~15 minutes

---

## What You'll Build

The foundation of your Space Invaders game:
- **Black game canvas**: 800x600 fixed-size arena
- **Player ship**: A green rectangle with a turret, sitting near the bottom
- **Keyboard movement**: Left/Right arrow keys move the ship horizontally
- **Shooting**: Press Space to fire white bullets upward
- **Shoot cooldown**: Prevents bullet spam with a 0.4-second delay between shots
- **Delta-time movement**: Consistent speed regardless of frame rate

---

## Concepts

- **Keyboard State Tracking**: Use a `Set<string>` to track which keys are currently held, allowing smooth continuous movement
- **Single-Fire Detection**: Track Space presses separately so each tap fires exactly one bullet
- **Shoot Cooldown**: A timer counts down each frame; shooting is blocked until it reaches zero
- **Bullet Management**: Bullets are stored in an array, move upward each frame, and are removed when off-screen

---

## Code

### 1. Create the Types File

**File:** `src/contexts/canvas2d/games/space-invaders/types.ts`

Define the constants and interfaces for the player, bullets, and game state. We will add alien types, shields, and UFO in later steps, but laying out the full shape now makes future additions easier.

```typescript
// ── Constants ──────────────────────────────────────────────────────────────

export const CANVAS_W = 800;
export const CANVAS_H = 600;

export const PLAYER_W = 40;
export const PLAYER_H = 20;
export const PLAYER_SPEED = 300; // px / s
export const PLAYER_SHOOT_COOLDOWN = 0.4; // seconds

export const BULLET_W = 4;
export const BULLET_H = 12;
export const PLAYER_BULLET_SPEED = -450; // negative = up

// ── Entity types ───────────────────────────────────────────────────────────

export interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  shootCooldown: number;
  cooldownLeft: number;
}

export interface Bullet {
  x: number;
  y: number;
  w: number;
  h: number;
  vy: number;
  fromPlayer: boolean;
  active: boolean;
}

// ── Aggregate game state ───────────────────────────────────────────────────

export type GamePhase = 'playing' | 'gameover';

export interface InvadersState {
  phase: GamePhase;
  player: Player;
  bullets: Bullet[];

  score: number;

  // Input snapshot written by InputSystem, read by other systems
  input: {
    left: boolean;
    right: boolean;
    shoot: boolean;
  };

  canvasW: number;
  canvasH: number;
}
```

**What's happening:**
- `PLAYER_BULLET_SPEED` is negative because the Y axis points downward in canvas, so negative means "up."
- `Bullet.fromPlayer` distinguishes player bullets from alien bullets that we will add later.
- `input` acts as a per-frame snapshot: the input system writes it, other systems read it.

---

### 2. Create the Input System

**File:** `src/contexts/canvas2d/games/space-invaders/systems/InputSystem.ts`

Capture held keys for continuous movement and single-press events for shooting.

```typescript
import type { InvadersState } from '../types';

export class InputSystem {
  private keys = new Set<string>();
  private shootPressed = false;

  private onKeyDown = (e: KeyboardEvent) => {
    if (['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    this.keys.add(e.key);
    if (e.key === ' ') this.shootPressed = true;
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key);
  };

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.keys.clear();
  }

  /** Write current input snapshot into state. Call once per frame. */
  poll(state: InvadersState): void {
    state.input.left = this.keys.has('ArrowLeft');
    state.input.right = this.keys.has('ArrowRight');
    state.input.shoot = this.shootPressed;
    // Consume single-fire flag so one press = one bullet
    this.shootPressed = false;
  }
}
```

**What's happening:**
- `keys` is a `Set` of currently held keys. Holding ArrowLeft keeps it in the set; releasing removes it.
- `shootPressed` is a flag that gets set on keydown and consumed after one `poll()`. This prevents holding Space from firing every frame.
- `preventDefault` stops the browser from scrolling when you press Space or arrow keys.

---

### 3. Create the Player System

**File:** `src/contexts/canvas2d/games/space-invaders/systems/PlayerSystem.ts`

Move the ship and handle shooting.

```typescript
import type { InvadersState } from '../types';
import { PLAYER_BULLET_SPEED, BULLET_W, BULLET_H } from '../types';

export class PlayerSystem {
  update(state: InvadersState, dt: number): void {
    if (state.phase !== 'playing') return;

    const { player, input } = state;

    // ── Movement ────────────────────────────────────────────────────────
    if (input.left) {
      player.x -= player.speed * dt;
    }
    if (input.right) {
      player.x += player.speed * dt;
    }

    // Clamp to canvas bounds
    if (player.x < 0) player.x = 0;
    if (player.x + player.w > state.canvasW) {
      player.x = state.canvasW - player.w;
    }

    // ── Shooting ────────────────────────────────────────────────────────
    player.cooldownLeft -= dt;
    if (player.cooldownLeft < 0) player.cooldownLeft = 0;

    if (input.shoot && player.cooldownLeft <= 0) {
      state.bullets.push({
        x: player.x + player.w / 2 - BULLET_W / 2,
        y: player.y - BULLET_H,
        w: BULLET_W,
        h: BULLET_H,
        vy: PLAYER_BULLET_SPEED,
        fromPlayer: true,
        active: true,
      });
      player.cooldownLeft = player.shootCooldown;
    }
  }
}
```

**What's happening:**
- Movement multiplies speed by `dt` for frame-rate independence. At 300 px/s, the ship crosses the 800px canvas in about 2.7 seconds.
- The ship is clamped so it never leaves the canvas on either side.
- A bullet spawns centered above the turret. The cooldown timer resets to 0.4 seconds, blocking the next shot until it counts down.

---

### 4. Create the Game Renderer

**File:** `src/contexts/canvas2d/games/space-invaders/renderers/GameRenderer.ts`

Draw the background, player ship, and bullets.

```typescript
import type { InvadersState } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: InvadersState): void {
    // ── Clear ───────────────────────────────────────────────────────────
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, state.canvasW, state.canvasH);

    // ── Player ──────────────────────────────────────────────────────────
    const p = state.player;
    ctx.fillStyle = '#00ff88';
    // Body
    ctx.fillRect(p.x, p.y + 6, p.w, p.h - 6);
    // Turret
    ctx.fillRect(p.x + p.w / 2 - 3, p.y, 6, 8);

    // ── Bullets ─────────────────────────────────────────────────────────
    for (const b of state.bullets) {
      if (!b.active) continue;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
  }
}
```

**What's happening:**
- The player ship is two rectangles: a wide body and a narrow turret on top. This gives the classic Space Invaders cannon silhouette.
- Bullets are drawn as small white rectangles.
- We clear to black every frame, matching the original arcade aesthetic.

---

### 5. Create the Engine

**File:** `src/contexts/canvas2d/games/space-invaders/InvadersEngine.ts`

Wire the systems and renderer into a game loop.

```typescript
import type { InvadersState } from './types';
import {
  CANVAS_W,
  CANVAS_H,
  PLAYER_W,
  PLAYER_H,
  PLAYER_SPEED,
  PLAYER_SHOOT_COOLDOWN,
} from './types';
import { InputSystem } from './systems/InputSystem';
import { PlayerSystem } from './systems/PlayerSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class InvadersEngine {
  private ctx: CanvasRenderingContext2D;
  private state: InvadersState;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private playerSystem = new PlayerSystem();
  private gameRenderer = new GameRenderer();

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    this.ctx = canvas.getContext('2d')!;

    this.inputSystem = new InputSystem();

    this.state = {
      phase: 'playing',
      player: {
        x: CANVAS_W / 2 - PLAYER_W / 2,
        y: CANVAS_H - 40,
        w: PLAYER_W,
        h: PLAYER_H,
        speed: PLAYER_SPEED,
        shootCooldown: PLAYER_SHOOT_COOLDOWN,
        cooldownLeft: 0,
      },
      bullets: [],
      score: 0,
      input: { left: false, right: false, shoot: false },
      canvasW: CANVAS_W,
      canvasH: CANVAS_H,
    };
  }

  start(): void {
    this.inputSystem.attach();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
  }

  private loop = (now: number): void => {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    // Poll input
    this.inputSystem.poll(this.state);

    // Update
    this.playerSystem.update(this.state, dt);

    // Move bullets
    for (const b of this.state.bullets) {
      b.y += b.vy * dt;
    }
    // Remove off-screen bullets
    this.state.bullets = this.state.bullets.filter(
      (b) => b.active && b.y + b.h > 0 && b.y < this.state.canvasH,
    );

    // Render
    this.gameRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(this.loop);
  };
}
```

**What's happening:**
- The canvas is set to a fixed 800x600 rather than fullscreen. This gives consistent gameplay and matches the original arcade resolution.
- `dt` is clamped to 50ms maximum to prevent physics explosions after a tab switch.
- Bullets move in the loop and are filtered out when they leave the screen. In later steps, we will move bullet logic into a dedicated collision system.
- The loop order is: poll input, update systems, render.

---

### 6. Create the Entry Point

**File:** `src/contexts/canvas2d/games/space-invaders/index.ts`

Export a factory function so the game launcher can start the game.

```typescript
import { InvadersEngine } from './InvadersEngine';

export function createSpaceInvaders(
  canvas: HTMLCanvasElement,
): { destroy: () => void } {
  const engine = new InvadersEngine(canvas);
  engine.start();
  return { destroy: () => engine.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Space Invaders game
3. **Observe:**
   - Black background filling the 800x600 canvas
   - Green ship with a turret at the bottom-center
   - Left/Right arrows move the ship smoothly
   - Press Space to fire white bullets upward
   - Bullets disappear when they leave the top of the screen
   - Holding Space fires one bullet per press, not a stream
   - Rapid tapping fires at most one bullet every 0.4 seconds

**Try holding both Left and Right arrows simultaneously.** The forces cancel out and the ship stays still. This is correct behavior since we subtract and add the same amount.

---

## Challenges

**Easy:**
- Change the ship color from green to cyan (`#00ffff`).
- Make the bullet speed faster by changing `PLAYER_BULLET_SPEED` to `-600`.
- Make the ship wider (60px) and adjust the turret position to stay centered.

**Medium:**
- Limit the player to 3 bullets on screen at once (check `state.bullets.length` before spawning).
- Add a muzzle flash: draw a small yellow circle at the turret tip for 0.05 seconds after firing.

**Hard:**
- Add a trailing glow behind each bullet (draw 3 progressively fainter rectangles below the bullet).
- Implement keyboard acceleration: the ship starts slow and reaches full speed after 0.2 seconds of holding the key.

---

## What You Learned

- Keyboard state tracking with a `Set<string>` for continuous held-key movement
- Single-press detection with a consumed flag for shooting
- Cooldown timers to rate-limit actions
- Bullet spawning and off-screen cleanup
- Drawing a multi-part ship with basic `fillRect` calls
- Delta-time game loop with `requestAnimationFrame`

**Next:** Building the 5x11 alien grid with side-to-side marching!
