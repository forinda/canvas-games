# Step 6: Damage, Effects & Polish

**Goal:** Add hit feedback particles, death explosions, a pause overlay, and visual polish to bring the game to life.

**Time:** ~15 minutes

---

## What You'll Build

- **Hit particles** -- colored sparks burst from enemies when bullets connect
- **Death explosions** -- larger particle bursts when enemies are destroyed
- **Player damage particles** -- red sparks fly when the player is hit
- **Particle system** integrated into the BulletSystem update loop
- **Pause overlay** with a semi-transparent backdrop
- **Particle rendering** with fade-out and shrinking effects

---

## Concepts

- **Particle Systems**: Small, short-lived visual elements that create effects like explosions, sparks, and smoke. Each particle has position, velocity, age, and lifetime. They spawn in bursts and fade out over time.
- **Alpha Fading**: `1 - (age / lifetime)` produces a value from 1.0 (fully visible) to 0.0 (invisible) over the particle's life. Used with `ctx.globalAlpha` for smooth fade-out.
- **Radial Burst Pattern**: Spawning particles with random angles (`Math.random() * Math.PI * 2`) and random speeds creates a natural explosion effect. More particles and higher speeds make bigger bursts.
- **Juice and Game Feel**: Particles are "juice" -- they do not affect gameplay but make every action feel impactful. A bullet hitting an enemy without particles feels flat; with 4-10 colored sparks, it feels satisfying.

---

## Code

### 1. Update the Bullet System

**File:** `src/contexts/canvas2d/games/topdown-shooter/systems/BulletSystem.ts`

Add particle spawning on hit and death, plus particle update logic.

```typescript
import type { ShooterState } from '../types';
import { BULLET_LIFETIME, ARENA_PADDING } from '../types';

export class BulletSystem {
  update(state: ShooterState, dt: number): void {
    const { bullets, enemies, player, particles } = state;

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];

      b.pos.x += b.vel.x * dt;
      b.pos.y += b.vel.y * dt;
      b.age += dt;

      // Remove if expired or out of arena
      if (
        b.age > BULLET_LIFETIME ||
        b.pos.x < ARENA_PADDING ||
        b.pos.x > state.canvasW - ARENA_PADDING ||
        b.pos.y < ARENA_PADDING ||
        b.pos.y > state.canvasH - ARENA_PADDING
      ) {
        bullets.splice(i, 1);
        continue;
      }

      if (b.fromPlayer) {
        // ── Player bullet vs enemies ─────────────────────────────
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          const dx = b.pos.x - e.pos.x;
          const dy = b.pos.y - e.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < b.radius + e.radius) {
            e.hp -= 1;
            bullets.splice(i, 1);

            // Hit particles
            for (let k = 0; k < 4; k++) {
              const angle = Math.random() * Math.PI * 2;
              const spd = 50 + Math.random() * 100;

              particles.push({
                pos: { x: b.pos.x, y: b.pos.y },
                vel: { x: Math.cos(angle) * spd, y: Math.sin(angle) * spd },
                age: 0,
                lifetime: 0.25,
                color: e.color,
                radius: 3,
              });
            }

            if (e.hp <= 0) {
              // Death burst
              for (let k = 0; k < 10; k++) {
                const angle = Math.random() * Math.PI * 2;
                const spd = 60 + Math.random() * 160;

                particles.push({
                  pos: { x: e.pos.x, y: e.pos.y },
                  vel: { x: Math.cos(angle) * spd, y: Math.sin(angle) * spd },
                  age: 0,
                  lifetime: 0.4,
                  color: e.color,
                  radius: 4,
                });
              }

              state.score +=
                e.type === 'tank'
                  ? 30
                  : e.type === 'ranged'
                    ? 20
                    : e.type === 'fast'
                      ? 15
                      : 10;
              state.kills += 1;
              enemies.splice(j, 1);
            }

            break; // bullet consumed
          }
        }
      } else {
        // ── Enemy bullet vs player ───────────────────────────────
        const dx = b.pos.x - player.pos.x;
        const dy = b.pos.y - player.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < b.radius + player.radius && player.invincibleTimer <= 0) {
          player.hp -= 8;
          player.invincibleTimer = 0.3;
          bullets.splice(i, 1);

          for (let k = 0; k < 5; k++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 60 + Math.random() * 80;

            particles.push({
              pos: { x: player.pos.x, y: player.pos.y },
              vel: { x: Math.cos(angle) * spd, y: Math.sin(angle) * spd },
              age: 0,
              lifetime: 0.3,
              color: '#ff5252',
              radius: 3,
            });
          }

          if (player.hp <= 0) {
            player.hp = 0;
            state.gameOver = true;
          }
        }
      }
    }

    // ── Update particles ─────────────────────────────────────────
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      p.pos.x += p.vel.x * dt;
      p.pos.y += p.vel.y * dt;
      p.age += dt;

      if (p.age >= p.lifetime) {
        particles.splice(i, 1);
      }
    }
  }
}
```

**What's happening:**
- **Hit particles** (4 per hit): When a player bullet connects with an enemy, 4 small particles spawn at the impact point. They use the enemy's color so the feedback matches the target. Each flies in a random direction at 50-150 px/s and lives for 0.25 seconds.
- **Death burst** (10 particles): When an enemy's HP reaches zero, a larger burst of 10 particles erupts from the enemy's position. These are slightly bigger (radius 4), faster (60-220 px/s), and live longer (0.4s), creating a satisfying explosion.
- **Player damage particles** (5 per hit): Red (`#ff5252`) sparks fly from the player when hit by an enemy bullet, matching the damage flash from the invincibility system.
- **Particle update**: At the end of each frame, all particles move by their velocity and age. When a particle exceeds its lifetime, it is removed.

---

### 2. Update the Game Renderer

**File:** `src/contexts/canvas2d/games/topdown-shooter/renderers/GameRenderer.ts`

Add particle rendering before bullets and enemies (behind everything).

```typescript
import type { ShooterState } from '../types';
import { ARENA_PADDING, PLAYER_RADIUS } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: ShooterState): void {
    const W = state.canvasW;
    const H = state.canvasH;

    // ── Background ───────────────────────────────────────────────
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    // ── Arena border ─────────────────────────────────────────────
    const ap = ARENA_PADDING;
    ctx.strokeStyle = '#333355';
    ctx.lineWidth = 2;
    ctx.strokeRect(ap, ap, W - ap * 2, H - ap * 2);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const gridSize = 60;

    for (let x = ap; x < W - ap; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, ap);
      ctx.lineTo(x, H - ap);
      ctx.stroke();
    }

    for (let y = ap; y < H - ap; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(ap, y);
      ctx.lineTo(W - ap, y);
      ctx.stroke();
    }

    // ── Particles (behind everything) ────────────────────────────
    for (const p of state.particles) {
      const alpha = 1 - p.age / p.lifetime;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.radius * alpha, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    // ── Bullets ──────────────────────────────────────────────────
    for (const b of state.bullets) {
      ctx.fillStyle = b.fromPlayer ? '#ffeb3b' : '#e040fb';
      ctx.beginPath();
      ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2);
      ctx.fill();

      // Glow
      ctx.shadowColor = b.fromPlayer ? '#ffeb3b' : '#e040fb';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // ── Enemies ──────────────────────────────────────────────────
    for (const e of state.enemies) {
      // Body
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI * 2);
      ctx.fill();

      // HP bar (if damaged)
      if (e.hp < e.maxHp) {
        const barW = e.radius * 2;
        const barH = 4;
        const barX = e.pos.x - barW / 2;
        const barY = e.pos.y - e.radius - 8;

        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(barX, barY, barW * (e.hp / e.maxHp), barH);
      }

      // Type indicator
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(9, e.radius * 0.7)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label =
        e.type === 'tank'
          ? 'T'
          : e.type === 'fast'
            ? 'F'
            : e.type === 'ranged'
              ? 'R'
              : '';

      if (label) ctx.fillText(label, e.pos.x, e.pos.y);
    }

    // ── Player ───────────────────────────────────────────────────
    const { player, mouse } = state;

    // Aim line
    const aimDx = mouse.x - player.pos.x;
    const aimDy = mouse.y - player.pos.y;
    const aimLen = Math.sqrt(aimDx * aimDx + aimDy * aimDy);

    if (aimLen > 0) {
      const nx = aimDx / aimLen;
      const ny = aimDy / aimLen;

      ctx.strokeStyle = 'rgba(255,235,59,0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(
        player.pos.x + nx * PLAYER_RADIUS,
        player.pos.y + ny * PLAYER_RADIUS,
      );
      ctx.lineTo(player.pos.x + nx * 60, player.pos.y + ny * 60);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Flash when invincible
    const flash =
      player.invincibleTimer > 0 &&
      Math.floor(player.invincibleTimer * 10) % 2 === 0;

    // Player body
    ctx.fillStyle = flash ? '#ff8a80' : '#42a5f5';
    ctx.beginPath();
    ctx.arc(player.pos.x, player.pos.y, player.radius, 0, Math.PI * 2);
    ctx.fill();

    // Player outline glow
    ctx.strokeStyle = '#90caf9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.pos.x, player.pos.y, player.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Gun direction indicator
    if (aimLen > 0) {
      const nx = aimDx / aimLen;
      const ny = aimDy / aimLen;

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(
        player.pos.x + nx * (player.radius - 4),
        player.pos.y + ny * (player.radius - 4),
        4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
}
```

**What's happening:**
- Particles render **behind everything** (before bullets and enemies) so they serve as background effects rather than obscuring gameplay elements.
- `ctx.globalAlpha = alpha` fades the particle from fully opaque to transparent over its lifetime.
- `p.radius * alpha` shrinks the particle as it fades, creating a "dying ember" effect. A 4px particle at 50% life is only 2px, which looks like it is dissolving.
- `ctx.globalAlpha = 1` resets opacity after the particle loop so bullets, enemies, and the player draw at full opacity.

---

### 3. Update the HUD Renderer

**File:** `src/contexts/canvas2d/games/topdown-shooter/renderers/HUDRenderer.ts`

Add the pause overlay.

```typescript
import type { ShooterState } from '../types';

const GAME_COLOR = '#e53935';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: ShooterState): void {
    const W = state.canvasW;

    // ── HP bar ───────────────────────────────────────────────────
    const barW = 200;
    const barH = 16;
    const barX = 20;
    const barY = 20;
    const hpFrac = state.player.hp / state.player.maxHp;

    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 4);
    ctx.fill();

    const hpColor =
      hpFrac > 0.5 ? '#4caf50' : hpFrac > 0.25 ? '#ff9800' : '#f44336';

    ctx.fillStyle = hpColor;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * hpFrac, barH, 4);
    ctx.fill();

    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 4);
    ctx.stroke();

    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `${state.player.hp} / ${state.player.maxHp}`,
      barX + barW / 2,
      barY + barH / 2,
    );

    // ── Wave / Score / Kills ─────────────────────────────────────
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#ddd';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    const waveLabel = state.waveData.active
      ? `Wave ${state.waveData.wave}`
      : `Next wave in ${Math.max(0, state.waveData.betweenWaveTimer).toFixed(1)}s`;

    ctx.fillText(waveLabel, W - 20, 20);
    ctx.fillText(`Score: ${state.score}`, W - 20, 40);
    ctx.fillText(`Kills: ${state.kills}`, W - 20, 60);

    if (state.highScore > 0) {
      ctx.fillStyle = '#999';
      ctx.font = '12px monospace';
      ctx.fillText(`Best: ${state.highScore}`, W - 20, 80);
    }

    // ── Help hint ────────────────────────────────────────────────
    ctx.font = '11px monospace';
    ctx.fillStyle = '#555';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('[H] Help  [P] Pause  [ESC] Exit', 20, state.canvasH - 10);

    // ── Paused overlay ───────────────────────────────────────────
    if (state.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, W, state.canvasH);
      ctx.font = 'bold 36px monospace';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PAUSED', W / 2, state.canvasH / 2);
      ctx.font = '16px monospace';
      ctx.fillStyle = '#aaa';
      ctx.fillText('Press [P] to resume', W / 2, state.canvasH / 2 + 40);
    }
  }
}
```

**What's happening:**
- The **pause overlay** draws a 60%-opaque black rectangle over the entire screen, then "PAUSED" in large white text with a resume hint below.
- The overlay only appears when `state.paused` is true, which toggles on the P key press handled by `InputSystem`.
- The semi-transparent black lets the game state show through dimly, so the player can still see where everything was when they paused.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Top-Down Shooter game in your browser
3. **Observe:**
   - Shoot an enemy -- **colored sparks** burst from the hit point matching the enemy's color
   - Kill an enemy -- a **larger explosion** of 10 particles erupts from their position
   - Get hit by an enemy or enemy bullet -- **red sparks** fly from the player
   - Particles **fade out and shrink** as they age, then disappear
   - Press **P** -- a dark overlay appears with "PAUSED" text
   - Press **P** again to resume -- everything continues from where it stopped
   - The game feels much more **responsive and satisfying** with particle feedback

---

## Challenges

**Easy:**
- Increase the death burst particle count from 10 to 20 for a bigger explosion.
- Change the player damage particle color from red to white.

**Medium:**
- Add "screen shake" on player hit: offset all rendering by a small random amount for 0.2 seconds after taking damage.

**Hard:**
- Implement "bullet trails": each bullet spawns a small fading particle every 2 frames behind it, creating a comet-tail effect.

---

## What You Learned

- Building a particle system with position, velocity, age, and lifetime
- Creating radial burst patterns with random angles and speeds
- Fading particles using `globalAlpha` and shrinking with `radius * alpha`
- Spawning different particle effects for hits (small, few) vs. deaths (large, many)
- Adding a pause overlay with semi-transparent backdrop
- Understanding "game juice" -- visual feedback that makes actions feel satisfying

**Next:** Start screen, game-over screen, restart logic, and high score persistence!
