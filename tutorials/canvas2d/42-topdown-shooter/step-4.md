# Step 4: Enemies & Waves

**Goal:** Enemies spawn in waves at arena edges, chase the player, and can be destroyed by bullets.

**Time:** ~15 minutes

---

## What You'll Build

- **EnemySystem** with chase AI that steers enemies toward the player
- **WaveSystem** that spawns escalating waves of enemies with delays
- **Four enemy types**: normal (red), fast (orange), tank (brown), ranged (purple)
- **Bullet-enemy collision** detection that damages and destroys enemies
- **Enemy rendering** with colored circles and type labels (F, T, R)
- **Score and kill tracking** with per-type point values

---

## Concepts

- **Chase AI**: Each frame, compute the direction vector from enemy to player, normalize it, and multiply by the enemy's speed. This simple "seek" behavior makes enemies constantly home in on the player.
- **Circle-Circle Collision**: Two circles collide when the distance between their centers is less than the sum of their radii: `dist < r1 + r2`. This is the fastest collision check and perfect for a top-down shooter where everything is circular.
- **Wave Progression**: Waves start simple (only normal enemies) and layer in new types as the wave number increases. Enemy HP and speed also scale with wave number, creating a difficulty curve.
- **Edge Spawning**: Enemies appear at random positions along the arena edges so they always come from off-screen, giving the player time to react.

---

## Code

### 1. Create the Enemy System

**File:** `src/contexts/canvas2d/games/topdown-shooter/systems/EnemySystem.ts`

Handles enemy movement, collision with the player, and spawning.

```typescript
import type { ShooterState, Enemy, EnemyType } from '../types';
import { ARENA_PADDING, BULLET_SPEED, BULLET_RADIUS } from '../types';

interface EnemyTemplate {
  type: EnemyType;
  hp: number;
  speed: number;
  radius: number;
  color: string;
  damage: number;
}

const TEMPLATES: Record<EnemyType, EnemyTemplate> = {
  normal: {
    type: 'normal',
    hp: 2,
    speed: 100,
    radius: 14,
    color: '#ef5350',
    damage: 10,
  },
  fast: {
    type: 'fast',
    hp: 1,
    speed: 190,
    radius: 10,
    color: '#ffa726',
    damage: 8,
  },
  tank: {
    type: 'tank',
    hp: 6,
    speed: 55,
    radius: 22,
    color: '#8d6e63',
    damage: 20,
  },
  ranged: {
    type: 'ranged',
    hp: 2,
    speed: 60,
    radius: 13,
    color: '#ab47bc',
    damage: 8,
  },
};

export class EnemySystem {
  update(state: ShooterState, dt: number): void {
    const { player, enemies } = state;

    for (const e of enemies) {
      // ── Chase AI ───────────────────────────────────────────────
      const dx = player.pos.x - e.pos.x;
      const dy = player.pos.y - e.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        // Ranged enemies stop at distance 200
        const chase = e.type === 'ranged' ? dist > 200 : true;

        if (chase) {
          e.vel.x = (dx / dist) * e.speed;
          e.vel.y = (dy / dist) * e.speed;
        } else {
          e.vel.x = 0;
          e.vel.y = 0;
        }
      }

      e.pos.x += e.vel.x * dt;
      e.pos.y += e.vel.y * dt;

      // Clamp inside arena
      const pad = ARENA_PADDING + e.radius;
      e.pos.x = Math.max(pad, Math.min(state.canvasW - pad, e.pos.x));
      e.pos.y = Math.max(pad, Math.min(state.canvasH - pad, e.pos.y));

      // ── Ranged enemy shooting ──────────────────────────────────
      if (e.type === 'ranged') {
        e.shootTimer -= dt;

        if (e.shootTimer <= 0 && dist < 400) {
          e.shootTimer = 2.0;
          state.bullets.push({
            pos: { x: e.pos.x, y: e.pos.y },
            vel: {
              x: (dx / dist) * BULLET_SPEED * 0.45,
              y: (dy / dist) * BULLET_SPEED * 0.45,
            },
            age: 0,
            radius: BULLET_RADIUS,
            fromPlayer: false,
          });
        }
      }

      // ── Collision with player ──────────────────────────────────
      if (dist < e.radius + player.radius && player.invincibleTimer <= 0) {
        player.hp -= e.damage;
        player.invincibleTimer = 0.5;

        if (player.hp <= 0) {
          player.hp = 0;
          state.gameOver = true;
        }
      }
    }
  }

  /** Spawn a single enemy at a random edge position */
  spawnEnemy(state: ShooterState, wave: number): void {
    const type = this.pickType(wave);
    const tmpl = TEMPLATES[type];

    const pos = this.randomEdgePosition(state.canvasW, state.canvasH);

    const enemy: Enemy = {
      pos,
      vel: { x: 0, y: 0 },
      hp: tmpl.hp + Math.floor(wave / 4),
      maxHp: tmpl.hp + Math.floor(wave / 4),
      radius: tmpl.radius,
      speed: tmpl.speed + wave * 3,
      type: tmpl.type,
      color: tmpl.color,
      shootTimer: 1.5,
      damage: tmpl.damage,
    };

    state.enemies.push(enemy);
  }

  private pickType(wave: number): EnemyType {
    const r = Math.random();

    if (wave < 2) return 'normal';
    if (wave < 4) return r < 0.3 ? 'fast' : 'normal';
    if (wave < 6) {
      if (r < 0.2) return 'tank';
      if (r < 0.5) return 'fast';
      return 'normal';
    }
    // Wave 6+: all types
    if (r < 0.15) return 'ranged';
    if (r < 0.35) return 'tank';
    if (r < 0.55) return 'fast';
    return 'normal';
  }

  private randomEdgePosition(w: number, h: number) {
    const pad = ARENA_PADDING + 30;
    const side = Math.floor(Math.random() * 4);

    switch (side) {
      case 0:
        return { x: pad, y: pad + Math.random() * (h - 2 * pad) }; // left
      case 1:
        return { x: w - pad, y: pad + Math.random() * (h - 2 * pad) }; // right
      case 2:
        return { x: pad + Math.random() * (w - 2 * pad), y: pad }; // top
      default:
        return { x: pad + Math.random() * (w - 2 * pad), y: h - pad }; // bottom
    }
  }
}
```

**What's happening:**
- **Chase AI** computes `(player - enemy)`, normalizes it, and multiplies by the enemy's speed. Every frame, the enemy adjusts its heading to point at the player's current position.
- **Ranged enemies** behave differently: they stop chasing when within 200px and fire slow purple bullets every 2 seconds. This forces the player to dodge projectiles while also managing melee enemies.
- **Enemy-player collision** uses circle-circle: `dist < e.radius + player.radius`. On collision, the player takes damage equal to `e.damage` and becomes invincible for 0.5 seconds to prevent instant death from overlapping enemies.
- **`spawnEnemy()`** picks a type based on the current wave (more variety at higher waves), creates the enemy from a template, and adds scaling: `+1 HP per 4 waves` and `+3 speed per wave`.
- **Edge spawning** picks a random side (top/bottom/left/right) and places the enemy at a random position along that edge.

---

### 2. Create the Wave System

**File:** `src/contexts/canvas2d/games/topdown-shooter/systems/WaveSystem.ts`

Manages wave progression, spawn timing, and between-wave delays.

```typescript
import type { ShooterState } from '../types';
import type { EnemySystem } from './EnemySystem';

const BETWEEN_WAVE_DELAY = 2.5; // seconds between waves

export class WaveSystem {
  private enemySystem: EnemySystem;

  constructor(enemySystem: EnemySystem) {
    this.enemySystem = enemySystem;
  }

  update(state: ShooterState, dt: number): void {
    const wd = state.waveData;

    if (!wd.active) {
      // Waiting between waves
      wd.betweenWaveTimer -= dt;

      if (wd.betweenWaveTimer <= 0) {
        this.startWave(state);
      }

      return;
    }

    // ── Spawn enemies during active wave ─────────────────────────
    if (wd.enemiesRemaining > 0) {
      wd.spawnTimer -= dt;

      if (wd.spawnTimer <= 0) {
        wd.spawnTimer = wd.spawnInterval;
        wd.enemiesRemaining -= 1;
        this.enemySystem.spawnEnemy(state, wd.wave);
      }
    }

    // ── Wave complete when all spawned + all dead ────────────────
    if (wd.enemiesRemaining <= 0 && state.enemies.length === 0) {
      wd.active = false;
      wd.betweenWaveTimer = BETWEEN_WAVE_DELAY;
    }
  }

  private startWave(state: ShooterState): void {
    const wd = state.waveData;

    wd.wave += 1;
    wd.enemiesRemaining = this.enemyCountForWave(wd.wave);
    wd.spawnInterval = Math.max(0.25, 1.0 - wd.wave * 0.05);
    wd.spawnTimer = 0.3;
    wd.active = true;
  }

  private enemyCountForWave(wave: number): number {
    // Base 4, +3 per wave, capped at 40
    return Math.min(40, 4 + wave * 3);
  }
}
```

**What's happening:**
- The wave system has two states: **between waves** (countdown timer) and **active** (spawning enemies).
- During the countdown, `betweenWaveTimer` decreases. When it hits zero, `startWave()` increments the wave number and sets how many enemies to spawn.
- During an active wave, enemies spawn one at a time on a `spawnInterval` timer. The interval shrinks each wave (from 1.0s down to 0.25s), so later waves feel more intense.
- A wave ends when all enemies have been spawned (`enemiesRemaining <= 0`) AND all enemies are dead (`enemies.length === 0`). This means you must clear the wave before the next one starts.
- Enemy count scales as `4 + wave * 3`, capped at 40. Wave 1 has 7 enemies; wave 10 has 34.

---

### 3. Update the Bullet System

**File:** `src/contexts/canvas2d/games/topdown-shooter/systems/BulletSystem.ts`

Add bullet-enemy collision detection and scoring.

```typescript
import type { ShooterState } from '../types';
import { BULLET_LIFETIME, ARENA_PADDING } from '../types';

export class BulletSystem {
  update(state: ShooterState, dt: number): void {
    const { bullets, enemies, player } = state;

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

            if (e.hp <= 0) {
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

          if (player.hp <= 0) {
            player.hp = 0;
            state.gameOver = true;
          }
        }
      }
    }
  }
}
```

**What's happening:**
- **Player bullets vs enemies**: For each player bullet, we check against every enemy. On collision, the enemy loses 1 HP and the bullet is consumed (`break` exits the inner loop). If the enemy's HP reaches zero, it is removed and the player earns score based on enemy type.
- **Enemy bullets vs player**: Ranged enemies fire bullets with `fromPlayer: false`. These check collision against the player. On hit, the player loses 8 HP and gains 0.3s of invincibility to prevent multi-hit from a single bullet cluster.
- **Score values**: tanks are worth 30 (they are tough), ranged 20 (they are dangerous), fast 15 (they are tricky), normal 10.
- The `break` after consuming a bullet is critical -- without it, one bullet could damage multiple enemies in a single frame.

---

### 4. Update the Game Renderer

**File:** `src/contexts/canvas2d/games/topdown-shooter/renderers/GameRenderer.ts`

Add enemy rendering with colored circles, type labels, and HP bars.

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

    // Player body
    ctx.fillStyle = '#42a5f5';
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
- **Enemy bodies** are drawn as colored circles. Each type has a distinct color defined in the templates: red for normal, orange for fast, brown for tank, purple for ranged.
- **HP bars** appear above damaged enemies. The bar width is `radius * 2` so it matches the enemy's visual size. A dark background bar shows max HP, and a green fill bar shows current HP as a fraction.
- **Type labels** display a single letter (F, T, R) centered on the enemy. Normal enemies have no label since they are the default. Font size scales with radius so it fits inside the circle.
- Draw order is: background, bullets, enemies, then player. The player is always on top so you can see yourself even when surrounded.

---

### 5. Update the Engine

**File:** `src/contexts/canvas2d/games/topdown-shooter/ShooterEngine.ts`

Add EnemySystem and WaveSystem.

```typescript
import type { ShooterState } from './types';
import { PLAYER_RADIUS, PLAYER_MAX_HP } from './types';
import { InputSystem } from './systems/InputSystem';
import { PlayerSystem } from './systems/PlayerSystem';
import { EnemySystem } from './systems/EnemySystem';
import { BulletSystem } from './systems/BulletSystem';
import { WaveSystem } from './systems/WaveSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class ShooterEngine {
  private ctx: CanvasRenderingContext2D;
  private state: ShooterState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private playerSystem: PlayerSystem;
  private enemySystem: EnemySystem;
  private bulletSystem: BulletSystem;
  private waveSystem: WaveSystem;
  private gameRenderer: GameRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.createInitialState(canvas.width, canvas.height);

    this.playerSystem = new PlayerSystem();
    this.enemySystem = new EnemySystem();
    this.bulletSystem = new BulletSystem();
    this.waveSystem = new WaveSystem(this.enemySystem);
    this.gameRenderer = new GameRenderer();
    this.inputSystem = new InputSystem(this.state, canvas);

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
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (!this.state.paused && !this.state.gameOver) {
      this.playerSystem.update(this.state, dt);
      this.enemySystem.update(this.state, dt);
      this.bulletSystem.update(this.state, dt);
      this.waveSystem.update(this.state, dt);
    }

    this.gameRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private createInitialState(w: number, h: number): ShooterState {
    return {
      canvasW: w,
      canvasH: h,
      player: {
        pos: { x: w / 2, y: h / 2 },
        hp: PLAYER_MAX_HP,
        maxHp: PLAYER_MAX_HP,
        radius: PLAYER_RADIUS,
        shootCooldown: 0,
        invincibleTimer: 0,
      },
      bullets: [],
      enemies: [],
      particles: [],
      waveData: {
        wave: 0,
        enemiesRemaining: 0,
        spawnTimer: 0,
        spawnInterval: 1,
        betweenWaveTimer: 1.5,
        active: false,
      },
      score: 0,
      highScore: 0,
      kills: 0,
      gameOver: false,
      paused: false,
      started: true,
      keys: new Set(),
      mouse: { x: w / 2, y: h / 2 },
      mouseDown: false,
    };
  }
}
```

**What's happening:**
- All four systems now run in the update loop in order: PlayerSystem (movement + shooting), EnemySystem (AI + enemy-player collision), BulletSystem (bullet movement + bullet-enemy collision), WaveSystem (spawn timing).
- `WaveSystem` receives a reference to `EnemySystem` in its constructor so it can call `spawnEnemy()`. This is dependency injection -- the wave system controls timing, while the enemy system handles creation.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Top-Down Shooter game in your browser
3. **Observe:**
   - After ~1.5 seconds, **Wave 1** starts and red enemies appear at the arena edges
   - Enemies **chase the player** relentlessly
   - **Click to shoot** -- bullets destroy enemies on contact (normal enemies take 2 hits)
   - After clearing all enemies, a ~2.5 second delay before the next wave starts
   - **Wave 2+** introduces orange "F" (fast) enemies that are quicker
   - **Wave 4+** introduces brown "T" (tank) enemies that take many hits
   - **Wave 6+** introduces purple "R" (ranged) enemies that shoot purple bullets at you
   - Getting touched by an enemy **deals damage** and triggers brief invincibility
   - HP reaching 0 sets `gameOver = true` (no overlay yet -- that comes in Step 6)

---

## Challenges

**Easy:**
- Change the `BETWEEN_WAVE_DELAY` to 5 seconds to give yourself more breathing room between waves.
- Modify a tank's HP from 6 to 3 and see how much easier they become.

**Medium:**
- Add a new enemy type "swarm" that has 1 HP, 150 speed, and radius 6 -- tiny and fast, appearing in large numbers.

**Hard:**
- Implement enemy-enemy collision so enemies push each other apart instead of stacking on the same pixel when chasing the player.

---

## What You Learned

- Implementing "seek" AI where enemies constantly recompute direction toward the player
- Circle-circle collision detection with `dist < r1 + r2`
- Wave-based spawning with escalating difficulty (more enemies, new types, scaling stats)
- Edge spawning to create enemies off-screen
- Scoring system with per-type point values
- System composition using dependency injection (WaveSystem depends on EnemySystem)

**Next:** Weapons and pickups -- adding weapon upgrades, health drops, and invincibility feedback!
