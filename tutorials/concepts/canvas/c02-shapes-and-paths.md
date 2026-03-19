# Shapes and Paths

## What Is It?

The Canvas 2D API gives you two fundamental ways to draw: immediate rectangle methods and the path-based drawing system. Rectangles are the simplest shape -- `fillRect` and `strokeRect` draw them in a single call. But for anything beyond rectangles (lines, triangles, polygons, custom shapes), you need the path system: `beginPath`, `moveTo`, `lineTo`, `closePath`, then `fill` or `stroke`.

Paths work like an invisible pen. You call `beginPath()` to start a new shape, then issue a series of commands that move the pen around without drawing anything visible. Only when you call `fill()` or `stroke()` does the path actually appear on the canvas. This two-phase approach (define shape, then render it) gives you precise control over complex shapes.

In game development, you use rectangles constantly -- for paddles, walls, grid cells, health bars, and UI panels. Lines and custom paths appear in things like court markings, laser beams, polygon-based ships, and terrain outlines. Mastering both systems is essential for drawing anything in the arcade.

## How It Works

```
Rectangle methods (immediate — no path needed):
  fillRect(x, y, w, h)    → filled rectangle
  strokeRect(x, y, w, h)  → outlined rectangle
  clearRect(x, y, w, h)   → erases a rectangular area

Path-based drawing:
  beginPath()  → start new path (clears previous sub-paths)
  moveTo(x,y)  → move pen without drawing
  lineTo(x,y)  → draw line from current position to (x,y)
  closePath()  → draw line back to start of current sub-path
  fill()       → fill the enclosed area
  stroke()     → draw the outline

Path lifecycle:
  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
  │beginPath()│───>│moveTo()  │───>│lineTo()  │───>│fill() or │
  │          │    │lineTo()  │    │lineTo()  │    │stroke()  │
  └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

Setting `fillStyle` or `strokeStyle` before drawing controls the color. Setting `lineWidth` controls the thickness of stroked lines. These are persistent state -- once set, they apply to all subsequent draw calls until changed.

## Code Example

```typescript
// shapes-and-paths.ts — Drawing the Pong court

function drawPongCourt(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  // Background
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, width, height);

  // Center dashed line
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.stroke();
  ctx.setLineDash([]); // Reset dash pattern

  // Left paddle (filled rectangle)
  const paddleWidth = 12;
  const paddleHeight = 80;
  const leftPaddleY = height / 2 - paddleHeight / 2;
  ctx.fillStyle = "#00ff88";
  ctx.fillRect(20, leftPaddleY, paddleWidth, paddleHeight);

  // Right paddle
  const rightPaddleY = height / 2 - paddleHeight / 2 + 30;
  ctx.fillStyle = "#ff4488";
  ctx.fillRect(width - 20 - paddleWidth, rightPaddleY, paddleWidth, paddleHeight);

  // Court border (stroked rectangle)
  ctx.strokeStyle = "#444444";
  ctx.lineWidth = 3;
  ctx.strokeRect(5, 5, width - 10, height - 10);

  // A triangular "boost zone" in the corner using paths
  ctx.fillStyle = "rgba(255, 200, 0, 0.15)";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(80, 0);
  ctx.lineTo(0, 80);
  ctx.closePath();
  ctx.fill();

  // Diamond shape at center using paths
  const cx = width / 2;
  const cy = height / 2;
  ctx.strokeStyle = "#666666";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 20);
  ctx.lineTo(cx + 15, cy);
  ctx.lineTo(cx, cy + 20);
  ctx.lineTo(cx - 15, cy);
  ctx.closePath();
  ctx.stroke();
}
```

## Visual Result

The code draws a complete Pong court: a near-black background with a dashed vertical center line, a green left paddle and a pink right paddle, a subtle gray border around the entire court, a faint yellow triangle in the top-left corner representing a "boost zone," and a small diamond outline at the center of the court. The paddles are solid filled rectangles, the court border is a stroked rectangle, and the triangle and diamond are custom path-based shapes.

## Used In These Games

- **Pong**: Paddles are `fillRect` calls, the center line uses `beginPath/moveTo/lineTo/stroke` with a dash pattern, and the court border is a `strokeRect`.
- **Breakout**: Each brick is a `fillRect` with varying colors. The court walls are stroked rectangles.
- **Snake**: The grid background uses `fillRect` for alternating cell colors. The snake body segments are filled rectangles.
- **Minesweeper**: Each cell is a `fillRect` for the background, with `strokeRect` for the border. Flagged cells use path-based triangles for the flag shape.
- **Checkers**: The 8x8 board is drawn with alternating `fillRect` calls for light and dark squares.

## Common Pitfalls

- **Forgetting `beginPath()`**: If you skip `beginPath()`, the new lines are added to the previous path. Calling `stroke()` redraws everything from the old path too, creating unwanted lines. Fix: always call `beginPath()` before starting a new shape.
- **Not setting `closePath()` for filled shapes**: For `fill()`, the path auto-closes, so `closePath()` is optional. But for `stroke()`, skipping `closePath()` leaves the shape open. Fix: always call `closePath()` before `stroke()` if you want a closed outline.
- **Confusing `clearRect` with `fillRect`**: `clearRect` makes pixels fully transparent (not white or black). If your canvas sits on a colored page, cleared areas show the page background. Fix: use `fillRect` with a specific color when you want a solid background.
- **Setting lineWidth to 0**: A `lineWidth` of 0 still renders a 1-pixel line in some browsers. Fix: if you do not want a stroke, simply do not call `stroke()`.

## API Reference

- `ctx.fillRect(x, y, width, height)` — Draws a filled rectangle immediately (no path needed).
- `ctx.strokeRect(x, y, width, height)` — Draws a rectangle outline immediately.
- `ctx.clearRect(x, y, width, height)` — Erases a rectangular area to transparent.
- `ctx.beginPath()` — Starts a new path, discarding any previous sub-paths.
- `ctx.moveTo(x, y)` — Moves the pen to a position without drawing.
- `ctx.lineTo(x, y)` — Draws a straight line from the current position to (x, y).
- `ctx.closePath()` — Draws a straight line back to the start of the current sub-path.
- `ctx.fill()` — Fills the current path with the current `fillStyle`.
- `ctx.stroke()` — Strokes the current path outline with the current `strokeStyle`.
- `ctx.setLineDash(segments)` — Sets the line dash pattern for strokes.
- `ctx.lineWidth` — Sets the width of stroked lines in pixels.
