# Projectile Motion

## What Is It?

Projectile motion is the curved path an object follows when launched at an angle and pulled down by gravity. Think of a basketball shot: the ball arcs upward, slows, then curves back down in a smooth parabola. Only two forces are at work -- the initial launch velocity and constant gravity. There is no thrust during flight.

This is the combination of constant horizontal velocity and accelerating vertical velocity, producing the characteristic parabolic arc.

## How It Works

```
Launch parameters:
  v₀    = initial speed
  theta = launch angle (from horizontal)
  g     = gravity acceleration

Decomposed initial velocity:
  vx = v₀ * cos(theta)     // constant throughout flight
  vy = v₀ * sin(theta)     // changes due to gravity

Position at time t:
  x(t) = x₀ + vx * t
  y(t) = y₀ + vy * t + ½ * g * t²

In game loop (per frame):
  vy += gravity * dt
  x  += vx * dt
  y  += vy * dt
```

The parabolic arc:

```
            *  *
          *      *
        *          *
      *              *    ← peak when vy = 0
    *                  *
  *  theta              *
  O─────────────────────── ground
  launch
```

Key derived values:

```
  Time to peak:     t_peak = v₀ * sin(theta) / g
  Max height:       h = (v₀ * sin(theta))² / (2g)
  Range (flat):     R = v₀² * sin(2*theta) / g
  Max range angle:  45 degrees
```

## Code Example

```typescript
const GRAVITY = 600; // px/s²

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
}

function launchProjectile(
  startX: number,
  startY: number,
  angleDeg: number,
  speed: number
): Projectile {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: startX,
    y: startY,
    vx: speed * Math.cos(rad),
    vy: -speed * Math.sin(rad), // negative = up in screen coords
    active: true,
  };
}

function updateProjectile(p: Projectile, dt: number, groundY: number): void {
  if (!p.active) return;

  p.vy += GRAVITY * dt; // gravity pulls down
  p.x += p.vx * dt;
  p.y += p.vy * dt;

  // Deactivate when it hits the ground
  if (p.y >= groundY) {
    p.y = groundY;
    p.active = false;
  }
}

// Basketball shot at 55 degrees, 500 px/s
const ball = launchProjectile(50, 500, 55, 500);
for (let i = 0; i < 120; i++) {
  updateProjectile(ball, 1 / 60, 500);
  if (!ball.active) {
    console.log(`Landed at x=${ball.x.toFixed(0)} after ${i + 1} frames`);
    break;
  }
}
// Traces a parabolic arc and lands ~330px away
```

## Used In These Games

- **Tower Defense**: Catapult or mortar towers lob projectiles in an arc toward enemies, using launch angle and speed to hit a target position.
- **Physics Puzzle**: The player launches objects at angles to reach targets, ricochet off surfaces, or trigger mechanisms.
- **Breakout**: The initial ball launch follows a brief arc if gravity is enabled as a gameplay variant.
- **Platformer**: Thrown items (rocks, grenades) follow parabolic arcs, and the player must aim by choosing angle and power.

## Common Pitfalls

- **Screen Y is inverted**: In canvas, Y increases downward. A launch "upward" needs a negative `vy`. Gravity is positive (adds to `vy`). Mixing this up makes projectiles launch into the ground.
- **Using degrees instead of radians**: `Math.cos()` and `Math.sin()` expect radians. Passing degrees directly gives wrong results. Convert with `rad = deg * Math.PI / 180`.
- **Not accounting for launch height**: The range formula `R = v₀² * sin(2*theta) / g` assumes launch and landing are at the same height. If they differ, use the full kinematic equations or just simulate frame by frame.
- **Aiming at a target**: To hit a specific point, you need to solve for the launch angle given distance and height difference. There are usually two solutions (high arc and low arc). The formula involves a quadratic -- or you can iterate/binary-search for the right angle.
