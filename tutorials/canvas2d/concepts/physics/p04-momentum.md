# Momentum

## What Is It?

Momentum is the tendency of a moving object to keep moving. In real physics, momentum = mass x velocity. In game terms, it means that once something starts moving, it does not stop immediately when you let go of the controls. Think of steering a boat: you cut the engine, but the boat glides forward for a while before water resistance slows it down.

This is the "feel" that separates a responsive platformer (low momentum, quick stops) from a floaty space game (high momentum, long glides). Asteroids is the classic example: your ship keeps drifting even after you release thrust.

## How It Works

```
Momentum model (simplified, mass = 1):

  // Thrust adds to velocity
  if (thrustKey) {
    vx += thrust * cos(angle) * dt;
    vy += thrust * sin(angle) * dt;
  }

  // No thrust = no deceleration force (in space)
  // Friction / drag handles gradual slowdown
  vx *= drag;
  vy *= drag;

  // Position update
  x += vx * dt;
  y += vy * dt;
```

With mass factored in:

```
  force = thrust_direction * thrust_power
  acceleration = force / mass
  velocity += acceleration * dt
  position += velocity * dt
```

Heavier objects (high mass) accelerate slower but are harder to stop.

```
  Light object (mass=1)      Heavy object (mass=5)
  thrust=100 → accel=100     thrust=100 → accel=20

  velocity after 1s: 100     velocity after 1s: 20
  Feels: snappy               Feels: sluggish, tanker-like
```

## Code Example

```typescript
interface Ship {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number; // radians
  mass: number;
}

const THRUST = 300;     // force in px/s²
const DRAG = 0.995;     // very low drag (space feel)
const MAX_SPEED = 400;  // clamp so things stay controllable

function updateShip(ship: Ship, thrusting: boolean, dt: number): void {
  if (thrusting) {
    const accel = THRUST / ship.mass;
    ship.vx += accel * Math.cos(ship.angle) * dt;
    ship.vy += accel * Math.sin(ship.angle) * dt;
  }

  // Apply drag (slight friction even in "space")
  ship.vx *= DRAG;
  ship.vy *= DRAG;

  // Clamp to max speed
  const speed = Math.sqrt(ship.vx ** 2 + ship.vy ** 2);
  if (speed > MAX_SPEED) {
    ship.vx = (ship.vx / speed) * MAX_SPEED;
    ship.vy = (ship.vy / speed) * MAX_SPEED;
  }

  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
}

// Ship glides after thrust stops
const ship: Ship = { x: 400, y: 300, vx: 0, vy: 0, angle: 0, mass: 1 };
updateShip(ship, true, 1 / 60);   // thrust one frame
updateShip(ship, false, 1 / 60);  // release -- still moving!
console.log(`vx=${ship.vx.toFixed(1)}`); // ~9.95, not zero
```

## Used In These Games

- **Asteroids**: The defining example. Thrust pushes in the facing direction, but the ship keeps moving when thrust stops. Players must learn to counter-thrust to slow down.
- **Platformer**: Light momentum on ground (quick stop) but heavier in air (cannot instantly reverse direction mid-jump) gives satisfying platforming feel.
- **Physics Puzzle**: Objects slide and collide with momentum transfer -- a fast-moving block pushes a slower one.
- **Flappy Bird**: The bird has vertical momentum. A tap gives upward velocity, but gravity continuously adds downward momentum.

## Common Pitfalls

- **No momentum = robotic movement**: If the character instantly reaches full speed and instantly stops, the game feels stiff. Even a tiny amount of acceleration/deceleration adds life.
- **Too much momentum = frustrating controls**: If the player cannot stop or turn quickly enough, the game feels unresponsive. Balance drag and thrust so the player feels in control.
- **Ignoring mass in collisions**: When two objects collide, the heavier one should be harder to deflect. Without mass, a tiny bullet pushes a giant asteroid the same amount, which looks wrong.
- **Mixing momentum with instant-set velocity**: Avoid writing `vx = speed` when the player presses a key -- that ignores momentum. Instead, add to velocity: `vx += accel * dt`.
