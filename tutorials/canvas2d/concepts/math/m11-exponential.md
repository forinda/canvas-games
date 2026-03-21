# Exponential Growth and Decay

## What Is It?

Exponential functions describe quantities that multiply by a fixed factor at each step, rather than adding a fixed amount. If your savings account earns 10% interest per year, your balance does not grow by the same dollar amount each year -- it grows by 10% of whatever the current balance is, which itself keeps getting bigger. This is exponential growth.

In games, exponential scaling appears everywhere in economy and progression systems. Upgrade costs often scale exponentially so that each level feels like a meaningful milestone. Enemy health might grow exponentially across levels to match the player's increasing power. Decay (the flip side) is used for things that diminish over time: a speed boost that fades, particle opacity that shrinks, or the half-life of a radioactive glow effect.

The critical insight is that exponential growth starts slow and then accelerates dramatically. A cost that doubles each level seems manageable at first (10, 20, 40, 80) but quickly becomes enormous (1280, 2560, 5120...). This natural curve is why it works so well for game balance -- it creates a satisfying sense of escalation.

## The Math

**Exponential growth:**

```
value(n) = base * multiplier^n
```

Where:
- `base` = initial value
- `multiplier` = growth factor (> 1 for growth, < 1 for decay)
- `n` = step number (level, time, etc.)

**Example: upgrade cost doubling each level:**

```
cost(level) = 100 * 2^level

Level:  0    1    2    3    4     5     6
Cost:  100  200  400  800  1600  3200  6400

        |
  6400  |                                 *
        |
  3200  |                           *
        |
  1600  |                     *
        |
   800  |               *
   400  |          *
   200  |     *
   100  | *
        +----+----+----+----+----+----+---> level
```

**Exponential decay:**

```
value(t) = initial * decay_rate^t

Where 0 < decay_rate < 1

Example: particle fading (decay_rate = 0.95 per frame)
Frame:    0     10     20     30     40
Alpha:  1.00   0.60   0.36   0.21   0.13
```

**Continuous decay** (frame-rate independent):

```
value(t) = initial * e^(-lambda * t)

// or equivalently:
value(t) = initial * Math.exp(-lambda * t)
```

## Code Example

```typescript
// Upgrade cost that scales exponentially
function upgradeCost(baseCost: number, level: number, scaleFactor: number): number {
  return Math.floor(baseCost * Math.pow(scaleFactor, level));
}

// Example: base cost 100, each level costs 1.8x more
// Level 0: 100, Level 1: 180, Level 5: 1,889, Level 10: 35,737
const cost = upgradeCost(100, 5, 1.8);

// Speed boost that decays over time
interface Buff {
  initialStrength: number;
  decayRate: number;  // e.g., 2.0 means half-life style decay
  startTime: number;
}

function buffStrength(buff: Buff, currentTime: number): number {
  const elapsed = currentTime - buff.startTime;
  return buff.initialStrength * Math.exp(-buff.decayRate * elapsed);
}

// Can the player afford the next upgrade?
interface PlayerEconomy {
  gold: number;
  upgradeLevel: number;
}

function tryUpgrade(player: PlayerEconomy): boolean {
  const cost = upgradeCost(100, player.upgradeLevel, 2.0);
  if (player.gold >= cost) {
    player.gold -= cost;
    player.upgradeLevel++;
    return true;
  }
  return false;
}
```

## Used In These Games

- **Idle/incremental games**: Building costs scale exponentially, forming the core economic loop. Players earn currency faster over time but costs grow to match, creating a satisfying treadmill.
- **RPG progression**: Enemy HP and XP requirements often follow exponential curves to ensure that leveling up always feels meaningful.
- **Particle effects**: Particle opacity and size decay exponentially, producing natural-looking fadeouts for smoke, sparks, and magic effects.

## Common Pitfalls

- **Growth too aggressive**: A multiplier of 2.0 (doubling) gets extreme fast. For most game economies, multipliers between 1.1 and 1.5 per level produce a better-paced curve. Playtest extensively.
- **Integer overflow / precision loss**: Very large exponents produce numbers beyond what JavaScript can represent accurately. `Math.pow(2, 60)` is over a quadrillion. Use `BigInt` or cap the maximum level.
- **Frame-rate dependence in decay**: Using `value *= 0.95` each frame gives different results at different frame rates. Use `Math.exp(-rate * deltaTime)` for consistent behavior.

## Further Reading

- "A Primer on Game Balance" -- covers exponential scaling in game economies
- Wikipedia: Exponential Growth -- https://en.wikipedia.org/wiki/Exponential_growth
- "Balancing MMO Economies" (GDC talk) -- real-world examples of exponential cost curves
