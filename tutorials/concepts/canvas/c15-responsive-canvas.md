# Responsive Canvas

## What Is It?

A responsive canvas adapts to any screen size -- phones, tablets, laptops, ultrawide monitors -- without distortion, clipping, or wasted space. Games need this because players use wildly different devices. A Tetris grid designed for a 1920x1080 desktop should also work on a 375x667 phone screen. Without responsive handling, the game either overflows the screen (requiring scrolling, which ruins gameplay) or appears tiny in the center of a large display.

There are two main strategies. The first is **scaling to fit**: design the game at a fixed logical resolution (e.g., 800x600), then scale the canvas to fill the available space while maintaining the aspect ratio, adding letterbox bars on the sides or top/bottom if needed. The second is **fluid layout**: let the game dimensions adapt to the actual screen size, recalculating grid cell sizes, font sizes, and padding proportionally.

Both strategies must handle the `resize` event, which fires when the user changes the browser window size, rotates a mobile device, or toggles fullscreen. The resize handler must update the canvas dimensions, recalculate layout values, and redraw. Combined with the `devicePixelRatio` handling from the Canvas Setup concept, this gives you a game that looks sharp and fills the screen on every device.

## How It Works

```
Strategy 1: Scale to Fit (letterboxed)
  Design at fixed resolution, scale up/down to fill screen.

  Screen:  1920 x 1080 (16:9)          Screen:  375 x 667 (9:16)
  Game:     800 x  600 (4:3)           Game:    800 x 600 (4:3)

  ┌────┬────────────────┬────┐          ┌───────────────┐
  │    │                │    │          │               │
  │ ▓▓ │  Game scaled   │ ▓▓ │          │  Game scaled  │
  │    │  to fill       │    │          │  to fill      │
  │    │  height        │    │          │  width        │
  │    │                │    │          │               │
  └────┴────────────────┴────┘          ├───────────────┤
    ▓▓ = letterbox bars                 │ ▓▓▓▓▓▓▓▓▓▓▓▓ │
                                        └───────────────┘

Strategy 2: Fluid Layout
  Game grid adapts to actual screen dimensions.

  Desktop:                    Mobile:
  ┌──┬──┬──┬──┬──┬──┬──┐    ┌──┬──┬──┬──┬──┐
  │  │  │  │  │  │  │  │    │  │  │  │  │  │
  ├──┼──┼──┼──┼──┼──┼──┤    ├──┼──┼──┼──┼──┤
  │  │  │  │  │  │  │  │    │  │  │  │  │  │
  ├──┼──┼──┼──┼──┼──┼──┤    ├──┼──┼──┼──┼──┤
  │  │  │  │  │  │  │  │    │  │  │  │  │  │
  └──┴──┴──┴──┴──┴──┴──┘    ├──┼──┼──┼──┼──┤
   cells = 80px each          │  │  │  │  │  │
                              └──┴──┴──┴──┴──┘
                               cells = 64px each
```

## Code Example

```typescript
// responsive-canvas.ts — Responsive game grid that adapts to any screen

interface ResponsiveLayout {
  canvasWidth: number;
  canvasHeight: number;
  gridOffsetX: number;
  gridOffsetY: number;
  cellSize: number;
  cols: number;
  rows: number;
  fontSize: number;
  padding: number;
}

function calculateLayout(
  screenWidth: number,
  screenHeight: number,
  minCols: number,
  minRows: number
): ResponsiveLayout {
  const padding = Math.max(8, Math.min(20, screenWidth * 0.02));
  const hudHeight = 48;

  // Available space for the grid
  const availWidth = screenWidth - padding * 2;
  const availHeight = screenHeight - padding * 2 - hudHeight;

  // Calculate cell size to fit the grid in available space
  const cellFromWidth = Math.floor(availWidth / minCols);
  const cellFromHeight = Math.floor(availHeight / minRows);
  const cellSize = Math.max(20, Math.min(cellFromWidth, cellFromHeight, 80));

  // Actual grid dimensions
  const gridWidth = cellSize * minCols;
  const gridHeight = cellSize * minRows;

  // Center the grid
  const gridOffsetX = Math.floor((screenWidth - gridWidth) / 2);
  const gridOffsetY = hudHeight + Math.floor((availHeight - gridHeight) / 2) + padding;

  // Scale font size proportionally
  const fontSize = Math.max(10, Math.min(18, cellSize * 0.4));

  return {
    canvasWidth: screenWidth,
    canvasHeight: screenHeight,
    gridOffsetX,
    gridOffsetY,
    cellSize,
    cols: minCols,
    rows: minRows,
    fontSize,
    padding,
  };
}

function setupResponsiveCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number
): { getLayout: () => ResponsiveLayout } {
  let layout: ResponsiveLayout;

  function resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // Set canvas buffer size
    canvas.width = screenWidth * dpr;
    canvas.height = screenHeight * dpr;

    // Set CSS display size
    canvas.style.width = `${screenWidth}px`;
    canvas.style.height = `${screenHeight}px`;

    // Scale for DPR
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
    ctx.scale(dpr, dpr);

    // Recalculate layout
    layout = calculateLayout(screenWidth, screenHeight, cols, rows);
  }

  resize();
  window.addEventListener("resize", resize);

  return { getLayout: () => layout };
}

// Scale-to-fit strategy (letterboxed)
function setupScaleToFit(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  gameWidth: number,
  gameHeight: number
): { getScale: () => number; getOffset: () => { x: number; y: number } } {
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    canvas.width = screenWidth * dpr;
    canvas.height = screenHeight * dpr;
    canvas.style.width = `${screenWidth}px`;
    canvas.style.height = `${screenHeight}px`;

    // Calculate scale to fit game in screen
    const scaleX = screenWidth / gameWidth;
    const scaleY = screenHeight / gameHeight;
    scale = Math.min(scaleX, scaleY);

    // Center the game (letterbox offset)
    offsetX = (screenWidth - gameWidth * scale) / 2;
    offsetY = (screenHeight - gameHeight * scale) / 2;

    // Apply transform: DPR + scale + center offset
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
  }

  resize();
  window.addEventListener("resize", resize);

  return {
    getScale: () => scale,
    getOffset: () => ({ x: offsetX, y: offsetY }),
  };
}

// Drawing using the responsive layout
function drawResponsiveGrid(
  ctx: CanvasRenderingContext2D,
  layout: ResponsiveLayout,
  cells: number[][]
): void {
  const { gridOffsetX, gridOffsetY, cellSize, cols, rows, fontSize } = layout;

  // Clear
  ctx.fillStyle = "#0a0a1a";
  ctx.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight);

  // HUD (proportional sizing)
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, layout.canvasWidth, 48);
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${fontSize * 1.2}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("RESPONSIVE GRID", layout.canvasWidth / 2, 24);

  // Grid cells
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = gridOffsetX + col * cellSize;
      const y = gridOffsetY + row * cellSize;

      ctx.fillStyle = cells[row][col] ? "#335577" : "#1a2a3a";
      ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

      if (cells[row][col]) {
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          cells[row][col].toString(),
          x + cellSize / 2,
          y + cellSize / 2
        );
      }
    }
  }
}
```

## Visual Result

On a desktop monitor, the grid appears with large cells (up to 80px each) centered in the window, with comfortable padding around all edges. A proportionally-sized HUD bar spans the top. On a phone in portrait mode, the same grid shrinks its cells to fit the narrow width, the font size scales down accordingly, and the padding tightens. In landscape mode, the cells may be constrained by height instead. When using scale-to-fit mode, the entire game appears at its designed aspect ratio with black letterbox bars filling the remaining space on wider or taller screens. Resizing the window causes an immediate recalculation and redraw -- the grid smoothly adapts to the new dimensions.

## Used In These Games

- **Sudoku**: The 9x9 grid calculates cell size based on the smaller screen dimension, ensuring all 81 cells fit on any device from phone to desktop.
- **Minesweeper**: The grid adapts to screen size, with larger cells on desktop and smaller cells on mobile. Font size for mine count numbers scales with cell size.
- **2048**: The 4x4 tile grid scales proportionally with the screen, maintaining square tiles and scaling the number font size to match.
- **Tetris**: The playfield and next-piece preview scale to fit the screen height, with the side panel repositioning on narrow screens.
- **Tower Defense**: The game map uses a fixed aspect ratio with scale-to-fit, ensuring towers, paths, and the minimap are always visible and correctly positioned.
- **Snake**: The grid cell size adapts so the full playfield fits the screen, recalculating on resize to avoid clipping on small devices.
- **Breakout**: The brick grid, paddle width, and ball size all scale proportionally to the canvas width so the game plays consistently on any screen.
- **Pong**: The court, paddle dimensions, and ball size scale to fill the available window while maintaining the correct aspect ratio.
- **Flappy Bird**: Pipe gaps, bird size, and scroll speed scale relative to the screen height so difficulty remains consistent across devices.
- **City Builder**: The city grid cell size and UI panel widths adapt to the screen, with panels collapsing on mobile to maximize the visible map area.
- **Sokoban**: The puzzle grid scales to fit the screen, centering the level and adjusting wall and crate sizes proportionally.
- **Card Battle**: Card dimensions and hand layout reflow based on screen width, showing fewer cards per row on narrow screens.
- **All 50 games**: Every game handles window resize and DPR changes to maintain usability and sharp rendering across devices.

## Common Pitfalls

- **Not resetting transforms before recalculating**: When the resize handler fires, the context still has the old DPR scale and offsets. Calling `ctx.scale(dpr, dpr)` again compounds the scaling. Fix: call `ctx.setTransform(1, 0, 0, 1, 0, 0)` to reset to the identity matrix before applying new transforms.
- **Layout thrashing on resize**: Resize events fire rapidly during window dragging. Recalculating layout and redrawing on every event can cause jank. Fix: debounce the resize handler, or only update layout and let the next animation frame handle the redraw.
- **Hardcoded pixel values**: Using `ctx.font = "24px monospace"` looks good at 1080p but is too large on a phone and too small on a 4K display. Fix: derive font sizes, padding, and spacing from the calculated cell size or screen dimensions.
- **Aspect ratio distortion**: Scaling width and height by different factors stretches the game. Fix: use a single scale factor (the minimum of X and Y scales) and center the result with letterbox bars.
- **Forgetting to update click coordinate conversion**: If the canvas scale or offset changes on resize, the mouse-to-canvas conversion must use the new values. Fix: recalculate conversion parameters in the resize handler, or compute them fresh from `getBoundingClientRect()` on each event.

## API Reference

- `window.addEventListener('resize', handler)` — Fires when the browser window changes size.
- `window.innerWidth` / `window.innerHeight` — The viewport dimensions in CSS pixels.
- `ctx.setTransform(a, b, c, d, e, f)` — Replaces the current transform matrix (use to reset before reapplying).
- `ctx.scale(sx, sy)` — Scales the coordinate system (used for DPR and game scaling).
- `ctx.translate(tx, ty)` — Offsets the origin (used for letterbox centering).
- `canvas.width` / `canvas.height` — Sets the internal buffer size.
- `canvas.style.width` / `canvas.style.height` — Sets the CSS display size.
- `Math.min(a, b)` — Used to determine the constraining dimension for aspect-ratio-preserving scaling.
