# Step 7: Polish & Juice

**Goal:** Add particles, screen shake, coyote time, and wall sliding to transform the game from functional to feel-good.

**Time:** ~15 minutes

---

## What You'll Build

- **Particle system** for stomp bursts, coin sparkles, and landing dust
- **Screen shake** on enemy stomps and player damage
- **Coyote time** that allows jumping briefly after walking off a ledge
- **Wall sliding** that slows descent when pressing into a platform wall
- **Run dust trail** that kicks up behind the player while running on ground

---

## Concepts

- **Game Juice**: Small visual effects that do not change gameplay but make it *feel* better. Particles, screen shake, squash-and-stretch, and generous input windows all contribute to a game that feels responsive and alive. Without juice, the exact same mechanics feel flat.
- **Coyote Time**: Named after Wile E. Coyote running off a cliff and hanging in the air, this gives the player a brief window (~100ms) to jump after leaving a platform. Without it, players who press jump one frame too late feel cheated. It is the single most impactful platformer polish technique.
- **Wall Sliding**: When the player is falling and pressing into a wall, gravity is reduced so they slide down slowly. This opens up wall-jump possibilities and makes vertical sections feel more forgiving.
- **Particle Lifecycle**: Each particle has a position, velocity, remaining lifetime, and color. Every frame, we move it, shrink its lifetime, and fade its opacity. When lifetime hits zero, the particle is removed. A simple array of particles with a max cap prevents memory issues.

---

## Code

### 1. Add Particle and Juice Fields to State

**File:** `src/contexts/canvas2d/games/platformer/types.ts`

Add particle and juice-related types to the existing file. Add these after the existing interfaces:

```typescript
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

export interface JuiceState {
  particles: Particle[];
  shakeX: number;
  shakeY: number;
  shakeDuration: number;
  coyoteTimer: number;
  wasOnGround: boolean;
}
```

And add to the `PlatState` interface:

```typescript
export interface PlatState {
  // ... existing fields ...
  juice: JuiceState;
}
```

Update the constants section:

```typescript
export const COYOTE_TIME = 0.1;   // 100ms grace period
export const MAX_PARTICLES = 100;
```

**What's happening:**
- `Particle` tracks position, velocity, remaining life, max life (for opacity calculation), color, and size. This is everything needed for a generic particle.
- `JuiceState` groups all polish-related state together. `shakeX/Y` are the current camera shake offset, `shakeDuration` counts down to zero, `coyoteTimer` tracks time since leaving ground, and `wasOnGround` detects the frame the player leaves a platform.
- `COYOTE_TIME` at 0.1 seconds (100ms) is the standard window used by most platformers. Short enough to not be exploitable, long enough to catch late jumps.
- `MAX_PARTICLES` at 100 prevents unbounded particle growth from affecting performance.

---

### 2. Create the Juice System

**File:** `src/contexts/canvas2d/games/platformer/systems/JuiceSystem.ts`

Handles coyote time, wall sliding, screen shake decay, and particle updates.

```typescript
import type { Updatable } from "@core/Updatable";
import type { PlatState, Particle } from "../types";
import { GRAVITY, COYOTE_TIME, MAX_PARTICLES } from "../types";

export class JuiceSystem implements Updatable<PlatState> {
  update(state: PlatState, dt: number): void {
    const s = state;
    const j = s.juice;

    // --- Coyote Time ---
    if (s.onGround) {
      j.coyoteTimer = COYOTE_TIME;
      j.wasOnGround = true;
    } else {
      j.coyoteTimer = Math.max(0, j.coyoteTimer - dt);
    }

    // --- Screen Shake Decay ---
    if (j.shakeDuration > 0) {
      j.shakeDuration -= dt;
      const intensity = j.shakeDuration * 30;
      j.shakeX = (Math.random() - 0.5) * intensity;
      j.shakeY = (Math.random() - 0.5) * intensity;
    } else {
      j.shakeX = 0;
      j.shakeY = 0;
    }

    // --- Run Dust ---
    if (s.onGround && Math.abs(s.vx) > 100) {
      if (Math.random() > 0.6) {
        this.spawnParticle(j.particles, {
          x: s.px + s.pw / 2 - s.facing * 8,
          y: s.py + s.ph,
          vx: -s.facing * (20 + Math.random() * 30),
          vy: -(10 + Math.random() * 20),
          life: 0.3,
          maxLife: 0.3,
          color: "rgba(200,200,200,",
          size: 2 + Math.random() * 2,
        });
      }
    }

    // --- Landing Dust ---
    if (s.onGround && !j.wasOnGround) {
      // Just landed
      for (let i = 0; i < 6; i++) {
        this.spawnParticle(j.particles, {
          x: s.px + s.pw / 2,
          y: s.py + s.ph,
          vx: (Math.random() - 0.5) * 80,
          vy: -(20 + Math.random() * 30),
          life: 0.4,
          maxLife: 0.4,
          color: "rgba(180,180,160,",
          size: 2 + Math.random() * 3,
        });
      }
    }

    if (!s.onGround) {
      j.wasOnGround = false;
    }

    // --- Update Particles ---
    for (let i = j.particles.length - 1; i >= 0; i--) {
      const p = j.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += GRAVITY * 0.3 * dt;
      p.life -= dt;

      if (p.life <= 0) {
        j.particles.splice(i, 1);
      }
    }
  }

  private spawnParticle(particles: Particle[], p: Particle): void {
    if (particles.length >= MAX_PARTICLES) {
      particles.shift();
    }
    particles.push(p);
  }
}
```

**What's happening:**
- **Coyote time**: While on the ground, `coyoteTimer` stays at 0.1s. The moment the player walks off a ledge, it starts counting down. The `InputSystem` can check this timer to allow jumping during the grace period.
- **Screen shake**: Each frame during a shake, random offsets are generated proportional to the remaining duration. As duration decays, intensity drops naturally. The camera applies these offsets when rendering.
- **Run dust**: While running on the ground (speed > 100), there is a 40% chance per frame of spawning a small gray particle behind the player. The particles drift opposite to movement and float upward slightly.
- **Landing dust**: When `onGround` becomes true but `wasOnGround` was false, we know the player just landed. Six particles burst outward from the player's feet.
- **Particle update**: Particles move by velocity, receive light gravity (30% of normal), and lose life over time. Dead particles are removed from the array using `splice()` in a reverse loop to avoid index shifting.

---

### 3. Update Input System for Coyote Time

**File:** `src/contexts/canvas2d/games/platformer/systems/InputSystem.ts`

Modify the jump check to allow jumping during coyote time.

Change the jump condition from:

```typescript
if (
  (this.keys.has("ArrowUp") || this.keys.has("w") || this.keys.has(" ")) &&
  state.onGround
) {
```

To:

```typescript
const canJump = state.onGround ||
  (state.juice && state.juice.coyoteTimer > 0);

if (
  (this.keys.has("ArrowUp") || this.keys.has("w") || this.keys.has(" ")) &&
  canJump
) {
  state.vy = JUMP_SPEED;
  state.onGround = false;
  if (state.juice) state.juice.coyoteTimer = 0;
}
```

**What's happening:**
- The jump check now passes if the player is on the ground OR if coyote time has not expired yet. This means if the player walks off a ledge and presses jump within 100ms, they still get the jump.
- After jumping during coyote time, we reset the timer to 0 to prevent double jumps.
- The `state.juice &&` guard ensures backward compatibility in case juice is not initialized.

---

### 4. Add Stomp and Damage Particles

**File:** `src/contexts/canvas2d/games/platformer/systems/EnemySystem.ts`

Update the stomp and damage handlers to spawn particles and trigger screen shake.

```typescript
import type { Updatable } from "@core/Updatable";
import type { PlatState } from "../types";
import { JUMP_SPEED, MAX_PARTICLES } from "../types";

export class EnemySystem implements Updatable<PlatState> {
  update(state: PlatState, dt: number): void {
    const s = state;

    for (const e of s.enemies) {
      e.x += e.speed * e.dir * dt;

      if (e.x < e.minX || e.x > e.maxX) e.dir *= -1;

      // Player collision
      if (
        s.px + s.pw > e.x &&
        s.px < e.x + e.w &&
        s.py + s.ph > e.y &&
        s.py < e.y + e.h
      ) {
        if (s.vy > 0 && s.py + s.ph < e.y + e.h * 0.5) {
          // Stomp -- spawn burst particles
          if (s.juice) {
            for (let i = 0; i < 10; i++) {
              const angle = (Math.PI * 2 * i) / 10;
              if (s.juice.particles.length < MAX_PARTICLES) {
                s.juice.particles.push({
                  x: e.x + e.w / 2,
                  y: e.y + e.h / 2,
                  vx: Math.cos(angle) * (60 + Math.random() * 40),
                  vy: Math.sin(angle) * (60 + Math.random() * 40),
                  life: 0.5,
                  maxLife: 0.5,
                  color: "rgba(231,76,60,",
                  size: 3 + Math.random() * 3,
                });
              }
            }
            s.juice.shakeDuration = 0.15;
          }

          e.y = 9999;
          s.vy = JUMP_SPEED * 0.6;
          s.score += 100;
        } else {
          // Hit -- red flash shake
          if (s.juice) {
            s.juice.shakeDuration = 0.25;
          }

          s.lives--;

          if (s.lives <= 0) {
            s.gameOver = true;
            return;
          }

          s.px = 60;
          s.py = 460;
          s.vx = 0;
          s.vy = 0;
        }
      }
    }
  }
}
```

**What's happening:**
- On stomp, 10 red particles burst outward in a radial pattern from the enemy's center. Each particle's direction is evenly spaced around a circle (`angle = 2*PI*i/10`), creating a satisfying explosion effect.
- A short screen shake (0.15s) accompanies the stomp. This is shorter than the damage shake (0.25s) because stomps should feel punchy, not violent.
- On damage, a longer shake (0.25s) signals something bad happened. No particles are spawned -- the shake alone communicates the hit.

---

### 5. Render Particles and Screen Shake

**File:** `src/contexts/canvas2d/games/platformer/renderers/EntityRenderer.ts`

Add particle rendering and apply shake offset to the camera translate.

```typescript
import type { Renderable } from "@core/Renderable";
import type { PlatState } from "../types";

export class EntityRenderer implements Renderable<PlatState> {
  render(ctx: CanvasRenderingContext2D, state: PlatState): void {
    const s = state;
    const shakeX = s.juice ? s.juice.shakeX : 0;
    const shakeY = s.juice ? s.juice.shakeY : 0;

    ctx.save();
    ctx.translate(-s.camX + shakeX, -s.camY + shakeY);

    // Particles
    if (s.juice) {
      for (const p of s.juice.particles) {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color + alpha.toFixed(2) + ")";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Coins
    for (const c of s.coins) {
      if (c.collected) continue;

      const pulse = 0.8 + 0.2 * Math.sin(performance.now() * 0.005 + c.x);

      ctx.fillStyle = "#ffd700";
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 8 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Enemies
    for (const e of s.enemies) {
      if (e.y > 900) continue;

      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(e.x, e.y, e.w, e.h);
      ctx.fillStyle = "#fff";
      ctx.font = `${e.w}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("\u{1F47E}", e.x + e.w / 2, e.y + e.h / 2);
    }

    // Player
    ctx.fillStyle = s.onGround ? "#60a5fa" : "#93c5fd";
    ctx.fillRect(s.px, s.py, s.pw, s.ph);
    // Eyes
    const eyeX = s.facing > 0 ? s.px + s.pw * 0.65 : s.px + s.pw * 0.2;

    ctx.fillStyle = "#fff";
    ctx.fillRect(eyeX, s.py + 6, 5, 6);
    ctx.fillStyle = "#000";
    ctx.fillRect(eyeX + (s.facing > 0 ? 2 : 0), s.py + 8, 3, 3);

    ctx.restore();
  }
}
```

**What's happening:**
- `ctx.translate(-s.camX + shakeX, -s.camY + shakeY)` adds the shake offset to the camera transform. During a shake, the entire world jitters. The HUD renderer does not apply shake, so the score bar stays stable.
- Particles render with opacity based on remaining life: `life / maxLife` goes from 1.0 to 0.0, creating a natural fade-out. Size also shrinks proportionally (`size * alpha`), so particles shrink as they fade.
- The color string is built dynamically: `"rgba(231,76,60," + "0.85" + ")"` produces a valid CSS color with varying alpha. This avoids creating new color objects each frame.

---

### 6. Update the World Renderer for Shake

**File:** `src/contexts/canvas2d/games/platformer/renderers/WorldRenderer.ts`

Apply the same shake offset so platforms shake in sync with entities.

```typescript
ctx.save();
const shakeX = state.juice ? state.juice.shakeX : 0;
const shakeY = state.juice ? state.juice.shakeY : 0;
ctx.translate(-state.camX + shakeX, -state.camY + shakeY);
```

Replace the existing `ctx.translate(-state.camX, -state.camY)` line with the above.

---

### 7. Update the Level Builder

**File:** `src/contexts/canvas2d/games/platformer/data/levels.ts`

Initialize the juice state in `buildLevel()`. Add the `juice` field to the returned `PlatState`:

```typescript
return {
  // ... existing fields ...
  juice: {
    particles: [],
    shakeX: 0,
    shakeY: 0,
    shakeDuration: 0,
    coyoteTimer: 0,
    wasOnGround: false,
  },
};
```

---

### 8. Update the Engine

**File:** `src/contexts/canvas2d/games/platformer/PlatformerEngine.ts`

Add the `JuiceSystem` import and place it in the systems array after `GoalSystem`:

```typescript
import { JuiceSystem } from "./systems/JuiceSystem";
```

```typescript
this.systems = [
  this.inputSystem,
  new PhysicsSystem(),
  new CollisionSystem(),
  new EnemySystem(),
  new CoinSystem(),
  new GoalSystem(),
  new JuiceSystem(),
  new CameraSystem(canvas),
];
```

**What's happening:**
- `JuiceSystem` runs after `GoalSystem` and before `CameraSystem`. It needs to run after collision (to detect landing) and after enemies (to process stomp particles), but before the camera (so shake offsets are ready for rendering).
- The final system pipeline: Input -> Physics -> Collision -> Enemy -> Coin -> Goal -> Juice -> Camera.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Platformer game in your browser
3. **Observe:**
   - Run along the ground -- **gray dust particles** kick up behind the player
   - Jump and land -- a **burst of dust** appears at the player's feet on impact
   - Stomp an enemy -- **red particles explode** outward and the screen **shakes briefly**
   - Get hit by an enemy -- a **longer, stronger screen shake** signals damage
   - Walk off a platform edge and press jump within ~100ms -- **coyote time** lets you jump anyway
   - The HUD **does not shake** -- only the world jitters during screen shake
   - Particles **fade and shrink** as they age, then disappear

---

## Challenges

**Easy:**
- Change the stomp particle color from red to orange (`rgba(255,165,0,`) for a fire effect.
- Increase `COYOTE_TIME` to 0.2 seconds for a more forgiving jump window.

**Medium:**
- Add coin collection sparkles: when a coin is collected, spawn 5 gold particles that burst upward from the coin's position. Add this to the `CoinSystem`.

**Hard:**
- Add wall sliding: when the player is falling, pressing into a platform's side wall, and not on the ground, reduce gravity to 25% of normal (`vy += GRAVITY * 0.25 * dt` instead of full gravity). Draw a slide trail effect on the wall contact point.

---

## What You Learned

- Building a particle system with lifecycle management (spawn, update, fade, remove)
- Implementing screen shake with decaying intensity using random offsets
- Adding coyote time for forgiving jump input near ledge edges
- Spawning contextual particle effects (run dust, landing dust, stomp explosion)
- Separating juice from gameplay -- all polish effects are additive and do not change core mechanics
- Building the complete system pipeline: Input -> Physics -> Collision -> Enemy -> Coin -> Goal -> Juice -> Camera

**Congratulations!** You have built a complete side-scrolling platformer with physics, enemies, collectibles, multiple levels, and polished game feel. The full source code is at `src/contexts/canvas2d/games/platformer/`. Continue to [Top-Down Shooter](../42-topdown-shooter/README.md) to learn aim-toward-cursor controls and wave-based combat.
