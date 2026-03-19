# Combo System

## What Is It?

A combo system rewards the player for consecutive successful actions performed in quick succession. Think of a fighting game where landing punch after punch increases a hit counter and a score multiplier. Miss once, and the combo resets. The pressure of maintaining a combo adds excitement: you play more aggressively to keep the chain alive, risking a miss for bigger rewards.

Combos turn simple repetitive actions into a risk/reward loop and give skilled players a way to shine.

## How It Works

```
State:
  comboCount    = 0     // consecutive hits
  multiplier    = 1.0   // score multiplier
  decayTimer    = 0     // seconds since last hit

On successful action (hit, kill, catch):
  comboCount++
  decayTimer = COMBO_WINDOW   // reset the timer
  multiplier = calculateMultiplier(comboCount)
  score += basePoints * multiplier

Each frame:
  decayTimer -= dt
  if (decayTimer <= 0) {
    comboCount = 0
    multiplier = 1.0   // combo dropped
  }

Multiplier tiers (example):
  1-4 hits   → 1.0x
  5-9 hits   → 1.5x
  10-19 hits → 2.0x
  20-49 hits → 3.0x
  50+ hits   → 5.0x
```

Timeline:

```
  hit  hit  hit  hit  ···(timeout)···  hit
   1    2    3    4    combo drops!      1  ← resets
  1.0  1.0  1.0  1.0                   1.0
                        timer ran out
```

## Code Example

```typescript
interface ComboTier {
  minHits: number;
  multiplier: number;
  label: string;
}

const COMBO_TIERS: ComboTier[] = [
  { minHits: 50, multiplier: 5.0, label: "UNSTOPPABLE" },
  { minHits: 20, multiplier: 3.0, label: "FRENZY" },
  { minHits: 10, multiplier: 2.0, label: "RAMPAGE" },
  { minHits: 5, multiplier: 1.5, label: "COMBO" },
  { minHits: 0, multiplier: 1.0, label: "" },
];

class ComboSystem {
  count = 0;
  multiplier = 1.0;
  label = "";
  private decayTimer = 0;
  private readonly window: number; // seconds to keep combo alive

  constructor(comboWindow = 2.0) {
    this.window = comboWindow;
  }

  hit(baseScore: number): number {
    this.count++;
    this.decayTimer = this.window;
    this.updateTier();
    return Math.floor(baseScore * this.multiplier);
  }

  update(dt: number): void {
    if (this.count === 0) return;
    this.decayTimer -= dt;
    if (this.decayTimer <= 0) {
      this.reset();
    }
  }

  private updateTier(): void {
    for (const tier of COMBO_TIERS) {
      if (this.count >= tier.minHits) {
        this.multiplier = tier.multiplier;
        this.label = tier.label;
        return;
      }
    }
  }

  private reset(): void {
    this.count = 0;
    this.multiplier = 1.0;
    this.label = "";
  }
}

// Usage
const combo = new ComboSystem(1.5);
let total = 0;
total += combo.hit(100); // hit 1: 100 * 1.0 = 100
total += combo.hit(100); // hit 2: 100 * 1.0 = 100
total += combo.hit(100); // hit 3: 100 * 1.0 = 100
total += combo.hit(100); // hit 4: 100 * 1.0 = 100
total += combo.hit(100); // hit 5: 100 * 1.5 = 150  COMBO!
console.log(`Total: ${total}, Combo: ${combo.count}x ${combo.label}`);
```

## Used In These Games

- **Tower Defense**: Killing enemies in rapid succession could boost gold earned, incentivizing aggressive tower placement near the path entrance.
- **Breakout**: Hitting bricks without the ball touching the paddle increases a combo multiplier, rewarding angled shots that chain multiple bricks.
- **Space Invaders**: Shooting aliens in quick succession could increase points per kill, encouraging rapid-fire accuracy.
- **Snake**: Eating food items within a time window could multiply score, adding urgency beyond simple survival.

## Common Pitfalls

- **Combo window too short**: If the player only has 0.3 seconds between hits, combos feel impossible. Start with 1-3 seconds and tune by playtesting.
- **Multiplier too generous**: A 10x multiplier lets skilled players score 10 times more, making leaderboards meaningless for average players. Keep the max around 3-5x.
- **No visual feedback**: The player needs to see the combo count, the multiplier tier, and a warning when the timer is about to expire. Without feedback, they cannot play around the system.
- **Combo never resets in practice**: If enemies come so frequently that the timer never expires, the combo is meaningless. Ensure there are natural gaps that challenge the player to maintain the chain.
