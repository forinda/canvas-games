# Parametric Equations

## What Is It?

A parametric equation defines a curve by expressing each coordinate as a separate function of a single parameter, usually called `t`. Instead of saying "y depends on x," you say "both x and y depend on t." As `t` advances from 0 to 1 (or 0 to some max), the point `(x(t), y(t))` traces out a path.

Think of it like a GPS tracker on a thrown ball. At each moment in time `t`, the tracker records an x position and a y position. The x position changes at a constant rate (the ball moves sideways steadily), while the y position follows a parabolic arc (gravity pulls it down). Together, these two functions of time describe the full trajectory.

Parametric equations are invaluable in games for drawing trajectory previews, animating objects along curves, and creating paths for enemies to follow. They give you full control over position at any point in time without needing to solve complex implicit equations.

## The Math

General form:

```
x(t) = ... some function of t ...
y(t) = ... some function of t ...
```

**Projectile trajectory** (constant gravity):

```
x(t) = x0 + vx * t
y(t) = y0 + vy * t + 0.5 * g * t^2
```

Where `(x0, y0)` is the launch point, `(vx, vy)` is launch velocity, and `g` is gravity.

```
    *   *
  *       *
 *          *        <-- parabolic arc traced by (x(t), y(t))
*             *
               *
launch          *
point            *
                  impact
```

**Circle** (radius `r`, center `cx, cy`):

```
x(t) = cx + r * cos(t)
y(t) = cy + r * sin(t)

        t = 0 to 2*PI traces a full circle
```

**Bezier curve** (quadratic, 3 control points P0, P1, P2):

```
x(t) = (1-t)^2 * P0.x + 2*(1-t)*t * P1.x + t^2 * P2.x
y(t) = (1-t)^2 * P0.y + 2*(1-t)*t * P1.y + t^2 * P2.y

P1 (control)
  *
 / \
/   \        <-- the curve is "pulled" toward P1
P0    P2
start  end
```

## Code Example

```typescript
interface Vec2 {
  x: number;
  y: number;
}

// Projectile trajectory preview
function trajectoryPoint(
  origin: Vec2,
  velocity: Vec2,
  gravity: number,
  t: number
): Vec2 {
  return {
    x: origin.x + velocity.x * t,
    y: origin.y + velocity.y * t + 0.5 * gravity * t * t,
  };
}

function drawTrajectoryPreview(
  ctx: CanvasRenderingContext2D,
  origin: Vec2,
  velocity: Vec2,
  gravity: number
): void {
  ctx.beginPath();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.setLineDash([4, 4]);

  const steps = 30;
  const maxTime = 2.0; // preview 2 seconds ahead

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * maxTime;
    const pt = trajectoryPoint(origin, velocity, gravity, t);

    if (i === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  }

  ctx.stroke();
  ctx.setLineDash([]);
}
```

## Used In These Games

- **Angry Birds-style launcher**: A dotted arc shows where the projectile will land before the player releases, computed from the parametric projectile equation.
- **Tower defense**: Enemies follow predefined Bezier curve paths through the map, evaluated parametrically at each frame.
- **Racing games**: Track boundaries and AI paths are defined as spline curves sampled with a parameter `t`.

## Common Pitfalls

- **Non-uniform speed along Bezier curves**: Moving `t` at a constant rate does NOT move along the curve at a constant speed. The object will slow down or speed up depending on control point placement. Use arc-length parameterization if constant speed is needed.
- **Forgetting gravity direction**: On a canvas, y increases downward, so gravity should be a positive number (e.g., `+980`) to pull things down. Using a negative value sends projectiles flying upward.
- **Sampling too few points**: If you draw a curve with too few line segments, it looks angular instead of smooth. Use at least 20-30 segments for curves visible to the player.

## Further Reading

- "The Nature of Code" by Daniel Shiffman, Chapter 2 (Forces) -- https://natureofcode.com/
- Pomax: "A Primer on Bezier Curves" -- https://pomax.github.io/bezierinfo/ (outstanding interactive guide)
