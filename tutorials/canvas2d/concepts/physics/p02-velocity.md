# Velocity

## What Is It?

Velocity is how fast something moves and in which direction. If you throw a ball to the right, its velocity has a rightward component. If you throw it up-right, it has both a rightward and an upward component. Think of velocity as an arrow attached to an object: the arrow's length is the speed, and the arrow's direction is where the object is heading.

Speed is just the magnitude (length) of the velocity vector -- it tells you "how fast" but not "which way." Velocity tells you both.

## How It Works

```
Each frame:
  position.x += velocity.x * dt
  position.y += velocity.y * dt

Speed (scalar):
  speed = sqrt(vx² + vy²)

Direction (angle in radians):
  angle = atan2(vy, vx)
```

A velocity vector in 2D:

```
        vy (up is negative in screen coords)
        ^
        |   /  velocity vector
        |  /
        | / angle = atan2(vy, vx)
        |/________> vx
```

Key relationships:
- `vx = speed * cos(angle)`
- `vy = speed * sin(angle)`
- Changing `vx` or `vy` independently lets you have gravity (changing `vy`) without affecting horizontal motion (`vx`).

## Code Example

```typescript
interface Entity {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function updatePosition(entity: Entity, dt: number): void {
  entity.x += entity.vx * dt;
  entity.y += entity.vy * dt;
}

function getSpeed(entity: Entity): number {
  return Math.sqrt(entity.vx ** 2 + entity.vy ** 2);
}

function getDirection(entity: Entity): number {
  return Math.atan2(entity.vy, entity.vx);
}

function setVelocityFromAngle(
  entity: Entity,
  angle: number,
  speed: number
): void {
  entity.vx = speed * Math.cos(angle);
  entity.vy = speed * Math.sin(angle);
}

// Example: bullet fired at 45 degrees upward
const bullet: Entity = { x: 100, y: 400, vx: 0, vy: 0 };
const ANGLE = -Math.PI / 4; // -45deg (up-right in screen coords)
setVelocityFromAngle(bullet, ANGLE, 500);

console.log(`vx=${bullet.vx.toFixed(1)}, vy=${bullet.vy.toFixed(1)}`);
// vx=353.6, vy=-353.6

updatePosition(bullet, 1 / 60);
console.log(`x=${bullet.x.toFixed(1)}, y=${bullet.y.toFixed(1)}`);
// x=105.9, y=394.1
```

## Used In These Games

- **Asteroids**: The ship has a velocity vector that persists after thrust stops (no friction in space). Bullets also travel at a set speed in the direction the ship faces.
- **Snake**: Velocity is effectively one cell per tick in the current facing direction. Speed is discrete, not continuous.
- **Breakout**: The ball has a velocity vector that changes direction on each bounce but keeps roughly constant speed.
- **Tower Defense**: Enemies move along a path at a set speed; the velocity direction changes at each waypoint.

## Common Pitfalls

- **Confusing speed and velocity**: Setting `vx = speed` ignores direction. If an object needs to move at 200 px/s toward a target, decompose the speed into `vx` and `vy` using the angle to the target.
- **Ignoring dt**: Writing `x += vx` ties movement to frame rate. At 120 fps objects move twice as far per second as at 60 fps. Always multiply by `dt`.
- **Integer positions**: If `x` and `y` are integers, small velocities get rounded to zero and the object never moves. Keep positions as floats; only round when drawing.
- **Mixing up screen coordinates**: In canvas, positive Y points downward. A negative `vy` moves the object up on screen, which is the opposite of math-class convention.
