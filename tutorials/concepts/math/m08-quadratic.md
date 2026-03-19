# Quadratic Formula (Line-Circle Intersection)

## What Is It?

The quadratic formula solves equations of the form `ax^2 + bx + c = 0`. You probably remember it from algebra class, but in game development it has a very practical use: determining whether and where a line (or ray) intersects a circle. This comes up any time you need to check if a straight path crosses through a circular area.

Imagine a samurai slicing through the air with a sword. The sword tip traces a line segment. A piece of fruit is a circle. To determine if the slice cuts through the fruit, you substitute the line equation into the circle equation, which produces a quadratic. The discriminant (`b^2 - 4ac`) tells you how many intersection points exist: two (the line passes through), one (tangent, just grazes it), or zero (a miss).

This technique generalizes to any ray-casting scenario: laser beams hitting circular shields, mouse trails cutting through targets, or checking line-of-sight past round obstacles.

## The Math

**The quadratic formula:**

```
Given: ax^2 + bx + c = 0

         -b +/- sqrt(b^2 - 4ac)
    x = -------------------------
                  2a
```

**The discriminant** determines the number of solutions:

```
D = b^2 - 4ac

D > 0  -->  two solutions (line crosses through circle)
D = 0  -->  one solution  (line is tangent to circle)
D < 0  -->  no solutions  (line misses circle)
```

```
D < 0 (miss)      D = 0 (tangent)     D > 0 (intersect)

     O                 O                   O
                      /                   /|\
    ---          ---/---             ---/-|-\---
                                      t1   t2
```

**Deriving the intersection:**

A line from point P in direction D, parameterized by t:

```
point_on_line = P + t * D
```

A circle centered at C with radius r:

```
|point - C|^2 = r^2
```

Substituting and expanding:

```
|P + t*D - C|^2 = r^2

Let F = P - C

(D.D)*t^2 + 2*(F.D)*t + (F.F - r^2) = 0

a = dot(D, D)
b = 2 * dot(F, D)
c = dot(F, F) - r*r
```

## Code Example

```typescript
interface Vec2 { x: number; y: number }

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

// Does a line segment from P1 to P2 intersect a circle at C with radius r?
function lineIntersectsCircle(
  p1: Vec2, p2: Vec2,
  center: Vec2, radius: number
): boolean {
  const d: Vec2 = sub(p2, p1);         // line direction
  const f: Vec2 = sub(p1, center);     // start to circle center

  const a = dot(d, d);
  const b = 2 * dot(f, d);
  const c = dot(f, f) - radius * radius;

  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) return false;   // no intersection

  const sqrtD = Math.sqrt(discriminant);
  const t1 = (-b - sqrtD) / (2 * a);
  const t2 = (-b + sqrtD) / (2 * a);

  // t must be in [0, 1] for the intersection to be on the segment
  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
}

// Usage: fruit ninja style -- did the swipe cut the fruit?
const swipeStart: Vec2 = { x: 100, y: 300 };
const swipeEnd: Vec2   = { x: 400, y: 100 };
const fruit: Vec2      = { x: 250, y: 180 };
const fruitRadius      = 30;

const sliced = lineIntersectsCircle(swipeStart, swipeEnd, fruit, fruitRadius);
```

## Used In These Games

- **Fruit Ninja clone**: The player's swipe gesture creates a line segment; each fruit is a circle. The quadratic formula determines which fruits were sliced.
- **Laser beam reflections**: A laser ray needs to find the first circle (mirror, enemy, obstacle) it hits. The smaller `t` value from the quadratic gives the nearest intersection point.
- **Line-of-sight checks**: Determine whether a straight line between two characters is blocked by a circular obstacle.

## Common Pitfalls

- **Forgetting to check `t` range**: The quadratic gives intersections for an infinite line. For a finite line segment (P1 to P2), you must verify that `t` is between 0 and 1. Otherwise you detect "intersections" behind the start or past the end.
- **Division by zero when `a = 0`**: If the "line" has zero length (P1 equals P2), then `a = 0` and division fails. Guard against degenerate inputs.
- **Using the wrong sign convention**: Make sure `b = 2 * dot(F, D)`, not `dot(D, F)`. The dot product is commutative so both are the same, but getting the formula wrong (e.g., forgetting the factor of 2) will produce incorrect results.

## Further Reading

- "Real-Time Collision Detection" by Christer Ericson, Section 5.3
- Scratchapixel: Ray-Sphere Intersection -- https://www.scratchapixel.com/lessons/3d-basic-rendering/minimal-ray-tracer-rendering-simple-shapes
