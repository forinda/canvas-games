# Step 4: Barricades & Building

**Goal:** Place barricades that slow and block zombies, adding a strategic layer to survival.

**Time:** ~15 minutes

---

## What You'll Build

- **Barricade placement** with the E key -- spawns a wooden barricade in front of the player
- **Barricade rendering** with a wood texture (cross-plank pattern), border, and HP bar
- **Zombie-barricade targeting** -- zombies divert to attack nearby barricades instead of the player
- **Barricade destruction** with wood splinter particle effects
- **Overlap prevention** so barricades cannot stack on top of each other

---

## Concepts

- **Placement in Aim Direction**: The barricade spawns at `player position + cos/sin(angle) * offset`. This means the player "throws" a barricade where they are looking, which feels intuitive paired with mouse aiming.
- **Resource Cost Gate**: Each barricade costs `BARRICADE_COST = 20` resources. The PlayerSystem checks `player.resources >= BARRICADE_COST` before placement. The HUD hint bar dims when the player cannot afford it.
- **Zombie Target Priority**: The ZombieSystem checks if any barricade is closer than `0.7 * distToPlayer` and within 200px. If so, the zombie switches to `attacking_barricade` state and moves toward the barricade instead. This gives barricades defensive value -- they intercept zombies.
- **AABB Overlap Check**: Before placing a barricade, we check if `|newX - existingX| < BARRICADE_SIZE` and `|newY - existingY| < BARRICADE_SIZE`. If both are true, the placement is rejected. This is faster than circle collision and works well for square barricades.

---

## Code

### 1. Update the Zombie System

**File:** `src/contexts/canvas2d/games/zombie-survival/systems/ZombieSystem.ts`

Add barricade targeting so zombies divert to attack nearby barricades.

```typescript
import type { GameState, Zombie } from '../types.ts';
import { ARENA_W, ARENA_H, BARRICADE_SIZE } from '../types.ts';

export class ZombieSystem {
  update(state: GameState, dt: number): void {
    const player = state.player;

    for (const z of state.zombies) {
      if (z.dead) continue;

      z.attackCooldown = Math.max(0, z.attackCooldown - dt);

      // Determine target: check barricades in path first
      const nearestBarricade = this.findNearestBarricade(z, state);
      const distToPlayer = this.dist(z.x, z.y, player.x, player.y);

      // Decide state
      if (nearestBarricade) {
        const distToBarricade = this.dist(z.x, z.y, nearestBarricade.x, nearestBarricade.y);

        if (distToBarricade < distToPlayer * 0.7) {
          z.state = 'attacking_barricade';
          z.targetBarricadeId = nearestBarricade.id;
        } else {
          z.state = 'chasing';
          z.targetBarricadeId = null;
        }
      } else {
        z.state = 'chasing';
        z.targetBarricadeId = null;
      }

      // Move toward target
      this.moveZombie(z, state, dt);
    }

    // Remove dead zombies
    state.zombies = state.zombies.filter((z) => !z.dead);
  }

  private moveZombie(z: Zombie, state: GameState, dt: number): void {
    let targetX: number;
    let targetY: number;

    if (z.state === 'attacking_barricade' && z.targetBarricadeId !== null) {
      const barricade = state.barricades.find(
        (b) => b.id === z.targetBarricadeId && !b.dead,
      );

      if (barricade) {
        targetX = barricade.x;
        targetY = barricade.y;
        const dist = this.dist(z.x, z.y, targetX, targetY);

        if (dist < z.radius + BARRICADE_SIZE / 2 + 4) {
          return; // In attack range -- CombatSystem handles damage
        }
      } else {
        z.state = 'chasing';
        z.targetBarricadeId = null;
        targetX = state.player.x;
        targetY = state.player.y;
      }
    } else {
      targetX = state.player.x;
      targetY = state.player.y;

      const dist = this.dist(z.x, z.y, targetX, targetY);

      if (dist < z.radius + 14 + 2) {
        z.state = 'attacking_player';
        return;
      }
    }

    const dx = targetX - z.x;
    const dy = targetY - z.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 1) {
      z.x += (dx / dist) * z.speed * dt;
      z.y += (dy / dist) * z.speed * dt;
    }

    z.x = Math.max(z.radius, Math.min(ARENA_W - z.radius, z.x));
    z.y = Math.max(z.radius, Math.min(ARENA_H - z.radius, z.y));
  }

  private findNearestBarricade(z: Zombie, state: GameState) {
    let nearest = null;
    let nearestDist = Infinity;

    for (const b of state.barricades) {
      if (b.dead) continue;

      const dToB = this.dist(z.x, z.y, b.x, b.y);

      if (dToB < nearestDist && dToB < 200) {
        nearest = b;
        nearestDist = dToB;
      }
    }

    return nearest;
  }

  private dist(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
```

**What's happening:**
- `findNearestBarricade()` scans all alive barricades within 200 pixels of the zombie. If the closest barricade is closer than 70% of the distance to the player (`distToBarricade < distToPlayer * 0.7`), the zombie targets it instead.
- When a zombie reaches its target barricade (distance < `z.radius + BARRICADE_SIZE / 2 + 4`), it stops and returns -- the CombatSystem then applies melee damage.
- If a targeted barricade dies, the zombie immediately switches back to `chasing` the player. This prevents zombies from standing still staring at a destroyed barricade.

---

### 2. Update the Combat System

**File:** `src/contexts/canvas2d/games/zombie-survival/systems/CombatSystem.ts`

Add zombie-barricade damage with splinter particles.

```typescript
import type { GameState } from '../types.ts';
import { ARENA_W, ARENA_H, BULLET_RADIUS, BARRICADE_SIZE, PLAYER_RADIUS } from '../types.ts';

export class CombatSystem {
  update(state: GameState, dt: number): void {
    this.updateBullets(state, dt);
    this.checkBulletZombieCollisions(state);
    this.checkZombiePlayerDamage(state, dt);
    this.checkZombieBarricadeDamage(state, dt);
    this.updateParticles(state, dt);
  }

  private updateBullets(state: GameState, dt: number): void {
    for (const b of state.bullets) {
      if (b.dead) continue;

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.x < -20 || b.x > ARENA_W + 20 || b.y < -20 || b.y > ARENA_H + 20) {
        b.dead = true;
      }
    }

    state.bullets = state.bullets.filter((b) => !b.dead);
  }

  private checkBulletZombieCollisions(state: GameState): void {
    for (const b of state.bullets) {
      if (b.dead) continue;

      for (const z of state.zombies) {
        if (z.dead) continue;

        const dx = b.x - z.x;
        const dy = b.y - z.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < BULLET_RADIUS + z.radius) {
          z.hp -= b.damage;
          b.dead = true;

          this.spawnBlood(state, z.x, z.y);

          if (z.hp <= 0) {
            z.dead = true;
            state.score += z.type === 'tank' ? 30 : z.type === 'runner' ? 15 : 10;
            state.totalKills++;
            state.zombiesRemainingInWave = Math.max(0, state.zombiesRemainingInWave - 1);
          }

          break;
        }
      }
    }
  }

  private checkZombiePlayerDamage(state: GameState, _dt: number): void {
    const player = state.player;

    if (player.invincibleTimer > 0) return;

    for (const z of state.zombies) {
      if (z.dead) continue;
      if (z.state !== 'attacking_player' && z.state !== 'chasing') continue;

      const dx = player.x - z.x;
      const dy = player.y - z.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < PLAYER_RADIUS + z.radius + 4) {
        if (z.attackCooldown <= 0) {
          player.hp -= z.damage;
          player.invincibleTimer = 0.5;
          z.attackCooldown = z.attackInterval;

          if (dist > 0.1) {
            player.x += (dx / dist) * 20;
            player.y += (dy / dist) * 20;
          }

          if (player.hp <= 0) {
            player.hp = 0;
            state.screen = 'gameover';
          }

          break;
        }
      }
    }
  }

  private checkZombieBarricadeDamage(state: GameState, _dt: number): void {
    for (const z of state.zombies) {
      if (z.dead) continue;
      if (z.state !== 'attacking_barricade' || z.targetBarricadeId === null) continue;

      const barricade = state.barricades.find(
        (b) => b.id === z.targetBarricadeId && !b.dead,
      );

      if (!barricade) continue;

      const dx = barricade.x - z.x;
      const dy = barricade.y - z.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < z.radius + BARRICADE_SIZE / 2 + 4) {
        if (z.attackCooldown <= 0) {
          barricade.hp -= z.damage;
          z.attackCooldown = z.attackInterval;

          this.spawnSplinters(state, barricade.x, barricade.y);

          if (barricade.hp <= 0) {
            barricade.dead = true;
            z.state = 'chasing';
            z.targetBarricadeId = null;
          }
        }
      }
    }

    // Remove dead barricades
    state.barricades = state.barricades.filter((b) => !b.dead);
  }

  private spawnBlood(state: GameState, x: number, y: number): void {
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 60;

      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        decay: 2 + Math.random(),
        color: '#8b0000',
        radius: 2 + Math.random() * 2,
      });
    }
  }

  private spawnSplinters(state: GameState, x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 40;

      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        decay: 2.5 + Math.random(),
        color: '#8B4513',
        radius: 2 + Math.random() * 2,
      });
    }
  }

  private updateParticles(state: GameState, dt: number): void {
    for (const p of state.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
    }

    state.particles = state.particles.filter((p) => p.alpha > 0);

    if (state.particles.length > 200) {
      state.particles.splice(0, state.particles.length - 200);
    }
  }
}
```

**What's happening:**
- `checkZombieBarricadeDamage()` iterates zombies in the `attacking_barricade` state. When a zombie is within melee range and its attack cooldown has expired, it deals `z.damage` to the barricade and resets the cooldown.
- `spawnSplinters()` creates brown (`#8B4513`) particles at the barricade position -- visually distinct from the dark-red blood particles.
- When a barricade's HP hits zero, it is marked `dead`, the attacking zombie switches back to `chasing`, and the barricade is removed from the array.

---

### 3. Update the Game Renderer

**File:** `src/contexts/canvas2d/games/zombie-survival/renderers/GameRenderer.ts`

Add barricade drawing with wood texture and HP bars.

```typescript
import type { GameState } from '../types.ts';
import {
  ARENA_W,
  ARENA_H,
  PLAYER_RADIUS,
  BARRICADE_SIZE,
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

    this.drawBackground(ctx, state);
    this.drawBarricades(ctx, state);
    this.drawBullets(ctx, state);
    this.drawZombies(ctx, state);
    this.drawPlayer(ctx, state);
    this.drawParticles(ctx, state);

    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D, state: GameState): void {
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
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

    ctx.strokeStyle = '#2d5a2d';
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

      // Wooden barricade look
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(b.x - half, b.y - half, BARRICADE_SIZE, BARRICADE_SIZE);

      // Cross planks
      ctx.strokeStyle = '#A0522D';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x - half + 4, b.y - half + 4);
      ctx.lineTo(b.x + half - 4, b.y + half - 4);
      ctx.moveTo(b.x + half - 4, b.y - half + 4);
      ctx.lineTo(b.x - half + 4, b.y + half - 4);
      ctx.stroke();

      // Border
      ctx.strokeStyle = '#5D3A1A';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x - half, b.y - half, BARRICADE_SIZE, BARRICADE_SIZE);

      // HP bar
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
}
```

**What's happening:**
- Barricades are drawn as brown squares (`#8B4513`) with an X-shaped cross-plank pattern in a lighter brown (`#A0522D`) and a dark border (`#5D3A1A`). This creates a quick "wooden crate" look with just rectangles and lines.
- Barricades are drawn before bullets and zombies so they appear as ground-level objects that entities walk over/around.
- HP bars only appear when the barricade has taken damage, using a green-to-red two-stage color scheme.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Zombie Survival game in your browser
3. **Observe:**
   - **Press E** -- a brown barricade with cross planks appears in front of the player
   - **Watch resources decrease** by 20 in the HUD
   - **Place multiple barricades** -- they cannot overlap each other
   - **Watch zombies approach** -- when a zombie gets within 200px of a barricade that is closer than the player, it diverts to attack the barricade
   - **Zombies hit barricades** -- brown wood splinter particles fly out, the HP bar appears and shrinks
   - **Barricade destroyed** -- it vanishes and the zombie resumes chasing the player
   - When resources drop below 20, the bottom hint text dims and pressing E does nothing

---

## Challenges

**Easy:**
- Change `BARRICADE_COST` to 15 to make barricades cheaper, or 30 to make them more strategic.

**Medium:**
- Draw a ghost preview of where the barricade will be placed: a semi-transparent outline at the aim position, green if placement is valid, red if it overlaps an existing barricade.

**Hard:**
- Allow barricade repair: when the player presses E near a damaged barricade (instead of placing a new one), spend resources to restore its HP.

---

## What You Learned

- Placing entities in the player's aim direction using trigonometric offsets
- Implementing AI target switching between the player and nearby barricades
- Using AABB overlap checks to prevent entity stacking
- Creating destruction particle effects distinct from combat particles
- Managing a resource economy that gates player actions

**Next:** Resource Management -- ammo crates, health packs, and building materials!
