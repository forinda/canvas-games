# Fisher-Yates Shuffle

## What Is It?

The Fisher-Yates shuffle (also called the Knuth shuffle) is the correct way to randomly reorder an array. It produces a uniformly random permutation, meaning every possible ordering is equally likely. This matters in games: if your card shuffle is biased, some hands appear more often than others, and players will notice.

The algorithm works backward through the array. For each position from the last element down to the second, it picks a random element from the unshuffled portion (including the current position) and swaps them. After processing position i, everything from i onward is in its final, random position and will never be touched again.

The analogy: imagine a deck of cards face-down on a table. You pick a random card from the pile, place it in position 52. Then pick a random card from the remaining 51, place it in position 51. Repeat until one card remains. Each card had a fair chance of landing in any position. That is Fisher-Yates.

## The Algorithm

```
function shuffle(array):
  for i from array.length - 1 down to 1:
    j = random integer from 0 to i (inclusive)
    swap array[i] and array[j]
```

### Swap Steps Example

Shuffling `[A, B, C, D, E]`:

```
Start:  [A, B, C, D, E]
         0  1  2  3  4

i=4: random j in [0..4], say j=2.  Swap arr[4] <-> arr[2]
        [A, B, E, D, C]
                      ^ locked

i=3: random j in [0..3], say j=0.  Swap arr[3] <-> arr[0]
        [D, B, E, A, C]
                   ^--^ locked

i=2: random j in [0..2], say j=2.  Swap arr[2] <-> arr[2] (no-op)
        [D, B, E, A, C]
                ^------ locked

i=1: random j in [0..1], say j=0.  Swap arr[1] <-> arr[0]
        [B, D, E, A, C]
         ^------------- all locked

Result: [B, D, E, A, C]
```

Each element was equally likely to end up in any position.

## Code Example

```typescript
/**
 * Fisher-Yates shuffle -- in-place, O(n), unbiased.
 */
function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// --- Card deck example ---

type Suit = "Hearts" | "Diamonds" | "Clubs" | "Spades";
type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7"
          | "8" | "9" | "10" | "J" | "Q" | "K";

interface Card { suit: Suit; rank: Rank; }

function createDeck(): Card[] {
  const suits: Suit[] = ["Hearts", "Diamonds", "Clubs", "Spades"];
  const ranks: Rank[] = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

const deck = createDeck();   // 52 cards in order
shuffle(deck);               // now randomly ordered
const hand = deck.slice(0, 5); // deal 5 cards
```

## Complexity

| Metric | Big O |
|--------|-------|
| Time   | O(n) -- one pass through the array, one swap per element. |
| Space  | O(1) -- in-place, no extra memory. |

## Used In These Games

- **Card games (Poker, Solitaire, Blackjack)**: Shuffling the deck before dealing.
- **Trivia / quiz games**: Randomizing question order or answer choices.
- **Board games**: Shuffling tile stacks, event decks, or player order.
- **Roguelikes**: Randomizing item placement, enemy spawn order, or room layouts.
- **Match-3**: Initial board setup -- shuffle tiles until a valid board is generated.

## Common Pitfalls

- **Using `array.sort(() => Math.random() - 0.5)`**: This is NOT a uniform shuffle. The sort-based approach is biased because comparison-based sorting makes assumptions about transitivity. Some permutations appear far more often than others.
- **Off-by-one in the random range**: The random index `j` must be in `[0, i]` inclusive. Using `[0, array.length)` for every iteration (instead of `[0, i]`) produces a biased "naive shuffle."
- **Modulo bias**: If your random number generator gives integers and you use `rand() % n`, the result is biased when `n` does not evenly divide the generator's range. `Math.random()` in JavaScript avoids this, but be careful in other languages.
- **Shuffling a copy vs. in-place**: If you need the original order preserved (e.g., for replay), clone the array before shuffling: `shuffle([...deck])`.

## Further Reading

- [Wikipedia: Fisher-Yates shuffle](https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle)
- [Mike Bostock's visual explanation](https://bost.ocks.org/mike/shuffle/)
- [Why `sort(() => Math.random() - 0.5)` is broken](https://blog.codinghorror.com/the-danger-of-naivete/)
