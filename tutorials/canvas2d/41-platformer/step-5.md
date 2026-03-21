# Step 5: Collectibles & Score

**Goal:** Add golden coins floating above platforms that the player can collect for points, with pulsing animations and glow effects.

**Time:** ~15 minutes

---

## What You'll Build

- **Coin system** that detects proximity-based collection
- **Pulsing coin animation** with sine-wave scaling
- **Glow effect** using canvas shadow blur
- **Score integration** that awards 50 points per coin
- **Collection flag** so coins disappear permanently once grabbed

---

## Concepts

- **Proximity Detection vs AABB**: Instead of full rectangle collision, coins use simple distance checks: `Math.abs(dx) < 20 && Math.abs(dy) < 20`. This creates a generous "pick-up radius" that feels forgiving. Since coins are circular and small, pixel-perfect collision is unnecessary.
- **Sine-Wave Animation**: `0.8 + 0.2 * Math.sin(performance.now() * 0.005 + c.x)` produces a pulsing scale between 0.6 and 1.0. The `+ c.x` offset means each coin pulses at a different phase, so they do not all throb in sync.
- **Canvas Shadow Glow**: Setting `ctx.shadowColor` and `ctx.shadowBlur` before drawing a shape creates a soft glow halo around it. Resetting `shadowBlur = 0` afterward prevents the glow from leaking into subsequent draw calls.
- **Boolean Flag Pattern**: Each coin has a `collected` boolean. Once set to `true`, the coin system skips it and the renderer stops drawing it. This is simpler than removing items from an array.

---

## Code

### 1. Create the Coin System

**File:** `src/contexts/canvas2d/games/platformer/systems/CoinSystem.ts`

Checks distance between the player center and each coin. Collects coins within range.

```typescript
import type { Updatable } from "@core/Updatable";
import type { PlatState } from "../types";

export class CoinSystem implements Updatable<PlatState> {
  update(state: PlatState, _dt: number): void {
    const s = state;

    for (const c of s.coins) {
      if (c.collected) continue;

      const dx = s.px + s.pw / 2 - c.x;
      const dy = s.py + s.ph / 2 - c.y;

      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
        c.collected = true;
        s.score += 50;
      }
    }
  }
}
```

**What's happening:**
- For each uncollected coin, we compute the distance from the player's center (`px + pw/2`, `py + ph/2`) to the coin's position.
- If both `dx` and `dy` are within 20 pixels, the coin is collected. This 20px radius means the player does not need to overlap the coin exactly -- just get close. This feels generous and fun.
- Setting `collected = true` permanently marks the coin. The `continue` at the top skips collected coins, so the check costs nothing for already-grabbed coins.
- Each coin awards 50 points, reflected immediately in the HUD score display.

---

### 2. Update the Entity Renderer

**File:** `src/contexts/canvas2d/games/platformer/renderers/EntityRenderer.ts`

Add coin rendering with pulse animation and glow effect, before the enemy and player draws.

```typescript
import type { Renderable } from "@core/Renderable";
import type { PlatState } from "../types";

export class EntityRenderer implements Renderable<PlatState> {
  render(ctx: CanvasRenderingContext2D, state: PlatState): void {
    const s = state;

    ctx.save();
    ctx.translate(-s.camX, -s.camY);

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
- Coins are drawn as filled circles using `ctx.arc()`. The radius oscillates between 6.4px and 8px thanks to the sine-wave `pulse` multiplier.
- `ctx.shadowColor = "#ffd700"` and `ctx.shadowBlur = 8` create a golden glow halo around each coin. This makes them visually pop against the dark background.
- `ctx.shadowBlur = 0` is reset immediately after drawing coins. Without this, the glow would apply to enemies and the player too.
- Coins render first (behind enemies and the player) so they sit naturally on platforms.
- The `+ c.x` in the sine offset means coins placed at different x positions pulse at different times, creating a shimmering wave effect across the level.

---

### 3. Update the Engine

**File:** `src/contexts/canvas2d/games/platformer/PlatformerEngine.ts`

Add the `CoinSystem` to the systems array, after `EnemySystem`.

Add this import at the top:

```typescript
import { CoinSystem } from "./systems/CoinSystem";
```

And update the systems array in the constructor:

```typescript
this.systems = [
  this.inputSystem,
  new PhysicsSystem(),
  new CollisionSystem(),
  new EnemySystem(),
  new CoinSystem(),
  new CameraSystem(canvas),
];
```

**What's happening:**
- `CoinSystem` runs after `EnemySystem` and before `CameraSystem`. The order here is less critical than for physics/collision since coins do not affect player movement, but placing it before the camera ensures the score updates before the frame renders.
- The system pipeline is now six systems deep: Input -> Physics -> Collision -> Enemy -> Coin -> Camera.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Platformer game in your browser
3. **Observe:**
   - **Golden coins** float above most platforms, pulsing with a soft glow
   - Each coin pulses at a **different rate** (offset by position)
   - Run near a coin -- it **disappears** when you get within ~20 pixels
   - The **score increases by 50** for each coin collected (visible in the HUD)
   - Coins on **moving platforms** stay in their original position (they do not move with the platform)
   - Collected coins **stay gone** -- they do not reappear

---

## Challenges

**Easy:**
- Change the coin value from 50 to 25 and the coin radius from 8 to 6 for smaller, less valuable coins.
- Change the coin color from gold (`#ffd700`) to green (`#00ff88`) for an emerald gem variant.

**Medium:**
- Add a spinning animation: instead of pulsing the radius, draw the coin as an ellipse whose horizontal radius oscillates (`ctx.ellipse()` with a varying x-radius), making it look like a spinning coin viewed from the side.

**Hard:**
- Add a "coin magnet" power-up: when collected, all coins within 150px of the player are automatically attracted toward the player for 5 seconds. Animate them moving toward the player using lerp.

---

## What You Learned

- Using proximity-based collection with distance checks instead of AABB collision
- Creating pulsing animations with `Math.sin()` and time-based offsets
- Applying canvas shadow blur for glow effects and cleaning it up afterward
- Using boolean flags to track collected state without array mutation
- Integrating a scoring system that displays in the HUD

**Next:** Multiple Levels & Checkpoints -- add level completion, progression to harder levels, and a goal system!
