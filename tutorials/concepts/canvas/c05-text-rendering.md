# Text Rendering

## What Is It?

Games need text everywhere: score counters, menu titles, level numbers, countdown timers, "Game Over" screens, cell values in puzzle games, and floating damage numbers. The Canvas 2D API provides `fillText()` and `strokeText()` for rendering text directly onto the canvas, along with properties to control font, alignment, and baseline.

Unlike HTML text, canvas text is "painted" as pixels. Once drawn, it becomes part of the canvas image -- you cannot select it, copy it, or style it with CSS afterward. This means you must set the font, size, color, and position manually before each draw call. The upside is total control: you can place text at exact pixel coordinates, overlay it on game graphics, and animate it frame by frame.

The `measureText()` method is crucial for layout. It returns the pixel width of a string in the current font, allowing you to center text, detect overflow, or build text-based UI elements like buttons and panels. Combined with `textAlign` and `textBaseline`, you can position text precisely relative to any anchor point.

## How It Works

```
Setting the font:
  ctx.font = "24px monospace"          // size + family
  ctx.font = "bold 32px 'Press Start'" // weight + size + family
  ctx.font = "italic 18px sans-serif"  // style + size + family

Drawing text:
  ctx.fillText(text, x, y)     // filled text
  ctx.strokeText(text, x, y)   // outlined text

Alignment (horizontal anchor):
  ctx.textAlign = "left"    // x is left edge (default)
  ctx.textAlign = "center"  // x is center
  ctx.textAlign = "right"   // x is right edge

Baseline (vertical anchor):
  ctx.textBaseline = "top"         // y is top of text
  ctx.textBaseline = "middle"      // y is vertical center
  ctx.textBaseline = "alphabetic"  // y is baseline (default)
  ctx.textBaseline = "bottom"      // y is bottom of text

  textAlign:  left     center     right
              │        │          │
              Hello World
              │        │          │

Measuring:
  const metrics = ctx.measureText("Score: 100")
  metrics.width  // pixel width of the string
```

## Code Example

```typescript
// text-rendering.ts — Score display, menu title, and Sudoku numbers

function drawScoreHUD(
  ctx: CanvasRenderingContext2D,
  score: number,
  lives: number,
  width: number
): void {
  ctx.font = "bold 20px 'Courier New', monospace";
  ctx.textBaseline = "top";

  // Left-aligned score
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`SCORE: ${score.toString().padStart(6, "0")}`, 16, 16);

  // Right-aligned lives
  ctx.textAlign = "right";
  ctx.fillStyle = "#ff6666";
  ctx.fillText(`LIVES: ${lives}`, width - 16, 16);

  // Centered level indicator
  ctx.textAlign = "center";
  ctx.fillStyle = "#aaaaaa";
  ctx.font = "14px monospace";
  ctx.fillText("LEVEL 3", width / 2, 20);
}

function drawMenuTitle(
  ctx: CanvasRenderingContext2D,
  title: string,
  centerX: number,
  centerY: number
): void {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Shadow/outline layer
  ctx.font = "bold 64px sans-serif";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 6;
  ctx.strokeText(title, centerX, centerY);

  // Fill layer
  ctx.fillStyle = "#ffcc00";
  ctx.fillText(title, centerX, centerY);

  // Subtitle
  ctx.font = "18px sans-serif";
  ctx.fillStyle = "#999999";
  ctx.fillText("Press ENTER to start", centerX, centerY + 50);
}

function drawSudokuCell(
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  value: number | null,
  isFixed: boolean,
  isError: boolean
): void {
  // Cell background
  ctx.fillStyle = isError ? "rgba(255, 0, 0, 0.15)" : "#1a1a2e";
  ctx.fillRect(cellX, cellY, cellSize, cellSize);
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 1;
  ctx.strokeRect(cellX, cellY, cellSize, cellSize);

  if (value !== null) {
    ctx.font = isFixed
      ? `bold ${cellSize * 0.55}px sans-serif`
      : `${cellSize * 0.5}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isFixed ? "#ffffff" : "#6699ff";
    ctx.fillText(
      value.toString(),
      cellX + cellSize / 2,
      cellY + cellSize / 2
    );
  }
}

// Centering text in a button using measureText
function drawButton(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number
): { x: number; y: number; width: number; height: number } {
  ctx.font = "bold 18px sans-serif";
  const metrics = ctx.measureText(label);
  const padding = 16;
  const btnWidth = metrics.width + padding * 2;
  const btnHeight = 40;

  ctx.fillStyle = "#333366";
  ctx.fillRect(x, y, btnWidth, btnHeight);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + btnWidth / 2, y + btnHeight / 2);

  return { x, y, width: btnWidth, height: btnHeight };
}
```

## Visual Result

The score HUD shows a white "SCORE: 000042" flush left, a red "LIVES: 3" flush right, and a gray "LEVEL 3" centered at the top of the screen, all in monospace font. The menu title shows "BREAKOUT" in large bold gold text with a thick black outline for readability, with "Press ENTER to start" in smaller gray text below. The Sudoku cell shows a number centered perfectly within a dark rectangular cell, with fixed (given) numbers in white bold and player-entered numbers in blue. Error cells have a faint red background tint.

## Used In These Games

- **Pong**: Score numbers displayed above each player's side using large centered text.
- **Sudoku**: Every cell value is rendered with `fillText`, centered in the cell using `textAlign: "center"` and `textBaseline: "middle"`.
- **Minesweeper**: Adjacent mine count numbers are drawn in cells with different colors per digit (1=blue, 2=green, 3=red).
- **2048**: Tile numbers are centered in each tile, with font size adjusted based on digit count to prevent overflow.
- **All games**: The score HUD, game-over screen, and menu titles use text rendering extensively.

## Common Pitfalls

- **Font string format errors**: The `ctx.font` property uses CSS font shorthand. `"monospace 24px"` is invalid (size must come before family). Fix: use the correct order: `"[style] [weight] size family"`, e.g., `"bold 24px monospace"`.
- **Text blurry at sub-pixel positions**: Drawing text at `x = 100.5` causes anti-aliasing that looks blurry. Fix: round text coordinates to whole pixels: `Math.round(x)`.
- **Assuming text height from measureText**: `measureText()` reliably returns `width` but support for height metrics varies across browsers. Fix: estimate height from font size, or use `actualBoundingBoxAscent + actualBoundingBoxDescent` where available.
- **Forgetting to set font before measureText**: `measureText()` uses the current `ctx.font`. If you measure before setting the font, you get the width for the wrong font. Fix: always set `ctx.font` before calling `measureText()`.

## API Reference

- `ctx.font` — Sets the font for text rendering (CSS font shorthand syntax).
- `ctx.fillText(text, x, y, maxWidth?)` — Draws filled text at the given position.
- `ctx.strokeText(text, x, y, maxWidth?)` — Draws text outline at the given position.
- `ctx.textAlign` — Horizontal alignment: `"left"`, `"center"`, `"right"`, `"start"`, `"end"`.
- `ctx.textBaseline` — Vertical alignment: `"top"`, `"middle"`, `"alphabetic"`, `"bottom"`.
- `ctx.measureText(text)` — Returns a `TextMetrics` object with the pixel width (and other metrics) of the string.
