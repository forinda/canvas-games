# Line Segment vs Circle Intersection

## What Is It?

This algorithm determines whether a line segment intersects a circle. It is essential for games with projectiles, raycasting, lasers, or any scenario where a moving point (represented as a line from its start to end position) might hit a circular object.

The approach uses the quadratic formula. A line segment can be described parametrically: any point on the segment is `P(t) = start + t * (end - start)` where t ranges from 0 to 1. A circle is all points at distance r from a center. Substituting the line equation into the circle equation gives a quadratic in t. The discriminant of that quadratic tells you everything: negative means no intersection, zero means the line is tangent (just touches), and positive means two intersection points. You then check that at least one solution has t in [0, 1] to confirm the intersection is on the segment, not the infinite line.

Think of it like shooting a laser across a room with a circular pillar in it. The math finds the exact points where the laser beam enters and exits the pillar, or determines that the beam misses entirely.

## The Algorithm

```
Given:
  Line segment from point P1 (x1, y1) to P2 (x2, y2)
  Circle with center C (cx, cy) and radius r

1. Compute the direction vector:
   dx = x2 - x1
   dy = y2 - y1

2. Compute the vector from P1 to circle center:
   fx = x1 - cx
   fy = y1 - cy

3. Set up the quadratic equation at^2 + bt + c = 0:
   a = dx*dx + dy*dy
   b = 2 * (fx*dx + fy*dy)
   c = fx*fx + fy*fy - r*r

4. Compute the discriminant:
   discriminant = b*b - 4*a*c

5. If discriminant < 0: no intersection (line misses circle entirely).

6. If discriminant >= 0:
   t1 = (-b - sqrt(discriminant)) / (2*a)   // entry point
   t2 = (-b + sqrt(discriminant)) / (2*a)   // exit point

7. If t1 in [0,1] or t2 in [0,1] or (t1 < 0 and t2 > 1):
   Intersection! The segment hits the circle.
```

### ASCII Diagram

```
  Case 1: Two intersections (discriminant > 0, both t in [0,1])

         .----.
       /   t1  \
  P1--+----||---+----P2
       \   t2  /
         '----'
           C


  Case 2: Tangent (discriminant == 0)

         .----.
       /        \
  P1---|---------|---P2
       \        /
         '----'    Line just touches the circle


  Case 3: Miss (discriminant < 0)

         .----.
       /        \
       |   C    |            P1-----------P2
       \        /
         '----'    Line does not reach the circle


  Case 4: Segment too short (discriminant > 0, but t > 1)

         .----.
       /        \
       |   C    |    P1---P2
       \        /                ^ t values > 1
         '----'    Infinite line hits, but segment does not
```

## Code Example

```typescript
interface Point { x: number; y: number; }
interface Circle { cx: number; cy: number; radius: number; }
interface Segment { p1: Point; p2: Point; }

interface IntersectionResult {
  hit: boolean;
  t1?: number;  // parameter of first intersection
  t2?: number;  // parameter of second intersection
  point?: Point; // nearest intersection point
}

function lineCircleIntersection(seg: Segment, circle: Circle): IntersectionResult {
  const dx = seg.p2.x - seg.p1.x;
  const dy = seg.p2.y - seg.p1.y;
  const fx = seg.p1.x - circle.cx;
  const fy = seg.p1.y - circle.cy;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - circle.radius * circle.radius;

  let discriminant = b * b - 4 * a * c;

  if (discriminant < 0) return { hit: false };

  discriminant = Math.sqrt(discriminant);
  const t1 = (-b - discriminant) / (2 * a);
  const t2 = (-b + discriminant) / (2 * a);

  // Check if either intersection is on the segment [0, 1]
  // Also check if the segment is entirely inside the circle (t1 < 0 && t2 > 1)
  const hit = (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);

  if (!hit) return { hit: false };

  // Nearest intersection point (clamp t to segment)
  const t = Math.max(0, Math.min(1, t1 >= 0 ? t1 : t2));
  return {
    hit: true,
    t1, t2,
    point: { x: seg.p1.x + t * dx, y: seg.p1.y + t * dy },
  };
}
```

## Complexity

| Metric | Big O |
|--------|-------|
| Time   | O(1) -- fixed number of arithmetic operations and at most one square root. |
| Space  | O(1) -- no allocations beyond the result. |

## Used In These Games

- **Shooters**: Hitscan weapons (instant bullets) check a line segment from the gun barrel to max range against circular enemy hitboxes.
- **Breakout**: The ball's movement path (line segment from old position to new position) vs circular or rectangular obstacles.
- **Raycasting engines**: Lines of sight, laser beams, or light rays checking intersection with circular objects.
- **Physics engines**: Continuous collision detection -- checking the swept path of a point against obstacles.
- **Tower defense**: Checking if an enemy (circle) crosses a trigger line.

## Common Pitfalls

- **Ignoring the t range**: The quadratic formula finds intersections on the infinite line. You must check that `t` is in `[0, 1]` to restrict to the segment.
- **Missing the "segment inside circle" case**: If `t1 < 0` and `t2 > 1`, the entire segment is inside the circle. Both intersection points are outside the segment, but there is still a collision.
- **Division by zero**: If `a == 0`, the segment has zero length (P1 == P2). Check for this and fall back to a point-in-circle test.
- **Floating point precision**: The discriminant can be a tiny negative number due to floating point errors when the line is nearly tangent. Use an epsilon threshold: `if (discriminant < -EPSILON) return no hit`.

## Further Reading

- [Geometric Tools: Line-Circle intersection](https://www.geometrictools.com/)
- [Real-Time Collision Detection, Ch. 5](https://realtimecollisiondetection.net/)
- [Jeffrey Thompson: Line vs Circle](http://www.jeffreythompson.org/collision-detection/line-circle.php)
