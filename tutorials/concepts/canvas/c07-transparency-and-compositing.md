# Transparency and Compositing

## What Is It?

Transparency controls how see-through drawn elements are, while compositing controls how new pixels combine with existing pixels on the canvas. Together, they let you create layered visual effects that would be impossible with opaque drawing alone: semi-transparent ghost characters, fog of war that obscures parts of a map, fade-in and fade-out transitions, and special blending modes like additive glow.

The simplest transparency tool is `globalAlpha`, a number from 0 (fully transparent) to 1 (fully opaque) that applies to everything drawn after it is set. For more targeted control, use rgba colors: `"rgba(255, 0, 0, 0.5)"` makes only that specific fill semi-transparent without affecting other draw calls.

`globalCompositeOperation` is more powerful and more complex. It controls the blending rule used when new pixels are drawn on top of existing pixels. The default is `"source-over"` (new content draws on top), but there are 26 modes including `"destination-over"` (draw behind), `"lighter"` (additive blending for glow effects), `"multiply"` (darken), and `"destination-in"` (use existing content as a mask). These modes unlock sophisticated visual effects with minimal code.

## How It Works

```
globalAlpha:
  ctx.globalAlpha = 1.0   →  fully opaque (default)
  ctx.globalAlpha = 0.5   →  50% transparent
  ctx.globalAlpha = 0.0   →  fully invisible

globalCompositeOperation:
  "source-over"      →  new draws ON TOP of existing (default)
  "destination-over"  →  new draws BEHIND existing
  "lighter"          →  adds RGB values (additive glow)
  "multiply"         →  multiplies RGB values (darkening)
  "screen"           →  inverse multiply (lightening)
  "source-in"        →  new content only where existing exists
  "destination-in"   →  keep existing only where new is drawn
  "source-atop"      →  new content only on top of existing
  "xor"              →  visible only where one exists, not both

  source-over:    lighter:         destination-over:
  ┌────────┐      ┌────────┐       ┌────────┐
  │ ┌──────┤      │ ┌BRIGHT┤       │ ┌──────┤
  │ │ NEW  │      │ │ GLOW │       │ │ OLD  │
  ├─┤ ON   │      ├─┤ ADD  │       ├─┤ ON   │
  │ │ TOP  │      │ │ VALS │       │ │ TOP  │
  └─┴──────┘      └─┴──────┘       └─┴──────┘
```

## Code Example

```typescript
// transparency-and-compositing.ts — Ghost, fog of war, and fade effect

function drawPacManGhost(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  isFrightened: boolean
): void {
  ctx.save();

  // Frightened ghosts are semi-transparent and blue
  if (isFrightened) {
    ctx.globalAlpha = 0.6;
  }

  const ghostColor = isFrightened ? "#4444ff" : color;

  // Ghost body (dome top + wavy bottom)
  ctx.fillStyle = ghostColor;
  ctx.beginPath();
  ctx.arc(x, y - radius * 0.2, radius, Math.PI, 0); // dome
  ctx.lineTo(x + radius, y + radius);

  // Wavy bottom
  const waves = 3;
  const waveWidth = (radius * 2) / waves;
  for (let i = waves; i > 0; i--) {
    const wx = x + radius - (waves - i) * waveWidth - waveWidth / 2;
    ctx.quadraticCurveTo(
      wx + waveWidth * 0.25, y + radius - 6,
      wx, y + radius
    );
  }

  ctx.closePath();
  ctx.fill();

  // Eyes (always fully opaque)
  ctx.globalAlpha = 1;
  const eyeY = y - radius * 0.3;
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x + side * radius * 0.35, eyeY, radius * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isFrightened ? "#ffffff" : "#0000aa";
    ctx.beginPath();
    ctx.arc(x + side * radius * 0.35 + 2, eyeY, radius * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawFogOfWar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  playerX: number,
  playerY: number,
  visionRadius: number
): void {
  ctx.save();

  // Draw a full-screen dark overlay
  ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
  ctx.fillRect(0, 0, width, height);

  // Cut a hole where the player can see using composite mode
  ctx.globalCompositeOperation = "destination-out";
  const gradient = ctx.createRadialGradient(
    playerX, playerY, 0,
    playerX, playerY, visionRadius
  );
  gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
  gradient.addColorStop(0.7, "rgba(0, 0, 0, 0.8)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(playerX, playerY, visionRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore(); // restores composite operation to source-over
}

function drawAdditiveGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string
): void {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  // Multiple overlapping circles create bright additive glow
  for (let i = 3; i > 0; i--) {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.arc(x, y, radius * (i / 2), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// Fade-to-black transition
function drawFadeOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  fadeProgress: number // 0 = no fade, 1 = fully black
): void {
  if (fadeProgress > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${fadeProgress})`;
    ctx.fillRect(0, 0, width, height);
  }
}
```

## Visual Result

The Pac-Man ghost appears as a colored dome shape with a wavy bottom edge, two white eyes with dark pupils, and the characteristic ghost silhouette. When frightened, the ghost turns semi-transparent blue, allowing the background to show through the body while the eyes remain fully opaque. The fog of war covers the entire screen in a dark semi-transparent overlay, except for a circular area around the player position where the darkness fades away through a radial gradient, creating a visible "vision cone." The additive glow creates a bright hotspot where overlapping circles make the center brighter than any individual circle, ideal for energy effects and explosions.

## Used In These Games

- **Pac-Man**: Frightened ghosts use `globalAlpha` for their semi-transparent appearance. The ghost body fades in opacity when retreating to the ghost house.
- **Minesweeper**: Unexplored cells use a semi-transparent overlay to look "covered."
- **Tower Defense**: Fog of war uses `destination-out` compositing to reveal the map around towers. Range indicators use alpha for semi-transparent circles.
- **Space Invaders**: Shield blocks become more transparent as they take damage, using decreasing `globalAlpha` values.
- **All games**: Fade-to-black transitions between game states use an `rgba(0,0,0,alpha)` fullscreen overlay with increasing alpha.

## Common Pitfalls

- **Forgetting to reset `globalAlpha`**: Setting `globalAlpha = 0.5` affects everything drawn afterward, including text and HUD elements that should be solid. Fix: always use `save()`/`restore()` around sections that change `globalAlpha`.
- **Not restoring `globalCompositeOperation`**: Like `globalAlpha`, the composite mode is persistent. Drawing with `"lighter"` mode and forgetting to restore it makes everything rendered afterward use additive blending. Fix: wrap composite mode changes in `save()`/`restore()`.
- **Alpha stacking**: Drawing two `rgba(0,0,0,0.5)` rectangles on top of each other does not produce `rgba(0,0,0,1.0)`. Alpha compositing is multiplicative. Fix: understand that overlapping transparent layers produce intermediate transparency, not additive.
- **Performance of composite modes**: Some composite operations (especially `"source-in"`, `"destination-out"`) are slower than `"source-over"` because they require reading back existing pixels. Fix: minimize the area affected by expensive composite modes.

## API Reference

- `ctx.globalAlpha` — Sets the transparency level (0-1) for all subsequent drawing operations.
- `ctx.globalCompositeOperation` — Sets how new drawing composites with existing canvas content.
- `ctx.save()` — Saves the current state including alpha and composite operation.
- `ctx.restore()` — Restores the previously saved state.
- `ctx.createRadialGradient(x0, y0, r0, x1, y1, r1)` — Used with `destination-out` to create soft-edged visibility holes.
