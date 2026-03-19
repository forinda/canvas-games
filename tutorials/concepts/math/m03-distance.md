# Distance (Pythagorean Theorem)

## What Is It?

The Pythagorean theorem lets you calculate the straight-line distance between two points. In the real world, if you walk 3 blocks east and 4 blocks north, the shortcut diagonally through the field is exactly 5 blocks. That 3-4-5 relationship is the Pythagorean theorem in action.

In games, you need distance calculations constantly. Is the enemy close enough for the tower to shoot? Did the player click close enough to an object to select it? Should two circles be considered colliding? All of these boil down to computing the distance between two points and comparing it to some threshold.

There is an important optimization trick: if you only need to compare distances (not display the actual number), you can skip the expensive `Math.sqrt` call and compare the squared distances instead. Since `sqrt` preserves ordering (if `a^2 < b^2`, then `a < b` for positive values), this is a safe and common shortcut.

## The Math

Given two points `A(x1, y1)` and `B(x2, y2)`:

```
dx = x2 - x1
dy = y2 - y1

distance = sqrt(dx^2 + dy^2)
```

Visualized:

```
B (x2, y2)
|\
| \
|  \  <-- distance (hypotenuse)
|   \
|    \
|_____\
A       C
(x1,y1) (x2, y1)

AC = dx = x2 - x1
BC = dy = y2 - y1
AB = sqrt(dx^2 + dy^2)
```

**Squared distance** (no square root):

```
distSq = dx^2 + dy^2
```

To check "is distance less than R?", compare `distSq < R * R`.

## Code Example

```typescript
interface Point {
  x: number;
  y: number;
}

function distanceSq(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

function distance(a: Point, b: Point): number {
  return Math.sqrt(distanceSq(a, b));
}

// Tower defense: is an enemy within firing range?
interface Tower {
  pos: Point;
  range: number;
  rangeSq: number; // precomputed: range * range
}

interface Enemy {
  pos: Point;
  alive: boolean;
}

function findTarget(tower: Tower, enemies: Enemy[]): Enemy | null {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    // Use squared distance to avoid sqrt every frame
    if (distanceSq(tower.pos, enemy.pos) <= tower.rangeSq) {
      return enemy;
    }
  }
  return null;
}
```

## Used In These Games

- **Tower defense**: Every frame, each tower checks whether any enemy is within its firing range using distance comparison.
- **Click-to-select**: When the player clicks the canvas, the game checks the distance from the click point to each selectable object to find the closest one.
- **Circle collision**: Two circles collide when the distance between their centers is less than the sum of their radii.

## Common Pitfalls

- **Using `Math.sqrt` when you do not need it**: If you are only comparing distances (e.g., "is this closer than that?"), compare squared distances instead. `Math.sqrt` is relatively slow and unnecessary for comparisons.
- **Forgetting to square the range threshold**: When comparing squared distances, you must compare against `range * range`, not `range`. Comparing `distSq < range` (unsquared) will give wildly wrong results.
- **Integer overflow in other languages**: In TypeScript/JavaScript, numbers are 64-bit floats so this is not a concern, but be aware of it if porting to languages with integer types.

## Further Reading

- Khan Academy: Distance Formula -- https://www.khanacademy.org/math/geometry/hs-geo-analytic-geometry
- "Real-Time Collision Detection" by Christer Ericson -- the definitive reference on spatial queries
