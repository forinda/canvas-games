# Circle vs Circle Collision

## What Is It?

Circle-circle collision is the simplest collision test in 2D games. Two circles overlap if the distance between their centers is less than the sum of their radii. That is the entire algorithm. No edge cases, no clamping, no corner handling. Just one distance check.

The reason this works is geometric: a circle is defined as all points within a certain distance (the radius) from a center point. Two circles overlap when some point belongs to both circles. The farthest apart their centers can be while still touching is exactly `r1 + r2` -- where each circle's edge just barely reaches the other's center line.

Analogy: imagine two soap bubbles floating toward each other. They merge (collide) the instant the distance between their centers becomes less than the sum of their radii. The calculation is the same whether the bubbles are the same size or wildly different.

## The Algorithm

```
Given:
  Circle A: center (ax, ay), radius ra
  Circle B: center (bx, by), radius rb

1. Calculate the distance between centers:
   dx = bx - ax
   dy = by - ay
   distanceSquared = dx * dx + dy * dy

2. Calculate the collision threshold:
   sumRadii = ra + rb

3. Collision if distanceSquared <= sumRadii * sumRadii
```

### ASCII Diagram

```
  No collision (distance > r1 + r2):

      .---.           .---.
    /       \       /       \
   |    A    | gap |    B    |
    \       /       \       /
      '---'           '---'
   |---ra---|         |---rb---|
   |--------distance---------|


  Touching (distance == r1 + r2):

      .---.---.
    /       |       \
   |    A   |   B    |
    \       |       /
      '---'---'
   |---ra--|--rb---|


  Overlapping (distance < r1 + r2):

      .---..---.
    /    /  \    \
   |   A |##| B   |     ## = overlap
    \    \  /    /
      '---''---'
   |---ra-|-rb---|
   |---distance--|     distance < ra + rb
```

## Code Example

```typescript
interface Circle {
  x: number;
  y: number;
  radius: number;
}

function circlesCollide(a: Circle, b: Circle): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distSq = dx * dx + dy * dy;
  const radiiSum = a.radius + b.radius;
  return distSq <= radiiSum * radiiSum;
}

// --- With elastic collision response ---

interface Velocity { vx: number; vy: number; }

function resolveCircleCollision(
  a: Circle & Velocity,
  b: Circle & Velocity
): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distSq = dx * dx + dy * dy;
  const radiiSum = a.radius + b.radius;

  if (distSq > radiiSum * radiiSum || distSq === 0) return;

  const dist = Math.sqrt(distSq);
  const nx = dx / dist; // collision normal
  const ny = dy / dist;

  // Separate overlapping circles
  const overlap = radiiSum - dist;
  a.x -= nx * overlap * 0.5;
  a.y -= ny * overlap * 0.5;
  b.x += nx * overlap * 0.5;
  b.y += ny * overlap * 0.5;

  // Elastic collision (equal mass)
  const dvx = a.vx - b.vx;
  const dvy = a.vy - b.vy;
  const dot = dvx * nx + dvy * ny;

  if (dot > 0) return; // already moving apart

  a.vx -= dot * nx;
  a.vy -= dot * ny;
  b.vx += dot * nx;
  b.vy += dot * ny;
}
```

## Complexity

| Metric | Big O |
|--------|-------|
| Time   | O(1) per pair -- two subtractions, two multiplies, one compare. |
| Space  | O(1) -- no allocations. |

For n circles checking all pairs: O(n^2). Use spatial hashing or a quadtree for large numbers of objects.

## Used In These Games

- **Pool / billiards**: Ball-to-ball collisions with elastic response.
- **Bubble shooter**: Detecting when a fired bubble touches a placed bubble.
- **Agar.io / slither.io**: Circular entities checking overlap for eating or collision.
- **Particle systems**: Collision between particles for physics simulations.
- **Pinball**: Ball vs circular bumpers.

## Common Pitfalls

- **Using `Math.sqrt` unnecessarily**: For a boolean collision check, compare squared distance against squared radius sum. Only compute the square root when you need the actual distance (e.g., for penetration depth or collision normal).
- **Forgetting to handle the zero-distance case**: If two circles are at exactly the same position, the distance is zero, and the collision normal is undefined (0/0). Pick an arbitrary normal (e.g., (1, 0)) or jitter one circle slightly.
- **Not separating overlapping circles before applying velocity changes**: If you only change velocities without pushing the circles apart, they may stay overlapping and collide again next frame, causing jittering.
- **Assuming equal mass**: The elastic collision formula above assumes equal mass. For different masses, the velocity exchange must be weighted: `v1' = v1 - (2*m2/(m1+m2)) * dot * n`.

## Further Reading

- [MDN: 2D collision detection](https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection)
- [Elastic collision physics](https://en.wikipedia.org/wiki/Elastic_collision)
- [Jeffrey Thompson's collision detection book (free online)](http://www.jeffreythompson.org/collision-detection/)
