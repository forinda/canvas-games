# Gravity

## What Is It?

Gravity is a constant downward acceleration applied to every object each frame. Think of it like an invisible hand that pushes everything toward the ground, getting faster the longer something falls. Drop a ball off a table: it does not fall at a steady speed -- it accelerates. In game terms, we do not move the object down by a fixed amount; we increase its downward velocity by a fixed amount every tick.

Real-world gravitational acceleration is approximately 9.8 m/s². In pixel-based games we pick a value that "feels" right (often 800-2000 px/s²) because screen pixels are not meters.

## How It Works

```
Each frame (dt = time since last frame in seconds):

  vy += GRAVITY * dt      // increase downward velocity
  y  += vy * dt           // move object by new velocity

Where:
  GRAVITY = constant (positive = down in screen coords)
  vy      = vertical velocity (px/s)
  dt      = delta time (s)
```

ASCII diagram of velocity over time:

```
vy
 |        /
 |      /
 |    /
 |  /
 |/____________ time
```

Velocity grows linearly; position grows quadratically (parabola).

The formula mirrors the real kinematic equation:

```
  y(t) = y₀ + v₀t + ½gt²
```

In a discrete game loop we split it into two half-steps:
1. Update velocity: `vy += g * dt`
2. Update position: `y += vy * dt`

This is called **semi-implicit Euler integration** and is stable enough for most 2D games.

## Code Example

```typescript
const GRAVITY = 1200; // pixels per second squared

interface FallingObject {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function applyGravity(obj: FallingObject, dt: number): void {
  // Increase downward velocity each frame
  obj.vy += GRAVITY * dt;

  // Move by updated velocity
  obj.x += obj.vx * dt;
  obj.y += obj.vy * dt;
}

// Example: a ball dropped from y=0
const ball: FallingObject = { x: 200, y: 0, vx: 0, vy: 0 };

// Simulate 5 frames at 60 fps (dt ≈ 0.0167)
for (let i = 0; i < 5; i++) {
  const dt = 1 / 60;
  applyGravity(ball, dt);
  console.log(
    `Frame ${i + 1}: vy=${ball.vy.toFixed(1)} px/s, y=${ball.y.toFixed(1)} px`
  );
}
// Frame 1: vy=20.0, y=0.3
// Frame 2: vy=40.0, y=1.0
// Frame 3: vy=60.0, y=2.0   <-- accelerating!
```

## Used In These Games

- **Platformer**: The player and enemies fall when not standing on a platform. `PhysicsSystem` applies gravity every frame and `CollisionSystem` stops the fall on ground contact.
- **Flappy Bird**: The bird constantly accelerates downward; each tap sets `vy` to a negative (upward) value, fighting gravity momentarily.
- **Physics Puzzle**: Dropped objects arc downward under gravity until they hit a surface.
- **Tower Defense**: Projectiles can use gravity for lobbed attacks (catapult towers).

## Common Pitfalls

- **Forgetting delta time**: Writing `vy += GRAVITY` without `* dt` makes physics frame-rate dependent. At 30 fps objects fall half as fast as at 60 fps. Always multiply by `dt`.
- **Gravity too weak or too strong**: If your character floats like they are on the moon, increase `GRAVITY`. If they slam to the ground instantly, decrease it. Tune by feel, not by realism.
- **Not clamping terminal velocity**: Without a max fall speed, objects can clip through thin platforms because they move too many pixels in one frame. See `p06-terminal-velocity.md`.
- **Applying gravity while grounded**: If you keep adding to `vy` while the object sits on a platform, `vy` grows huge. When the object steps off a ledge it rockets downward. Reset `vy = 0` when grounded.
