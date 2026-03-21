# Step 6: Wave System

**Goal:** Define waves with different enemy types, counts, and spawn intervals. Add a Start Wave button, between-wave countdowns, and boss announcements.

**Time:** ~15 minutes

---

## What You'll Build

- **10 classic wave definitions** with escalating difficulty and boss waves at waves 5 and 10
- **Spawn queue system** that schedules enemy spawns at precise intervals
- **Start Wave button** in the UI panel with auto-start countdown between waves
- **Boss announcement overlay** with a pulsing red screen flash
- **Endless wave generator** that scales HP and speed exponentially
- **Wave completion bonus** that awards gold at the end of each wave

---

## Concepts

- **Spawn Groups**: Each wave contains one or more `SpawnGroup` objects. A group defines the enemy type, count, and spawn interval (milliseconds between each enemy). Groups within a wave spawn sequentially: all goblins first, then orcs, then the boss.
- **Spawn Queue**: When a wave starts, all enemies are pre-scheduled into a `spawnQueue` with absolute timestamps. The update loop checks if `now >= scheduledAt` and spawns the next enemy. This decouples wave definition from spawning logic.
- **Between-Wave Countdown**: After clearing all enemies, a 5-second countdown begins. The player can use this time to place towers. They can also click "Next Wave" to skip the countdown. This rhythm of build-fight-build is the core tower defense loop.
- **Exponential Scaling**: Endless mode multiplies HP by `1.12^(wave-1)`, creating gentle early waves that become brutally difficult. Speed scales linearly at 2% per wave to maintain pressure without making enemies unreactable.

---

## Code

### 1. Create Wave Definitions

**File:** `src/games/tower-defense/data/waves.ts`

```typescript
import type { WaveDef } from '../types';

/** Classic mode: 10 waves, boss on wave 5 and 10 */
export const CLASSIC_WAVES: WaveDef[] = [
  {
    waveNumber: 1,
    groups: [{ enemyType: 'goblin', count: 8, interval: 800 }],
  },
  {
    waveNumber: 2,
    groups: [
      { enemyType: 'goblin', count: 10, interval: 700 },
      { enemyType: 'orc', count: 2, interval: 1500 },
    ],
  },
  {
    waveNumber: 3,
    groups: [
      { enemyType: 'goblin', count: 8, interval: 600 },
      { enemyType: 'orc', count: 4, interval: 1200 },
    ],
  },
  {
    waveNumber: 4,
    groups: [
      { enemyType: 'orc', count: 6, interval: 1000 },
      { enemyType: 'ghost', count: 4, interval: 900 },
    ],
  },
  {
    waveNumber: 5,
    groups: [
      { enemyType: 'goblin', count: 12, interval: 500 },
      { enemyType: 'orc', count: 5, interval: 900 },
      { enemyType: 'boss', count: 1, interval: 0 },
    ],
    preBossAnnounce: true,
  },
  {
    waveNumber: 6,
    groups: [
      { enemyType: 'ghost', count: 10, interval: 600 },
      { enemyType: 'orc', count: 6, interval: 900 },
    ],
  },
  {
    waveNumber: 7,
    groups: [
      { enemyType: 'goblin', count: 15, interval: 450 },
      { enemyType: 'ghost', count: 8, interval: 600 },
      { enemyType: 'orc', count: 5, interval: 900 },
    ],
  },
  {
    waveNumber: 8,
    groups: [
      { enemyType: 'orc', count: 10, interval: 700 },
      { enemyType: 'ghost', count: 10, interval: 500 },
    ],
  },
  {
    waveNumber: 9,
    groups: [
      { enemyType: 'goblin', count: 20, interval: 350 },
      { enemyType: 'orc', count: 8, interval: 700 },
      { enemyType: 'ghost', count: 8, interval: 500 },
    ],
  },
  {
    waveNumber: 10,
    groups: [
      { enemyType: 'goblin', count: 15, interval: 350 },
      { enemyType: 'orc', count: 10, interval: 600 },
      { enemyType: 'ghost', count: 10, interval: 450 },
      { enemyType: 'boss', count: 2, interval: 3000 },
    ],
    preBossAnnounce: true,
  },
];

/**
 * Generate an endless wave. Scales exponentially with wave number.
 */
export function generateEndlessWave(waveNumber: number): WaveDef {
  const scale = Math.pow(1.12, waveNumber - 1);
  const hpMul = parseFloat(scale.toFixed(2));
  const speedMul = parseFloat((1 + (waveNumber - 1) * 0.02).toFixed(2));

  const isBossWave = waveNumber % 5 === 0;
  const groups = [];

  groups.push({
    enemyType: 'goblin' as const,
    count: Math.min(5 + waveNumber * 2, 40),
    interval: Math.max(600 - waveNumber * 20, 200),
    hpMultiplier: hpMul,
    speedMultiplier: speedMul,
  });

  if (waveNumber >= 3) {
    groups.push({
      enemyType: 'orc' as const,
      count: Math.min(2 + waveNumber, 20),
      interval: Math.max(900 - waveNumber * 15, 300),
      hpMultiplier: hpMul,
      speedMultiplier: speedMul,
    });
  }

  if (waveNumber >= 5) {
    groups.push({
      enemyType: 'ghost' as const,
      count: Math.min(2 + waveNumber, 15),
      interval: Math.max(700 - waveNumber * 15, 250),
      hpMultiplier: hpMul,
      speedMultiplier: speedMul,
    });
  }

  if (isBossWave) {
    groups.push({
      enemyType: 'boss' as const,
      count: Math.floor(waveNumber / 5),
      interval: 3000,
      hpMultiplier: hpMul * 1.2,
      speedMultiplier: speedMul,
    });
  }

  return { waveNumber, groups, preBossAnnounce: isBossWave };
}

/** Challenge mode uses the same wave definitions as classic */
export const CHALLENGE_WAVES = CLASSIC_WAVES;
```

**What's happening:**
- Classic mode ramps gradually: wave 1 is just 8 goblins, wave 4 introduces ghosts, wave 5 brings the first boss. By wave 10, all four enemy types attack simultaneously with two bosses.
- Spawn intervals decrease as waves progress (800ms down to 350ms for goblins), creating increasingly dense enemy streams.
- `preBossAnnounce: true` triggers a dramatic red screen flash warning the player that a boss is coming, giving them a chance to prepare.
- The endless wave generator uses `1.12^(wave-1)` for HP scaling. By wave 20, enemies have ~8x base HP. By wave 30, ~25x. This creates a difficulty curve that becomes impossible eventually, making high scores meaningful.
- Spawn intervals in endless mode decrease by 20ms per wave (capped at 200ms minimum), so late-game waves are nearly continuous streams.

---

### 2. Create the Wave System

**File:** `src/games/tower-defense/systems/WaveSystem.ts`

```typescript
import type { GameStateData, SpawnQueueItem } from '../types';
import { CLASSIC_WAVES, CHALLENGE_WAVES, generateEndlessWave } from '../data/waves';
import { EnemySystem } from './EnemySystem';
import { EconomySystem } from './EconomySystem';

const BETWEEN_WAVE_DELAY = 5000; // ms

export class WaveSystem {
  /**
   * Called once per frame. Handles:
   * 1. Processing the spawn queue
   * 2. Detecting wave completion
   * 3. Between-wave countdown
   */
  static update(state: GameStateData): void {
    if (state.screen !== 'playing') return;

    const now = performance.now();

    // Process spawn queue
    if (state.spawnQueue.length > 0) {
      state.waveInProgress = true;
      const item = state.spawnQueue[0];

      if (now >= item.scheduledAt) {
        state.spawnQueue.shift();
        EnemySystem.spawnEnemy(
          state,
          item.enemyType,
          item.hpMultiplier,
          item.speedMultiplier,
        );
      }
    } else if (state.waveInProgress && state.enemies.length === 0) {
      // All enemies cleared -- wave complete
      state.waveInProgress = false;
      EconomySystem.waveCompleteBonus(state);

      // Check win condition
      if (state.mode !== 'endless' && state.currentWave >= state.totalWaves) {
        state.screen = 'win';
        return;
      }

      // Start between-wave countdown
      state.betweenWaveCountdown = BETWEEN_WAVE_DELAY;
    }

    // Between-wave countdown timer
    if (
      !state.waveInProgress &&
      state.spawnQueue.length === 0 &&
      state.betweenWaveCountdown > 0 &&
      state.currentWave > 0
    ) {
      state.betweenWaveCountdown -= 16; // approx 1 frame at 60fps

      if (state.betweenWaveCountdown <= 0) {
        state.betweenWaveCountdown = 0;
        WaveSystem.startNextWave(state);
      }
    }
  }

  /** Start the next wave (called by player click or auto-countdown) */
  static startNextWave(state: GameStateData): void {
    if (state.waveInProgress || state.spawnQueue.length > 0) return;
    if (state.screen !== 'playing') return;

    state.currentWave++;
    const waveDef = WaveSystem.getWaveDef(state);
    if (!waveDef) return;

    const now = performance.now();
    let scheduleAt = now + 500; // slight delay before first spawn

    for (const group of waveDef.groups) {
      const hpMul = group.hpMultiplier ?? 1;
      const speedMul = group.speedMultiplier ?? 1;

      for (let i = 0; i < group.count; i++) {
        const item: SpawnQueueItem = {
          enemyType: group.enemyType,
          scheduledAt: scheduleAt,
          hpMultiplier: hpMul,
          speedMultiplier: speedMul,
        };

        state.spawnQueue.push(item);
        scheduleAt += group.interval;
      }
    }

    state.waveInProgress = true;
    state.betweenWaveCountdown = 0;

    // Boss wave announcement
    if (waveDef.preBossAnnounce) {
      state.bossAnnounceUntil = performance.now() + 3000;
    }
  }

  private static getWaveDef(state: GameStateData) {
    const waveIdx = state.currentWave - 1;

    if (state.mode === 'endless') {
      return generateEndlessWave(state.currentWave);
    }

    const waves = state.mode === 'challenge' ? CHALLENGE_WAVES : CLASSIC_WAVES;
    return waves[waveIdx] ?? null;
  }
}
```

**What's happening:**
- `startNextWave` converts a wave definition into a flat spawn queue. Each spawn group's enemies are scheduled sequentially: enemy 1 at time T, enemy 2 at T + interval, etc. Groups are chained so the second group starts after the first finishes.
- The spawn queue uses absolute timestamps (`performance.now() + offset`), making it simple to check: just compare `now >= scheduledAt`. The first enemy spawns 500ms after the wave starts.
- `update` runs three checks each frame: (1) is there an enemy ready to spawn? (2) is the wave complete (queue empty + no living enemies)? (3) is the between-wave countdown running?
- Wave completion triggers `EconomySystem.waveCompleteBonus`, awarding bonus gold proportional to the wave number. In classic mode, completing all 10 waves sets `screen = 'win'`.
- Boss announcements last 3 seconds (`bossAnnounceUntil = now + 3000`). The renderer shows a pulsing red overlay with "BOSS INCOMING!" text.

---

### 3. Add Start Wave Button to UI

Add the Start Wave button to the right side of the tower panel in `UIRenderer.render()`:

```typescript
    // Start wave button (right side of panel)
    const btnW = 140;
    const btnH = 48;
    const btnX = canvasW - btnW - cardPad;
    const btnY = panelY + (this.panelHeight - btnH) / 2;

    const canStart = !state.waveInProgress && state.spawnQueue.length === 0;
    const isFirstWave = state.currentWave === 0;
    const btnLabel = isFirstWave
      ? '\u25B6 Start Game'
      : canStart
        ? '\u25B6 Next Wave'
        : '\u23F3 Wave...';

    ctx.fillStyle = canStart ? '#1b5e20' : '#2a2a2a';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 10);
    ctx.fill();

    ctx.strokeStyle = canStart ? '#4caf50' : '#444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 10);
    ctx.stroke();

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = canStart ? '#a5d6a7' : '#555';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btnLabel, btnX + btnW / 2, btnY + btnH / 2);

    if (canStart) {
      input.startWaveRect = { x: btnX, y: btnY, w: btnW, h: btnH };
    } else {
      input.startWaveRect = null;
    }

    // Between-wave countdown progress bar
    if (!state.waveInProgress && state.betweenWaveCountdown > 0 && state.currentWave > 0) {
      const totalDelay = 5000;
      const pct = state.betweenWaveCountdown / totalDelay;
      const barW2 = btnW;
      const barH2 = 4;
      ctx.fillStyle = '#1a2a1a';
      ctx.fillRect(btnX, btnY - 10, barW2, barH2);
      ctx.fillStyle = '#4caf50';
      ctx.fillRect(btnX, btnY - 10, barW2 * (1 - pct), barH2);
    }
```

**What's happening:**
- The button changes label and style based on state: "Start Game" before wave 1, "Next Wave" between waves (active green), "Wave..." during a wave (dimmed gray).
- `input.startWaveRect` is only set when the button is active, preventing clicks during active waves.
- The progress bar above the button fills from left to right over 5 seconds, showing the countdown until auto-start. Clicking "Next Wave" skips this countdown.

---

### 4. Add Wave Start to Input System

Handle the Start Wave button click and keyboard shortcut:

```typescript
// In handleClick(), add before the grid click check:
    if (this.startWaveRect) {
      const rect = this.startWaveRect;
      if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
        WaveSystem.startNextWave(state);
        return;
      }
    }

// In the keyHandler, add Space/Enter support:
    if (e.key === ' ' || e.key === 'Enter') {
      if (state.screen === 'playing') {
        WaveSystem.startNextWave(state);
      }
    }
```

---

### 5. Add Wave System and Boss Overlay to Game Engine

```typescript
// Add to update():
WaveSystem.update(this.state);

// Add to render(), after the UI panel:
// Wave announce flash
if (state.waveInProgress && state.spawnQueue.length > 0) {
  const pct = Math.abs(Math.sin(performance.now() * 0.003));
  if (pct > 0.7) {
    ctx.fillStyle = `rgba(46,204,113,${(pct - 0.7) * 0.3})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `bold ${Math.min(32, canvas.width * 0.04)}px monospace`;
    ctx.fillStyle = `rgba(46,204,113,${(pct - 0.7) * 2})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`WAVE ${state.currentWave}`, canvas.width / 2, 64);
  }
}

// Boss announcement overlay
const now = performance.now();
if (state.bossAnnounceUntil > now) {
  const remaining = state.bossAnnounceUntil - now;
  const pulse = 0.5 + 0.5 * Math.sin(now * 0.008);
  const alpha = Math.min(1, remaining / 500);

  ctx.fillStyle = `rgba(192,57,43,${0.15 * pulse * alpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = `bold ${Math.min(48, canvas.width * 0.06)}px monospace`;
  ctx.fillStyle = `rgba(231,76,60,${(0.7 + 0.3 * pulse) * alpha})`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#e74c3c';
  ctx.shadowBlur = 20 * pulse;
  ctx.fillText('BOSS INCOMING!', canvas.width / 2, canvas.height * 0.35);
  ctx.shadowBlur = 0;
}
```

**What's happening:**
- The wave announce flash is a subtle green overlay that pulses using `Math.sin`, showing the wave number briefly as enemies start spawning.
- The boss announcement is more dramatic: a red-tinted screen with pulsing "BOSS INCOMING!" text that has a glowing `shadowBlur` effect. It fades out over the last 500ms using the `alpha` calculation.
- Both overlays draw on top of everything else, creating a full-screen effect that demands the player's attention.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Tower Defense game in your browser
3. **Observe:**
   - A **"Start Game" button** appears in the bottom-right panel
   - **Click it** (or press Space) to start Wave 1: 8 goblins stream from the START cell
   - A green **"WAVE 1" flash** pulses briefly at the top
   - Kill all enemies and receive a **gold bonus** (check the HUD)
   - A **5-second countdown bar** fills above the button before the next wave auto-starts
   - Click **"Next Wave"** to skip the countdown
   - On **Wave 5**, a red **"BOSS INCOMING!"** overlay pulses with glowing text
   - The **boss** spawns: a large red enemy with a permanent HP bar
   - Survive all 10 waves and the game ends (win screen comes in Step 8)

---

## Challenges

**Easy:**
- Change `BETWEEN_WAVE_DELAY` to 10000 (10 seconds) for more building time between waves.
- Add a wave 11 to `CLASSIC_WAVES` with 3 bosses and see if your defenses hold.

**Medium:**
- Add a wave preview: before each wave starts, show the enemy types and counts that are about to spawn (e.g., "Wave 3: 8 Goblins, 4 Orcs") in the UI panel.

**Hard:**
- Implement a "fast forward" button that doubles `dt` for all systems, making waves play out at 2x speed. Add a visual indicator showing the current speed.

---

## What You Learned

- Defining wave data with spawn groups, intervals, and boss flags
- Converting wave definitions into scheduled spawn queues with absolute timestamps
- Implementing build-fight-build rhythm with between-wave countdowns
- Generating endless waves with exponential HP scaling
- Creating dramatic boss announcements with pulsing overlay effects

**Next:** Tower Upgrades -- spend gold to make towers stronger with multi-level upgrade paths!
