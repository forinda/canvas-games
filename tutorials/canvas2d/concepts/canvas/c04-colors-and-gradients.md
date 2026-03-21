# Colors and Gradients

## What Is It?

Every visible thing on a canvas has a color. The `fillStyle` and `strokeStyle` properties control what color is used when you call `fill()`, `stroke()`, `fillRect()`, or any other drawing method. These properties accept CSS color strings (named colors, hex, rgb, rgba, hsl) for solid colors, but they also accept gradient objects for smooth color transitions.

Gradients are essential for polished game visuals. A linear gradient transitions between colors along a straight line -- perfect for sky backgrounds, health bars that shift from green to red, and metallic surfaces. A radial gradient transitions between colors radiating from a center point -- ideal for ball glow effects, explosions, spotlights, and vignette overlays.

The key insight is that `fillStyle` is not just a color string. It is a union type that accepts strings, `CanvasGradient` objects, and `CanvasPattern` objects. Once you assign a gradient to `fillStyle`, every subsequent `fill()` or `fillRect()` call uses that gradient until you assign something else. This means you can create a gradient once and reuse it across multiple draw calls.

## How It Works

```
Solid colors:
  ctx.fillStyle = "red"                  // Named
  ctx.fillStyle = "#ff0000"              // Hex
  ctx.fillStyle = "rgb(255, 0, 0)"       // RGB
  ctx.fillStyle = "rgba(255, 0, 0, 0.5)" // RGBA (with alpha)
  ctx.fillStyle = "hsl(0, 100%, 50%)"    // HSL

Linear gradient:
  const grad = ctx.createLinearGradient(x0, y0, x1, y1)
  grad.addColorStop(0, startColor)   // position 0 = start
  grad.addColorStop(1, endColor)     // position 1 = end
  ctx.fillStyle = grad

  (x0,y0)─────────────────►(x1,y1)
  color1                    color2

Radial gradient:
  const grad = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1)
  grad.addColorStop(0, innerColor)
  grad.addColorStop(1, outerColor)

      ┌─────────────┐
      │  ╭───────╮   │
      │  │ inner │   │  r0 = inner radius
      │  ╰───────╯   │  r1 = outer radius
      └─────────────┘
```

Color stops can be placed at any position between 0 and 1. You can add as many stops as you want for multi-color gradients.

## Code Example

```typescript
// colors-and-gradients.ts — Sky background, health bar, and glowing ball

function drawSkyBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  // Vertical linear gradient: dark blue at top to orange at horizon
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#0a0a2e");
  sky.addColorStop(0.5, "#1a1a4e");
  sky.addColorStop(0.8, "#ff6633");
  sky.addColorStop(1, "#ffcc66");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
}

function drawHealthBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  healthPercent: number // 0 to 1
): void {
  // Background
  ctx.fillStyle = "#333333";
  ctx.fillRect(x, y, width, height);

  // Health fill: green at full, yellow at half, red at low
  const barWidth = width * healthPercent;
  const healthGrad = ctx.createLinearGradient(x, 0, x + width, 0);
  healthGrad.addColorStop(0, "#ff3333");
  healthGrad.addColorStop(0.5, "#ffaa00");
  healthGrad.addColorStop(1, "#33ff66");
  ctx.fillStyle = healthGrad;
  ctx.fillRect(x, y, barWidth, height);

  // Border
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
}

function drawGlowingBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number
): void {
  // Radial gradient: bright center fading to transparent
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
  glow.addColorStop(0, "rgba(0, 200, 255, 0.8)");
  glow.addColorStop(0.3, "rgba(0, 150, 255, 0.3)");
  glow.addColorStop(1, "rgba(0, 100, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
  ctx.fill();

  // Solid ball core
  ctx.fillStyle = "#00ccff";
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

// Compose the scene
function renderScene(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  drawSkyBackground(ctx, w, h);
  drawHealthBar(ctx, 20, 20, 200, 16, 0.65);
  drawGlowingBall(ctx, w / 2, h / 2, 12);
}
```

## Visual Result

The scene shows a dramatic sky gradient that transitions from dark navy at the top, through deep blue in the middle, to warm orange and yellow at the bottom -- like a sunset. In the top-left corner, a health bar sits at 65% full, with the filled portion displaying a gradient that shifts from red on the left through yellow in the middle to green on the right. At the center of the screen, a bright cyan ball glows with a soft radial halo that fades from bright at the center to fully transparent at the edges, creating a neon glow effect against the sky background.

## Used In These Games

- **Flappy Bird**: The sky background is a vertical linear gradient from light blue at the top to warm orange near the horizon.
- **Lava Floor**: The lava surface uses a linear gradient shifting from bright orange to deep red, with radial gradients for heat distortion spots.
- **Fishing**: The water is drawn with a vertical linear gradient from light blue at the surface to dark blue at depth.
- **Platformer**: The parallax sky uses a multi-stop linear gradient for sunrise/sunset effects behind the level.
- **Tower Defense**: Uses linear gradients for the terrain background and radial gradients for tower range indicator rings.
- **Breakout**: The ball has a radial gradient glow effect. Bricks use different solid colors per row, and power-ups have gradient fills.
- **Space Invaders**: The background uses a dark gradient from deep navy to black. Laser shots use bright gradient fills for a beam effect.
- **Asteroids**: Explosions use radial gradients that fade from bright orange to transparent.
- **Doodle Jump**: The background gradient shifts from sky blue at the top to lighter tones at the bottom as the player ascends.
- **Color Switch**: Each rotating gate segment uses a distinct solid color. The background uses a dark gradient for contrast.
- **Helicopter**: The cavern background uses a vertical gradient to suggest depth, with the ceiling and floor shaded differently.
- **Idle Clicker**: Resource bars and upgrade buttons use linear gradients to give UI elements a polished, glossy appearance.

## Common Pitfalls

- **Gradient coordinates are in canvas space, not shape space**: A gradient defined from (0,0) to (0,600) always maps to those canvas positions, regardless of where you draw. If you draw a small rectangle at (400, 300), only a tiny slice of the gradient shows. Fix: create the gradient with coordinates that match the shape you are filling.
- **Creating gradients every frame**: `createLinearGradient` creates a new object each time. Creating hundreds per frame impacts performance. Fix: create gradients once during initialization and store them, unless the gradient parameters change each frame.
- **Forgetting alpha for transparency**: Using `"rgb(255, 0, 0)"` gives fully opaque red. For semi-transparent overlays, use `"rgba(255, 0, 0, 0.5)"` or set `globalAlpha`. Fix: use the `rgba()` format when you need transparency.
- **Color stop order**: Color stops must be added in ascending position order (0 to 1). Adding them out of order may produce unexpected results. Fix: always add stops from lowest position to highest.

## API Reference

- `ctx.fillStyle` — Sets the fill color, gradient, or pattern for subsequent fill operations.
- `ctx.strokeStyle` — Sets the stroke color, gradient, or pattern for subsequent stroke operations.
- `ctx.createLinearGradient(x0, y0, x1, y1)` — Creates a gradient along a line between two points.
- `ctx.createRadialGradient(x0, y0, r0, x1, y1, r1)` — Creates a gradient between two circles.
- `gradient.addColorStop(position, color)` — Adds a color at a position (0-1) along the gradient.
