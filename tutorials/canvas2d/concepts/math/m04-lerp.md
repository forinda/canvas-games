# Linear Interpolation (Lerp)

## What Is It?

Linear interpolation, or "lerp," is a way to smoothly blend between two values. Imagine you are standing at point A and you want to walk to point B. At `t = 0` you are at A; at `t = 1` you are at B; at `t = 0.5` you are exactly halfway. Lerp gives you the value at any point along that journey.

In games, lerp is the workhorse of smooth motion. Instead of snapping a camera to the player's position (which looks jarring), you lerp the camera toward the player each frame. Instead of instantly changing a health bar's width, you lerp it down for a satisfying drain effect. It is one of the simplest yet most impactful tools in your toolkit.

A close relative is the "ease" or "smoothstep" function, which manipulates the `t` value so that the blending accelerates or decelerates. But the foundation is always the same lerp formula.

## The Math

The lerp formula:

```
lerp(a, b, t) = a + (b - a) * t
```

Where:
- `a` = start value
- `b` = end value
- `t` = interpolation factor, typically 0 to 1

```
t = 0.0      t = 0.25     t = 0.5      t = 0.75     t = 1.0
  |            |            |            |            |
  A-----------*-----------*-----------*-----------B
  a                    (a+b)/2                    b
```

**Lerp for 2D points** -- lerp each component independently:

```
x = lerp(x1, x2, t)
y = lerp(y1, y2, t)
```

**Frame-rate-independent smooth follow** (common pattern):

```
// Each frame, move 10% of the remaining distance
current = lerp(current, target, 1 - Math.pow(0.9, dt * 60))
```

This ensures the same visual speed regardless of frame rate.

## Code Example

```typescript
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

interface Camera {
  x: number;
  y: number;
}

interface Player {
  x: number;
  y: number;
}

// Smooth camera that follows the player
function updateCamera(
  camera: Camera,
  player: Player,
  dt: number
): void {
  // smoothFactor controls how quickly the camera catches up
  // Using frame-rate-independent lerp
  const smoothFactor = 5; // higher = faster follow
  const t = 1 - Math.exp(-smoothFactor * dt);

  camera.x = lerp(camera.x, player.x, t);
  camera.y = lerp(camera.y, player.y, t);
}

// Health bar that drains smoothly
let displayedHealth = 100;
const actualHealth = 65;

function updateHealthBar(dt: number): void {
  const t = 1 - Math.exp(-3 * dt);
  displayedHealth = lerp(displayedHealth, actualHealth, t);
}
```

## Used In These Games

- **Platformer**: The camera lerps toward the player to create a smooth scrolling effect instead of snapping rigidly to the player's position.
- **UI animations**: Health bars, score counters, and menu elements lerp between states for polished transitions.
- **Color blending**: Lerping between RGB values creates smooth color transitions for effects like day/night cycles.

## Common Pitfalls

- **Using a raw `t` factor without accounting for frame rate**: Writing `camera.x = lerp(camera.x, target.x, 0.1)` looks fine at 60fps but will behave differently at 30fps or 144fps. Use `1 - Math.exp(-speed * dt)` for frame-rate independence.
- **Lerp never actually arriving**: Because the frame-dependent approach moves a percentage of the remaining distance, it asymptotically approaches but never reaches the target. Snap to the target when the difference is tiny: `if (Math.abs(current - target) < 0.01) current = target`.
- **t values outside 0-1**: Lerp works with any `t` value (it just extrapolates), but this can cause overshooting if `t` accidentally exceeds 1. Clamp it if needed: `t = Math.min(1, Math.max(0, t))`.

## Further Reading

- Freya Holmer: "The Continuity of Splines" (YouTube) -- exceptional visual explanation of interpolation
- "Game Feel" by Steve Swink -- covers how lerp-based camera and movement create satisfying game feel
