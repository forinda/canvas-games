# Coordinate Systems

## What Is It?

The canvas coordinate system places the origin (0, 0) at the top-left corner, with X increasing to the right and Y increasing downward. This is the opposite of the math convention where Y increases upward, and it catches people off guard the first time. Every position you specify in canvas drawing calls -- `fillRect`, `arc`, `fillText`, `moveTo` -- uses this coordinate system.

The bigger challenge is converting between coordinate spaces. When a user clicks or touches the screen, the browser gives you page coordinates. The canvas might be offset from the page edge, scaled by CSS, and further scaled by the `devicePixelRatio` adjustment. You need to convert the browser's event coordinates into the canvas's internal coordinate system to know which game object was clicked. This is critical for any game with mouse/touch interaction: clicking grid cells, dragging puzzle pieces, aiming weapons, pressing UI buttons.

This conversion is so fundamental that every interactive game needs it. Get it wrong, and clicks "miss" by some offset -- the player clicks on a cell but the game registers the click on the wrong cell. The solution is `getBoundingClientRect()` combined with the ratio between the canvas's CSS display size and its internal buffer size.

## How It Works

```
Canvas coordinate system:
  (0,0)───────────────────► X+
    │
    │   (100, 50)
    │       •
    │
    │              (300, 200)
    │                  •
    │
    ▼
    Y+

Converting mouse/touch events to canvas coordinates:
  1. Get the canvas position on the page: canvas.getBoundingClientRect()
  2. Subtract the canvas offset from the event coordinates
  3. Scale by the ratio of internal size to display size

  Event:  (pageX, pageY)
  Canvas: rect.left, rect.top, rect.width, rect.height
  Buffer: canvas.width, canvas.height

  canvasX = (event.clientX - rect.left) * (canvas.width / rect.width)
  canvasY = (event.clientY - rect.top)  * (canvas.height / rect.height)

  If using DPR scaling (ctx.scale(dpr, dpr)), divide by DPR:
  logicalX = canvasX / dpr
  logicalY = canvasY / dpr

Grid cell from coordinates:
  col = Math.floor(logicalX / cellSize)
  row = Math.floor(logicalY / cellSize)
```

## Code Example

```typescript
// coordinate-systems.ts — Click detection on a game grid

interface GridConfig {
  offsetX: number;  // grid start X on canvas
  offsetY: number;  // grid start Y on canvas
  cols: number;
  rows: number;
  cellSize: number;
}

function canvasCoords(
  canvas: HTMLCanvasElement,
  event: MouseEvent | Touch
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  // Convert page coordinates to canvas logical coordinates
  const x = (event.clientX - rect.left) * (canvas.width / rect.width) / dpr;
  const y = (event.clientY - rect.top) * (canvas.height / rect.height) / dpr;

  return { x, y };
}

function gridCellFromCoords(
  canvasX: number,
  canvasY: number,
  grid: GridConfig
): { col: number; row: number } | null {
  const relX = canvasX - grid.offsetX;
  const relY = canvasY - grid.offsetY;

  // Check bounds
  if (relX < 0 || relY < 0) return null;

  const col = Math.floor(relX / grid.cellSize);
  const row = Math.floor(relY / grid.cellSize);

  if (col >= grid.cols || row >= grid.rows) return null;

  return { col, row };
}

// Complete example: clickable Minesweeper grid
function setupMinesweeperGrid(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): void {
  const grid: GridConfig = {
    offsetX: 40,
    offsetY: 60,
    cols: 10,
    rows: 10,
    cellSize: 32,
  };

  const revealed: boolean[][] = Array.from({ length: grid.rows }, () =>
    Array(grid.cols).fill(false)
  );

  let hoveredCell: { col: number; row: number } | null = null;

  function drawGrid(): void {
    ctx.clearRect(0, 0, canvas.width / (window.devicePixelRatio || 1),
                  canvas.height / (window.devicePixelRatio || 1));
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const x = grid.offsetX + col * grid.cellSize;
        const y = grid.offsetY + row * grid.cellSize;

        // Cell background
        const isHovered = hoveredCell?.col === col && hoveredCell?.row === row;
        if (revealed[row][col]) {
          ctx.fillStyle = "#2a2a3e";
        } else if (isHovered) {
          ctx.fillStyle = "#3a3a5e";
        } else {
          ctx.fillStyle = "#2a2a4e";
        }
        ctx.fillRect(x, y, grid.cellSize - 1, grid.cellSize - 1);

        // Cell border
        ctx.strokeStyle = "#444466";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, grid.cellSize - 1, grid.cellSize - 1);

        // Show coordinates in revealed cells
        if (revealed[row][col]) {
          ctx.fillStyle = "#888888";
          ctx.font = "10px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            `${col},${row}`,
            x + grid.cellSize / 2,
            y + grid.cellSize / 2
          );
        }
      }
    }
  }

  // Mouse move: highlight hovered cell
  canvas.addEventListener("mousemove", (event: MouseEvent) => {
    const { x, y } = canvasCoords(canvas, event);
    hoveredCell = gridCellFromCoords(x, y, grid);
    drawGrid();
  });

  // Click: reveal cell
  canvas.addEventListener("click", (event: MouseEvent) => {
    const { x, y } = canvasCoords(canvas, event);
    const cell = gridCellFromCoords(x, y, grid);
    if (cell) {
      revealed[cell.row][cell.col] = true;
      drawGrid();
    }
  });

  // Touch support
  canvas.addEventListener("touchstart", (event: TouchEvent) => {
    event.preventDefault();
    const touch = event.touches[0];
    const { x, y } = canvasCoords(canvas, touch);
    const cell = gridCellFromCoords(x, y, grid);
    if (cell) {
      revealed[cell.row][cell.col] = true;
      drawGrid();
    }
  });

  drawGrid();
}
```

## Visual Result

A 10x10 grid of dark cells appears, offset from the top-left corner. When the mouse hovers over a cell, that cell brightens to indicate it is being targeted. Clicking a cell reveals it, changing its background to a slightly different shade and displaying the cell's column and row coordinates (e.g., "3,5") in the center. The coordinate conversion ensures that clicks precisely match the visual grid cell, even if the browser window is resized, scrolled, or displayed on a high-DPI screen. Touch input on mobile devices works identically.

## Used In These Games

- **Minesweeper**: Click-to-reveal and right-click-to-flag both require converting mouse position to grid cell coordinates.
- **Sudoku**: Clicking a cell to select it for number input requires precise coordinate mapping to the 9x9 grid.
- **Chess / Checkers**: Selecting and moving pieces requires mapping clicks to board squares.
- **Connect Four**: Clicking a column to drop a token maps the X coordinate to a column index.
- **Tower Defense**: Placing towers on grid cells and clicking enemies both need coordinate conversion.
- **Whack-a-Mole**: Detecting which hole was clicked requires testing the click position against each hole's coordinates.

## Common Pitfalls

- **Using `event.offsetX/offsetY` directly**: These properties sometimes work but are unreliable when the canvas has CSS transforms, borders, or padding. Fix: always use `getBoundingClientRect()` with `clientX/clientY`.
- **Forgetting DPR scaling**: If you scaled the canvas buffer by `devicePixelRatio` but do not divide the converted coordinates by DPR, clicks are offset by that factor. Fix: include `/ dpr` in the conversion formula.
- **Not accounting for canvas CSS offset**: If the canvas has margin, padding, or is inside a scrollable container, the rect's `left` and `top` values account for this. Using `pageX` instead of `clientX` breaks when the page is scrolled. Fix: always use `clientX/clientY` with `getBoundingClientRect()`.
- **Integer vs. float cell indices**: `Math.floor(x / cellSize)` can return -0 or negative values for coordinates just outside the grid. Fix: always check that the result is within `[0, cols)` and `[0, rows)` before using it as an array index.
- **Touch events not prevented**: On mobile, touch events trigger both `touchstart` and a delayed `click`, causing double-processing. Fix: call `event.preventDefault()` in the touch handler.

## API Reference

- `canvas.getBoundingClientRect()` — Returns the canvas element's position and size relative to the viewport.
- `event.clientX` / `event.clientY` — Mouse/touch position relative to the viewport.
- `canvas.width` / `canvas.height` — The internal buffer dimensions (may differ from CSS display size).
- `window.devicePixelRatio` — The scaling factor between CSS pixels and physical pixels.
- `Math.floor(value)` — Rounds down to the nearest integer (for grid cell calculation).
