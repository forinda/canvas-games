# Shadows and Glow

## What Is It?

The Canvas 2D API has a built-in shadow system controlled by four properties: `shadowColor`, `shadowBlur`, `shadowOffsetX`, and `shadowOffsetY`. These apply an automatic shadow or glow effect to anything you draw -- rectangles, paths, text, and images. When the offset is zero and the blur is high, the shadow becomes a glow effect centered on the shape, which is how most games create neon-style aesthetics.

Shadows are the easiest way to add visual depth and polish to a game. A button with a soft drop shadow looks clickable. A ball with a colored glow looks like it is emitting light. Score text with a glow behind it pops against any background. Tower range rings with a soft blur look like energy fields. All of this comes from setting four properties before your normal draw calls.

The performance cost of shadows is real but manageable. The blur operation is GPU-accelerated in modern browsers, but drawing hundreds of shadowed elements per frame can slow things down. The pattern is to use shadows selectively -- on important elements like the player character, active projectiles, UI elements, and highlights -- rather than on every single object.

## How It Works

```
Shadow properties:
  ctx.shadowColor   = "rgba(0, 0, 0, 0.5)"  // color (supports alpha)
  ctx.shadowBlur    = 10                      // blur radius in pixels
  ctx.shadowOffsetX = 5                       // horizontal offset
  ctx.shadowOffsetY = 5                       // vertical offset

Drop shadow (offset > 0):
  ┌──────────┐
  │  Shape   │
  └──────────┘
     ╲──────────╲    ← shadow offset down-right
      ╲ (blurred)╲
       ╲──────────╲

Glow effect (offset = 0, colored shadow):
      ·····
    ·· ┌────┐ ··
   ·  │Shape│  ·     ← glow radiates from edges
    ·· └────┘ ··
      ·····

To disable shadows:
  ctx.shadowColor = "transparent"
  // or
  ctx.shadowBlur = 0
```

Shadow state is part of the drawing state saved/restored by `save()`/`restore()`. This makes it easy to enable shadows for one element and disable them for the next.

## Code Example

```typescript
// shadows-and-glow.ts — Neon buttons, ball glow, and tower range

function drawNeonButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  glowColor: string,
  isHovered: boolean
): void {
  ctx.save();

  // Neon glow effect
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = isHovered ? 25 : 12;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Button border (the glow attaches to this)
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  // Draw the stroke again for double-intensity glow
  if (isHovered) {
    ctx.strokeRect(x, y, width, height);
  }

  // Text (also gets the glow)
  ctx.fillStyle = glowColor;
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + width / 2, y + height / 2);

  ctx.restore(); // removes shadow state
}

function drawGlowingBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  glowIntensity: number // 0 to 1
): void {
  ctx.save();

  // Outer glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 20 * glowIntensity;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Draw again for stronger glow
  ctx.fill();

  // Inner bright core (no extra shadow needed)
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawTowerRangeRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  range: number,
  towerColor: string
): void {
  ctx.save();

  ctx.shadowColor = towerColor;
  ctx.shadowBlur = 15;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  ctx.strokeStyle = towerColor;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.arc(x, y, range, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawDropShadowPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  ctx.save();

  // Classic drop shadow
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;

  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(x, y, width, height);

  // Border (shadow still applies)
  ctx.shadowColor = "transparent"; // disable shadow for border
  ctx.strokeStyle = "#333355";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  ctx.restore();
}
```

## Visual Result

The neon button appears as a rectangular outline with a soft colored glow radiating from its edges, like a neon sign. When hovered, the glow intensifies and spreads further. The text inside also glows with the same color. The ball has a vibrant colored glow surrounding it, with a bright white core at the center, creating the look of a glowing energy orb. The tower range ring is a thin circle with a soft glow, resembling an energy field boundary. The panel has a traditional drop shadow offset to the bottom-right, giving it a raised, floating appearance.

## Used In These Games

- **Breakout**: The ball has a colored glow trail. Power-up items glow to attract attention.
- **Tower Defense**: Selected towers show their range as a glowing ring. Upgrade buttons use neon glow styling.
- **Pac-Man**: Power pellets pulse with a glow effect. The energized Pac-Man has an enhanced glow.
- **Pong**: The ball glows, and the paddles have a subtle colored glow matching their team color.
- **Space Invaders**: Laser shots glow brightly. The player ship has a subtle engine glow.
- **All games**: Menu buttons use neon glow on hover for interactive feedback.

## Common Pitfalls

- **Shadows on every object tank performance**: Drawing 200 enemies each with `shadowBlur = 20` is expensive. Fix: only use shadows on key objects (player, active effects, UI). For bulk objects, skip shadows or use a pre-rendered glow texture.
- **Shadow bleeds outside clipping**: Shadows are drawn outside the shape's bounds. If you clip a region and draw a shadowed shape near the edge, the shadow may be clipped unexpectedly. Fix: make the clip region larger than the visible area by the shadow blur amount.
- **Forgetting to disable shadows**: Shadows persist until changed. Drawing a shadowed button and then drawing score text without resetting produces shadowed text. Fix: use `save()`/`restore()`, or explicitly set `ctx.shadowColor = "transparent"` after.
- **Double-drawing for glow intensity**: Calling `fill()` twice with the same shadow settings doubles the glow brightness. This is a useful trick, but it is also a trap if done accidentally. Fix: be intentional about double-drawing; use it only when you want extra intensity.

## API Reference

- `ctx.shadowColor` — The color of the shadow (supports rgba for transparent shadows).
- `ctx.shadowBlur` — The blur radius of the shadow in pixels (0 = sharp edge).
- `ctx.shadowOffsetX` — Horizontal offset of the shadow from the shape.
- `ctx.shadowOffsetY` — Vertical offset of the shadow from the shape.
- `ctx.save()` — Saves shadow state along with other drawing state.
- `ctx.restore()` — Restores shadow state to what it was at the last `save()`.
