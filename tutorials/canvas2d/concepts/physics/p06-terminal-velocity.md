# Terminal Velocity

## What Is It?

Terminal velocity is the maximum speed an object can reach while falling. In the real world, air resistance increases with speed until it equals the pull of gravity, and the object stops accelerating. In games, we enforce a hard cap on fall speed to prevent objects from moving so fast that they skip through platforms or become impossible to control.

Think of it like a speed limit sign for gravity: no matter how long something falls, it will never go faster than this limit.

## How It Works

```
Each frame:
  vy += GRAVITY * dt                          // gravity accelerates
  vy = Math.min(vy, TERMINAL_VELOCITY)        // clamp to max

Typical values (in px/s):
  GRAVITY            = 800 - 2000
  TERMINAL_VELOCITY  = 400 - 800
```

Without clamping:

```
vy ──────────────────────/  (grows forever)
                        /
                      /
                    /
                  /
```

With clamping:

```
vy ──────────────────────  (capped)
                  ________
                /
              /
            /
```

Why it matters for collision detection:

```
Frame N:   object at y=100, vy=2000 px/s, dt=0.016
           next y = 100 + 2000 * 0.016 = 132 px movement

A platform at y=110 (only 10px thick) gets skipped entirely!
With terminal velocity of 600: movement = 600 * 0.016 = 9.6 px -- safe.
```

## Code Example

```typescript
const GRAVITY = 1200;           // px/s²
const TERMINAL_VELOCITY = 600;  // px/s max fall speed

interface Falling {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function applyGravityWithTerminal(obj: Falling, dt: number): void {
  // Apply gravity
  obj.vy += GRAVITY * dt;

  // Clamp to terminal velocity (positive vy = falling in screen coords)
  if (obj.vy > TERMINAL_VELOCITY) {
    obj.vy = TERMINAL_VELOCITY;
  }

  // Optionally clamp upward speed too (e.g., max jump speed)
  const MAX_UP_SPEED = -800;
  if (obj.vy < MAX_UP_SPEED) {
    obj.vy = MAX_UP_SPEED;
  }

  obj.x += obj.vx * dt;
  obj.y += obj.vy * dt;
}

// Demo: falling for a long time
const rock: Falling = { x: 100, y: 0, vx: 0, vy: 0 };
for (let i = 0; i < 120; i++) {
  applyGravityWithTerminal(rock, 1 / 60);
}
console.log(`vy after 2 seconds: ${rock.vy}`);
// Output: 600 (clamped, not 2400)
```

## Used In These Games

- **Platformer**: The player and enemies have a terminal velocity to ensure they never fall through thin platforms and to keep falling speed visually reasonable.
- **Flappy Bird**: The bird's downward velocity is clamped so it does not plummet offscreen between pipe gaps.
- **Physics Puzzle**: Falling objects are clamped so they reliably land on surfaces and do not tunnel through geometry.
- **Tower Defense**: Lobbed projectiles (catapult shots) have a max fall speed so they stay visible during their arc.

## Common Pitfalls

- **Clamping speed instead of vy**: If you clamp `sqrt(vx² + vy²)`, you limit overall speed, which prevents the player from running fast while falling. Clamp `vy` independently.
- **Forgetting negative direction**: `vy` can be negative (moving up). Clamping with `Math.min(vy, MAX)` only works if `vy` is positive-down. Be explicit about which direction you are clamping.
- **Setting terminal velocity too high**: If max fall speed lets the object move more than the thinnest platform's height per frame, tunneling is still possible. Ensure `TERMINAL_VELOCITY * dt < thinnest_platform_height`.
- **Not applying terminal velocity to fast-moving projectiles**: Bullets or thrown objects going downward can have the same tunneling problem. Apply speed caps or use swept collision detection for very fast objects.
