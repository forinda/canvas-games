# Step 6: Day/Night Waves

**Goal:** Zombies attack at night, scavenge during the day, with a flashlight darkness overlay.

**Time:** ~15 minutes

---

## What You'll Build

- **Visual day/night cycle** -- the arena changes color between bright green (day) and dark near-black (night)
- **Flashlight cone** at night -- a darkness overlay with a cone of light cut out in the player's aim direction
- **Ambient glow** around the player for minimum visibility even outside the flashlight
- **Dynamic grid lines and borders** that shift opacity between day and night
- **Full gameplay loop** where day = build/scavenge, night = fight for survival

---

## Concepts

- **Even-Odd Fill Rule**: The flashlight overlay uses a canvas trick. We draw a full-arena dark rectangle, then draw a cone shape inside it, then fill with the `"evenodd"` rule. This fills everything *except* where the shapes overlap -- creating a "hole" in the darkness where the flashlight shines.
- **Composite Operations**: After the darkness overlay, we use `ctx.globalCompositeOperation = "lighter"` to draw a warm gradient over the flashlight cone. "Lighter" adds colors together, creating a glow effect without overwriting existing pixels.
- **Flashlight Parameters**: `FLASHLIGHT_RANGE = 260` defines how far the cone reaches. `FLASHLIGHT_ANGLE = Math.PI / 3.5` is the cone half-angle (~51 degrees total). A small ambient circle of radius 40 around the player ensures minimum visibility.
- **Day/Night Background Swap**: During day, the arena background is `#1a2a1a` (dark green) with visible grid lines. At night, it shifts to `#0a0e0a` (near-black) with dimmer grid lines. The border also changes from green to purple-tinted. These subtle shifts signal the transition even before the flashlight overlay kicks in.

---

## Code

### 1. Update the Game Renderer

**File:** `src/contexts/canvas2d/games/zombie-survival/renderers/GameRenderer.ts`

Add day/night background colors, barricade rendering, and the flashlight darkness overlay.

```typescript
import type { GameState } from '../types.ts';
import {
  ARENA_W,
  ARENA_H,
  PLAYER_RADIUS,
  BARRICADE_SIZE,
  FLASHLIGHT_RANGE,
  FLASHLIGHT_ANGLE,
  BULLET_RADIUS,
} from '../types.ts';
import { ZOMBIE_DEFS } from '../data/zombies.ts';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: GameState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    const scale = Math.min(W / ARENA_W, H / ARENA_H);
    const offsetX = (W - ARENA_W * scale) / 2;
    const offsetY = (H - ARENA_H * scale) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // ─── Background ──────────────────────────────────
    this.drawBackground(ctx, state);

    // ─── Barricades ──────────────────────────────────
    this.drawBarricades(ctx, state);

    // ─── Bullets ─────────────────────────────────────
    this.drawBullets(ctx, state);

    // ─── Zombies ─────────────────────────────────────
    this.drawZombies(ctx, state);

    // ─── Player ──────────────────────────────────────
    this.drawPlayer(ctx, state);

    // ─── Particles ───────────────────────────────────
    this.drawParticles(ctx, state);

    // ─── Flashlight darkness overlay (night only) ────
    if (state.timeOfDay === 'night') {
      this.drawFlashlightOverlay(ctx, state);
    }

    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D, state: GameState): void {
    if (state.timeOfDay === 'day') {
      ctx.fillStyle = '#1a2a1a';
    } else {
      ctx.fillStyle = '#0a0e0a';
    }

    ctx.fillRect(0, 0, ARENA_W, ARENA_H);

    // Grid lines (subtle)
    ctx.strokeStyle =
      state.timeOfDay === 'day'
        ? 'rgba(255,255,255,0.03)'
        : 'rgba(255,255,255,0.015)';
    ctx.lineWidth = 1;
    const gridSize = 50;

    for (let x = 0; x <= ARENA_W; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ARENA_H);
      ctx.stroke();
    }

    for (let y = 0; y <= ARENA_H; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(ARENA_W, y);
      ctx.stroke();
    }

    // Arena border
    ctx.strokeStyle = state.timeOfDay === 'day' ? '#2d5a2d' : '#1a1a2e';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, ARENA_W, ARENA_H);
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, state: GameState): void {
    const p = state.player;

    if (p.invincibleTimer > 0 && Math.floor(p.invincibleTimer * 10) % 2 === 0) return;

    ctx.save();
    ctx.translate(p.x, p.y);

    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ecf0f1';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(
      Math.cos(p.angle) * (PLAYER_RADIUS + 8),
      Math.sin(p.angle) * (PLAYER_RADIUS + 8),
    );
    ctx.stroke();

    const eyeOffset = 5;
    const eyeAngle1 = p.angle - 0.3;
    const eyeAngle2 = p.angle + 0.3;

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(Math.cos(eyeAngle1) * eyeOffset, Math.sin(eyeAngle1) * eyeOffset, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(Math.cos(eyeAngle2) * eyeOffset, Math.sin(eyeAngle2) * eyeOffset, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawZombies(ctx: CanvasRenderingContext2D, state: GameState): void {
    for (const z of state.zombies) {
      if (z.dead) continue;

      const def = ZOMBIE_DEFS[z.type];

      ctx.save();
      ctx.translate(z.x, z.y);

      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(0, 0, z.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (z.hp < z.maxHp) {
        const barW = z.radius * 2.2;
        const barH = 3;
        const barY = -z.radius - 7;

        ctx.fillStyle = '#333';
        ctx.fillRect(-barW / 2, barY, barW, barH);
        ctx.fillStyle =
          z.hp > z.maxHp * 0.5
            ? '#2ecc71'
            : z.hp > z.maxHp * 0.25
              ? '#f1c40f'
              : '#e74c3c';
        ctx.fillRect(-barW / 2, barY, barW * (z.hp / z.maxHp), barH);
      }

      if (z.type === 'tank') {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, z.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawBarricades(ctx: CanvasRenderingContext2D, state: GameState): void {
    for (const b of state.barricades) {
      if (b.dead) continue;

      const half = BARRICADE_SIZE / 2;

      ctx.fillStyle = '#8B4513';
      ctx.fillRect(b.x - half, b.y - half, BARRICADE_SIZE, BARRICADE_SIZE);

      ctx.strokeStyle = '#A0522D';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x - half + 4, b.y - half + 4);
      ctx.lineTo(b.x + half - 4, b.y + half - 4);
      ctx.moveTo(b.x + half - 4, b.y - half + 4);
      ctx.lineTo(b.x - half + 4, b.y + half - 4);
      ctx.stroke();

      ctx.strokeStyle = '#5D3A1A';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x - half, b.y - half, BARRICADE_SIZE, BARRICADE_SIZE);

      if (b.hp < b.maxHp) {
        const barW = BARRICADE_SIZE;
        const barH = 3;
        const barY = b.y - half - 6;

        ctx.fillStyle = '#333';
        ctx.fillRect(b.x - half, barY, barW, barH);
        ctx.fillStyle = b.hp > b.maxHp * 0.5 ? '#2ecc71' : '#e74c3c';
        ctx.fillRect(b.x - half, barY, barW * (b.hp / b.maxHp), barH);
      }
    }
  }

  private drawBullets(ctx: CanvasRenderingContext2D, state: GameState): void {
    ctx.fillStyle = '#f1c40f';

    for (const b of state.bullets) {
      if (b.dead) continue;
      ctx.beginPath();
      ctx.arc(b.x, b.y, BULLET_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, state: GameState): void {
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawFlashlightOverlay(ctx: CanvasRenderingContext2D, state: GameState): void {
    const p = state.player;

    // Create darkness with flashlight cone cut out
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    // Dark overlay
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.beginPath();
    ctx.rect(0, 0, ARENA_W, ARENA_H);

    // Cut out flashlight cone using even-odd rule
    ctx.moveTo(p.x, p.y);
    const startAngle = p.angle - FLASHLIGHT_ANGLE;
    const endAngle = p.angle + FLASHLIGHT_ANGLE;

    ctx.arc(p.x, p.y, FLASHLIGHT_RANGE, startAngle, endAngle);
    ctx.closePath();

    // Also cut out a small circle around the player (ambient glow)
    ctx.moveTo(p.x + 40, p.y);
    ctx.arc(p.x, p.y, 40, 0, Math.PI * 2, true);

    ctx.fill('evenodd');

    // Flashlight cone glow
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, FLASHLIGHT_RANGE);
    gradient.addColorStop(0, 'rgba(255,255,200,0.06)');
    gradient.addColorStop(1, 'rgba(255,255,200,0)');

    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.arc(p.x, p.y, FLASHLIGHT_RANGE, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
```

**What's happening:**
- `drawBackground()` now checks `state.timeOfDay`. During day: brighter green background, more visible grid, green border. At night: near-black background, dimmer grid, purple-tinted border. The transition is instant (no gradual fade), matching the cycle timer.
- `drawFlashlightOverlay()` is the key nighttime effect. The technique works in three stages:
  1. **Dark rect** -- fill the entire arena with 75% opacity black
  2. **Even-odd cutout** -- draw a cone (from player center, spanning `FLASHLIGHT_ANGLE` on each side) and a small circle (radius 40) in the same path. With `fill('evenodd')`, the overlapping regions become transparent, creating "holes" in the darkness
  3. **Glow gradient** -- using `globalCompositeOperation = 'lighter'`, draw a radial gradient over the cone area to add a warm yellowish glow
- The flashlight follows `p.angle`, so it always points where the mouse is. This forces the player to choose between looking and fleeing, creating tension at night.
- The ambient glow circle (40px) ensures the player can always see immediately around themselves, preventing total blindness.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Zombie Survival game in your browser
3. **Observe:**
   - **Day phase**: bright green arena, full visibility, ammo and resources accumulate
   - **Build barricades** during day to prepare for the incoming wave
   - **Night falls**: arena goes dark, a **flashlight cone** illuminates your aim direction
   - **Move your mouse** -- the cone follows, revealing different parts of the arena
   - Zombies **outside the cone** are hidden under the darkness overlay
   - A small **ambient glow** around the player lets you see immediate threats
   - The cone has a **warm yellowish glow** for atmosphere
   - **Survive the wave** -- day returns with full visibility and resource scavenging
   - The cycle bar changes from **orange (day) to purple (night)**

---

## Challenges

**Easy:**
- Change `FLASHLIGHT_ANGLE` to `Math.PI / 2.5` for a wider cone, or `Math.PI / 5` for a narrow beam.
- Change the darkness opacity from 0.75 to 0.9 for a scarier night experience.

**Medium:**
- Add a gradual day-to-night transition: over the last 3 seconds of day, linearly interpolate the background color from day to night rather than switching instantly.

**Hard:**
- Add a second light source: when a bullet is in flight, it emits a small glow (radius 30) around it. Use the same even-odd technique to cut additional circles out of the darkness for each live bullet.

---

## What You Learned

- Using the canvas even-odd fill rule to create "light holes" in a darkness overlay
- Applying `globalCompositeOperation = 'lighter'` for additive glow effects
- Creating radial gradients for atmospheric flashlight illumination
- Implementing visual day/night cycling with coordinated background, grid, and border changes
- Building the complete gameplay loop: day (build, scavenge) to night (fight, survive)

**Next:** Upgrades & Polish -- weapon upgrades, wave counter, and death screen!
