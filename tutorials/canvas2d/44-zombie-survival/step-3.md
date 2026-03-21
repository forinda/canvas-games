# Step 3: Zombie Spawning & AI

**Goal:** Zombies spawn at edges and swarm toward the player with three distinct types.

**Time:** ~15 minutes

---

## What You'll Build

- **Three zombie types**: walkers (slow, moderate HP), runners (fast, fragile), and tanks (slow, massive HP)
- **Edge spawning** from random arena edges with slight speed variance
- **Chase AI** that moves each zombie directly toward the player
- **Zombie rendering** with type-specific colors, outlines, and HP bars
- **Bullet-zombie collisions** with blood particle effects and score tracking
- **Zombie-player damage** with knockback, invincibility frames, and game over

---

## Concepts

- **Entity Definitions (Data-Driven)**: Instead of hardcoding zombie stats, we define `ZOMBIE_DEFS` as a lookup table keyed by `ZombieType`. Each entry has HP, speed, damage, attack interval, radius, and color. This makes adding new zombie types trivial -- just add a row.
- **Edge Spawning**: `Math.floor(Math.random() * 4)` picks one of four edges (top, right, bottom, left). The zombie spawns 20 pixels outside the visible arena and walks in, creating a natural "arrival" feel.
- **Circle-Circle Collision**: Two circles collide when `distance(a, b) < radiusA + radiusB`. We use this for both bullet-zombie and zombie-player checks. `Math.sqrt(dx*dx + dy*dy)` gives the Euclidean distance.
- **Knockback**: When a zombie hits the player, we push the player away by 20 pixels along the line between them: `player.x += (dx / dist) * 20`. This gives visceral feedback and prevents the player from being "stuck inside" a zombie.

---

## Code

### 1. Create Zombie Definitions

**File:** `src/contexts/canvas2d/games/zombie-survival/data/zombies.ts`

A data table defining the stats and appearance of each zombie type.

```typescript
import type { ZombieType } from '../types.ts';

export interface ZombieDef {
  type: ZombieType;
  hp: number;
  speed: number;
  damage: number;
  attackInterval: number;
  radius: number;
  color: string;
}

export const ZOMBIE_DEFS: Record<ZombieType, ZombieDef> = {
  walker: {
    type: 'walker',
    hp: 60,
    speed: 45,
    damage: 8,
    attackInterval: 1.2,
    radius: 12,
    color: '#5a8a3c',
  },
  runner: {
    type: 'runner',
    hp: 35,
    speed: 110,
    damage: 5,
    attackInterval: 0.8,
    radius: 10,
    color: '#c0392b',
  },
  tank: {
    type: 'tank',
    hp: 200,
    speed: 28,
    damage: 18,
    attackInterval: 2.0,
    radius: 18,
    color: '#6c3483',
  },
};
```

**What's happening:**
- **Walkers** are the baseline: 60 HP, 45 px/s, 8 damage every 1.2 seconds. Green (`#5a8a3c`), 12px radius.
- **Runners** are twice as fast (110 px/s) but fragile (35 HP, 5 damage). Red (`#c0392b`), smaller 10px radius.
- **Tanks** are 200 HP bruisers moving at 28 px/s, dealing 18 damage every 2 seconds. Purple (`#6c3483`), large 18px radius.
- The `attackInterval` field controls the cooldown between consecutive melee hits. A walker attacks every 1.2s; a runner hammers every 0.8s.

---

### 2. Create the Zombie System

**File:** `src/contexts/canvas2d/games/zombie-survival/systems/ZombieSystem.ts`

Moves each zombie toward the player and determines attack state.

```typescript
import type { GameState, Zombie } from '../types.ts';
import { ARENA_W, ARENA_H, BARRICADE_SIZE } from '../types.ts';

export class ZombieSystem {
  update(state: GameState, dt: number): void {
    const player = state.player;

    for (const z of state.zombies) {
      if (z.dead) continue;

      z.attackCooldown = Math.max(0, z.attackCooldown - dt);

      // Simple chase: move toward player
      z.state = 'chasing';
      z.targetBarricadeId = null;

      this.moveZombie(z, state, dt);
    }

    // Remove dead zombies
    state.zombies = state.zombies.filter((z) => !z.dead);
  }

  private moveZombie(z: Zombie, state: GameState, dt: number): void {
    const targetX = state.player.x;
    const targetY = state.player.y;

    const dist = this.dist(z.x, z.y, targetX, targetY);

    if (dist < z.radius + 14 + 2) {
      z.state = 'attacking_player';
      return; // CombatSystem handles damage
    }

    const dx = targetX - z.x;
    const dy = targetY - z.y;

    if (dist > 1) {
      z.x += (dx / dist) * z.speed * dt;
      z.y += (dy / dist) * z.speed * dt;
    }

    // Clamp to arena
    z.x = Math.max(z.radius, Math.min(ARENA_W - z.radius, z.x));
    z.y = Math.max(z.radius, Math.min(ARENA_H - z.radius, z.y));
  }

  private dist(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
```

**What's happening:**
- Each zombie moves directly toward the player. The direction vector `(dx, dy)` is normalized by dividing by `dist`, then multiplied by `z.speed * dt` for framerate-independent movement.
- When a zombie gets within `z.radius + 14 + 2` pixels of the player (14 is `PLAYER_RADIUS`, 2 is a small buffer), it switches to `attacking_player` state and stops moving. The `CombatSystem` handles the actual damage.
- `attackCooldown` counts down each frame. When a zombie's cooldown reaches zero and it is in attack range, it can deal damage (handled in CombatSystem).
- Barricade interaction is not yet implemented -- that comes in Step 4.

---

### 3. Update the Combat System

**File:** `src/contexts/canvas2d/games/zombie-survival/systems/CombatSystem.ts`

Add bullet-zombie collisions, zombie-player damage, and blood particles.

```typescript
import type { GameState } from '../types.ts';
import { ARENA_W, ARENA_H, BULLET_RADIUS, BARRICADE_SIZE, PLAYER_RADIUS } from '../types.ts';

export class CombatSystem {
  update(state: GameState, dt: number): void {
    this.updateBullets(state, dt);
    this.checkBulletZombieCollisions(state);
    this.checkZombiePlayerDamage(state, dt);
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

          // Blood particles
          this.spawnBlood(state, z.x, z.y);

          if (z.hp <= 0) {
            z.dead = true;
            state.score += z.type === 'tank' ? 30 : z.type === 'runner' ? 15 : 10;
            state.totalKills++;
            state.zombiesRemainingInWave = Math.max(0, state.zombiesRemainingInWave - 1);
          }

          break; // bullet hits one zombie
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

          // Knockback player slightly
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
- `checkBulletZombieCollisions()` is an O(bullets x zombies) nested loop. For each live bullet, it checks every live zombie. When `distance < BULLET_RADIUS + z.radius`, the bullet is consumed and the zombie takes damage. If the zombie dies, score is awarded (10 for walker, 15 for runner, 30 for tank).
- `checkZombiePlayerDamage()` skips if the player has invincibility frames. On a hit, the player takes damage, gets 0.5 seconds of invincibility, and is knocked back 20 pixels. If HP hits zero, `state.screen = 'gameover'`.
- `spawnBlood()` creates 4 dark-red particles at the zombie's position with random directions and speeds, producing a burst effect on bullet impact.
- Each bullet can only hit one zombie (`break` after the first hit), giving a fair one-bullet-one-hit mechanic.

---

### 4. Update the Game Renderer

**File:** `src/contexts/canvas2d/games/zombie-survival/renderers/GameRenderer.ts`

Add zombie drawing with type-specific colors, outlines, and HP bars.

```typescript
import type { GameState } from '../types.ts';
import { ARENA_W, ARENA_H, PLAYER_RADIUS, BULLET_RADIUS } from '../types.ts';
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

      // Body
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(0, 0, z.radius, 0, Math.PI * 2);
      ctx.fill();

      // Outline
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // HP bar (if damaged)
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

      // Type indicator for tank
      if (z.type === 'tank') {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, z.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
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
- Each zombie is drawn as a filled circle using the color from `ZOMBIE_DEFS` (green for walkers, red for runners, purple for tanks). A dark semi-transparent outline adds definition.
- Damaged zombies show an HP bar above their head. The bar color transitions from green (>50%) to yellow (>25%) to red (<25%).
- Tanks get an extra inner circle (`radius * 0.5`, white with 30% opacity) to visually distinguish them from walkers at a glance.
- Draw order is: background, bullets, zombies, player, particles. This puts the player on top of zombies for visibility, and particles on top of everything for effect.

---

### 5. Update the Engine

**File:** `src/contexts/canvas2d/games/zombie-survival/ZombieEngine.ts`

Add the ZombieSystem and spawn some test zombies.

```typescript
import type { GameState } from './types.ts';
import { ARENA_W, ARENA_H, MAX_AMMO, DAY_DURATION } from './types.ts';
import { InputSystem } from './systems/InputSystem.ts';
import { PlayerSystem } from './systems/PlayerSystem.ts';
import { ZombieSystem } from './systems/ZombieSystem.ts';
import { CombatSystem } from './systems/CombatSystem.ts';
import { GameRenderer } from './renderers/GameRenderer.ts';
import { HUDRenderer } from './renderers/HUDRenderer.ts';
import { ZOMBIE_DEFS } from './data/zombies.ts';

export class ZombieEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState;

  private inputSystem: InputSystem;
  private playerSystem: PlayerSystem;
  private zombieSystem: ZombieSystem;
  private combatSystem: CombatSystem;
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;

  private lastTime = 0;
  private rafId = 0;
  private running = false;
  private onExit: () => void;

  private resizeHandler: () => void;
  private restartHandler: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.canvas = canvas;
    this.onExit = onExit;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    this.state = this.createInitialState();

    this.inputSystem = new InputSystem(canvas, () => this.state);
    this.playerSystem = new PlayerSystem();
    this.zombieSystem = new ZombieSystem();
    this.combatSystem = new CombatSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    this.resizeHandler = () => this.handleResize();
    this.restartHandler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r' && this.state.screen === 'gameover') {
        this.state = this.createInitialState();
        // Spawn test zombies again
        this.spawnTestZombies();
      }
      if (e.key === 'Escape' && this.state.screen === 'gameover') {
        this.onExit();
      }
    };

    // Spawn some test zombies so we can see them
    this.spawnTestZombies();
  }

  private spawnTestZombies(): void {
    const types: Array<'walker' | 'runner' | 'tank'> = ['walker', 'walker', 'walker', 'runner', 'runner', 'tank'];

    for (const type of types) {
      const def = ZOMBIE_DEFS[type];
      // Spawn from random edge
      const edge = Math.floor(Math.random() * 4);
      let x: number, y: number;

      switch (edge) {
        case 0: x = Math.random() * ARENA_W; y = -20; break;
        case 1: x = ARENA_W + 20; y = Math.random() * ARENA_H; break;
        case 2: x = Math.random() * ARENA_W; y = ARENA_H + 20; break;
        default: x = -20; y = Math.random() * ARENA_H; break;
      }

      this.state.zombies.push({
        id: this.state.nextId++,
        type,
        x,
        y,
        hp: def.hp,
        maxHp: def.hp,
        speed: def.speed + Math.random() * 10 - 5,
        damage: def.damage,
        attackCooldown: 0,
        attackInterval: def.attackInterval,
        state: 'chasing',
        targetBarricadeId: null,
        radius: def.radius,
        dead: false,
      });
    }
  }

  private createInitialState(): GameState {
    return {
      screen: 'playing',
      player: {
        x: ARENA_W / 2,
        y: ARENA_H / 2,
        angle: 0,
        hp: 100,
        maxHp: 100,
        ammo: MAX_AMMO,
        maxAmmo: MAX_AMMO,
        resources: 40,
        shootCooldown: 0,
        invincibleTimer: 0,
      },
      zombies: [],
      bullets: [],
      barricades: [],
      particles: [],
      wave: 0,
      timeOfDay: 'day',
      cycleTimer: DAY_DURATION,
      zombiesRemainingInWave: 0,
      spawnTimer: 0,
      spawnQueue: [],
      score: 0,
      nextId: 1,
      totalKills: 0,
    };
  }

  private handleResize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  start(): void {
    this.running = true;
    this.handleResize();
    window.addEventListener('resize', this.resizeHandler);
    window.addEventListener('keydown', this.restartHandler);
    this.inputSystem.attach();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private loop(timestamp: number): void {
    if (!this.running) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number): void {
    const input = this.inputSystem.snapshot();

    if (input.pause) {
      if (this.state.screen === 'playing') {
        this.state.screen = 'paused';
        return;
      } else if (this.state.screen === 'paused') {
        this.state.screen = 'playing';
        return;
      }
    }

    if (this.state.screen !== 'playing') return;

    this.playerSystem.setInput(input);
    this.playerSystem.update(this.state, dt);
    this.zombieSystem.update(this.state, dt);
    this.combatSystem.update(this.state, dt);
  }

  private render(): void {
    const { ctx, canvas } = this;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#080a08';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.gameRenderer.render(ctx, this.state);
    this.hudRenderer.render(ctx, this.state);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('keydown', this.restartHandler);
    this.inputSystem.detach();
  }
}
```

**What's happening:**
- `spawnTestZombies()` creates 3 walkers, 2 runners, and 1 tank from random edges. This is temporary -- the WaveSystem in Step 6 will handle real spawning.
- The `restartHandler` listens for R to reset the game state and respawn test zombies on game over, and Escape to exit.
- The update order is critical: `PlayerSystem` first (processes input, creates bullets), then `ZombieSystem` (moves zombies), then `CombatSystem` (resolves collisions). This prevents one-frame-late hits.

---

### 6. Update the HUD Renderer

**File:** `src/contexts/canvas2d/games/zombie-survival/renderers/HUDRenderer.ts`

Add a kills counter and game over screen.

```typescript
import type { GameState } from '../types.ts';
import { BARRICADE_COST } from '../types.ts';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: GameState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    if (state.screen === 'gameover') {
      this.drawGameOver(ctx, state, W, H);
      return;
    }

    this.drawTopBar(ctx, state, W);
    this.drawBottomHints(ctx, state, W, H);

    if (state.screen === 'paused') {
      this.drawPauseOverlay(ctx, W, H);
    }
  }

  private drawTopBar(ctx: CanvasRenderingContext2D, state: GameState, W: number): void {
    const barH = 36;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, barH);

    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    const y = barH / 2;
    let x = 12;

    const hpPct = state.player.hp / state.player.maxHp;
    const hpColor = hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f1c40f' : '#e74c3c';

    ctx.fillStyle = hpColor;
    ctx.fillText(`HP: ${Math.ceil(state.player.hp)}/${state.player.maxHp}`, x, y);
    x += 130;

    const hpBarW = 80;
    const hpBarH = 8;
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y - hpBarH / 2, hpBarW, hpBarH);
    ctx.fillStyle = hpColor;
    ctx.fillRect(x, y - hpBarH / 2, hpBarW * hpPct, hpBarH);
    x += hpBarW + 20;

    ctx.fillStyle = '#f1c40f';
    ctx.fillText(`Ammo: ${Math.floor(state.player.ammo)}/${state.player.maxAmmo}`, x, y);
    x += 140;

    ctx.fillStyle = '#e67e22';
    ctx.fillText(`Resources: ${Math.floor(state.player.resources)}`, x, y);
    x += 150;

    ctx.fillStyle = '#ecf0f1';
    ctx.fillText(`Score: ${state.score}`, x, y);
    x += 120;

    ctx.fillStyle = '#95a5a6';
    ctx.fillText(`Kills: ${state.totalKills}`, x, y);
  }

  private drawBottomHints(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number): void {
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const canPlace = state.player.resources >= BARRICADE_COST;

    ctx.fillStyle = canPlace ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.25)';
    ctx.fillText(
      `[WASD] Move  |  [Mouse] Aim  |  [Click] Shoot  |  [E] Place Barricade (${BARRICADE_COST} res)  |  [P] Pause`,
      W / 2,
      H - 8,
    );
  }

  private drawPauseOverlay(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);

    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = '#ecf0f1';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', W / 2, H / 2 - 20);

    ctx.font = '16px monospace';
    ctx.fillStyle = '#95a5a6';
    ctx.fillText('Press [P] or [ESC] to resume', W / 2, H / 2 + 20);
  }

  private drawGameOver(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number): void {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 48px monospace';
    ctx.fillStyle = '#e74c3c';
    ctx.fillText('GAME OVER', W / 2, H / 2 - 60);

    ctx.font = '20px monospace';
    ctx.fillStyle = '#ecf0f1';
    ctx.fillText(`Survived ${state.wave} waves`, W / 2, H / 2 - 10);

    ctx.fillStyle = '#f1c40f';
    ctx.fillText(`Score: ${state.score}  |  Kills: ${state.totalKills}`, W / 2, H / 2 + 25);

    ctx.font = '16px monospace';
    ctx.fillStyle = '#95a5a6';
    ctx.fillText('Press [R] to restart  |  [ESC] to exit', W / 2, H / 2 + 70);
  }
}
```

**What's happening:**
- A `Kills` counter is added to the top bar after the score, using gray text (`#95a5a6`).
- The game over screen shows a dark 80% opacity overlay with "GAME OVER" in red, the wave count, score and kills, and restart instructions.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Zombie Survival game in your browser
3. **Observe:**
   - **6 zombies** (3 green walkers, 2 red runners, 1 purple tank) spawn from edges and move toward you
   - Runners arrive fastest, walkers at moderate speed, the tank is slow
   - **Shoot zombies** -- they show HP bars when damaged and burst into red particles on death
   - **Score and kills** update in the top bar
   - **Let a zombie reach you** -- you take damage, get knocked back, and blink briefly
   - **Let HP reach 0** -- the "GAME OVER" screen appears
   - **Press R** -- the game restarts with fresh zombies

---

## Challenges

**Easy:**
- Change the walker color to a brighter green and increase runner speed to 140.

**Medium:**
- Add a "headshot" mechanic: if the bullet hits within `z.radius * 0.3` of the zombie center, deal double damage.

**Hard:**
- Implement basic zombie-zombie separation so they do not overlap. After moving each zombie, push it away from any overlapping zombie by half the overlap distance.

---

## What You Learned

- Defining entity types with a data-driven definition table
- Implementing chase AI with normalized direction vectors
- Detecting circle-circle collisions for bullet hits and melee damage
- Creating particle burst effects for visual feedback
- Building a game over screen with restart capability

**Next:** Barricades & Building -- place barricades that slow and block zombies!
