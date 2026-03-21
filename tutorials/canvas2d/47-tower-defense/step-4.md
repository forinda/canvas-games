# Step 4: Tower Shooting & Projectiles

**Goal:** Towers automatically target the nearest-to-exit enemy within range and fire tracking projectiles at them.

**Time:** ~15 minutes

---

## What You'll Build

- **Tower targeting system** that finds the enemy furthest along the path within each tower's range
- **Projectile spawning** when a tower's fire cooldown expires
- **Tracking projectiles** that steer toward their target's current position
- **Projectile renderer** with colored trails and glowing heads for each projectile type

---

## Concepts

- **"First" Targeting Strategy**: Towers target the enemy closest to the exit (highest `pathProgress` score). This is the most strategically useful default because it ensures towers focus on the most immediate threat. The enemy list is scanned each frame, and only enemies within the tower's range are candidates.
- **Fire Rate Cooldown**: Each tower stores `lastFiredAt` as a timestamp. A tower can only fire when `now - lastFiredAt >= fireInterval`. This creates distinct tower personalities: Archers fire rapidly (600ms), Snipers fire slowly (2200ms).
- **Projectile Tracking**: Projectiles don't fly to a fixed point. Each frame, if the target is still alive, the projectile updates its destination (`toX`, `toY`) to the target's current position. This means projectiles curve to follow moving enemies, making them feel smart.
- **Linear Interpolation Movement**: Each frame, the projectile moves `speed * dt` pixels toward its target. When the remaining distance is less than the frame's travel, the projectile "hits" and is marked `done`.

---

## Code

### 1. Create the Tower System

**File:** `src/contexts/canvas2d/games/tower-defense/systems/TowerSystem.ts`

```typescript
import type { ActiveEnemy, GameStateData, PlacedTower, Projectile } from '../types';
import { TOWER_DEFS, getTowerStats } from '../data/towers';
import type { GridSystem } from './GridSystem';
import { pathProgress } from './PathSystem';

let _projCounter = 0;

export class TowerSystem {
  static update(state: GameStateData, grid: GridSystem): void {
    const now = performance.now();

    for (const tower of state.towers) {
      const stats = getTowerStats(tower.type, tower.level);

      // Find target: enemy furthest along path within range
      const target = TowerSystem.findTarget(state, tower, stats.range, grid);
      tower.targetId = target ? target.id : null;

      if (!target) continue;

      // Check fire rate cooldown
      if (now - tower.lastFiredAt < stats.fireInterval) continue;

      tower.lastFiredAt = now;

      // Spawn projectile
      const center = grid.cellCenter(tower.col, tower.row);
      const proj: Projectile = {
        id: `proj_${++_projCounter}`,
        type: stats.projectileType,
        fromX: center.x,
        fromY: center.y,
        toX: target.x,
        toY: target.y,
        x: center.x,
        y: center.y,
        speed: stats.projectileSpeed,
        damage: stats.damage,
        splashRadius: stats.splashRadius,
        slowFactor: stats.slowFactor,
        targetId: target.id,
        done: false,
        color: TOWER_DEFS[tower.type].color,
      };

      state.projectiles.push(proj);
    }
  }

  /** Find the enemy furthest along the path that is within range */
  static findTarget(
    state: GameStateData,
    tower: PlacedTower,
    range: number,
    grid: GridSystem,
  ): ActiveEnemy | null {
    const center = grid.cellCenter(tower.col, tower.row);
    let best: ActiveEnemy | null = null;
    let bestProgress = -1;

    for (const enemy of state.enemies) {
      if (enemy.dead || enemy.reachedEnd) continue;

      const dx = enemy.x - center.x;
      const dy = enemy.y - center.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > range) continue;

      const pp = pathProgress(enemy);
      if (pp > bestProgress) {
        bestProgress = pp;
        best = enemy;
      }
    }

    return best;
  }
}
```

**What's happening:**
- Each frame, every tower scans all living enemies. For each enemy within range (Euclidean distance from tower center to enemy position), it computes `pathProgress` -- the sum of `waypointIndex + progress`.
- The enemy with the highest path progress is selected as the target. This "first" strategy is optimal because killing the enemy closest to your exit prevents the most damage.
- `tower.targetId` is updated every frame even when not firing. The tower renderer uses this to draw a targeting line and rotate the tower barrel toward the target.
- When the cooldown is satisfied, a `Projectile` is created at the tower's center, aimed at the target's current position, carrying the tower's damage and special properties (splash, slow).

---

### 2. Create the Combat System

**File:** `src/contexts/canvas2d/games/tower-defense/systems/CombatSystem.ts`

Moves projectiles and handles hit detection.

```typescript
import type { GameStateData } from '../types';
import { EnemySystem } from './EnemySystem';

const MAX_PROJECTILES = 150;

export class CombatSystem {
  static update(state: GameStateData, dt: number): void {
    // Cap projectile count to prevent unbounded growth
    if (state.projectiles.length > MAX_PROJECTILES) {
      state.projectiles.splice(0, state.projectiles.length - MAX_PROJECTILES);
    }

    for (const proj of state.projectiles) {
      if (proj.done) continue;

      // Track target's current position (projectiles home in)
      const target = state.enemies.find(e => e.id === proj.targetId);
      if (target && !target.dead && !target.reachedEnd) {
        proj.toX = target.x;
        proj.toY = target.y;
      }

      // Move projectile toward target
      const dx = proj.toX - proj.x;
      const dy = proj.toY - proj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const travel = proj.speed * dt;

      if (dist <= travel + 1) {
        // Hit!
        proj.x = proj.toX;
        proj.y = proj.toY;
        proj.done = true;

        if (proj.splashRadius > 0) {
          // Area damage (cannons)
          EnemySystem.applyAreaDamage(
            state, proj.x, proj.y,
            proj.splashRadius, proj.damage, proj.slowFactor,
          );
        } else if (target && !target.dead) {
          // Single target damage
          EnemySystem.applyDamage(state, target.id, proj.damage, proj.slowFactor);
        }
      } else {
        // Still traveling -- normalize and advance
        const nx = dx / dist;
        const ny = dy / dist;
        proj.x += nx * travel;
        proj.y += ny * travel;
      }
    }

    // Remove completed projectiles
    state.projectiles = state.projectiles.filter(p => !p.done);
  }
}
```

**What's happening:**
- Each frame, every active projectile updates its destination to the target's current position (`proj.toX = target.x`). This creates the homing behavior that makes projectiles feel responsive.
- Movement uses normalized direction vectors. `(dx/dist, dy/dist)` gives a unit vector toward the target, multiplied by `speed * dt` for frame-rate-independent travel.
- The hit check uses `dist <= travel + 1`. The `+1` pixel tolerance prevents projectiles from oscillating around the target at very high speeds.
- On hit, the system branches: splash projectiles (cannonballs) call `applyAreaDamage` which damages all enemies within the splash radius. Single-target projectiles call `applyDamage` directly.
- `MAX_PROJECTILES = 150` prevents memory issues during intense waves. Old projectiles are culled first.

---

### 3. Add Damage Methods to EnemySystem

Add these methods to your existing `EnemySystem` class:

```typescript
  /** Apply damage to a single enemy */
  static applyDamage(
    state: GameStateData,
    enemyId: string,
    damage: number,
    slowFactor: number,
    slowDuration = 2000,
  ): void {
    const enemy = state.enemies.find(e => e.id === enemyId);
    if (!enemy || enemy.dead) return;

    enemy.hp -= damage;
    enemy.hpBarTimer = performance.now() + 2000;

    if (slowFactor > 0 && !ENEMY_DEFS[enemy.type].immuneToSlow) {
      enemy.slowUntil = performance.now() + slowDuration;
    }

    if (enemy.hp <= 0) {
      enemy.dead = true;
    }
  }

  /** Apply area damage to all enemies within a radius */
  static applyAreaDamage(
    state: GameStateData,
    cx: number, cy: number,
    radius: number,
    damage: number,
    slowFactor: number,
  ): void {
    for (const enemy of state.enemies) {
      if (enemy.dead) continue;
      const dx = enemy.x - cx;
      const dy = enemy.y - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        EnemySystem.applyDamage(state, enemy.id, damage, slowFactor);
      }
    }
  }
```

**What's happening:**
- `applyDamage` reduces HP and checks for death. It also sets `hpBarTimer` so the HP bar shows for 2 seconds after the hit.
- If the projectile has a `slowFactor` (Frost towers), the enemy's `slowUntil` is set to 2 seconds in the future. Enemies marked with `immuneToSlow` (Ghosts) are unaffected.
- `applyAreaDamage` checks all enemies against a circular radius using squared-distance comparison (avoiding the `sqrt` cost). Every enemy within the splash circle takes full damage.

---

### 4. Create the Projectile Renderer

**File:** `src/contexts/canvas2d/games/tower-defense/renderers/ProjectileRenderer.ts`

```typescript
import type { GameStateData, Projectile } from '../types';

const PROJ_COLORS: Record<string, { trail: string; head: string; size: number }> = {
  arrow:      { trail: '#c8a050', head: '#ffd080', size: 3 },
  cannonball: { trail: '#666',    head: '#333',    size: 6 },
  frostbolt:  { trail: '#80d8ff', head: '#e1f5fe', size: 4 },
  bullet:     { trail: '#ffeb3b', head: '#fff',    size: 2 },
};

export class ProjectileRenderer {
  render(ctx: CanvasRenderingContext2D, state: GameStateData): void {
    for (const proj of state.projectiles) {
      if (proj.done) continue;
      this.drawProjectile(ctx, proj);
    }
  }

  private drawProjectile(ctx: CanvasRenderingContext2D, proj: Projectile) {
    const style = PROJ_COLORS[proj.type] ?? { trail: '#fff', head: '#fff', size: 3 };

    // Direction vector for trail
    const dx = proj.x - proj.fromX;
    const dy = proj.y - proj.fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      const trailLen = Math.min(dist, style.size * 8);

      // Gradient trail from transparent to colored
      const tx = proj.x - nx * trailLen;
      const ty = proj.y - ny * trailLen;
      const grad = ctx.createLinearGradient(tx, ty, proj.x, proj.y);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, style.trail);

      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(proj.x, proj.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = style.size * 0.7;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Glowing head
    ctx.shadowColor = style.head;
    ctx.shadowBlur = style.size * 2;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, style.size, 0, Math.PI * 2);
    ctx.fillStyle = style.head;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
```

**What's happening:**
- Each projectile type has a distinct visual style. Arrows are small and warm-toned. Cannonballs are large and dark. Frostbolts glow blue. Bullets are tiny and bright.
- The trail uses a linear gradient from transparent to the trail color, creating a fading streak behind the projectile. The trail length is capped at `size * 8` pixels so it doesn't stretch too far.
- The head uses `shadowBlur` to create a glow effect. This makes projectiles visible against the dark background even when they're small.
- `lineCap = 'round'` gives the trail smooth endpoints instead of flat cuts.

---

### 5. Update the Game Engine

Add the tower system, combat system, and projectile renderer to the game loop.

```typescript
// Add imports:
import { TowerSystem } from './systems/TowerSystem';
import { CombatSystem } from './systems/CombatSystem';
import { ProjectileRenderer } from './renderers/ProjectileRenderer';

// Add to constructor:
this.projectileRenderer = new ProjectileRenderer();

// Update the update() method:
private update(dt: number): void {
  EnemySystem.update(this.state, dt, this.grid);
  TowerSystem.update(this.state, this.grid);
  CombatSystem.update(this.state, dt);
}

// Update the render() method (add after towerRenderer):
this.projectileRenderer.render(ctx, state);
```

---

### 6. Add Slow Effect to EnemySystem Update

Update the enemy movement to check for active slow effects:

```typescript
// In EnemySystem.update(), replace the effectiveSpeed line:
const now = performance.now();
const slowActive = now < enemy.slowUntil;
const immune = ENEMY_DEFS[enemy.type].immuneToSlow;
const effectiveSpeed = slowActive && !immune
  ? enemy.baseSpeed * 0.5
  : enemy.baseSpeed;
```

**What's happening:**
- Each frame, the enemy checks if `slowUntil` is in the future. If so, and the enemy isn't immune, its speed is halved.
- This integrates with the Frost tower's `slowFactor`. When a frostbolt hits, it sets `slowUntil` to 2 seconds from now. The enemy's blue ring (drawn in the enemy renderer when slowed) gives visual feedback.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Tower Defense game in your browser
3. **Observe:**
   - Place an **Archer** tower near the path -- it fires golden arrows rapidly
   - Place a **Cannon** tower -- large cannonballs fly slowly but deal splash damage
   - Place a **Frost** tower -- blue frostbolts hit enemies and slow them (blue ring appears)
   - Place a **Sniper** tower -- long-range, infrequent but powerful shots
   - **Projectiles track** enemies as they move, curving to follow them
   - Each projectile type has a distinct colored trail and head glow
   - Towers rotate to face their current target
   - When no enemies are in range, towers sit idle

---

## Challenges

**Easy:**
- Double the Archer's `projectileSpeed` to 800 and watch arrows arrive nearly instantly.
- Change the cannonball trail color to orange (`'#ff6600'`) for a more explosive feel.

**Medium:**
- Add a "nearest" targeting mode: instead of targeting the furthest-along-path enemy, target the closest enemy by Euclidean distance. Add a toggle key to switch modes.

**Hard:**
- Implement projectile "lead" targeting: instead of aiming at the enemy's current position, predict where the enemy will be when the projectile arrives (based on distance / projectile speed) and aim there. This is how real tower defense games prevent misses on fast enemies.

---

## What You Learned

- Implementing "first" targeting by scoring enemies with path progress
- Using fire-rate cooldowns with `performance.now()` timestamps
- Building tracking projectiles that update their destination each frame
- Rendering projectile trails with linear gradients and glowing heads
- Applying splash damage within a radius using squared-distance checks

**Next:** Damage, Health & Currency -- enemies take damage, die with particle effects, and drop gold!
