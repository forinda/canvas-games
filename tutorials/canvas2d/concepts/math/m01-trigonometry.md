# Trigonometry

## What Is It?

Trigonometry is the branch of math that deals with the relationships between angles and sides of triangles. In game development, you will use it constantly -- any time something needs to move in a direction, aim at a target, or rotate, trig is behind the scenes.

Think of a lighthouse beam sweeping in a circle. The beam has an angle (measured from some reference direction like "east"), and the tip of the beam traces out a circle. If you know the angle and the length of the beam, `cos` tells you how far the tip is to the right, and `sin` tells you how far it is upward. Together they convert an angle into a direction.

The function `atan2(dy, dx)` does the reverse: given a horizontal and vertical distance between two points, it returns the angle. This is how you answer "what direction should the enemy face to look at the player?"

## The Math

The two fundamental functions map an angle to x/y components:

```
x = cos(angle)       y = sin(angle)
```

Given a radius `r` and angle `theta`:

```
x = r * cos(theta)
y = r * sin(theta)
```

Visualizing the unit circle (radius = 1):

```
          90 deg (pi/2)
             |
             |  (0, 1)
             |
180 deg -----+-----> 0 deg
(-1,0)       |       (1, 0)
             |
             |  (0, -1)
             |
         270 deg (3pi/2)
```

Note: In canvas, the y-axis points DOWN, so `sin` values increase downward.

`atan2` returns the angle between the positive x-axis and the point `(dx, dy)`:

```
angle = Math.atan2(dy, dx)       // returns radians in range (-pi, pi]
```

Converting between degrees and radians:

```
radians = degrees * (Math.PI / 180)
degrees = radians * (180 / Math.PI)
```

## Code Example

```typescript
// Ship that thrusts in the direction it's facing

interface Ship {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;  // radians, 0 = pointing right
  thrustPower: number;
}

function updateShip(ship: Ship, thrusting: boolean, dt: number): void {
  if (thrusting) {
    // Convert rotation angle into x/y thrust components
    const ax = Math.cos(ship.rotation) * ship.thrustPower;
    const ay = Math.sin(ship.rotation) * ship.thrustPower;

    ship.vx += ax * dt;
    ship.vy += ay * dt;
  }

  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
}

function aimAtTarget(ship: Ship, targetX: number, targetY: number): void {
  const dx = targetX - ship.x;
  const dy = targetY - ship.y;
  ship.rotation = Math.atan2(dy, dx);
}
```

## Used In These Games

- **Asteroids clone**: The ship rotates freely and thrusts forward using `cos`/`sin` to convert the rotation angle into velocity changes.
- **Tower defense**: Turrets use `atan2` to calculate the angle to the nearest enemy, then rotate to face it before firing.
- **Top-down shooter**: Bullets are spawned with a velocity vector derived from the angle between the player and the mouse cursor.

## Common Pitfalls

- **Forgetting canvas y-axis is flipped**: In standard math, y increases upward. On an HTML canvas, y increases downward. If your ship flies the wrong way, check whether you need to negate the y component.
- **Mixing degrees and radians**: `Math.sin`, `Math.cos`, and `Math.atan2` all work in radians. If you pass degrees directly you will get nonsensical results. Always convert with `deg * Math.PI / 180`.
- **Using `Math.atan` instead of `Math.atan2`**: `Math.atan(dy/dx)` loses information about which quadrant the angle is in (and divides by zero when dx is 0). Always use `Math.atan2(dy, dx)`.

## Further Reading

- "Essential Mathematics for Games and Interactive Applications" by Van Verth & Bishop, Chapter 4
- MDN Web Docs: Math.atan2 -- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/atan2
- Khan Academy: Unit Circle -- https://www.khanacademy.org/math/trigonometry
