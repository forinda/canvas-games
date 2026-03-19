# Screen Wrap

## What Is It?

Screen wrapping means that when an object moves off one edge of the screen, it reappears on the opposite edge. Think of the world as a donut (torus): walk far enough east and you end up back where you started from the west. The classic example is Pac-Man -- go through the tunnel on the right and you pop out on the left. Asteroids uses this for every direction: top/bottom and left/right.

## How It Works

```
After updating position:

  if (x > canvasWidth)   x -= canvasWidth;    // went off right → appear left
  if (x < 0)             x += canvasWidth;    // went off left → appear right
  if (y > canvasHeight)  y -= canvasHeight;   // went off bottom → appear top
  if (y < 0)             y += canvasHeight;   // went off top → appear bottom
```

For objects with a size (like a ship), you may want to let them go fully off-screen before wrapping, so they do not pop:

```
  if (x > canvasWidth + halfWidth)    x = -halfWidth;
  if (x < -halfWidth)                 x = canvasWidth + halfWidth;
```

Topological view (the screen is a torus):

```
  +--------+       Wrap left/right and top/bottom
  |  * →   |       means the screen is topologically
  |        |  ═══  a torus (donut shape).
  |   ← *  |
  +--------+
  Object exits right, enters left.
```

## Code Example

```typescript
interface Wrappable {
  x: number;
  y: number;
  width: number;
  height: number;
}

function screenWrap(
  obj: Wrappable,
  canvasW: number,
  canvasH: number
): void {
  const halfW = obj.width / 2;
  const halfH = obj.height / 2;

  // Horizontal wrap
  if (obj.x - halfW > canvasW) {
    obj.x = -halfW;
  } else if (obj.x + halfW < 0) {
    obj.x = canvasW + halfW;
  }

  // Vertical wrap
  if (obj.y - halfH > canvasH) {
    obj.y = -halfH;
  } else if (obj.y + halfH < 0) {
    obj.y = canvasH + halfH;
  }
}

// Usage in game loop
const ship: Wrappable = { x: 790, y: 300, width: 30, height: 30 };
const CANVAS_W = 800;
const CANVAS_H = 600;

// Ship drifts right past the edge
ship.x = 820;
screenWrap(ship, CANVAS_W, CANVAS_H);
console.log(`ship.x = ${ship.x}`);
// Output: ship.x = -15 (appears on left side)
```

## Used In These Games

- **Asteroids**: Ship, asteroids, and bullets all wrap around all four edges. This creates the classic infinite-space feel.
- **Snake**: The snake wraps around the board edges so going off the right brings you back on the left, increasing play area utility.
- **Space Invaders**: Optionally, the UFO bonus enemy wraps horizontally across the top of the screen.
- **Pac-Man style games**: The tunnel/portal effect is screen wrapping applied to a single axis.

## Common Pitfalls

- **Popping artifacts**: If the object wraps when its center hits the edge, half of it visually disappears before the other half appears on the opposite side. Wrap when the object is fully off-screen (using its width/height), or draw the object at both positions during the transition.
- **Collision detection across edges**: Two objects near opposite edges may actually be close in "wrapped space" but far apart in screen coordinates. For collision checks, consider the wrapped distance: `dx = Math.min(Math.abs(dx), canvasW - Math.abs(dx))`.
- **Wrapping only the player**: If bullets or asteroids do not wrap, they can disappear forever. Apply the same wrapping logic to all relevant entities.
- **Using modulo incorrectly**: `x = x % canvasW` breaks for negative values in many languages. JavaScript's `%` returns negative remainders, so `(-5) % 800 = -5`, not `795`. Add the canvas size first: `x = ((x % canvasW) + canvasW) % canvasW`.
