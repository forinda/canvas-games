# Weighted Random Selection

## What Is It?

Weighted random selection picks a random item from a list where each item has a different probability of being chosen. Unlike uniform random (where every item has an equal chance), weighted random lets you make some outcomes more likely than others. A common sword might have a 70% chance of dropping, a rare sword 25%, and a legendary sword 5%.

The standard approach is the cumulative weight method. You add up all the weights into a running total, then generate a random number between 0 and the total. You scan through the cumulative weights to find which item that number falls under. For large loot tables, you can use binary search on the cumulative weights to speed this up from O(n) to O(log n).

Think of it like a wheel of fortune. Each item gets a slice proportional to its weight. You spin the wheel (generate a random number), and it lands on a slice. Bigger slices (higher weight) get landed on more often. The cumulative weight method is the mathematical equivalent of that wheel.

## The Algorithm

```
Given items with weights:
  Common Sword:   weight 70
  Rare Sword:     weight 25
  Legendary Sword: weight 5

1. Build cumulative weights:
   Common:    70
   Rare:      70 + 25 = 95
   Legendary: 95 + 5  = 100

2. Generate random number in [0, 100):  e.g., 83.7

3. Find the first cumulative weight > random number:
   70 < 83.7 (skip)
   95 > 83.7 (match!) --> Rare Sword

Visually:
  0          70        95    100
  |  Common  |  Rare   |Leg.|
  |==========|=========|====|
                  ^
                83.7 lands here --> Rare Sword
```

### Binary Search on Cumulative Weights

```
For large tables, linear scan is O(n). Binary search is O(log n).

Cumulative: [70, 95, 100]
Random: 83.7

  lo=0, hi=2, mid=1
  cumulative[1] = 95 > 83.7  --> hi = 1
  lo=0, hi=1, mid=0
  cumulative[0] = 70 < 83.7  --> lo = 1
  lo == hi == 1 --> item[1] = Rare Sword
```

## Code Example

```typescript
interface WeightedItem<T> {
  item: T;
  weight: number;
}

class WeightedRandom<T> {
  private items: T[];
  private cumulative: number[];
  private totalWeight: number;

  constructor(entries: WeightedItem<T>[]) {
    this.items = [];
    this.cumulative = [];
    this.totalWeight = 0;

    for (const entry of entries) {
      this.totalWeight += entry.weight;
      this.items.push(entry.item);
      this.cumulative.push(this.totalWeight);
    }
  }

  /** Pick a random item using binary search -- O(log n). */
  pick(): T {
    const r = Math.random() * this.totalWeight;
    let lo = 0;
    let hi = this.cumulative.length - 1;

    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.cumulative[mid] <= r) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }

    return this.items[lo];
  }
}

// --- Loot table example ---

interface LootDrop {
  name: string;
  rarity: string;
}

const lootTable = new WeightedRandom<LootDrop>([
  { item: { name: "Iron Sword",   rarity: "common"    }, weight: 50 },
  { item: { name: "Steel Sword",  rarity: "uncommon"  }, weight: 30 },
  { item: { name: "Gold Sword",   rarity: "rare"      }, weight: 15 },
  { item: { name: "Dragon Blade", rarity: "legendary" }, weight: 5  },
]);

// Drop an item when an enemy dies
const drop = lootTable.pick();
console.log(`Dropped: ${drop.name} (${drop.rarity})`);

// Verify distribution (10,000 samples)
const counts: Record<string, number> = {};
for (let i = 0; i < 10000; i++) {
  const d = lootTable.pick();
  counts[d.name] = (counts[d.name] ?? 0) + 1;
}
console.log(counts);
// ~5000 Iron, ~3000 Steel, ~1500 Gold, ~500 Dragon
```

## Complexity

| Metric | Approach | Big O |
|--------|----------|-------|
| Build  | Both     | O(n) -- one pass to compute cumulative weights. |
| Pick   | Linear scan | O(n) per pick. |
| Pick   | Binary search | O(log n) per pick. |
| Space  | Both     | O(n) for the cumulative array. |

For small tables (< 20 items), linear scan is fine. For large tables or frequent picks, use binary search.

## Used In These Games

- **RPGs (loot drops)**: Every enemy, chest, and boss has a loot table with weighted rarities.
- **Gacha / card games**: Pull rates for common, rare, super rare, and ultra rare cards.
- **Roguelikes**: Room generation, item placement, and enemy spawning all use weighted random to control difficulty curves.
- **Procedural generation**: Biome selection, terrain feature placement, NPC name generation.
- **Idle / clicker games**: Resource multiplier events, bonus triggers, critical hit chances.

## Common Pitfalls

- **Weights that do not sum to 100**: Weights do not need to be percentages. `[70, 25, 5]` works the same as `[14, 5, 1]` -- the algorithm normalizes automatically by generating a random number in `[0, totalWeight)`.
- **Zero or negative weights**: A weight of 0 means the item is never selected. Negative weights break the cumulative array. Validate inputs.
- **Off-by-one in binary search**: If your random number equals a cumulative boundary exactly, you must consistently round up or down. Using `<=` vs `<` in the comparison determines which item "owns" the boundary.
- **Confusing weight with probability**: Weight 50 out of total 100 is 50% probability. But weight 50 out of total 200 is 25%. Always think of weight as relative to the total.
- **Not seeding the RNG for reproducibility**: If you need deterministic loot for testing or replays, use a seeded pseudo-random number generator instead of `Math.random()`.

## Further Reading

- [Wikipedia: Alias method (O(1) weighted random)](https://en.wikipedia.org/wiki/Alias_method)
- [Loot table design patterns in game development](https://www.gamedeveloper.com/design/loot-tables-random-rewards-in-game-design)
- [Vose's Alias Method explained](https://www.keithschwarz.com/darts-dice-coins/)
