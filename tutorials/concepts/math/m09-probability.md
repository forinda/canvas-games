# Probability and Random Numbers

## What Is It?

Probability is the math of chance. In games, randomness creates variety and replayability -- different enemy spawns each run, varied loot drops, unpredictable weather patterns. The key tool is `Math.random()`, which gives you a uniformly distributed number between 0 and 1. But raw uniform randomness is rarely what you want; you almost always need to shape it.

Think of a fishing game. If every fish had an equal chance of appearing, catching a legendary fish would feel no different from catching a common one. Instead, you assign weights: common fish might have a 70% chance, rare fish 25%, and legendary fish just 5%. This "weighted distribution" makes rare events feel special when they happen.

Beyond simple weights, you can use probability to create bell curves (most values cluster around the middle), exponential distributions (many low values with rare high ones), and other shapes that make your game feel natural rather than artificially random.

## The Math

**Uniform random in a range [min, max):**

```
value = min + Math.random() * (max - min)
```

**Random integer in range [min, max]:**

```
value = min + Math.floor(Math.random() * (max - min + 1))
```

**Weighted selection:**

Given items with weights, compute cumulative weights and pick:

```
Item:    Common(70)  Rare(25)  Legendary(5)
Cumul:   70          95        100

Roll 0-99:
  0-69   --> Common
  70-94  --> Rare
  95-99  --> Legendary

  |------- Common -------|--- Rare ---|-- L --|
  0                     70          95      100
                              ^
                         roll = 82 --> Rare!
```

**Pseudo-bell curve** (sum multiple random rolls):

```
// Average of N uniform randoms approaches a normal distribution
value = (rand() + rand() + rand()) / 3
```

```
Uniform:          Bell curve:
  ________            *
 |        |         *   *
 |        |       *       *
 |________|     *___________*
 0        1     0    0.5    1
```

## Code Example

```typescript
// Random integer in range [min, max] inclusive
function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Weighted random selection
interface WeightedItem<T> {
  item: T;
  weight: number;
}

function weightedRandom<T>(items: WeightedItem<T>[]): T {
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of items) {
    roll -= entry.weight;
    if (roll <= 0) return entry.item;
  }

  return items[items.length - 1].item; // fallback
}

// Fishing game: spawn fish with rarity weights
type FishRarity = "common" | "uncommon" | "rare" | "legendary";

const fishTable: WeightedItem<FishRarity>[] = [
  { item: "common",    weight: 60 },
  { item: "uncommon",  weight: 25 },
  { item: "rare",      weight: 12 },
  { item: "legendary", weight: 3  },
];

function catchFish(): FishRarity {
  return weightedRandom(fishTable);
}
```

## Used In These Games

- **Fishing game**: Fish rarity is determined by a weighted random table, making legendary catches exciting and memorable.
- **Roguelike dungeon generator**: Room sizes, enemy placement, and loot drops all use shaped random distributions to create varied but balanced levels.
- **Particle effects**: Random velocity, lifetime, and size create natural-looking explosions, rain, and fire effects.

## Common Pitfalls

- **Using `Math.random()` for security**: `Math.random()` is NOT cryptographically secure. For games this is fine, but never use it for passwords, tokens, or gambling with real money.
- **Off-by-one in integer ranges**: `Math.floor(Math.random() * 4)` gives 0-3, not 0-4. If you want to include the upper bound, add 1 to the range before flooring.
- **Perception of "unfair" randomness**: Humans are bad at recognizing true randomness -- a player might get the same rare drop twice in a row and think it is bugged, or go 50 rolls without one and feel cheated. Consider "pity timers" (guaranteed drop after N failures) or shuffle bags to make randomness feel more fair.

## Further Reading

- "Probability and Computing" by Mitzenmacher and Upfal -- rigorous but accessible probability fundamentals
- Red Blob Games: Probability -- https://www.redblobgames.com/articles/probability/
- GDC Talk: "The Psychology of Randomness" -- how players perceive random systems
