# Step 3: Bite Detection & Hook

**Goal:** Wait for a random bite, display a reaction alert, and let the player press to hook the fish.

**Time:** ~15 minutes

---

## What You'll Build

- **Fish species data** with rarity tiers, size ranges, and weighted random selection
- **Bite detection** after a randomized wait timer
- **Hook reaction window** -- a flashing alert with a countdown timer bar
- **Bobber splash effect** when a fish bites
- **Fish selection** influenced by cast distance (longer casts find rarer fish)

---

## Concepts

- **Weighted Random Selection**: Each fish species has a `weight` value (e.g., Sardine = 30, Kraken = 0.5). To pick a fish, we sum all weights, generate a random roll in that range, and subtract weights one by one until the roll goes below zero. Higher weights mean higher probability.
- **Distance-Boosted Rarity**: Longer casts multiply the weight of rare and legendary fish. A `castDistance` of 1.0 doubles legendary weights (`w *= 1 + 1.0 * 2`), making deep water more rewarding without making rare fish impossible near shore.
- **Reaction Window**: When a fish bites, the player has exactly 1.5 seconds to press SPACE or click. A countdown bar and flashing text create urgency. Missing the window resets to idle -- the fish escapes.
- **Visual Feedback**: The bobber turns red and generates expanding ring "splash" effects when a fish bites. This combines color change, animation, and text alerts to ensure the player notices immediately.

---

## Code

### 1. Create the Fish Data

**File:** `src/contexts/canvas2d/games/fishing/data/fish.ts`

All fish species definitions and the weighted random picker.

```typescript
import type { Fish } from '../types';

export const FISH_SPECIES: Fish[] = [
  // ── Common ──
  {
    name: 'Sardine', rarity: 'common', sizeRange: [8, 20],
    icon: '🐟', color: '#90a4ae', points: 10, weight: 30, fight: 0.1,
  },
  {
    name: 'Trout', rarity: 'common', sizeRange: [20, 50],
    icon: '🐟', color: '#a1887f', points: 15, weight: 25, fight: 0.2,
  },
  {
    name: 'Bass', rarity: 'common', sizeRange: [25, 60],
    icon: '🐟', color: '#81c784', points: 20, weight: 25, fight: 0.25,
  },

  // ── Uncommon ──
  {
    name: 'Salmon', rarity: 'uncommon', sizeRange: [40, 90],
    icon: '🐠', color: '#ff8a65', points: 40, weight: 12, fight: 0.35,
  },
  {
    name: 'Tuna', rarity: 'uncommon', sizeRange: [60, 150],
    icon: '🐠', color: '#4db6ac', points: 50, weight: 10, fight: 0.45,
  },
  {
    name: 'Swordfish', rarity: 'uncommon', sizeRange: [100, 250],
    icon: '🐠', color: '#7986cb', points: 60, weight: 8, fight: 0.5,
  },

  // ── Rare ──
  {
    name: 'Marlin', rarity: 'rare', sizeRange: [150, 400],
    icon: '🦈', color: '#5c6bc0', points: 100, weight: 4, fight: 0.65,
  },
  {
    name: 'Shark', rarity: 'rare', sizeRange: [200, 500],
    icon: '🦈', color: '#78909c', points: 120, weight: 3, fight: 0.8,
  },
  {
    name: 'Whale', rarity: 'rare', sizeRange: [500, 1500],
    icon: '🐋', color: '#42a5f5', points: 150, weight: 2, fight: 0.7,
  },

  // ── Legendary ──
  {
    name: 'Golden Fish', rarity: 'legendary', sizeRange: [15, 30],
    icon: '✨', color: '#ffd54f', points: 300, weight: 1, fight: 0.9,
  },
  {
    name: 'Kraken', rarity: 'legendary', sizeRange: [1000, 3000],
    icon: '🐙', color: '#ce93d8', points: 500, weight: 0.5, fight: 0.95,
  },
  {
    name: 'Mermaid\'s Pearl', rarity: 'legendary', sizeRange: [5, 10],
    icon: '🔮', color: '#e0f7fa', points: 1000, weight: 0.3, fight: 0.6,
  },
];

/** Pick a random fish, weighted by rarity. Cast distance boosts rare chances. */
export function pickRandomFish(castDistance: number): Fish {
  // Further casts improve rare/legendary odds
  const boosted = FISH_SPECIES.map(f => {
    let w = f.weight;
    if (f.rarity === 'rare') w *= (1 + castDistance * 1.5);
    if (f.rarity === 'legendary') w *= (1 + castDistance * 2);
    return { fish: f, w };
  });

  const total = boosted.reduce((s, b) => s + b.w, 0);
  let roll = Math.random() * total;

  for (const b of boosted) {
    roll -= b.w;
    if (roll <= 0) return b.fish;
  }

  return FISH_SPECIES[0];
}

/** Random size within the fish's size range */
export function randomSize(fish: Fish): number {
  const [min, max] = fish.sizeRange;
  return Math.round((min + Math.random() * (max - min)) * 10) / 10;
}
```

**What's happening:**
- 12 fish species span four rarity tiers. Common fish have high `weight` values (25-30), while legendaries have very low weights (0.3-1.0), making them proportionally rare in random selection.
- `pickRandomFish()` boosts rare weights by `1 + castDistance * 1.5` and legendary weights by `1 + castDistance * 2`. At full cast distance (1.0), legendary fish are three times more likely than at minimum distance.
- The weighted selection algorithm sums all weights, generates a random value in that range, then iterates through species subtracting each weight. The fish whose subtraction brings the roll to zero or below is selected.
- `randomSize()` picks a value within the fish's size range, rounded to one decimal place for display.

---

### 2. Create the Fishing System

**File:** `src/contexts/canvas2d/games/fishing/systems/FishingSystem.ts`

Manages the waiting, hooking, and (later) reeling phases.

```typescript
import type { FishingState } from '../types';
import { pickRandomFish, randomSize } from '../data/fish';

export class FishingSystem {
  private readonly HOOK_WINDOW = 1.5; // seconds to react

  update(state: FishingState, dt: number): void {
    switch (state.phase) {
      case 'waiting':
        this.updateWaiting(state, dt);
        break;
      case 'hooking':
        this.updateHooking(state, dt);
        break;
    }
  }

  private updateWaiting(s: FishingState, dt: number): void {
    s.waitElapsed += dt;
    s.bobberBobTime += dt;

    if (s.waitElapsed >= s.waitTimer && !s.fishBiting) {
      // Fish bites!
      s.fishBiting = true;
      s.phase = 'hooking';
      s.hookWindowTimer = this.HOOK_WINDOW;
      s.hookWindowDuration = this.HOOK_WINDOW;
      s.hookSuccess = false;

      // Pick the fish now based on cast distance
      s.currentFish = pickRandomFish(s.castDistance);
      s.currentFishSize = randomSize(s.currentFish);
    }
  }

  private updateHooking(s: FishingState, dt: number): void {
    s.hookWindowTimer -= dt;
    s.bobberBobTime += dt;

    if (s.hookSuccess) {
      // Successfully hooked — transition to reeling (Step 4)
      s.phase = 'idle'; // Placeholder: goes to reeling in next step
      s.castPower = 0;
      s.castCharging = false;
      s.castDistance = 0;
      s.fishBiting = false;
      s.hookSuccess = false;
      s.currentFish = null;
      return;
    }

    if (s.hookWindowTimer <= 0) {
      // Missed the hook — fish escapes
      this.resetToIdle(s);
    }
  }

  private resetToIdle(s: FishingState): void {
    s.phase = 'idle';
    s.castPower = 0;
    s.castCharging = false;
    s.castDistance = 0;
    s.fishBiting = false;
    s.hookSuccess = false;
    s.reelHolding = false;
    s.currentFish = null;
    s.currentFishSize = 0;
  }
}
```

**What's happening:**
- `updateWaiting()` counts elapsed time against the randomized `waitTimer`. When time is up, it sets `fishBiting = true`, transitions to `hooking` phase, starts the 1.5-second hook window, and selects a fish species using the cast distance for rarity boosting.
- `updateHooking()` counts down the hook window. If the player sets `hookSuccess = true` (via SPACE or click in the InputSystem), the phase transitions forward. For now it resets to idle; Step 4 will change this to start reeling.
- If `hookWindowTimer` reaches zero without a hook, `resetToIdle()` clears all casting/fishing state and returns to the idle prompt. The fish got away.
- The fish species and size are determined at bite time, not at catch time. This lets the reeling phase (Step 4) use the fish's `fight` value to adjust difficulty.

---

### 3. Update the Scene Renderer -- Splash Effect

**File:** `src/contexts/canvas2d/games/fishing/renderers/SceneRenderer.ts`

Update the `drawBobber` method to show a red bobber and splash rings when a fish is biting.

```typescript
// Replace the drawBobber method in SceneRenderer:

private drawBobber(ctx: CanvasRenderingContext2D, state: FishingState): void {
  const bob = Math.sin(state.bobberBobTime * 3) * 4;
  const x = state.bobberX;
  const y = state.bobberY + bob;

  // Bobber body — turns red when fish is biting
  ctx.fillStyle = state.fishBiting ? '#ff1744' : '#ff5722';
  ctx.beginPath();
  ctx.ellipse(x, y, 6, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bobber top
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(x, y - 8, 4, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Splash effect when fish biting or in hook phase
  if (state.fishBiting || state.phase === 'hooking') {
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    const splashR = 10 + Math.sin(state.bobberBobTime * 8) * 5;

    ctx.beginPath();
    ctx.arc(x, y, splashR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, splashR + 8, 0, Math.PI * 2);
    ctx.stroke();
  }
}
```

**What's happening:**
- The bobber body color switches from standard orange (`#ff5722`) to bright red (`#ff1744`) when `fishBiting` is true, providing immediate visual feedback.
- Two expanding/contracting concentric circles create a splash effect. Their radius oscillates via `Math.sin(bobberBobTime * 8)` at about 1.3 Hz -- fast enough to look like active splashing.
- The splash draws during both `fishBiting` (the instant of the bite) and the entire `hooking` phase, so the urgency remains visible while the countdown runs.

---

### 4. Update the HUD Renderer -- Hook Window

**File:** `src/contexts/canvas2d/games/fishing/renderers/HUDRenderer.ts`

Add the hook window alert with flashing text and countdown bar to the HUD.

```typescript
// Add this case to the switch in the render() method:
//   case 'hooking':
//     this.drawHookWindow(ctx, state, W, H);
//     break;

// Add this method to HUDRenderer:

private drawHookWindow(
  ctx: CanvasRenderingContext2D, state: FishingState, W: number, H: number
): void {
  // Flashing alert text
  const flash = Math.sin(state.time * 15) > 0;
  ctx.font = 'bold 24px monospace';
  ctx.fillStyle = flash ? '#ff1744' : '#ff8a80';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FISH ON! Click or press SPACE!', W / 2, H * 0.7);

  // Countdown timer bar
  const barW = 200;
  const barH = 12;
  const bx = (W - barW) / 2;
  const by = H * 0.7 + 24;
  const pct = Math.max(0, state.hookWindowTimer / state.hookWindowDuration);

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.roundRect(bx, by, barW, barH, 3);
  ctx.fill();

  // Fill — changes from orange to red as time runs out
  ctx.fillStyle = pct > 0.3 ? '#ff9800' : '#f44336';
  ctx.beginPath();
  ctx.roundRect(bx, by, barW * pct, barH, 3);
  ctx.fill();
}
```

**What's happening:**
- The alert text alternates between bright red and lighter red at ~2.4 Hz using `Math.sin(state.time * 15)`. This rapid flashing grabs attention without being painful to look at.
- The countdown bar shows the remaining hook window as a percentage: `hookWindowTimer / hookWindowDuration`. It starts full and shrinks to zero over 1.5 seconds.
- The bar color shifts from orange to red when below 30% remaining time, adding a final urgency signal as the window is about to close.
- The bar uses `roundRect` with a 3px radius for a polished look consistent with other UI elements.

---

### 5. Update the Engine

**File:** `src/contexts/canvas2d/games/fishing/FishingEngine.ts`

Wire up the FishingSystem in the update loop.

```typescript
// Add to constructor:
this.fishingSystem = new FishingSystem();

// Add to update(dt), after castingSystem.update():
this.fishingSystem.update(this.state, dt);
```

**What's happening:**
- The FishingSystem runs after the CastingSystem each frame. Order matters: the CastingSystem may transition from `casting` to `waiting`, and then the FishingSystem immediately starts tracking the wait timer in that same frame.
- Both systems guard themselves with phase checks, so calling them unconditionally is safe and keeps the engine code clean.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Fishing game in your browser
3. **Test the full cast-and-hook flow:**
   - Press and hold **SPACE** to charge the power meter
   - Release to cast -- the bobber lands on the water and bobs gently
   - Wait 2-8 seconds for the **"Waiting for a bite..."** text
   - When the fish bites: the bobber turns **red**, splash rings appear, and **"FISH ON!"** flashes
   - Press **SPACE** or **click** within 1.5 seconds to hook the fish
   - Watch the **countdown bar** shrink -- if you miss it, the fish escapes and you return to idle
   - Try casting at **full power** and **low power** -- longer casts take the same wait time but access rarer fish

---

## Challenges

**Easy:**
- Change `HOOK_WINDOW` from 1.5 to 3.0 seconds for an easier reaction time, or 0.8 for a real challenge.
- Add a sound effect placeholder: log "SPLASH!" to the console when a fish bites.

**Medium:**
- Display the fish species name briefly when the hook is successful (e.g., "Hooked a Salmon!") before transitioning to the next phase.

**Hard:**
- Make the wait timer inversely proportional to cast distance: short casts wait longer (4-10s), long casts get bites faster (1-4s), rewarding skilled casting.

---

## What You Learned

- Implementing weighted random selection with distance-based rarity boosting
- Building a timed reaction window with countdown bar and flashing alerts
- Using visual feedback (color changes, splash effects) to communicate game events
- Managing phase transitions between waiting, hooking, and idle states
- Structuring game systems that check phase guards before updating

**Next:** Reeling Minigame -- add a tension bar where you must carefully hold SPACE to reel in the fish without snapping the line!
