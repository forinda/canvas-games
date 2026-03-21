# Rounded Rectangles

## What Is It?

Rounded rectangles are rectangles with circular arcs at the corners instead of sharp 90-degree angles. They are the most common shape in game UI: cards, buttons, panels, dialog boxes, health bar containers, tile backgrounds, and notification popups. Modern canvas implementations provide `roundRect()` as a built-in path method, which takes the rectangle dimensions plus one or more corner radii.

Before `roundRect()` was widely available, developers had to manually construct rounded rectangles using a combination of `moveTo`, `lineTo`, and `arcTo` or `quadraticCurveTo` calls. This was tedious and error-prone. The native `roundRect()` method simplifies this to a single call that handles all four corners, with support for uniform radii (all corners the same) or per-corner radii (each corner different).

Rounded rectangles appear in nearly every game in the arcade for UI elements. In gameplay, they show up as card shapes in Memory Match, tile backgrounds in 2048, board cells in puzzle games, and styled panels that display instructions or stats. They also serve as button hit areas with visual softness that makes interfaces feel polished and modern.

## How It Works

```
ctx.roundRect(x, y, width, height, radii)

radii can be:
  - A single number: all corners get the same radius
  - An array of 2: [top-left/bottom-right, top-right/bottom-left]
  - An array of 4: [top-left, top-right, bottom-right, bottom-left]

  roundRect(10, 10, 200, 100, 15):
  ╭──────────────────────╮
  │                      │   All corners: radius 15
  │                      │
  ╰──────────────────────╯

  roundRect(10, 10, 200, 100, [20, 0, 20, 0]):
  ╭──────────────────────┐
  │                      │   Top-left, bottom-right: radius 20
  │                      │   Top-right, bottom-left: sharp
  └──────────────────────╯

Note: roundRect() adds to the current path.
You still need to call fill() or stroke() to render it.
```

## Code Example

```typescript
// rounded-rectangles.ts — Cards, buttons, and game panels

function drawCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  faceUp: boolean,
  symbol: string,
  color: string
): void {
  const radius = 10;

  // Card shadow
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;

  // Card body
  ctx.fillStyle = faceUp ? "#ffffff" : "#2244aa";
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();

  ctx.restore(); // remove shadow

  // Card border
  ctx.strokeStyle = faceUp ? "#cccccc" : "#1a3388";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.stroke();

  if (faceUp) {
    // Card symbol
    ctx.fillStyle = color;
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(symbol, x + width / 2, y + height / 2);
  } else {
    // Card back pattern (inner rounded rect)
    ctx.fillStyle = "#1a3388";
    ctx.beginPath();
    ctx.roundRect(x + 6, y + 6, width - 12, height - 12, radius - 3);
    ctx.fill();
  }
}

function drawGamePanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  title: string
): void {
  // Panel background with different top/bottom radii
  ctx.fillStyle = "rgba(20, 20, 40, 0.9)";
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, [12, 12, 6, 6]);
  ctx.fill();

  // Title bar (only top corners rounded)
  ctx.fillStyle = "#333366";
  ctx.beginPath();
  ctx.roundRect(x, y, width, 36, [12, 12, 0, 0]);
  ctx.fill();

  // Title text
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, x + width / 2, y + 18);

  // Panel border
  ctx.strokeStyle = "#555577";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, [12, 12, 6, 6]);
  ctx.stroke();
}

function drawButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  isHovered: boolean,
  isPressed: boolean
): { x: number; y: number; width: number; height: number } {
  const radius = height / 2; // fully rounded ends (pill shape)

  // Button background
  ctx.fillStyle = isPressed ? "#224488" : isHovered ? "#3355aa" : "#2244aa";
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();

  // Highlight on top edge
  if (!isPressed) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.roundRect(x, y, width, height / 2, [radius, radius, 0, 0]);
    ctx.fill();
  }

  // Label
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + width / 2, y + height / 2 + (isPressed ? 1 : 0));

  return { x, y, width, height };
}

// Draw a Memory Match game board
function drawMemoryBoard(ctx: CanvasRenderingContext2D): void {
  const cols = 4;
  const rows = 3;
  const cardW = 80;
  const cardH = 100;
  const gap = 12;
  const startX = 50;
  const startY = 80;

  const symbols = ["A", "B", "C", "D", "E", "F"];
  const colors = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);
      const faceUp = idx < 2; // first two cards flipped for demo
      const symbolIdx = idx % symbols.length;
      drawCard(ctx, x, y, cardW, cardH, faceUp, symbols[symbolIdx], colors[symbolIdx]);
    }
  }
}
```

## Visual Result

The Memory Match board shows a grid of 4x3 cards. The first two cards are face-up, showing a white card body with a colored letter symbol centered inside and a light gray border. All other cards are face-down, showing a blue card back with a darker blue inner rectangle. Every card has smoothly rounded corners and a soft drop shadow beneath it, making them look like physical playing cards. The game panel has a dark semi-transparent background with a colored title bar, rounded more at the top than the bottom. The button appears as a pill-shaped element with a subtle highlight gradient on the top half.

## Used In These Games

- **Memory Match**: Every card is a rounded rectangle with shadow, showing either the face (symbol) or the back (pattern). The flip animation narrows the rounded rect width.
- **Card Battle**: Each card in the player's hand and on the field is a rounded rectangle with attack/defense stats rendered inside.
- **2048**: Each numbered tile is a rounded rectangle with a background color that shifts based on its value (2, 4, 8, 16, etc.).
- **Sudoku**: The outer container and 3x3 subgrid boundaries use rounded rectangles for a polished appearance.
- **Idle Clicker**: Upgrade buttons, resource panels, and the main clicker target all use pill-shaped or rounded-corner rectangles.
- **Simon Says**: Each colored panel is a large rounded rectangle that lights up when active in the sequence.
- **Match-3**: Each gem or candy tile sits inside a rounded rectangle cell background on the game board.
- **Hangman**: The letter selection buttons along the bottom are rounded rectangles that grey out when used.
- **Connect Four**: The game board frame is a large rounded rectangle with circular cutouts for the token slots.
- **Tic-Tac-Toe**: The game board container and the "New Game" button use rounded rectangles for a clean UI look.
- **Typing Speed**: The text input area and result display panels are rounded rectangles with subtle borders.
- **All games (UI)**: Menu panels, dialog boxes, buttons, score displays, and instruction overlays all use rounded rectangles throughout.

## Common Pitfalls

- **Browser compatibility**: `roundRect()` is relatively new (2023 in all major browsers). Very old browsers do not support it. Fix: for maximum compatibility, use a polyfill that constructs the shape with `arcTo()` calls, or check for the method's existence.
- **Radius larger than half the dimension**: If the corner radius exceeds half the rectangle's width or height, the arcs overlap and produce unexpected shapes. Fix: clamp the radius: `Math.min(radius, width / 2, height / 2)`.
- **Forgetting it is a path method**: `roundRect()` only adds to the current path. You must still call `fill()` or `stroke()` afterward. Fix: always follow `roundRect()` with a render call.
- **Separate paths for fill and stroke**: If you call `fill()` then `stroke()` on the same path, the stroke is centered on the path edge, half inside and half outside. For crisp borders, draw the fill and stroke as separate `beginPath()`/`roundRect()` calls, or accept the slight overlap.

## API Reference

- `ctx.roundRect(x, y, width, height, radii)` — Adds a rounded rectangle to the current path.
- `ctx.beginPath()` — Starts a new path before defining the rounded rectangle.
- `ctx.fill()` — Fills the rounded rectangle with the current `fillStyle`.
- `ctx.stroke()` — Strokes the rounded rectangle outline with the current `strokeStyle`.
- `ctx.arcTo(x1, y1, x2, y2, radius)` — Alternative for manually constructing rounded corners (fallback approach).
