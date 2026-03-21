# Reflection

## What Is It?

Reflection is what happens when a moving object bounces off a surface. Think of a billiard ball hitting the rail of a pool table: it approaches at some angle, and leaves at the same angle on the other side of the surface's normal. The "normal" is simply the direction pointing straight out from the surface.

In games, reflection is essential for any kind of bouncing behavior -- a ball bouncing off walls in Breakout, a laser beam reflecting off mirrors in a puzzle game, or a puck ricocheting off the edges of an air hockey table. The math is elegant: you take the incoming velocity, figure out how much of it is going "into" the surface (using the dot product), and flip just that component.

The formula works for any surface angle, not just horizontal or vertical walls. This means you can have angled paddles, sloped terrain, or rotating mirrors, and the same single formula handles them all.

## The Math

Given:
- `V` = incoming velocity vector
- `N` = surface normal (unit vector pointing away from the surface)

The reflected velocity is:

```
R = V - 2 * (V . N) * N
```

Where `V . N` is the dot product.

Visualized:

```
       V \     | N (normal)
          \    |
           \   |
            \  |
             \ |
    ----------\|----------  surface
              /|
             / |
            /
           /
          / R (reflected)
```

The angle of incidence equals the angle of reflection:

```
       theta  |  theta
         \    |    /
          \   |   /
           \  |  /
            \ | /
    ---------\|/----------
```

For axis-aligned walls (common special case):

```
Hit vertical wall:   vx = -vx    (flip horizontal component)
Hit horizontal wall: vy = -vy    (flip vertical component)
```

## Code Example

```typescript
interface Vec2 {
  x: number;
  y: number;
}

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function reflect(velocity: Vec2, normal: Vec2): Vec2 {
  const d = dot(velocity, normal);
  return {
    x: velocity.x - 2 * d * normal.x,
    y: velocity.y - 2 * d * normal.y,
  };
}

// Ball bouncing off an angled paddle
interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function bounceOffPaddle(ball: Ball, paddleAngle: number): void {
  // Normal points "up" from the paddle surface
  // Paddle surface direction is along the angle; normal is perpendicular
  const normal: Vec2 = {
    x: -Math.sin(paddleAngle),
    y: Math.cos(paddleAngle),  // flipped for canvas coords
  };

  const vel: Vec2 = { x: ball.vx, y: ball.vy };
  const reflected = reflect(vel, normal);

  ball.vx = reflected.x;
  ball.vy = reflected.y;
}
```

## Used In These Games

- **Breakout / Brick Breaker**: The ball reflects off the paddle, walls, and bricks. The paddle angle can be varied based on where the ball hits to give the player directional control.
- **Laser puzzle games**: A beam of light reflects off mirror surfaces; the reflection formula computes the new beam direction at each mirror.
- **Pong**: The ball reflects off the top/bottom walls (simple axis flip) and off paddles (which may use an angled normal to add variety).

## Common Pitfalls

- **Normal pointing the wrong way**: The normal must point AWAY from the surface toward the incoming object. If it points into the surface, the reflection formula will push the velocity deeper into the wall instead of bouncing it away. A quick check: `dot(velocity, normal)` should be negative for an incoming collision.
- **Non-unit normal**: The formula assumes `N` is a unit vector (length = 1). If it is not normalized, the reflection will be scaled incorrectly. Always normalize your normals.
- **Ball getting stuck inside walls**: If the ball moves fast enough to penetrate a wall between frames, it may reflect repeatedly and get trapped. After reflecting, also reposition the ball to be outside the surface.

## Further Reading

- "Real-Time Collision Detection" by Christer Ericson -- detailed treatment of reflection and collision response
- Wikipedia: Specular Reflection -- https://en.wikipedia.org/wiki/Specular_reflection
