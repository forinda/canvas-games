# Circle vs Rectangle Collision

## What Is It?

Circle-rectangle collision detection determines whether a circle overlaps an axis-aligned rectangle. This comes up constantly in games: a ball hitting a paddle, a round character colliding with a wall, or a circular explosion radius intersecting a rectangular trigger zone.

The core insight is elegant: find the point on the rectangle that is closest to the circle's center, then check if that point is within the circle's radius. If the circle's center is already inside the rectangle, the closest point is the center itself, and the collision is guaranteed. Otherwise, the closest point is found by clamping the circle's center coordinates to the rectangle's edges.

Think of it like a magnet and a metal plate. The magnet (circle center) pulls toward the nearest point on the plate (rectangle). If that nearest point is close enough (within the radius), they touch.

## The Algorithm

```
Given:
  Circle: center (cx, cy), radius r
  Rectangle: left x, top y, width w, height h

1. Find the closest point on the rectangle to the circle's center:
   closestX = clamp(cx, rect.x, rect.x + rect.w)
   closestY = clamp(cy, rect.y, rect.y + rect.h)

2. Calculate the distance from the circle center to that closest point:
   dx = cx - closestX
   dy = cy - closestY
   distanceSquared = dx * dx + dy * dy

3. Collision if distanceSquared <= r * r
```

### ASCII Diagram

```
Case 1: Circle outside, near corner
                  closest point
                       v
  +-----------+
  |           |
  |   RECT    |........O  (circle center)
  |           |       /
  +-----------+      / r (radius)

  Distance from closest point to center < radius = COLLISION


Case 2: Circle outside, near edge
  +-----------+
  |           |
  |   RECT    + - - - O
  |           |  dist < r = COLLISION
  +-----------+


Case 3: Circle center inside rectangle
  +-----------+
  |     O     |   closest point = center itself
  |   RECT    |   distance = 0, always < r
  +-----------+   = COLLISION


Case 4: No collision
  +-----------+
  |           |
  |   RECT    |              O
  |           |          (too far away)
  +-----------+
```

### Clamping visualized

```
  rect.x          rect.x + w
    |                 |
    v                 v
    +-----------------+  <- rect.y
    |                 |
    |    cx is here   |  closestX = cx (already inside range)
    |                 |
    +-----------------+  <- rect.y + h

    If cx < rect.x, closestX = rect.x (clamp to left edge)
    If cx > rect.x + w, closestX = rect.x + w (clamp to right edge)
    Same logic for Y axis.
```

## Code Example

```typescript
interface Circle {
  cx: number;
  cy: number;
  radius: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function circleRectCollision(circle: Circle, rect: Rect): boolean {
  // Find the closest point on the rectangle to the circle center
  const closestX = clamp(circle.cx, rect.x, rect.x + rect.width);
  const closestY = clamp(circle.cy, rect.y, rect.y + rect.height);

  // Check distance from closest point to circle center
  const dx = circle.cx - closestX;
  const dy = circle.cy - closestY;

  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

// --- With penetration depth for collision response ---

interface CollisionResult {
  colliding: boolean;
  overlapX: number;
  overlapY: number;
}

function circleRectResolve(circle: Circle, rect: Rect): CollisionResult {
  const closestX = clamp(circle.cx, rect.x, rect.x + rect.width);
  const closestY = clamp(circle.cy, rect.y, rect.y + rect.height);

  const dx = circle.cx - closestX;
  const dy = circle.cy - closestY;
  const distSq = dx * dx + dy * dy;
  const rSq = circle.radius * circle.radius;

  if (distSq > rSq) return { colliding: false, overlapX: 0, overlapY: 0 };

  const dist = Math.sqrt(distSq);
  const overlap = circle.radius - dist;
  const nx = dist === 0 ? 1 : dx / dist; // normal direction
  const ny = dist === 0 ? 0 : dy / dist;

  return { colliding: true, overlapX: nx * overlap, overlapY: ny * overlap };
}
```

## Complexity

| Metric | Big O |
|--------|-------|
| Time   | O(1) -- a clamp, a subtraction, a multiply, a compare. |
| Space  | O(1) -- no allocations. |

## Used In These Games

- **Breakout / Arkanoid**: Ball (circle) vs paddle and bricks (rectangles). The collision normal determines bounce direction.
- **Pinball**: Ball vs flippers and bumpers that have rectangular hit zones.
- **Platformers with round characters**: A circle collider on the player vs rectangular platforms gives smoother edge sliding than AABB vs AABB.
- **Pool / billiards**: Balls vs table cushions (rectangular boundaries).

## Common Pitfalls

- **Comparing distance instead of distance-squared**: Computing `Math.sqrt` is unnecessary for a boolean overlap test. Compare `distSq <= r * r` instead of `dist <= r` to avoid the square root.
- **Handling the center-inside-rect case**: When the circle center is inside the rectangle, the closest point equals the center, and the distance is zero. The collision normal is undefined. You need special handling -- typically push out along the axis of minimum penetration.
- **Ignoring collision normals**: Knowing that a collision happened is not enough for physics. You need the direction (normal) to reflect velocity or push objects apart. The normal points from the closest point toward the circle center.
- **Rotated rectangles**: This algorithm only works for axis-aligned rectangles. For rotated rectangles, transform the circle center into the rectangle's local coordinate space first, then apply the same algorithm.

## Further Reading

- [MDN: 2D collision detection](https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection)
- [Circle-Rectangle collision (Jeffrey Thompson)](http://www.jeffreythompson.org/collision-detection/circle-rect.php)
- Separating Axis Theorem for generalized convex shapes
