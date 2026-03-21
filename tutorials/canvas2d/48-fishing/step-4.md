# Step 4: Reeling Minigame

**Goal:** Build a tension bar minigame -- reel carefully to land the fish without snapping the line or letting it go slack.

**Time:** ~15 minutes

---

## What You'll Build

- **Tension meter** -- a vertical bar on the right side with a green safe zone (0.3-0.7) and red danger zones
- **Reel progress bar** -- a horizontal bar showing how close you are to landing the fish
- **Fish fight AI** -- the fish randomly pulls the tension in alternating directions
- **Line snap / slack failure** -- tension reaching 0 or 1 means the fish escapes
- **Catch popup** -- a celebratory panel showing the caught fish's name, size, rarity, and points

---

## Concepts

- **Tension Management**: The core mechanic is a balancing act. Holding SPACE raises tension (reeling in) and also advances progress. Releasing lets tension fall. The green zone (0.3-0.7) is safe; drifting outside it risks snapping the line (tension = 1.0) or losing slack (tension = 0.0).
- **Fish Fight Behavior**: Each fish has a `fight` value (0-1) that controls how aggressively it resists. The fish changes pull direction every `0.8 * (1 - fight * 0.5)` seconds and applies `fight * 0.4` tension drift per second. A Sardine (fight: 0.1) barely pulls; a Kraken (fight: 0.95) yanks the line wildly.
- **Reel Speed Scaling**: Progress per second while holding is `0.12 * (1 - fight * 0.5)`. Harder fish reel in more slowly, extending the minigame and giving the fight AI more chances to push tension out of bounds.
- **Catch Result Recording**: When progress reaches 1.0, a `CaughtFish` object is created with the species, size, and timestamp. The catch popup displays for 3 seconds, and the engine detects the phase transition to record the catch in the catalog (Step 5).

---

## Code

### 1. Update the Fishing System -- Reeling Phase

**File:** `src/contexts/canvas2d/games/fishing/systems/FishingSystem.ts`

Add the reeling update logic and catch/fail handling.

```typescript
import type { FishingState, CaughtFish } from '../types';
import { pickRandomFish, randomSize } from '../data/fish';

export class FishingSystem {
  private readonly HOOK_WINDOW = 1.5;
  private readonly REEL_SPEED = 0.12;        // progress per second while holding
  private readonly TENSION_RISE = 0.6;        // tension rise when holding
  private readonly TENSION_FALL = 0.45;       // tension fall when releasing
  private readonly FISH_FIGHT_INTERVAL = 0.8; // seconds between direction changes

  update(state: FishingState, dt: number): void {
    switch (state.phase) {
      case 'waiting':
        this.updateWaiting(state, dt);
        break;
      case 'hooking':
        this.updateHooking(state, dt);
        break;
      case 'reeling':
        this.updateReeling(state, dt);
        break;
    }
  }

  private updateWaiting(s: FishingState, dt: number): void {
    s.waitElapsed += dt;
    s.bobberBobTime += dt;

    if (s.waitElapsed >= s.waitTimer && !s.fishBiting) {
      s.fishBiting = true;
      s.phase = 'hooking';
      s.hookWindowTimer = this.HOOK_WINDOW;
      s.hookWindowDuration = this.HOOK_WINDOW;
      s.hookSuccess = false;

      s.currentFish = pickRandomFish(s.castDistance);
      s.currentFishSize = randomSize(s.currentFish);
    }
  }

  private updateHooking(s: FishingState, dt: number): void {
    s.hookWindowTimer -= dt;
    s.bobberBobTime += dt;

    if (s.hookSuccess) {
      // Successfully hooked — start reeling!
      s.phase = 'reeling';
      s.reelTension = 0.5;
      s.reelProgress = 0;
      s.reelHolding = false;
      s.fishFightTimer = 0;
      s.fishFightDir = 1;
      return;
    }

    if (s.hookWindowTimer <= 0) {
      this.resetToIdle(s);
    }
  }

  private updateReeling(s: FishingState, dt: number): void {
    if (!s.currentFish) {
      this.resetToIdle(s);
      return;
    }

    const fight = s.currentFish.fight;

    // Fish fights — changes pull direction at intervals
    s.fishFightTimer += dt;
    if (s.fishFightTimer >= this.FISH_FIGHT_INTERVAL * (1 - fight * 0.5)) {
      s.fishFightTimer = 0;
      s.fishFightDir = Math.random() > 0.5 ? 1 : -1;
    }

    // Fish fight applies constant tension drift
    s.reelTension += s.fishFightDir * fight * 0.4 * dt;

    // Player holding = reel in + raise tension
    if (s.reelHolding) {
      s.reelTension += this.TENSION_RISE * dt;
      s.reelProgress += this.REEL_SPEED * (1 - fight * 0.5) * dt;
    } else {
      s.reelTension -= this.TENSION_FALL * dt;
    }

    // Clamp tension to 0-1
    s.reelTension = Math.max(0, Math.min(1, s.reelTension));

    // Check tension failure (snap or slack)
    if (s.reelTension >= 1 || s.reelTension <= 0) {
      // Line snapped or went slack — fish escapes
      this.resetToIdle(s);
      return;
    }

    // Check catch success
    if (s.reelProgress >= 1) {
      this.catchFish(s);
    }
  }

  private catchFish(s: FishingState): void {
    if (!s.currentFish) return;

    const caught: CaughtFish = {
      fish: s.currentFish,
      size: s.currentFishSize,
      timestamp: Date.now(),
    };

    s.lastCatch = caught;
    s.catchPopupTimer = 3; // show popup for 3 seconds
    s.totalScore += s.currentFish.points;
    s.totalCaught += 1;

    this.resetToIdle(s);
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
- `updateReeling()` is the heart of the minigame. Each frame it applies three forces to tension: (1) the fish's fight pull, (2) the player's reel-in pressure (when holding), and (3) natural tension fall (when releasing).
- The fish changes pull direction every `0.8 * (1 - fight * 0.5)` seconds. A high-fight fish (0.95) flips every 0.42 seconds, keeping the player constantly adjusting. A low-fight fish (0.1) flips every 0.76 seconds and barely moves the needle.
- Reel progress advances at `0.12 * (1 - fight * 0.5)` per second while holding. A common Sardine (fight 0.1) reels in about 8.8 seconds; a legendary Kraken (fight 0.95) takes over 16 seconds of careful tension management.
- If tension hits exactly 0 or 1, the fish escapes immediately. There is no grace period -- this creates real stakes for the balancing act.
- `catchFish()` creates a `CaughtFish` record, updates score/count, starts the 3-second popup timer, then resets to idle.

---

### 2. Update the HUD Renderer -- Tension and Progress

**File:** `src/contexts/canvas2d/games/fishing/renderers/HUDRenderer.ts`

Add the tension meter, progress bar, and catch popup to the HUD.

```typescript
// Add these cases to the switch in render():
//   case 'reeling':
//     this.drawTensionMeter(ctx, state, W, H);
//     break;

// After the switch, add:
//   if (state.catchPopupTimer > 0 && state.lastCatch) {
//     this.drawCatchPopup(ctx, state, W, H);
//   }

// Add these methods to HUDRenderer:

private drawTensionMeter(
  ctx: CanvasRenderingContext2D, state: FishingState, W: number, H: number
): void {
  // Fish info label
  if (state.currentFish) {
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = RARITY_COLORS[state.currentFish.rarity];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      `${state.currentFish.icon} Reeling: ${state.currentFish.name}`,
      W / 2, H * 0.62
    );
  }

  // ── Vertical tension bar (right side) ──
  const barW = 30;
  const barH = H * 0.4;
  const bx = W - 60;
  const by = (H - barH) / 2;

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.roundRect(bx, by, barW, barH, 6);
  ctx.fill();

  // Green zone (0.3 - 0.7 of bar height)
  const greenTop = by + barH * 0.3;
  const greenBottom = by + barH * 0.7;
  ctx.fillStyle = 'rgba(76,175,80,0.3)';
  ctx.fillRect(bx, greenTop, barW, greenBottom - greenTop);

  // Red danger zones (top and bottom)
  ctx.fillStyle = 'rgba(244,67,54,0.2)';
  ctx.fillRect(bx, by, barW, greenTop - by);
  ctx.fillRect(bx, greenBottom, barW, by + barH - greenBottom);

  // Tension indicator (horizontal slider)
  const tensionY = by + barH * (1 - state.reelTension);
  ctx.fillStyle = (state.reelTension > 0.3 && state.reelTension < 0.7)
    ? '#4caf50' : '#f44336';
  ctx.beginPath();
  ctx.roundRect(bx - 4, tensionY - 4, barW + 8, 8, 4);
  ctx.fill();

  // Label
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('TENSION', bx + barW / 2, by + barH + 8);

  // ── Horizontal progress bar (bottom center) ──
  const progW = 300;
  const progH = 16;
  const px = (W - progW) / 2;
  const py = H * 0.82;

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.roundRect(px, py, progW, progH, 4);
  ctx.fill();

  ctx.fillStyle = '#2196f3';
  ctx.beginPath();
  ctx.roundRect(px, py, progW * state.reelProgress, progH, 4);
  ctx.fill();

  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Reel: ${Math.round(state.reelProgress * 100)}%`, W / 2, py + progH / 2);

  // Instructions
  ctx.font = '12px monospace';
  ctx.fillStyle = '#aaa';
  ctx.textBaseline = 'top';
  ctx.fillText('Hold SPACE to reel — keep tension in the green zone!', W / 2, py + progH + 8);
}

private drawCatchPopup(
  ctx: CanvasRenderingContext2D, state: FishingState, W: number, H: number
): void {
  const caught = state.lastCatch!;
  const alpha = Math.min(1, state.catchPopupTimer);
  ctx.globalAlpha = alpha;

  // Panel
  const panelW = 320;
  const panelH = 140;
  const px = (W - panelW) / 2;
  const py = H * 0.25;

  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.beginPath();
  ctx.roundRect(px, py, panelW, panelH, 12);
  ctx.fill();

  ctx.strokeStyle = RARITY_COLORS[caught.fish.rarity];
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(px, py, panelW, panelH, 12);
  ctx.stroke();

  // Title
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#ffd54f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('CATCH!', W / 2, py + 12);

  // Fish info
  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = RARITY_COLORS[caught.fish.rarity];
  ctx.fillText(`${caught.fish.icon} ${caught.fish.name}`, W / 2, py + 40);

  ctx.font = '14px monospace';
  ctx.fillStyle = '#ccc';
  ctx.fillText(
    `${caught.size} cm  •  ${caught.fish.rarity.toUpperCase()}`,
    W / 2, py + 70
  );

  ctx.fillStyle = '#4caf50';
  ctx.fillText(`+${caught.fish.points} points`, W / 2, py + 92);

  ctx.globalAlpha = 1;
}
```

**What's happening:**
- The tension meter is a vertical bar on the right side of the screen. The bar is divided into three zones: red (top, tension too high), green (middle, safe zone 0.3-0.7), and red (bottom, tension too low). The tension indicator slides up and down within the bar.
- The indicator color changes based on its position: green when in the safe zone, red when in danger. This gives instant visual feedback without needing to read numbers.
- The progress bar at the bottom shows reel completion as a percentage. It fills from left to right with blue as the player successfully reels in.
- The catch popup uses `ctx.globalAlpha` to fade out during its final second (`Math.min(1, catchPopupTimer)`). The border color matches the fish's rarity color, and the panel shows the icon, name, size, rarity, and points earned.
- The fish name label above the tension meter is colored by rarity, so the player immediately knows if they have hooked something special.

---

### 3. Update the Engine -- Catch Popup Timer

**File:** `src/contexts/canvas2d/games/fishing/FishingEngine.ts`

Add the catch popup countdown and reeling phase bobber animation.

```typescript
// In update(dt), add after fishingSystem.update():

// Update catch popup timer
if (this.state.catchPopupTimer > 0) {
  this.state.catchPopupTimer -= dt;
}
```

**What's happening:**
- The catch popup timer counts down from 3.0 to 0. The HUD only draws the popup when `catchPopupTimer > 0`, so it automatically disappears after 3 seconds.
- This timer runs independently of the phase, so the player sees the catch celebration even after the state has returned to idle.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Fishing game in your browser
3. **Test the full fishing loop:**
   - **Cast** with SPACE (hold and release)
   - **Wait** for the bite
   - **Hook** the fish by pressing SPACE within 1.5 seconds
   - **Reel** by holding SPACE -- watch the tension meter on the right
   - **Release SPACE** when tension gets too high (near the top red zone)
   - **Hold again** when tension drops toward the bottom red zone
   - Keep the indicator in the **green zone** until the progress bar reaches 100%
   - See the **"CATCH!"** popup with the fish name, size, and points
   - Try hooking a fish and **intentionally letting tension hit 0 or 1** -- the fish should escape
   - Notice the **score and fish count** update in the top-left after each catch
   - Try a **long cast** -- you may encounter uncommon or rare fish that fight harder

---

## Challenges

**Easy:**
- Widen the green zone from 0.3-0.7 to 0.2-0.8 for a more forgiving experience.
- Increase `REEL_SPEED` to 0.2 so fish are caught faster.

**Medium:**
- Add a "line snap" text animation that briefly flashes "LINE SNAPPED!" or "FISH ESCAPED!" when the tension hits the extremes.

**Hard:**
- Make the tension meter wobble visually when the fish changes fight direction: briefly shake the bar left and right by a few pixels using `Math.sin()` for 0.2 seconds after each direction change.

---

## What You Learned

- Building a tension-management minigame with opposing forces (player reel vs. fish fight)
- Using fish-specific `fight` values to scale difficulty dynamically
- Drawing a vertical meter with color-coded zones (green safe, red danger)
- Implementing a catch popup with fade-out animation using `globalAlpha`
- Managing multiple simultaneous timers (fight interval, progress, popup countdown)

**Next:** Fish Catalog & Polish -- add a persistent collection log, species discovery tracking, and the finishing touches!
