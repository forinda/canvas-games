# Canvas 2D API

## What Is It?

The Canvas 2D API is the browser's built-in drawing surface. Think of it as a digital whiteboard: you get a blank rectangle of pixels and a set of drawing commands -- rectangles, circles, lines, text, images. Every frame, you clear the whiteboard and redraw everything from scratch. There is no scene graph or retained objects; it is immediate-mode rendering. You tell the canvas what to draw, it draws it, and it forgets.

This is the rendering foundation for every game in this project. All visuals -- from the Snake grid to Tower Defense projectiles -- are drawn with these API calls.

## How It Works

```
Setup:
  const canvas = document.getElementById("game") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;

Per frame:
  ctx.clearRect(0, 0, canvas.width, canvas.height);  // wipe
  // ... draw everything ...

Key drawing commands:
  Rectangles:  ctx.fillRect(x, y, w, h)
               ctx.strokeRect(x, y, w, h)

  Circles/arcs: ctx.beginPath()
                ctx.arc(cx, cy, r, 0, Math.PI * 2)
                ctx.fill()  or  ctx.stroke()

  Lines:       ctx.beginPath()
               ctx.moveTo(x1, y1)
               ctx.lineTo(x2, y2)
               ctx.stroke()

  Text:        ctx.font = "16px monospace"
               ctx.fillText("Score: 100", x, y)

State management:
  ctx.save()      ← push current state (transform, style, clip)
  ctx.restore()   ← pop back to saved state

Transforms:
  ctx.translate(x, y)   ← move origin
  ctx.rotate(angle)     ← rotate (radians, clockwise)
  ctx.scale(sx, sy)     ← scale axes
```

Coordinate system:

```
  (0,0) ──────────→ x (canvas.width)
    |
    |   Canvas pixel grid
    |   Origin is top-left
    |   Y increases downward
    |
    ↓
    y (canvas.height)
```

## Code Example

```typescript
function renderFrame(ctx: CanvasRenderingContext2D): void {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;

  // Clear
  ctx.clearRect(0, 0, W, H);

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#1a1a2e");
  grad.addColorStop(1, "#16213e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Draw a rotated rectangle (save/restore protects state)
  ctx.save();
  ctx.translate(200, 150);
  ctx.rotate(Math.PI / 6); // 30 degrees
  ctx.fillStyle = "#e94560";
  ctx.fillRect(-25, -25, 50, 50); // centered on origin
  ctx.restore();

  // Draw a circle
  ctx.beginPath();
  ctx.arc(400, 300, 40, 0, Math.PI * 2);
  ctx.fillStyle = "#0f3460";
  ctx.fill();
  ctx.strokeStyle = "#e94560";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Draw text
  ctx.font = "bold 20px monospace";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText("Canvas API Demo", W / 2, 30);

  // Draw a line
  ctx.beginPath();
  ctx.moveTo(50, H - 50);
  ctx.lineTo(W - 50, H - 50);
  ctx.strokeStyle = "#533483";
  ctx.lineWidth = 2;
  ctx.stroke();
}
```

## Used In These Games

- **Tower Defense**: Grid, towers, enemies, projectiles, and particles are all drawn with `fillRect`, `arc`, `fillText`, and gradients. See the renderers in `src/games/tower-defense/renderers/`.
- **Snake**: The board is drawn as a grid of `fillRect` calls. The snake body is colored rectangles, food is a contrasting rectangle. See `src/games/snake/renderers/BoardRenderer.ts`.
- **Platformer**: Platforms, the player, enemies, and coins are drawn with rectangles and arcs. The camera system uses `ctx.translate` to offset the world. See `src/games/platformer/renderers/`.
- **Asteroids**: The ship and asteroids are drawn with `beginPath`/`lineTo`/`stroke` for a wireframe look. See `src/games/asteroids/renderers/GameRenderer.ts`.

## Common Pitfalls

- **Forgetting `beginPath()`**: Without `beginPath()`, successive `arc()` or `lineTo()` calls add to the same path. When you call `fill()`, every shape drawn since the last `beginPath()` fills at once, creating weird shapes.
- **Not using save/restore with transforms**: `ctx.translate(100, 100)` shifts the origin permanently. Without `save()`/`restore()`, every subsequent draw is offset. Always wrap transforms in save/restore pairs.
- **Drawing at fractional pixels**: `ctx.fillRect(10.5, 20.3, 50, 50)` causes anti-aliasing blur on crisp pixel art. Round positions to integers for sharp edges: `Math.round(x)`.
- **Forgetting to clear**: If you do not call `clearRect` at the start of each frame, new draws stack on top of old ones, creating trails or smearing. (Sometimes this is intentional for effects, but usually it is a bug.)
- **Text alignment surprises**: `ctx.textAlign = "center"` centers text on the x coordinate. If you set it and forget, later `fillText` calls at "left-aligned" positions will be shifted. Reset after drawing centered text or use save/restore.
