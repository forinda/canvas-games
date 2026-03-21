# Step 2: Shooting Mechanics

**Goal:** Aim and shoot at zombies with limited ammo, including bullet rendering and movement.

**Time:** ~15 minutes

---

## What You'll Build

- **Click-to-shoot** mechanic that fires yellow bullets from the player toward the mouse
- **Bullet physics** with velocity, arena bounds checking, and cleanup
- **Ammo tracking** with a fire-rate cooldown to prevent instant depletion
- **A HUD top bar** showing HP, ammo count, resources, and score
- **Bottom hint bar** displaying control reminders

---

## Concepts

- **Projectile Velocity from Angle**: `vx = cos(angle) * BULLET_SPEED` and `vy = sin(angle) * BULLET_SPEED` launch a bullet in the player's facing direction at 600 px/s. The spawn position is offset from the player center by `PLAYER_RADIUS + BULLET_RADIUS + 2` so the bullet does not start inside the player.
- **Fire-Rate Cooldown**: `shootCooldown` counts down each frame by `dt`. A new bullet can only fire when `shootCooldown <= 0` and there is ammo. After firing, it resets to 0.18 seconds, giving a fire rate of ~5.5 shots/second.
- **Dead Flag Pattern**: Instead of removing bullets from the array during iteration (which causes index shifting bugs), we set `b.dead = true` and filter after the loop. This pattern is used for all entities throughout the game.
- **HUD Rendering**: The HUD draws directly on the canvas (not inside the arena transform), so it stays at fixed screen coordinates regardless of arena scaling.

---

## Code

### 1. Update the Player System

**File:** `src/games/zombie-survival/systems/PlayerSystem.ts`

Add shooting and barricade placement to the existing movement logic.

```typescript
import type { GameState } from '../types.ts';
import type { InputSnapshot } from './InputSystem.ts';
import {
  PLAYER_SPEED,
  PLAYER_RADIUS,
  BULLET_SPEED,
  BULLET_DAMAGE,
  BULLET_RADIUS,
  BARRICADE_SIZE,
  BARRICADE_HP,
  BARRICADE_COST,
  ARENA_W,
  ARENA_H,
} from '../types.ts';

export class PlayerSystem {
  private input!: InputSnapshot;

  setInput(input: InputSnapshot): void {
    this.input = input;
  }

  update(state: GameState, dt: number): void {
    const inp = this.input;
    if (!inp) return;

    const player = state.player;

    // ─── Movement ──────────────────────────────────────
    let dx = inp.moveX;
    let dy = inp.moveY;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len > 0) {
      dx /= len;
      dy /= len;
    }

    player.x += dx * PLAYER_SPEED * dt;
    player.y += dy * PLAYER_SPEED * dt;

    // Clamp to arena
    player.x = Math.max(PLAYER_RADIUS, Math.min(ARENA_W - PLAYER_RADIUS, player.x));
    player.y = Math.max(PLAYER_RADIUS, Math.min(ARENA_H - PLAYER_RADIUS, player.y));

    // ─── Aim ───────────────────────────────────────────
    player.angle = Math.atan2(inp.aimY - player.y, inp.aimX - player.x);

    // ─── Shooting ──────────────────────────────────────
    player.shootCooldown = Math.max(0, player.shootCooldown - dt);

    if (inp.shooting && player.shootCooldown <= 0 && player.ammo > 0) {
      this.fireBullet(state);
      player.ammo--;
      player.shootCooldown = 0.18; // fire rate
    }

    // ─── Invincibility ─────────────────────────────────
    player.invincibleTimer = Math.max(0, player.invincibleTimer - dt);

    // ─── Place Barricade ───────────────────────────────
    if (inp.placeBarricade && player.resources >= BARRICADE_COST) {
      this.placeBarricade(state);
    }
  }

  private fireBullet(state: GameState): void {
    const p = state.player;
    const vx = Math.cos(p.angle) * BULLET_SPEED;
    const vy = Math.sin(p.angle) * BULLET_SPEED;

    state.bullets.push({
      id: state.nextId++,
      x: p.x + Math.cos(p.angle) * (PLAYER_RADIUS + BULLET_RADIUS + 2),
      y: p.y + Math.sin(p.angle) * (PLAYER_RADIUS + BULLET_RADIUS + 2),
      vx,
      vy,
      damage: BULLET_DAMAGE,
      dead: false,
    });
  }

  private placeBarricade(state: GameState): void {
    const p = state.player;
    const dist = PLAYER_RADIUS + BARRICADE_SIZE * 0.8;
    const bx = p.x + Math.cos(p.angle) * dist;
    const by = p.y + Math.sin(p.angle) * dist;

    const halfB = BARRICADE_SIZE / 2;
    const cx = Math.max(halfB, Math.min(ARENA_W - halfB, bx));
    const cy = Math.max(halfB, Math.min(ARENA_H - halfB, by));

    // Don't place if overlapping another barricade
    for (const b of state.barricades) {
      if (b.dead) continue;
      const ddx = cx - b.x;
      const ddy = cy - b.y;
      if (Math.abs(ddx) < BARRICADE_SIZE && Math.abs(ddy) < BARRICADE_SIZE) {
        return;
      }
    }

    state.player.resources -= BARRICADE_COST;
    state.barricades.push({
      id: state.nextId++,
      x: cx,
      y: cy,
      hp: BARRICADE_HP,
      maxHp: BARRICADE_HP,
      dead: false,
    });
  }
}
```

**What's happening:**
- `fireBullet()` creates a new `Bullet` entity at the tip of the gun barrel. The velocity `(vx, vy)` is computed from the player's facing angle and `BULLET_SPEED = 600`, so bullets travel 600 pixels per second.
- After firing, `shootCooldown` is set to 0.18 seconds. The player cannot fire again until this counts down to zero. This gives the game a rhythmic shooting feel rather than instant ammo dump.
- `placeBarricade()` puts a barricade in front of the player (offset by `PLAYER_RADIUS + BARRICADE_SIZE * 0.8` in the aim direction). It checks for overlaps with existing barricades and deducts `BARRICADE_COST = 20` resources.

---

### 2. Create the Combat System

**File:** `src/games/zombie-survival/systems/CombatSystem.ts`

Moves bullets, checks collisions, and manages particle effects. For now only bullet movement and out-of-bounds cleanup. Zombie collision is added in Step 3.

```typescript
import type { GameState } from '../types.ts';
import { ARENA_W, ARENA_H, BULLET_RADIUS, BARRICADE_SIZE, PLAYER_RADIUS } from '../types.ts';

export class CombatSystem {
  update(state: GameState, dt: number): void {
    this.updateBullets(state, dt);
    this.updateParticles(state, dt);
  }

  private updateBullets(state: GameState, dt: number): void {
    for (const b of state.bullets) {
      if (b.dead) continue;

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Out of arena
      if (b.x < -20 || b.x > ARENA_W + 20 || b.y < -20 || b.y > ARENA_H + 20) {
        b.dead = true;
      }
    }

    state.bullets = state.bullets.filter((b) => !b.dead);
  }

  private updateParticles(state: GameState, dt: number): void {
    for (const p of state.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
    }

    state.particles = state.particles.filter((p) => p.alpha > 0);

    // Cap particles
    if (state.particles.length > 200) {
      state.particles.splice(0, state.particles.length - 200);
    }
  }
}
```

**What's happening:**
- Each bullet moves by `vx * dt` and `vy * dt` every frame. At 600 px/s, a bullet crosses the 1200px arena in 2 seconds.
- Bullets are marked dead when they exit 20 pixels beyond the arena edge (a small buffer to avoid visual popping).
- `state.bullets.filter(b => !b.dead)` removes dead bullets after iteration, avoiding index-shifting bugs during the loop.
- Particles decay in alpha each frame by their `decay` rate. When alpha reaches zero, they are removed. A hard cap of 200 particles prevents memory growth from rapid fire.

---

### 3. Update the Game Renderer

**File:** `src/games/zombie-survival/renderers/GameRenderer.ts`

Add bullet rendering to the existing arena and player drawing.

```typescript
import type { GameState } from '../types.ts';
import { ARENA_W, ARENA_H, PLAYER_RADIUS, BULLET_RADIUS } from '../types.ts';

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
- Bullets are drawn as small yellow circles (`#f1c40f`, 3px radius) before the player so they appear to emerge from beneath the gun barrel.
- Particles use `ctx.globalAlpha` set to their current `alpha` value, creating a fade-out effect. The alpha is reset to 1 after the particle loop.

---

### 4. Create the HUD Renderer

**File:** `src/games/zombie-survival/renderers/HUDRenderer.ts`

Displays HP, ammo, resources, and score in a top bar, plus control hints at the bottom.

```typescript
import type { GameState } from '../types.ts';
import { BARRICADE_COST } from '../types.ts';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: GameState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

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

    // HP
    const hpPct = state.player.hp / state.player.maxHp;
    const hpColor = hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f1c40f' : '#e74c3c';

    ctx.fillStyle = hpColor;
    ctx.fillText(`HP: ${Math.ceil(state.player.hp)}/${state.player.maxHp}`, x, y);
    x += 130;

    // HP bar
    const hpBarW = 80;
    const hpBarH = 8;

    ctx.fillStyle = '#333';
    ctx.fillRect(x, y - hpBarH / 2, hpBarW, hpBarH);
    ctx.fillStyle = hpColor;
    ctx.fillRect(x, y - hpBarH / 2, hpBarW * hpPct, hpBarH);
    x += hpBarW + 20;

    // Ammo
    ctx.fillStyle = '#f1c40f';
    ctx.fillText(`Ammo: ${Math.floor(state.player.ammo)}/${state.player.maxAmmo}`, x, y);
    x += 140;

    // Resources
    ctx.fillStyle = '#e67e22';
    ctx.fillText(`Resources: ${Math.floor(state.player.resources)}`, x, y);
    x += 150;

    // Score
    ctx.fillStyle = '#ecf0f1';
    ctx.fillText(`Score: ${state.score}`, x, y);
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
}
```

**What's happening:**
- The top bar is a semi-transparent black strip with stats laid out left-to-right. The HP text color changes from green to yellow to red based on health percentage.
- An HP progress bar sits next to the text: dark gray background with a colored fill proportional to `hp / maxHp`.
- The bottom hint bar shows controls in a centered line. The barricade hint dims when the player cannot afford it (resources below `BARRICADE_COST`).
- The pause overlay is a dark scrim with centered text, only drawn when `state.screen === 'paused'`.

---

### 5. Update the Engine

**File:** `src/games/zombie-survival/ZombieEngine.ts`

Wire in the CombatSystem, HUDRenderer, and pause toggle.

```typescript
import type { GameState } from './types.ts';
import { ARENA_W, ARENA_H, MAX_AMMO, DAY_DURATION } from './types.ts';
import { InputSystem } from './systems/InputSystem.ts';
import { PlayerSystem } from './systems/PlayerSystem.ts';
import { CombatSystem } from './systems/CombatSystem.ts';
import { GameRenderer } from './renderers/GameRenderer.ts';
import { HUDRenderer } from './renderers/HUDRenderer.ts';

export class ZombieEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState;

  private inputSystem: InputSystem;
  private playerSystem: PlayerSystem;
  private combatSystem: CombatSystem;
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;

  private lastTime = 0;
  private rafId = 0;
  private running = false;
  private onExit: () => void;

  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.canvas = canvas;
    this.onExit = onExit;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    this.state = this.createInitialState();

    this.inputSystem = new InputSystem(canvas, () => this.state);
    this.playerSystem = new PlayerSystem();
    this.combatSystem = new CombatSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    this.resizeHandler = () => this.handleResize();
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

    // Handle pause toggle
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
    this.inputSystem.detach();
  }
}
```

**What's happening:**
- The `CombatSystem` is added to the update loop after `PlayerSystem`, so bullets created this frame immediately start moving.
- The `HUDRenderer` is called after `GameRenderer` so the HUD overlays the game scene.
- Pause logic checks `input.pause` before the `screen !== 'playing'` guard, allowing toggle between `playing` and `paused`. When paused, no systems update but rendering still runs (showing the pause overlay).

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Zombie Survival game in your browser
3. **Observe:**
   - **Click** to fire yellow bullets in the direction of your mouse
   - Watch the **ammo counter** in the top bar decrease with each shot
   - **Hold click** -- bullets fire rapidly but with a slight cooldown between shots
   - **Fire 30 shots** -- the counter hits 0 and clicking no longer fires
   - **Press E** -- a brown barricade appears in front of the player (resources decrease by 20)
   - **Press P** -- the game pauses with a dark overlay and "PAUSED" text
   - **Press P again** -- the game resumes

---

## Challenges

**Easy:**
- Change the bullet color from yellow to red (`#e74c3c`).
- Increase `MAX_AMMO` to 50 and observe the HUD update.

**Medium:**
- Add a muzzle flash effect: when a bullet is fired, temporarily draw a white circle at the barrel tip that fades out over 0.1 seconds.

**Hard:**
- Implement a shotgun mode: when the player fires, spawn 3 bullets in a 15-degree fan spread instead of 1. Each bullet should deal reduced damage.

---

## What You Learned

- Creating projectile entities with velocity computed from an angle
- Implementing fire-rate cooldown to control shooting rhythm
- Using the dead-flag pattern to safely remove entities during iteration
- Building a HUD with dynamic stat bars, color-coded health, and pause overlay

**Next:** Zombie Spawning & AI -- zombies spawn at edges and swarm toward the player!
