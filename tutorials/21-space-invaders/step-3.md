# Step 3: Bullet-Alien Collision

**Goal:** Player bullets destroy aliens on contact, track score, and aliens speed up as fewer remain.

**Time:** ~15 minutes

---

## What You'll Build

The game becomes playable:
- **Bullet-alien collision**: When a player bullet overlaps an alien, both are removed
- **Score tracking**: Each destroyed alien adds points (Small=30, Medium=20, Large=10)
- **Score display**: A simple HUD bar at the top shows the current score
- **Speed escalation**: As aliens are destroyed, the remaining ones march faster
- **Level clear detection**: When all aliens are gone, the game recognizes the victory

---

## Concepts

- **AABB Collision Detection**: Two axis-aligned rectangles overlap when all four edge comparisons pass simultaneously
- **Entity Deactivation**: Rather than removing entities from arrays mid-loop, mark them with `alive = false` or `active = false` and filter later
- **Score Accumulation**: Add points on collision, display with canvas text
- **Emergent Difficulty**: The speed multiplier formula from Step 2 naturally makes the game harder as you clear aliens

---

## Code

### 1. Create the Collision System

**File:** `src/games/space-invaders/systems/CollisionSystem.ts`

Check every active player bullet against every alive alien.

```typescript
import type { InvadersState } from '../types';

function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export class CollisionSystem {
  update(state: InvadersState, _dt: number): void {
    if (state.phase !== 'playing') return;

    for (const bullet of state.bullets) {
      if (!bullet.active || !bullet.fromPlayer) continue;

      // ── Off-screen removal ──────────────────────────────────────────
      if (bullet.y + bullet.h < 0) {
        bullet.active = false;
        continue;
      }

      // ── Player bullet vs aliens ─────────────────────────────────────
      for (const alien of state.aliens) {
        if (!alien.alive) continue;
        if (
          rectsOverlap(
            bullet.x, bullet.y, bullet.w, bullet.h,
            alien.x, alien.y, alien.w, alien.h,
          )
        ) {
          alien.alive = false;
          bullet.active = false;
          state.score += alien.points;
          break; // one bullet hits one alien
        }
      }
    }

    // Purge inactive bullets
    state.bullets = state.bullets.filter((b) => b.active);

    // ── Check level clear ─────────────────────────────────────────────
    if (state.aliens.every((a) => !a.alive)) {
      state.phase = 'gameover'; // temporary — we will add wave progression in Step 5
    }
  }
}
```

**What's happening:**
- `rectsOverlap` implements the standard AABB (Axis-Aligned Bounding Box) test: two rectangles overlap when neither is fully to the left, right, above, or below the other.
- When a hit is detected, both the alien and bullet are deactivated. The `break` ensures one bullet does not destroy multiple aliens in the same frame.
- After processing, inactive bullets are purged from the array to prevent memory growth.
- For now, clearing all aliens triggers `'gameover'`. We will replace this with proper wave progression in Step 5.

---

### 2. Create the HUD Renderer

**File:** `src/games/space-invaders/renderers/HUDRenderer.ts`

Display the current score on a dark bar at the top.

```typescript
import type { InvadersState } from '../types';
import { HUD_HEIGHT } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: InvadersState): void {
    // ── Top bar background ──────────────────────────────────────────────
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, state.canvasW, HUD_HEIGHT);

    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.textBaseline = 'middle';

    const midY = HUD_HEIGHT / 2;

    // Score (left-aligned)
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${state.score}`, 12, midY);

    // ── Game over overlay ───────────────────────────────────────────────
    if (state.phase === 'gameover') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(0, 0, state.canvasW, state.canvasH);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 36px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GAME OVER', state.canvasW / 2, state.canvasH / 2);
    }
  }
}
```

**What's happening:**
- The HUD is a 36px tall dark bar across the top. The score is drawn with monospace font so numbers do not shift as they change width.
- The game-over overlay draws a semi-transparent black rectangle over everything, then centers "GAME OVER" text. This simple approach works because the HUD renders after the game renderer.

---

### 3. Update the Engine

**File:** `src/games/space-invaders/InvadersEngine.ts`

Add the collision system and HUD renderer to the loop.

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
import { buildFormation } from './data/formations';
import { InputSystem } from './systems/InputSystem';
import { PlayerSystem } from './systems/PlayerSystem';
import { AlienSystem } from './systems/AlienSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class InvadersEngine {
  private ctx: CanvasRenderingContext2D;
  private state: InvadersState;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private playerSystem = new PlayerSystem();
  private alienSystem = new AlienSystem();
  private collisionSystem = new CollisionSystem();
  private gameRenderer = new GameRenderer();
  private hudRenderer = new HUDRenderer();

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
      aliens: buildFormation(CANVAS_W),
      bullets: [],
      alienDir: 1,
      alienSpeedMultiplier: 1,
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

    this.inputSystem.poll(this.state);

    // Update systems
    this.playerSystem.update(this.state, dt);
    this.alienSystem.update(this.state, dt);

    // Move bullets
    for (const b of this.state.bullets) {
      b.y += b.vy * dt;
    }

    // Collision detection (after bullet movement)
    this.collisionSystem.update(this.state, dt);

    // Render
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(this.loop);
  };
}
```

**What's happening:**
- The collision system runs after bullets have moved, so it checks positions at the end of the frame. This avoids bullets visually overlapping aliens for one frame before the collision registers.
- The HUD renderer runs last, so it draws on top of everything else. The game-over overlay covers the entire scene.
- System order matters: input -> player -> aliens -> bullet movement -> collision -> render.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Space Invaders game
3. **Observe:**
   - The score reads `SCORE: 0` in the top-left on a dark bar
   - Fire at the aliens -- bullets now destroy them on contact
   - Each destroyed alien increases the score: blue=10, green=20, red=30
   - As you destroy aliens, the remaining ones visibly speed up
   - Clearing all 55 aliens shows "GAME OVER" (we will fix this to mean "victory" in Step 5)
   - If aliens reach the bottom, you also see "GAME OVER"

**Try clearing the bottom rows first.** The top-row red aliens are worth the most points, but the bottom aliens are closest to you. Notice how the speed ramps up dramatically when only a few aliens remain -- the last 5 aliens zip across the screen at 3-4x speed.

---

## Challenges

**Easy:**
- Display the number of remaining aliens next to the score: `SCORE: 120 | ALIENS: 47`.
- Change the alien point values so all types are worth 10 points.
- Make destroyed aliens flash white for one frame before disappearing (set a `flashTimer` field).

**Medium:**
- Add a hit counter: track consecutive hits without missing and display a combo multiplier (2x, 3x, etc.).
- Play a screen shake effect when the last alien on a row is destroyed (offset the canvas translate by a random amount for 0.1 seconds).

**Hard:**
- Implement piercing bullets that pass through one alien and can hit a second one behind it.
- Add an explosion particle effect: when an alien dies, spawn 8 small colored squares that fly outward and fade.

---

## What You Learned

- AABB rectangle collision detection with the four-comparison overlap test
- Deactivating entities with boolean flags and filtering them out after the loop
- Score tracking on collision with per-type point values
- HUD rendering with `fillText` over a dark bar
- Game-over overlay with semi-transparent backdrop
- Observing emergent difficulty from the speed multiplier formula

**Next:** Aliens fight back with their own bullets, and shields protect you!
