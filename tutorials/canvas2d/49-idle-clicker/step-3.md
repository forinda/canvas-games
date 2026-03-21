# Step 3: Cost Scaling & Formatting

**Goal:** Abbreviate large numbers with K/M/B/T suffixes and see exponential cost curves in action.

**Time:** ~15 minutes

---

## What You'll Build

- **A `formatNumber` function** that converts large numbers to readable strings (1,500 becomes "1.50K", 2,300,000 becomes "2.30M")
- **Formatted displays everywhere** -- coin counter, upgrade costs, CPS rates, and click power all use abbreviated notation
- **CPS rate display** below the coin showing passive income speed
- **Background tier progression** that visually shifts gradient colors as total earnings grow through milestones (1K, 100K, 10M, 1B)

---

## Concepts

- **Big Number Formatting**: Idle games quickly reach numbers in the millions, billions, and beyond. Displaying "1,234,567" takes up too much space and is hard to parse. Suffixes (K, M, B, T, Qa, Qi) compress the display while preserving meaningful precision.
- **Tiered Precision**: Numbers under 10 get two decimal places ("1.50K"), under 100 get one ("15.3K"), and 100+ get none ("150K"). This keeps the display compact at every scale.
- **Exponential Cost Curves**: With a 1.15x multiplier, buying 50 Cursors takes the cost from 15 to 16,367. After 100 purchases it is 18 million. This curve is what makes idle games feel "crunchy" -- each purchase is a meaningful decision.
- **Visual Progression**: The `BG_TIERS` array maps total coins earned to background gradient colors. As the player crosses thresholds (1K, 100K, 10M, 1B), the screen shifts from dark blue to purple to red to gold, giving a constant sense of forward motion.

---

## Code

### 1. Create the Number Formatter

**File:** `src/contexts/canvas2d/games/idle-clicker/utils.ts`

Add the `formatNumber` function alongside the existing `getUpgradeCost`.

```typescript
import type { Upgrade } from './types';

/** Format a number with K/M/B/T suffixes */
export function formatNumber(n: number): string {
  if (n < 0) return '-' + formatNumber(-n);

  if (n < 1000) {
    // Show one decimal for small fractional numbers
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
```

**What's happening:**
- Negative numbers are handled recursively by stripping the sign, formatting the absolute value, and prepending a dash.
- Numbers below 1,000 are shown as-is, with one decimal place for small fractions (like CPS values of 0.1).
- The `while` loop divides by 1,000 repeatedly to find the correct suffix tier. A value of 2,500,000 divides twice (2,500 then 2.5) landing at tier 2 ("M").
- Precision adapts to magnitude: `2.50M` (two decimals when under 10), `25.0M` (one decimal when under 100), `250M` (no decimals when 100+). This keeps the string short and informative at every scale.
- The suffix array extends to Qa (quadrillion) and Qi (quintillion) to handle late-game numbers. In practice, most idle clickers need at least T (trillion).

---

### 2. Update the HUD Renderer

**File:** `src/contexts/canvas2d/games/idle-clicker/renderers/HUDRenderer.ts`

Replace raw number displays with formatted values and add the CPS rate.

```typescript
import type { IdleState } from '../types';
import { SHOP_WIDTH_RATIO, SHOP_MIN_WIDTH, SHOP_MAX_WIDTH } from '../types';
import { formatNumber } from '../utils';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: IdleState): void {
    const W = state.width;
    const H = state.height;
    const shopW = Math.max(
      SHOP_MIN_WIDTH,
      Math.min(SHOP_MAX_WIDTH, W * SHOP_WIDTH_RATIO),
    );
    const gameW = W - shopW;
    const cx = gameW / 2;

    // Total coins -- large display at top
    ctx.fillStyle = '#ffc107';
    ctx.font = `bold ${Math.min(42, gameW * 0.07)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${formatNumber(state.coins)}`, cx, 30);

    // "coins" label
    ctx.fillStyle = 'rgba(255, 193, 7, 0.6)';
    ctx.font = `${Math.min(16, gameW * 0.03)}px monospace`;
    ctx.fillText('coins', cx, 30 + Math.min(48, gameW * 0.08));

    // CPS rate below the coin
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = `${Math.min(14, gameW * 0.028)}px monospace`;
    ctx.fillText(
      `${formatNumber(state.cps)} per second`,
      cx,
      H * 0.45 + Math.min(gameW, H) * 0.15 + 50,
    );

    // Stats at bottom-left of game area
    const statsX = 16;
    const statsY = H - 60;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = `${Math.min(12, gameW * 0.025)}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(
      `Click power: ${formatNumber(state.clickPower)}`,
      statsX,
      statsY,
    );
    ctx.fillText(
      `Total clicks: ${state.totalClicks.toLocaleString()}`,
      statsX,
      statsY + 18,
    );

    // Controls hint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = `${Math.min(11, gameW * 0.022)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('[H] Help  [ESC] Exit', cx, H - 16);
  }
}
```

**What's happening:**
- `formatNumber(state.coins)` replaces `Math.floor(state.coins)`, so once the player has 1,500 coins it shows "1.50K" instead of "1500".
- The CPS rate is now displayed below the coin button, positioned relative to the coin's center plus its radius. This tells the player exactly how fast they are earning passively.
- Click power uses `formatNumber` too -- once CPS reaches high values, click power will show suffixed numbers.
- `state.totalClicks.toLocaleString()` adds comma separators (e.g., "1,234") for the click counter, which stays as a raw count since it does not grow as fast.

---

### 3. Update the Shop Renderer

**File:** `src/contexts/canvas2d/games/idle-clicker/renderers/ShopRenderer.ts`

Use `formatNumber` for costs and CPS values in the shop.

```typescript
// In the upgrade item rendering loop, replace raw cost and CPS displays:

// Cost line -- was: `Cost: ${cost}`
ctx.fillText(`Cost: ${formatNumber(cost)}`, textX, y + itemH / 2 + 2);

// CPS line -- was: `+${u.cps}/s each | Total: ${totalCps}/s`
const cpsText = u.owned > 0
  ? `+${formatNumber(u.cps)}/s each | Total: ${formatNumber(totalCps)}/s`
  : `+${formatNumber(u.cps)}/s each`;
ctx.fillText(cpsText, textX, y + itemH - 6, maxTextW);
```

**What's happening:**
- Upgrade costs that grow into the thousands, millions, and beyond now display as "15.0K", "1.40M", etc. instead of unwieldy raw numbers.
- CPS values per upgrade and total CPS contribution both use formatting, keeping the shop readable at every stage of the game.

---

### 4. Observe the Background Tiers

The `GameRenderer` already uses `BG_TIERS` from types to select a background gradient. As the player accumulates total coins, the background shifts automatically:

| Total Coins | Gradient Colors | Feel |
|---|---|---|
| 0 | Dark navy | Starting out |
| 1,000 | Deeper blue | Getting started |
| 100,000 | Purple | Mid-game |
| 10,000,000 | Purple to red | Advanced |
| 1,000,000,000 | Dark red to gold | Endgame |

No additional code is needed -- this was built into `GameRenderer.getBackgroundTier()` from Step 1. Now that numbers grow large enough to cross these thresholds, you will actually see the transitions.

---

### 5. Verify the Cost Curve

Here is what the exponential cost scaling looks like for the Cursor upgrade (base 15, multiplier 1.15):

| Owned | Cost | Total Spent |
|---|---|---|
| 0 | 15 | 0 |
| 5 | 30 | 105 |
| 10 | 60 | 320 |
| 20 | 245 | 1,800 |
| 50 | 16.4K | 110K |
| 100 | 18.0M | 121M |

The cost roughly doubles every 5 purchases. This means early upgrades feel fast and rewarding, while later purchases require patience or switching to higher-tier upgrades. This curve is the fundamental tension engine of the idle genre.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Idle Clicker game
3. **Observe:**
   - Click rapidly until you have ~50 coins. The display shows raw numbers: "50"
   - Buy 3-4 Cursors and let CPS accumulate. Watch coins tick past **1,000** -- the display switches to **"1.00K"**
   - Buy several Grandmas. As you approach 100K total, the **background gradient shifts** from dark blue to purple
   - Check the shop -- Cursor costs now show as **"30"**, **"34"**, etc. with each purchase growing 15%
   - Watch the **CPS display** below the coin update as you buy more upgrades
   - Let the game idle until coins cross 1M -- the display shows **"1.00M"**
   - The **click power** stat at the bottom grows as CPS increases, showing formatted values

---

## Challenges

**Easy:**
- Add a "coins per click" stat line in the HUD, showing the current click power as a formatted number with a "per click" label.

**Medium:**
- Add time-to-next-upgrade display: calculate `(cost - coins) / cps` for the cheapest affordable upgrade and show "Next in: Xs" below the shop header.

**Hard:**
- Implement a "Buy Max" button that calculates the maximum number of a given upgrade the player can afford using the geometric series sum formula: `sum = baseCost * (multiplier^n - 1) / (multiplier - 1)`.

---

## What You Learned

- Formatting large numbers with tiered precision and K/M/B/T suffixes
- How exponential cost curves (`base * multiplier^owned`) create meaningful progression tension
- Using visual milestones (background color tiers) to communicate progress without UI clutter
- Applying consistent formatting across HUD, shop, and particle displays

**Next:** Prestige System -- reset your progress in exchange for a permanent multiplier that makes your next run faster!
