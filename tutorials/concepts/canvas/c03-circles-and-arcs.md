# Circles and Arcs

## What Is It?

The Canvas API does not have a `drawCircle` method. Instead, it provides `arc()`, which draws a portion of a circle's circumference along a path. A full circle is just an arc that sweeps the full 360 degrees (2 * PI radians). Partial arcs let you draw pie slices, progress indicators, Pac-Man's animated mouth, curved health bars, and countless other shapes that involve circular geometry.

Arcs are part of the path system, so they work the same way as `lineTo` -- you call `beginPath()`, add one or more arcs, then call `fill()` or `stroke()` to render them. You can combine arcs with straight lines in a single path to create complex shapes like rounded corners, semicircles connected by lines, or the Pac-Man character (two straight lines from the center to the mouth edges, connected by an arc).

In the arcade, circles appear everywhere: balls in Pong and Breakout, dots in Pac-Man, Minesweeper mine markers, bubble shooter bubbles, Connect Four tokens, and bullet projectiles. Partial arcs show up in pie-chart health displays, Pac-Man's mouth, and angular indicators.

## How It Works

```
ctx.arc(x, y, radius, startAngle, endAngle, counterclockwise?)

         3π/2 (top)
           │
           │
  π ───────┼─────── 0 / 2π (right)
  (left)   │
           │
         π/2 (bottom)

  Angles are in RADIANS, measured clockwise from the 3-o'clock position.
  0 = right, π/2 = bottom, π = left, 3π/2 = top

  Full circle:    arc(x, y, r, 0, Math.PI * 2)
  Top semicircle: arc(x, y, r, Math.PI, 0)        (π to 0, clockwise)
  Pac-Man:        arc(x, y, r, 0.3, Math.PI * 2 - 0.3)  (gap = mouth)
```

The `counterclockwise` parameter (default `false`) controls which direction the arc sweeps. For most game uses, you leave it as `false` (clockwise).

When you add an arc to an existing path, the canvas automatically draws a straight line from the current pen position to the start of the arc. If you do not want this connecting line, call `moveTo()` to the arc's start point first, or begin a fresh path with `beginPath()`.

## Code Example

```typescript
// circles-and-arcs.ts — Breakout ball and Pac-Man mouth animation

function drawBreakoutBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number
): void {
  // Outer glow ring
  ctx.strokeStyle = "rgba(0, 200, 255, 0.3)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
  ctx.stroke();

  // Solid ball
  ctx.fillStyle = "#00ccff";
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Highlight (small offset circle for 3D effect)
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.beginPath();
  ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function drawPacMan(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  mouthAngle: number, // 0 (closed) to 0.4 (wide open)
  direction: number   // 0=right, PI/2=down, PI=left, 3PI/2=up
): void {
  ctx.fillStyle = "#ffcc00";
  ctx.beginPath();
  // Start from center, line to mouth edge, arc around, line back
  ctx.moveTo(x, y);
  ctx.arc(
    x,
    y,
    radius,
    direction + mouthAngle,        // upper lip
    direction - mouthAngle + Math.PI * 2, // lower lip (sweep clockwise)
    false
  );
  ctx.closePath();
  ctx.fill();

  // Eye
  const eyeOffsetX = Math.cos(direction - 0.5) * radius * 0.4;
  const eyeOffsetY = Math.sin(direction - 0.5) * radius * 0.4;
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.arc(x + eyeOffsetX, y + eyeOffsetY, radius * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

// Animate Pac-Man's mouth
let frame = 0;
function renderFrame(ctx: CanvasRenderingContext2D): void {
  frame++;
  const mouthAngle = Math.abs(Math.sin(frame * 0.1)) * 0.4;
  drawPacMan(ctx, 200, 200, 30, mouthAngle, 0);

  // Draw some dots for Pac-Man to eat
  ctx.fillStyle = "#ffcc00";
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(280 + i * 30, 200, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
```

## Visual Result

The Breakout ball appears as a bright cyan circle with a subtle glow ring around it and a white highlight spot that gives it a 3D, shiny appearance. Pac-Man appears as a yellow circle with a triangular wedge cut out for the mouth, facing right. The mouth opens and closes smoothly using a sine wave to oscillate the mouth angle. A small black dot serves as Pac-Man's eye, positioned above the mouth. Five small yellow dots trail ahead of Pac-Man, representing pellets to eat.

## Used In These Games

- **Breakout**: The ball is a filled circle with a glow ring (two concentric arcs with different radii).
- **Pac-Man**: The player character uses a partial arc with `moveTo` to the center to create the mouth wedge. The mouth angle oscillates for the chomp animation. Pellets and power pellets are small filled circles.
- **Pong**: The ball is a simple filled circle.
- **Bubble Shooter**: Each bubble is a filled circle with color. The aiming line connects to a circle at the tip.
- **Connect Four**: Tokens are filled circles drawn on top of the board grid.
- **Minesweeper**: Mines are drawn as circles with radiating lines for the spikes.

## Common Pitfalls

- **Using degrees instead of radians**: `arc()` takes radians, not degrees. `arc(x, y, r, 0, 90)` sweeps almost 14.3 full circles, not a quarter circle. Fix: use `Math.PI / 2` for 90 degrees, or write a helper: `const deg = (d: number) => d * Math.PI / 180`.
- **Forgetting `beginPath()` before a new circle**: Without it, `fill()` fills all circles drawn since the last `beginPath()`, connecting them with unintended shapes. Fix: call `beginPath()` before each independent circle.
- **Arc connecting line**: If you add an `arc()` call after a `lineTo()`, the canvas draws a straight line from the line's endpoint to the arc's start. This creates unexpected lines. Fix: call `moveTo()` to the arc's start point, or use a fresh `beginPath()`.
- **Counterclockwise confusion**: The default is clockwise (`false`). Setting `counterclockwise` to `true` draws the arc the other way, which changes which portion of the circle is covered. Fix: sketch out the angles on paper first when working with partial arcs.

## API Reference

- `ctx.arc(x, y, radius, startAngle, endAngle, counterclockwise?)` — Adds a circular arc to the current path.
- `ctx.beginPath()` — Starts a new path, required before each independent shape.
- `ctx.moveTo(x, y)` — Moves the pen without drawing (used to position before an arc).
- `ctx.closePath()` — Draws a straight line back to the sub-path start (creates the Pac-Man mouth edge).
- `ctx.fill()` — Fills the enclosed path area.
- `ctx.stroke()` — Draws the path outline.
- `Math.PI` — The constant pi (~3.14159), used to specify angles in radians.
