# Step 5: Resource Management

**Goal:** Ammo crates, health packs, building materials -- scavenge resources during the day phase.

**Time:** ~15 minutes

---

## What You'll Build

- **Auto-scavenging** during the day phase: ammo and resources passively increase over time
- **Health regeneration** during the day so the player can recover between waves
- **Wave data system** that defines zombie counts per wave with scaling difficulty
- **HP multiplier** that makes zombies tougher in later waves
- **A wave spawn queue** that drips zombies into the arena over time rather than all at once

---

## Concepts

- **Passive Resource Generation**: During the day phase, `state.player.ammo += SCAVENGE_RATE_AMMO * dt` adds 1.2 ammo per second, capped at `maxAmmo`. Resources grow at 4 per second. This "auto-scavenge" mechanic gives the player downtime between waves to prepare without manual pickup mechanics.
- **Wave Scaling Formula**: `walkerCount = 3 + wave * 2` means wave 1 has 5 walkers, wave 5 has 13. Runners appear from wave 2 (`wave * 1.2`), tanks from wave 4 (`(wave - 3) * 0.6`). This creates a smooth difficulty curve.
- **HP Multiplier**: `1 + (wave - 1) * 0.15` means wave 1 zombies have base HP, wave 5 zombies have 1.6x HP, wave 10 zombies have 2.35x HP. This prevents later waves from being trivially easy despite more zombies.
- **Spawn Queue with Timer**: Rather than dumping all zombies at once, the WaveSystem maintains a `spawnQueue` array and a `spawnTimer`. Every `spawnTimer` seconds, one zombie is dequeued and spawned. The interval shrinks in later waves (`Math.max(0.3, 1.2 - wave * 0.08)`), creating increasing pressure.

---

## Code

### 1. Create Wave Data

**File:** `src/games/zombie-survival/data/waves.ts`

Defines how many and what type of zombies spawn per wave, with infinite scaling.

```typescript
import type { WaveSpawn } from '../types.ts';

/** Returns the spawn list for a given wave number. Scales infinitely. */
export function getWaveSpawns(wave: number): WaveSpawn[] {
  const spawns: WaveSpawn[] = [];

  // Base walkers scale with wave
  const walkerCount = 3 + wave * 2;
  spawns.push({ type: 'walker', count: walkerCount });

  // Runners appear from wave 2
  if (wave >= 2) {
    const runnerCount = Math.floor(wave * 1.2);
    spawns.push({ type: 'runner', count: runnerCount });
  }

  // Tanks appear from wave 4
  if (wave >= 4) {
    const tankCount = Math.max(1, Math.floor((wave - 3) * 0.6));
    spawns.push({ type: 'tank', count: tankCount });
  }

  return spawns;
}

/** HP multiplier that makes later waves tougher */
export function waveHpMultiplier(wave: number): number {
  return 1 + (wave - 1) * 0.15;
}
```

**What's happening:**
- `getWaveSpawns()` returns an array of `WaveSpawn` objects, each with a `type` and `count`. Wave 1 gets 5 walkers. Wave 3 gets 9 walkers + 3 runners. Wave 5 gets 13 walkers + 6 runners + 1 tank.
- `waveHpMultiplier()` returns a multiplier applied to all zombie HP at spawn time. This is separate from count scaling, so both the number and durability of zombies increase.
- The function uses simple linear formulas rather than exponential curves. Linear scaling is easier to reason about and test, and it still produces challenging gameplay because the player's resources do not scale.

---

### 2. Create the Wave System

**File:** `src/games/zombie-survival/systems/WaveSystem.ts`

Manages day/night transitions, resource scavenging, and zombie spawning.

```typescript
import type { GameState, Zombie } from '../types.ts';
import {
  DAY_DURATION,
  NIGHT_DURATION,
  SCAVENGE_RATE_AMMO,
  SCAVENGE_RATE_RESOURCES,
  ARENA_W,
  ARENA_H,
} from '../types.ts';
import { getWaveSpawns, waveHpMultiplier } from '../data/waves.ts';
import { ZOMBIE_DEFS } from '../data/zombies.ts';

export class WaveSystem {
  update(state: GameState, dt: number): void {
    state.cycleTimer -= dt;

    if (state.timeOfDay === 'day') {
      this.updateDay(state, dt);
    } else {
      this.updateNight(state, dt);
    }
  }

  private updateDay(state: GameState, dt: number): void {
    // Auto-scavenge resources during day
    state.player.ammo = Math.min(
      state.player.maxAmmo,
      state.player.ammo + SCAVENGE_RATE_AMMO * dt,
    );
    state.player.resources += SCAVENGE_RATE_RESOURCES * dt;

    // Small HP regen during day
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 2 * dt);

    if (state.cycleTimer <= 0) {
      // Transition to night
      state.timeOfDay = 'night';
      state.cycleTimer = NIGHT_DURATION;
      state.wave++;
      this.startWave(state);
    }
  }

  private updateNight(state: GameState, dt: number): void {
    // Spawn queued zombies
    this.processSpawnQueue(state, dt);

    // Check if wave is complete
    const allSpawned = state.spawnQueue.length === 0;
    const allDead = state.zombies.every((z) => z.dead) || state.zombies.length === 0;

    if (allSpawned && allDead && state.cycleTimer < NIGHT_DURATION - 2) {
      // Wave cleared early -- go to day
      state.timeOfDay = 'day';
      state.cycleTimer = DAY_DURATION;
      return;
    }

    if (state.cycleTimer <= 0) {
      // Night is over regardless
      state.timeOfDay = 'day';
      state.cycleTimer = DAY_DURATION;
    }
  }

  private startWave(state: GameState): void {
    const spawns = getWaveSpawns(state.wave);

    state.spawnQueue = [...spawns];
    let totalZombies = 0;

    for (const s of spawns) totalZombies += s.count;

    state.zombiesRemainingInWave = totalZombies;
    state.spawnTimer = 0.5; // initial delay before first spawn
  }

  private processSpawnQueue(state: GameState, dt: number): void {
    if (state.spawnQueue.length === 0) return;

    state.spawnTimer -= dt;

    if (state.spawnTimer > 0) return;

    // Spawn next zombie
    const group = state.spawnQueue[0];

    this.spawnZombie(state, group.type);
    group.count--;

    if (group.count <= 0) {
      state.spawnQueue.shift();
    }

    // Interval between spawns gets shorter in later waves
    const baseInterval = 1.2;
    const minInterval = 0.3;

    state.spawnTimer = Math.max(minInterval, baseInterval - state.wave * 0.08);
  }

  private spawnZombie(state: GameState, type: Zombie['type']): void {
    const def = ZOMBIE_DEFS[type];
    const hpMult = waveHpMultiplier(state.wave);

    // Spawn from random edge
    const edge = Math.floor(Math.random() * 4);
    let x: number;
    let y: number;

    switch (edge) {
      case 0: x = Math.random() * ARENA_W; y = -20; break;       // top
      case 1: x = ARENA_W + 20; y = Math.random() * ARENA_H; break; // right
      case 2: x = Math.random() * ARENA_W; y = ARENA_H + 20; break; // bottom
      default: x = -20; y = Math.random() * ARENA_H; break;        // left
    }

    const zombie: Zombie = {
      id: state.nextId++,
      type,
      x,
      y,
      hp: Math.round(def.hp * hpMult),
      maxHp: Math.round(def.hp * hpMult),
      speed: def.speed + Math.random() * 10 - 5, // slight variance
      damage: def.damage,
      attackCooldown: 0,
      attackInterval: def.attackInterval,
      state: 'chasing',
      targetBarricadeId: null,
      radius: def.radius,
      dead: false,
    };

    state.zombies.push(zombie);
  }
}
```

**What's happening:**
- `updateDay()` continuously adds ammo (capped at `maxAmmo = 30`), resources (uncapped), and health (capped at `maxHp = 100`). When the 15-second day timer expires, it transitions to night and starts the next wave.
- `startWave()` gets spawn definitions from `getWaveSpawns()`, copies them into `spawnQueue`, and counts total zombies for the HUD display.
- `processSpawnQueue()` spawns one zombie each time `spawnTimer` expires. The timer interval starts at 1.2 seconds and decreases by 0.08 per wave, bottoming out at 0.3 seconds. This means wave 1 spawns leisurely; wave 10+ spawns are rapid-fire.
- `spawnZombie()` picks a random edge, applies the HP multiplier, and adds slight speed variance (`+/- 5 px/s`) so zombies do not move in lock-step.
- When all spawned zombies are dead and at least 2 seconds have passed, the wave is considered cleared early and transitions back to day. This rewards efficient players with extra scavenge time.

---

### 3. Update the Engine

**File:** `src/games/zombie-survival/ZombieEngine.ts`

Wire in the WaveSystem and remove the test zombie spawner.

```typescript
import type { GameState } from './types.ts';
import { ARENA_W, ARENA_H, MAX_AMMO, DAY_DURATION } from './types.ts';
import { InputSystem } from './systems/InputSystem.ts';
import { PlayerSystem } from './systems/PlayerSystem.ts';
import { ZombieSystem } from './systems/ZombieSystem.ts';
import { CombatSystem } from './systems/CombatSystem.ts';
import { WaveSystem } from './systems/WaveSystem.ts';
import { GameRenderer } from './renderers/GameRenderer.ts';
import { HUDRenderer } from './renderers/HUDRenderer.ts';

export class ZombieEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState;

  private inputSystem: InputSystem;
  private playerSystem: PlayerSystem;
  private zombieSystem: ZombieSystem;
  private combatSystem: CombatSystem;
  private waveSystem: WaveSystem;
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
    this.waveSystem = new WaveSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    this.resizeHandler = () => this.handleResize();
    this.restartHandler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r' && this.state.screen === 'gameover') {
        this.state = this.createInitialState();
      }
      if (e.key === 'Escape' && this.state.screen === 'gameover') {
        this.onExit();
      }
    };
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
    this.waveSystem.update(this.state, dt);
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
- The `spawnTestZombies()` method from Step 3 is removed. Now the `WaveSystem` handles all spawning through the day/night cycle.
- The update order adds `waveSystem.update()` between player and zombie systems. This ensures day/night transitions and spawning happen before zombie movement each frame.
- The game now starts in the `day` phase with a 15-second timer. During this time, ammo and resources accumulate. When the timer expires, night begins and wave 1 starts.

---

### 4. Update the HUD Renderer

**File:** `src/games/zombie-survival/renderers/HUDRenderer.ts`

Add wave info, day/night indicator, and cycle progress bar.

```typescript
import type { GameState } from '../types.ts';
import { DAY_DURATION, NIGHT_DURATION, BARRICADE_COST } from '../types.ts';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: GameState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    if (state.screen === 'gameover') {
      this.drawGameOver(ctx, state, W, H);
      return;
    }

    this.drawTopBar(ctx, state, W);
    this.drawWaveInfo(ctx, state, W);
    this.drawCycleBar(ctx, state, W);
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

  private drawWaveInfo(ctx: CanvasRenderingContext2D, state: GameState, W: number): void {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px monospace';

    const isNight = state.timeOfDay === 'night';

    ctx.fillStyle = isNight ? '#e74c3c' : '#f1c40f';
    const phaseLabel = isNight ? 'NIGHT' : 'DAY';
    const timeLeft = Math.ceil(state.cycleTimer);

    ctx.fillText(`${phaseLabel} - Wave ${state.wave} - ${timeLeft}s`, W - 12, 18);

    if (isNight && state.zombiesRemainingInWave > 0) {
      ctx.fillStyle = '#e74c3c';
      ctx.font = '12px monospace';
      ctx.fillText(`Zombies remaining: ${state.zombiesRemainingInWave}`, W - 12, 34);
    }
  }

  private drawCycleBar(ctx: CanvasRenderingContext2D, state: GameState, W: number): void {
    const barY = 36;
    const barH = 4;
    const maxTime = state.timeOfDay === 'day' ? DAY_DURATION : NIGHT_DURATION;
    const pct = state.cycleTimer / maxTime;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, barY, W, barH);
    ctx.fillStyle = state.timeOfDay === 'day' ? '#f39c12' : '#8e44ad';
    ctx.fillRect(0, barY, W * pct, barH);
  }

  private drawBottomHints(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number): void {
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const canPlace = state.player.resources >= BARRICADE_COST;

    ctx.fillStyle = canPlace ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.25)';
    ctx.fillText(
      `[WASD] Move  |  [Mouse] Aim  |  [Click] Shoot  |  [E] Place Barricade (${BARRICADE_COST} res)  |  [P] Pause  |  [H] Help`,
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
- `drawWaveInfo()` displays "DAY" in yellow or "NIGHT" in red, plus the current wave number and time remaining, right-aligned. During night, a secondary line shows "Zombies remaining" count.
- `drawCycleBar()` is a thin 4px progress bar below the top bar. It fills with orange during day and purple during night, shrinking as time runs out. This gives the player a visual sense of urgency.
- The game over screen now shows `Survived ${state.wave} waves` since waves are tracked by the WaveSystem.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Zombie Survival game in your browser
3. **Observe:**
   - Game starts in **DAY** phase -- the top-right shows "DAY - Wave 0 - 15s"
   - Watch **ammo and resources** slowly increase in the HUD during day
   - The **cycle bar** (orange) shrinks below the top bar
   - After 15 seconds, night falls: "NIGHT - Wave 1" appears in red
   - **Zombies spawn one by one** from random edges (5 walkers on wave 1)
   - Kill all zombies to **end night early** and return to day
   - Watch ammo and HP **regenerate during day**
   - On wave 2+, **runners** (red, fast) appear alongside walkers
   - On wave 4+, **tanks** (purple, large) join the horde
   - Notice zombies get **tougher each wave** (more HP from the multiplier)

---

## Challenges

**Easy:**
- Change `DAY_DURATION` to 20 seconds to give more preparation time.
- Change `SCAVENGE_RATE_AMMO` to 2.0 for faster ammo recovery.

**Medium:**
- Display a "WAVE 3 INCOMING" text announcement for 2 seconds at the start of each night.

**Hard:**
- Add a resource drop mechanic: when a zombie dies, there is a 30% chance it drops a small resource pickup at its death position. The player can walk over it to collect 5 resources.

---

## What You Learned

- Implementing passive resource generation tied to a day/night timer
- Designing wave scaling formulas with per-type thresholds and HP multipliers
- Building a spawn queue that drips entities in over time for pacing control
- Creating HUD elements for phase indicators, timers, and progress bars
- Structuring early wave clearing to reward skilled play with extra scavenge time

**Next:** Day/Night Waves -- zombies attack at night, scavenge during the day, with a flashlight darkness overlay!
