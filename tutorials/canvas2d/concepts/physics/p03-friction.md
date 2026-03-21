# Friction

## What Is It?

Friction is a force that slows moving objects down over time. Imagine sliding a hockey puck across a table: it gradually loses speed and eventually stops. In games, we simulate this by multiplying the velocity by a number slightly less than 1 every frame. A friction factor of 0.98 means "keep 98% of your speed each frame," so the object decelerates smoothly without ever abruptly stopping.

Lower values (like 0.90) create heavy, sluggish movement -- like dragging something through mud. Higher values (like 0.995) create slippery, ice-like surfaces where objects glide for a long time.

## How It Works

```
Each frame:
  velocity.x *= friction
  velocity.y *= friction

Typical values:
  0.90 - 0.93  heavy / mud / underwater
  0.94 - 0.97  normal ground
  0.98 - 0.99  ice / space-like
  1.00         no friction (pure space)
```

Exponential decay curve:

```
speed
 |\.
 |  \.
 |    \.
 |      \.___________
 |________________________ time
```

The object never truly reaches zero speed (asymptotic), so in practice you add a cutoff:

```
if (Math.abs(vx) < 0.01) vx = 0;
```

For frame-rate independence, the correct formula is:

```
friction_per_frame = friction_base ^ dt
// e.g. friction_base = 0.001 (per second), dt in seconds
velocity *= Math.pow(friction_base, dt);
```

But for fixed-step or near-constant frame rates, the simpler `velocity *= friction` works fine.

## Code Example

```typescript
interface Slider {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const FRICTION = 0.96;
const VELOCITY_CUTOFF = 0.5; // stop jittering at tiny speeds

function applyFriction(obj: Slider): void {
  obj.vx *= FRICTION;
  obj.vy *= FRICTION;

  // Snap to zero when nearly stopped
  if (Math.abs(obj.vx) < VELOCITY_CUTOFF) obj.vx = 0;
  if (Math.abs(obj.vy) < VELOCITY_CUTOFF) obj.vy = 0;
}

function update(obj: Slider, dt: number): void {
  applyFriction(obj);
  obj.x += obj.vx * dt;
  obj.y += obj.vy * dt;
}

// Example: puck pushed to the right
const puck: Slider = { x: 0, y: 300, vx: 400, vy: 0 };

for (let frame = 0; frame < 10; frame++) {
  update(puck, 1 / 60);
  console.log(
    `Frame ${frame}: vx=${puck.vx.toFixed(1)}, x=${puck.x.toFixed(1)}`
  );
}
// vx decays: 384.0 → 368.6 → 353.9 → ... → 0
```

## Used In These Games

- **Asteroids**: Low friction (0.99) makes the ship glide in space. Thrust adds velocity; friction very slowly bleeds it off so the ship eventually stops without reverse thrust.
- **Breakout**: The paddle may have light friction so it decelerates when the player releases the key, creating a smooth stop instead of an instant halt.
- **Platformer**: Ground friction is moderate (0.85-0.92 per frame) so the player slides to a stop. Air friction is much lower, letting the player maintain horizontal speed while jumping.
- **Physics Puzzle**: Objects rolling on surfaces lose speed to friction, affecting how far they travel.

## Common Pitfalls

- **Friction = 0 means instant stop, not no friction**: A common confusion. `velocity *= 0` zeroes velocity. No friction means `friction = 1.0`, keeping full speed.
- **Applying friction before input**: If you apply friction then set velocity from keys, friction has no visible effect while keys are held. Apply input first, then friction.
- **Frame-rate dependent decay**: At 120 fps, `velocity *= 0.98` runs twice as many times per second as at 60 fps, causing more total friction. Use `Math.pow(frictionBase, dt)` for frame-rate independence, or use a fixed timestep.
- **Not using different friction for air vs ground**: A platformer character should slide less on the ground than in the air. Use separate friction values per surface type.
