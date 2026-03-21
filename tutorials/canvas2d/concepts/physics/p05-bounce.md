# Bounce (Velocity Reflection)

## What Is It?

Bouncing is what happens when a moving object hits a surface and rebounds. Think of a tennis ball hitting a wall: it comes in from one direction and leaves in the mirrored direction. In code, we reverse (negate) the velocity component that is perpendicular to the wall. Hit a vertical wall? Flip `vx`. Hit a horizontal floor? Flip `vy`. Add damping (energy loss) so each bounce is a little weaker than the last.

## How It Works

Simple axis-aligned bounce (walls parallel to axes):

```
  Hit left or right wall:   vx = -vx * damping
  Hit top or bottom wall:   vy = -vy * damping

  damping (0.0 - 1.0):
    1.0 = perfect bounce (no energy loss)
    0.8 = loses 20% speed each bounce
    0.0 = dead stop (no bounce)
```

General bounce off an arbitrary surface (using the surface normal):

```
  v_reflected = v - 2 * dot(v, n) * n

  Where:
    v = incoming velocity vector
    n = surface normal (unit vector pointing away from surface)
```

ASCII diagram:

```
         \ incoming      / reflected
          \             /
           \     n     /
            \    |    /
             \   |   /
              \  |  /
    ___________\.|./___________  surface
```

## Code Example

```typescript
interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

const DAMPING = 0.8; // 20% energy loss per bounce

function bounceOffWalls(ball: Ball, canvasW: number, canvasH: number): void {
  // Right wall
  if (ball.x + ball.radius > canvasW) {
    ball.x = canvasW - ball.radius;
    ball.vx = -ball.vx * DAMPING;
  }
  // Left wall
  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.vx = -ball.vx * DAMPING;
  }
  // Bottom wall (floor)
  if (ball.y + ball.radius > canvasH) {
    ball.y = canvasH - ball.radius;
    ball.vy = -ball.vy * DAMPING;
  }
  // Top wall (ceiling)
  if (ball.y - ball.radius < 0) {
    ball.y = ball.radius;
    ball.vy = -ball.vy * DAMPING;
  }
}

// General reflection off arbitrary normal
function reflect(vx: number, vy: number, nx: number, ny: number) {
  const dot = vx * nx + vy * ny;
  return {
    vx: (vx - 2 * dot * nx) * DAMPING,
    vy: (vy - 2 * dot * ny) * DAMPING,
  };
}
```

## Used In These Games

- **Breakout**: The ball bounces off walls, the paddle, and bricks. Paddle angle can influence the reflected direction to give the player control.
- **Physics Puzzle**: Objects bounce off surfaces with energy loss, settling into resting positions.
- **Platformer**: Enemies or projectiles may bounce off walls to create unpredictable movement patterns.
- **Asteroids**: Optionally, bullets or ship can bounce off screen edges instead of wrapping.

## Common Pitfalls

- **Not repositioning before reflecting**: If the ball is 5 pixels inside the wall when you detect the collision, flipping `vx` just makes it move further inside. Always snap the ball to the surface edge first, then reflect.
- **Double bounce glitch**: If the ball is still overlapping the wall next frame (due to high speed or no reposition), it flips velocity again and gets stuck vibrating. Fix: reposition to exactly the surface, or add a "just bounced" cooldown flag.
- **Damping = 0 by accident**: A damping of 0 kills all velocity on contact. Use 1.0 for a perfect bounce. The parameter is a multiplier, not a subtraction.
- **Ignoring angular bounce on the paddle**: In Breakout, bouncing with a flat `vy = -vy` makes the game boring. Vary the reflected angle based on where the ball hits the paddle to give the player control.
