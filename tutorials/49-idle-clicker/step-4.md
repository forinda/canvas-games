# Step 4: Prestige System

**Goal:** Reset progress for a permanent multiplier bonus that makes subsequent runs faster.

**Time:** ~15 minutes

---

## What You'll Build

- **A prestige mechanic** that resets coins, upgrades, and CPS in exchange for prestige points
- **A permanent multiplier** based on accumulated prestige points that boosts all future earnings
- **Prestige point calculation** based on total coins earned using a square-root formula
- **A prestige button and UI** showing current prestige level, multiplier, and points available on reset
- **Modified income calculations** that apply the prestige multiplier to both CPS and click power

---

## Concepts

- **Prestige / Rebirth**: The core loop of idle games is "play, reset, play faster." When progress slows, the player can prestige -- resetting most progress but gaining a permanent bonus. This creates a meta-progression layer that keeps the game engaging long after the initial upgrades are maxed out.
- **Square-Root Scaling**: Prestige points are calculated as `floor(sqrt(totalCoinsEarned / 1,000,000))`. This means the first prestige point requires 1M total coins, 4 points require 16M, and 100 points require 10B. The diminishing returns encourage players to prestige multiple times rather than grinding forever.
- **Multiplier Formula**: The prestige multiplier is `1 + prestigePoints * 0.1`. With 10 prestige points, all income is doubled (2x). With 100 points, it is 11x. This stacks multiplicatively with CPS, making each prestige feel impactful.
- **Selective Reset**: Prestige resets coins, upgrades, and CPS, but preserves prestige points and the total prestige count. This lets players feel permanent progress even through resets.

---

## Code

### 1. Update Types

**File:** `src/games/idle-clicker/types.ts`

Add prestige fields to `IdleState`.

```typescript
/** Full game state for the idle clicker */
export interface IdleState {
  coins: number;
  totalCoinsEarned: number;
  totalClicks: number;
  clickPower: number;
  cps: number;
  upgrades: Upgrade[];
  particles: ClickParticle[];
  coinButton: { x: number; y: number; radius: number };
  coinPulse: number;
  shopScroll: number;
  width: number;
  height: number;
  saveTimer: number;
  helpVisible: boolean;

  // --- Prestige fields ---
  /** Accumulated prestige points (permanent across resets) */
  prestigePoints: number;
  /** Number of times the player has prestiged */
  prestigeCount: number;
  /** Total coins earned in the current run (resets on prestige) */
  runCoinsEarned: number;
}
```

**What's happening:**
- `prestigePoints` accumulates across resets and drives the multiplier formula. It never decreases.
- `prestigeCount` tracks how many times the player has prestiged, useful for display and potential achievements.
- `runCoinsEarned` tracks earnings in the current run separately from `totalCoinsEarned`, which is the all-time total used for prestige point calculation.

---

### 2. Add Prestige Utility Functions

**File:** `src/games/idle-clicker/utils.ts`

Add functions for prestige point calculation and multiplier.

```typescript
import type { Upgrade } from './types';

/** Format a number with K/M/B/T suffixes */
export function formatNumber(n: number): string {
  if (n < 0) return '-' + formatNumber(-n);

  if (n < 1000) {
    if (n < 10 && n !== Math.floor(n)) return n.toFixed(1);
    return Math.floor(n).toString();
  }

  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
  let tier = 0;
  let scaled = n;

  while (scaled >= 1000 && tier < suffixes.length - 1) {
    scaled /= 1000;
    tier++;
  }

  return scaled < 10
    ? scaled.toFixed(2) + suffixes[tier]
    : scaled < 100
      ? scaled.toFixed(1) + suffixes[tier]
      : Math.floor(scaled) + suffixes[tier];
}

/** Calculate the current cost of an upgrade based on owned count */
export function getUpgradeCost(upgrade: Upgrade): number {
  return Math.floor(
    upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.owned),
  );
}

/** Calculate prestige points available from total coins earned */
export function calcPrestigePoints(totalCoinsEarned: number): number {
  return Math.floor(Math.sqrt(totalCoinsEarned / 1_000_000));
}

/** Calculate the prestige multiplier from accumulated points */
export function getPrestigeMultiplier(prestigePoints: number): number {
  return 1 + prestigePoints * 0.1;
}
```

**What's happening:**
- `calcPrestigePoints` uses a square root to convert total earnings into prestige points. Earning 1M coins gets 1 point, 4M gets 2, 9M gets 3, and so on. The square root ensures each additional point requires more total earnings, creating natural prestige timing decisions.
- `getPrestigeMultiplier` converts points to a multiplier: 0 points = 1x (no bonus), 10 points = 2x, 50 points = 6x, 100 points = 11x. The linear relationship keeps the math transparent for players.

---

### 3. Update the Idle System

**File:** `src/games/idle-clicker/systems/IdleSystem.ts`

Apply the prestige multiplier to CPS and click power.

```typescript
import type { IdleState } from '../types';
import { getPrestigeMultiplier } from '../utils';

export class IdleSystem {
  update(state: IdleState, dt: number): void {
    const dtSec = dt / 1000;
    const prestigeMult = getPrestigeMultiplier(state.prestigePoints);

    // Recalculate CPS from all upgrades, boosted by prestige
    let baseCps = 0;
    for (const u of state.upgrades) {
      baseCps += u.cps * u.owned;
    }
    state.cps = baseCps * prestigeMult;

    // Add passive income
    if (state.cps > 0) {
      const earned = state.cps * dtSec;
      state.coins += earned;
      state.totalCoinsEarned += earned;
      state.runCoinsEarned += earned;
    }

    // Update click power: base 1 + 1% of CPS, all boosted by prestige
    state.clickPower = (1 + baseCps * 0.01) * prestigeMult;
  }
}
```

**What's happening:**
- The prestige multiplier is calculated once per frame and applied to both CPS and click power. With 10 prestige points (2x multiplier), every upgrade produces double the coins and every click is worth double.
- `runCoinsEarned` is incremented alongside `totalCoinsEarned`, tracking the current run's progress separately.
- Click power is calculated as `(1 + baseCps * 0.01) * prestigeMult`, so the prestige bonus applies multiplicatively to the base click value plus the CPS bonus.

---

### 4. Add Prestige Logic to the Engine

**File:** `src/games/idle-clicker/IdleClickerEngine.ts`

Add the prestige method and wire it to input.

```typescript
import { createDefaultUpgrades } from './data/upgrades';
import { calcPrestigePoints, getPrestigeMultiplier } from './utils';

// In the constructor, initialize prestige fields:
this.state = {
  // ... existing fields ...
  prestigePoints: 0,
  prestigeCount: 0,
  runCoinsEarned: 0,
};

// Add the prestige method:
private prestige(): void {
  const newPoints = calcPrestigePoints(this.state.totalCoinsEarned);
  if (newPoints <= this.state.prestigePoints) return; // No new points to gain

  // Award new prestige points
  this.state.prestigePoints = newPoints;
  this.state.prestigeCount++;

  // Reset run progress
  this.state.coins = 0;
  this.state.runCoinsEarned = 0;
  this.state.totalClicks = 0;
  this.state.clickPower = 1;
  this.state.cps = 0;
  this.state.upgrades = createDefaultUpgrades();
  this.state.particles = [];
  this.state.coinPulse = 0;
  this.state.shopScroll = 0;

  // totalCoinsEarned is NOT reset -- it's the all-time total
}
```

**What's happening:**
- Prestige is only allowed if the player would gain new prestige points (calculated from all-time `totalCoinsEarned`). This prevents "empty" prestiges that waste the player's time.
- The method resets coins, upgrades, clicks, and CPS back to fresh-start values. Crucially, `totalCoinsEarned` and `prestigePoints` persist -- they are the permanent progression.
- `createDefaultUpgrades()` generates a fresh upgrade array with all `owned` counts at 0.
- `prestigeCount` increments for display purposes and potential unlock tracking.

---

### 5. Add Prestige Display to the HUD

**File:** `src/games/idle-clicker/renderers/HUDRenderer.ts`

Show prestige info and the available prestige points.

```typescript
import { formatNumber, calcPrestigePoints, getPrestigeMultiplier } from '../utils';

// Add to the end of the render() method, before the controls hint:

// Prestige info (top-right of game area)
if (state.prestigePoints > 0 || calcPrestigePoints(state.totalCoinsEarned) > 0) {
  const mult = getPrestigeMultiplier(state.prestigePoints);
  const prestX = gameW - 16;
  const prestY = 16;

  ctx.fillStyle = '#ce93d8';
  ctx.font = `bold ${Math.min(14, gameW * 0.028)}px monospace`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(`Prestige: ${state.prestigePoints} pts (${mult.toFixed(1)}x)`, prestX, prestY);

  // Show available points on next prestige
  const available = calcPrestigePoints(state.totalCoinsEarned);
  if (available > state.prestigePoints) {
    const gain = available - state.prestigePoints;
    ctx.fillStyle = '#ab47bc';
    ctx.font = `${Math.min(12, gameW * 0.025)}px monospace`;
    ctx.fillText(`+${gain} pts available [P to prestige]`, prestX, prestY + 20);
  }
}

// Update controls hint to include prestige key:
ctx.fillText('[P] Prestige  [H] Help  [ESC] Exit', cx, H - 16);
```

**What's happening:**
- The prestige display only appears once the player has earned enough to gain at least 1 prestige point (1M total coins), keeping the UI clean for new players.
- Current prestige points and the active multiplier are shown in purple in the top-right of the game area.
- When new points are available, a highlighted line shows how many points the player would gain, encouraging them to prestige.
- The `[P]` key hint is added to the controls bar at the bottom.

---

### 6. Add Prestige Key to Input System

**File:** `src/games/idle-clicker/systems/InputSystem.ts`

Handle the P key to trigger prestige.

```typescript
// Add a prestige callback to the constructor:
private onPrestige: () => void;

// In the onKey method:
private onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    this.onExit();
  } else if (e.key === 'p' || e.key === 'P') {
    this.onPrestige();
  } else if (e.key === 'h' || e.key === 'H') {
    this.onToggleHelp();
  }
}
```

**What's happening:**
- The P key triggers the prestige callback, which the engine maps to `this.prestige()`. The prestige method already validates that new points are available before proceeding.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Idle Clicker game
3. **Observe:**
   - Play normally: click and buy upgrades until your total earnings approach **1,000,000**
   - Once you cross 1M total coins, a **purple prestige display** appears in the top-right
   - It shows **"+1 pts available [P to prestige]"**
   - Press **P** -- everything resets: coins go to 0, upgrades reset to 0 owned
   - The prestige display now shows **"Prestige: 1 pts (1.1x)"**
   - Start clicking and buying again -- notice coins accumulate **10% faster** than before
   - Continue playing until you can prestige again for more points
   - After 10 prestige points, the multiplier reaches **2.0x** and progress feels noticeably faster
   - The multiplier compounds: 2x income means you reach prestige thresholds in half the time, earning more points per run

---

## Challenges

**Easy:**
- Change the prestige multiplier formula from `1 + points * 0.1` to `1 + points * 0.2` to make each prestige feel more impactful.

**Medium:**
- Add a confirmation prompt before prestiging: show a "Are you sure?" overlay that requires clicking "Yes" or pressing P again within 3 seconds.

**Hard:**
- Add a "prestige upgrade" shop that appears after the first prestige, letting players spend prestige points on permanent bonuses like "Start with 100 coins" or "Auto-clicker: 1 click per second."

---

## What You Learned

- Implementing a prestige/rebirth system that resets progress for permanent bonuses
- Using square-root scaling to create diminishing returns on prestige point accumulation
- Applying a global multiplier to both passive income and click power
- Separating permanent state (prestige points) from resettable state (coins, upgrades)

**Next:** Offline Progress & Polish -- calculate earnings while the player is away and persist everything to localStorage!
