# Step 5: Damage, Health & Currency

**Goal:** Enemies take damage and die with particle explosions, earn gold from kills, and display floating damage numbers and a HUD with game stats.

**Time:** ~15 minutes

---

## What You'll Build

- **Economy system** that tracks gold, score, and high scores with localStorage persistence
- **Death particle effects** that burst from enemies when they are killed
- **Floating damage numbers** that rise and fade above hit enemies
- **HUD bar** showing lives, gold, score, wave count, and game mode
- **Particle renderer** with gravity and alpha decay for satisfying death animations

---

## Concepts

- **Economy Loop**: The core tower defense loop is: spend gold to place towers, towers kill enemies, enemies drop gold, use gold to place more towers. Balancing income (enemy rewards + wave bonuses) against costs (tower prices + upgrades) is what makes the game strategic.
- **Floating Damage Numbers**: When a projectile hits, a `-damage` text spawns at the enemy's position, drifts upward, and fades out over 0.8 seconds. This gives immediate feedback on how much damage each hit deals.
- **Particle Systems**: Death particles are simple objects with position, velocity, gravity, and alpha decay. Each frame, `x += vx * dt`, `vy += gravity * dt`, and `alpha -= decay`. When alpha hits zero, the particle is removed. Eight particles per death create a satisfying burst.
- **High Score Persistence**: `localStorage` stores the best score across sessions. The economy system updates the high score automatically whenever the current score exceeds it.

---

## Code

### 1. Create the Economy System

**File:** `src/games/tower-defense/systems/EconomySystem.ts`

```typescript
import type { GameStateData } from '../types';

const HS_KEY = 'td_highscore';

export class EconomySystem {
  static spendGold(state: GameStateData, amount: number): void {
    state.gold = Math.max(0, state.gold - amount);
  }

  static earnGold(state: GameStateData, amount: number): void {
    state.gold += amount;
  }

  static addScore(state: GameStateData, points: number): void {
    state.score += points;

    if (state.score > state.highScore) {
      state.highScore = state.score;
      try {
        localStorage.setItem(HS_KEY, String(state.highScore));
      } catch { /* noop */ }
    }
  }

  static loadHighScore(): number {
    try {
      return parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
    } catch {
      return 0;
    }
  }

  /** Bonus gold awarded when all enemies in a wave are cleared */
  static waveCompleteBonus(state: GameStateData): void {
    let bonus = Math.round(state.currentWave * 25);
    if (state.mode === 'challenge') {
      bonus = Math.round(bonus * 0.6);
    }
    EconomySystem.earnGold(state, bonus);
  }
}
```

**What's happening:**
- `spendGold` clamps to zero to prevent negative gold (a defensive measure in case a check is missed). `earnGold` simply adds.
- `addScore` uses the enemy's `maxHp` as the score value, so harder enemies are worth more points. If the score exceeds the high score, it updates both the state and localStorage.
- `waveCompleteBonus` gives `wave * 25` gold at the end of each wave. Wave 1 gives 25 gold, wave 10 gives 250. Challenge mode reduces this by 40% to increase difficulty.
- The `try/catch` around localStorage handles environments where storage is unavailable (private browsing, iframe restrictions).

---

### 2. Update EnemySystem with Gold Rewards and Particles

Add gold earning, score tracking, and death particles to the enemy cleanup loop:

```typescript
// In EnemySystem.update(), replace the cleanup section:

    // Single-pass: process dead/ended and keep alive in one loop
    const alive: ActiveEnemy[] = [];

    for (const e of state.enemies) {
      if (e.dead) {
        // Award gold and score
        EconomySystem.earnGold(state, e.reward);
        EconomySystem.addScore(state, e.maxHp);
        // Spawn death particles
        EnemySystem.spawnDeathParticles(state, e.x, e.y, ENEMY_DEFS[e.type].color);
      } else if (!e.reachedEnd) {
        alive.push(e);
      }
    }

    state.enemies = alive;
```

Add the death particle spawner as a private method:

```typescript
  private static spawnDeathParticles(
    state: GameStateData,
    x: number,
    y: number,
    color: string,
  ): void {
    if (state.particles.length >= 200) return; // cap total particles

    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
      const speed = 60 + Math.random() * 80;
      const p: Particle = {
        id: `p_${Date.now()}_${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 3,
        color,
        alpha: 1,
        decay: 0.04 + Math.random() * 0.02,
        done: false,
      };
      state.particles.push(p);
    }
  }
```

**What's happening:**
- When an enemy dies, three things happen simultaneously: gold is earned, score is added, and 8 particles burst from the death position.
- The particles are evenly spaced around a circle (`2PI * i / 8`) with slight random jitter. Speed varies from 60-140 pixels/sec to create natural spread.
- Particle colors match the enemy color, so goblin deaths burst green and boss deaths burst red. This reinforces which enemy just died.
- The 200-particle cap prevents performance issues during intense waves where many enemies die per frame.

---

### 3. Add Floating Damage Numbers

Update the `applyDamage` method to spawn damage numbers:

```typescript
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

    // Floating damage number
    const dmgNum: DamageNumber = {
      id: `dn_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      x: enemy.x + (Math.random() - 0.5) * 10,
      y: enemy.y - 12,
      text: `-${damage}`,
      color: slowFactor > 0 ? '#4fc3f7' : '#ff5252',
      alpha: 1,
      age: 0,
    };
    state.damageNumbers.push(dmgNum);

    if (slowFactor > 0 && !ENEMY_DEFS[enemy.type].immuneToSlow) {
      enemy.slowUntil = performance.now() + slowDuration;
    }

    if (enemy.hp <= 0) {
      enemy.dead = true;
    }
  }
```

**What's happening:**
- Each hit creates a `DamageNumber` that appears slightly above the enemy with a small random horizontal offset to prevent stacking.
- Frost damage numbers are blue (`#4fc3f7`), regular damage numbers are red (`#ff5252`). This makes it easy to see which towers are dealing which hits.
- The `age` field is incremented in the update loop. Over 0.8 seconds, the number drifts upward (`y -= 40 * dt`) and fades out (`alpha = 1 - age / 0.8`).

---

### 4. Create the Particle Renderer

**File:** `src/games/tower-defense/renderers/ParticleRenderer.ts`

```typescript
import type { GameStateData } from '../types';

export class ParticleRenderer {
  update(state: GameStateData, dt: number): void {
    for (const p of state.particles) {
      if (p.done) continue;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt;      // gravity pulls particles down
      p.vx *= 0.97;           // air resistance
      p.alpha -= p.decay;

      if (p.alpha <= 0) p.done = true;
    }

    state.particles = state.particles.filter(p => !p.done);
  }

  render(ctx: CanvasRenderingContext2D, state: GameStateData): void {
    for (const p of state.particles) {
      if (p.done) continue;

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
- `update` applies physics each frame: position += velocity, velocity.y += gravity, velocity.x dampens. The 120 px/s^2 gravity makes particles arc downward naturally.
- `vx *= 0.97` simulates air resistance, preventing particles from flying off screen.
- `alpha -= decay` fades particles over ~20-25 frames (decay is 0.04-0.06). When alpha reaches zero, the particle is marked done.
- `render` draws each particle as a filled circle with `globalAlpha` set to the particle's current alpha. The alpha is reset to 1 after the loop.

---

### 5. Create the HUD Renderer

**File:** `src/games/tower-defense/renderers/HUDRenderer.ts`

Draws the top bar with lives, gold, score, and wave information.

```typescript
import type { GameStateData } from '../types';

export class HUDRenderer {
  readonly height = 52;

  render(ctx: CanvasRenderingContext2D, state: GameStateData, canvasW: number): void {
    const h = this.height;

    // Background
    ctx.fillStyle = '#0d1a0d';
    ctx.fillRect(0, 0, canvasW, h);

    // Bottom border
    ctx.fillStyle = '#2a4a2a';
    ctx.fillRect(0, h - 2, canvasW, 2);

    const cy = h / 2;
    const pad = 18;
    let x = pad;

    // Lives
    this.drawStat(ctx, x, cy, '\u2764\uFE0F', `${state.lives}/${state.maxLives}`, '#e74c3c');
    x += 110;

    // Gold
    this.drawStat(ctx, x, cy, '\u{1F4B0}', `${state.gold}`, '#f1c40f');
    x += 100;

    // Score
    this.drawStat(ctx, x, cy, '\u2B50', `${state.score}`, '#9b59b6');
    x += 110;

    // Wave
    const waveText = state.mode === 'endless'
      ? `Wave ${state.currentWave}`
      : `Wave ${state.currentWave}/${state.totalWaves}`;
    this.drawStat(ctx, x, cy, '\u{1F30A}', waveText, '#3498db');
    x += 140;

    // Mode badge
    const modeColors: Record<string, string> = {
      classic: '#2ecc71', endless: '#e67e22', challenge: '#e74c3c',
    };
    ctx.fillStyle = modeColors[state.mode] ?? '#888';
    ctx.font = 'bold 14px monospace';
    const modeLabel = state.mode.toUpperCase();
    const mw = ctx.measureText(modeLabel).width + 16;
    ctx.beginPath();
    ctx.roundRect(x, cy - 11, mw, 22, 5);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(modeLabel, x + mw / 2, cy);
    ctx.textAlign = 'left';

    // High score (right side)
    if (state.highScore > 0) {
      ctx.font = '12px monospace';
      ctx.fillStyle = '#666';
      ctx.textAlign = 'right';
      ctx.fillText(`Best: ${state.highScore}`, canvasW - pad, cy);
      ctx.textAlign = 'left';
    }
  }

  private drawStat(
    ctx: CanvasRenderingContext2D,
    x: number, cy: number,
    icon: string, value: string, color: string,
  ) {
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(icon, x, cy);
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = color;
    ctx.fillText(value, x + 24, cy);
  }
}
```

**What's happening:**
- The HUD is a fixed 52px bar at the top, matching the `hudHeight` used by the grid system for layout.
- Four stats are drawn left to right with emoji icons: hearts for lives, money bag for gold, star for score, wave icon for wave progress.
- The mode badge is a rounded rectangle filled with the mode's theme color (green for classic, orange for endless, red for challenge).
- The high score is right-aligned in muted gray, visible but not distracting.

---

### 6. Update the Game Engine

Add the particle renderer, HUD, and damage number updates to the game loop.

```typescript
// Add to constructor:
this.particleRenderer = new ParticleRenderer();
this.hudRenderer = new HUDRenderer();

// Update the update() method:
private update(dt: number): void {
  EnemySystem.update(this.state, dt, this.grid);
  TowerSystem.update(this.state, this.grid);
  CombatSystem.update(this.state, dt);
  this.particleRenderer.update(this.state, dt);

  // Update floating damage numbers
  for (const dn of this.state.damageNumbers) {
    dn.age += dt;
    dn.y -= 40 * dt;                      // drift upward
    dn.alpha = Math.max(0, 1 - dn.age / 0.8);  // fade over 0.8s
  }
  this.state.damageNumbers = this.state.damageNumbers.filter(dn => dn.alpha > 0);

  // Update placement fail flash timer
  if (this.state.placementFail) {
    this.state.placementFail.timer -= dt;
    if (this.state.placementFail.timer <= 0) {
      this.state.placementFail = null;
    }
  }
}

// Update the render() method:
private render(): void {
  const { ctx, canvas, state } = this;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0a140a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  this.gridRenderer.render(ctx, state, this.grid);
  this.towerRenderer.render(ctx, state, this.grid);
  this.enemyRenderer.render(ctx, state, this.grid.cellSize);
  this.projectileRenderer.render(ctx, state);
  this.particleRenderer.render(ctx, state);
  this.hudRenderer.render(ctx, state, canvas.width);
  this.uiRenderer.render(ctx, state, canvas.width, canvas.height, this.grid, this.input);

  // Draw floating damage numbers
  for (const dn of state.damageNumbers) {
    ctx.globalAlpha = dn.alpha;
    ctx.font = `bold ${Math.min(14, canvas.width * 0.018)}px monospace`;
    ctx.fillStyle = dn.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dn.text, dn.x, dn.y);
  }
  ctx.globalAlpha = 1;
}
```

**What's happening:**
- The update loop now has five systems running in sequence: enemies move, towers target, projectiles fly, particles drift, and damage numbers fade.
- Damage numbers use simple physics: drift up at 40 px/s and linearly fade alpha from 1 to 0 over 0.8 seconds. The filter removes expired numbers.
- The placement fail timer counts down and nulls itself when expired, so the red flash on invalid placement lasts exactly 0.4 seconds.
- Render order matters: grid first (background), then towers, enemies, projectiles, particles, HUD, UI panel. This ensures foreground elements draw on top of background elements.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Tower Defense game in your browser
3. **Observe:**
   - The **HUD bar** at the top shows: lives (20/20), gold (200), score (0), wave (0/10), and CLASSIC badge
   - Place towers and watch **gold decrease** in the HUD
   - When enemies are hit, **red damage numbers** float upward and fade (blue for frost hits)
   - When an enemy dies, a **burst of colored particles** explodes from its position
   - **Gold increases** when enemies die (check the HUD)
   - **Score climbs** as you kill enemies, based on their max HP
   - If an enemy reaches the end, **lives decrease** in the HUD
   - The **high score** appears on the right side after your first game

---

## Challenges

**Easy:**
- Change the damage number font size to 20px for more dramatic hit feedback.
- Increase death particles to 16 per enemy for bigger explosions.

**Medium:**
- Add a "+gold" floating number when an enemy dies (green text showing `+10` or `+25`) alongside the death particles.

**Hard:**
- Implement a combo system: if an enemy dies within 0.5 seconds of the previous kill, show a "x2 COMBO" multiplier that increases the gold reward. Display the combo count as a large fading number in the center of the screen.

---

## What You Learned

- Building an economy system with gold earning, spending, and high score persistence
- Creating death particle effects with physics simulation (gravity, drag, fade)
- Rendering floating damage numbers with upward drift and alpha decay
- Drawing a HUD bar with emoji icons and color-coded stat values
- Coordinating render order so foreground elements properly overlay background

**Next:** Wave System -- define waves with escalating enemy counts and boss fights!
