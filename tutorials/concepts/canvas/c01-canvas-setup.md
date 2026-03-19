# Canvas Setup

## What Is It?

Every game in this arcade begins the same way: grab a `<canvas>` element from the DOM, request a 2D drawing context, and size the canvas so it fills the available space with crisp, pixel-perfect rendering. This is the foundation that every other concept builds on. Without a properly configured canvas, your shapes will be blurry, your coordinates will be wrong, and your game will look broken on high-DPI screens.

The setup step also includes listening for window resize events so the game can adapt when the browser window changes size or orientation. On modern devices, `window.devicePixelRatio` is often 2 or even 3, meaning the physical screen has 2-3x more pixels than CSS pixels. If you only set the canvas dimensions to the CSS size, the browser stretches your drawing to fill the physical pixels, producing a blurry result. The fix is to set the internal canvas buffer to the physical pixel count and use CSS to scale it back down visually.

This concept is so fundamental that every single one of the 50 games in the arcade performs this initialization in some form. Get it right once, and you have a reliable canvas for everything that follows.

## How It Works

The process has four steps:

```
1. Query the DOM for the <canvas> element
2. Call canvas.getContext('2d') to get the drawing API
3. Set canvas.width / canvas.height to physical pixels
4. Use CSS width/height to display at logical size

Physical pixels = CSS pixels * devicePixelRatio

+---------------------+
| Browser Window      |
|  +-----------+      |
|  | <canvas>  |      |  CSS size: 800 x 600
|  |           |      |  Buffer:  1600 x 1200 (on 2x display)
|  +-----------+      |
+---------------------+
```

The `getContext('2d')` call returns a `CanvasRenderingContext2D` object. This is the single object you use for all drawing operations -- rectangles, arcs, text, images, transforms, and everything else. If the call fails (rare, but possible on very old hardware), it returns `null`.

After setting the buffer size, you scale the context by `devicePixelRatio` so that all your drawing code can work in logical (CSS) pixel units. Without this scale call, a `fillRect(0, 0, 100, 100)` would only cover a quarter of the intended area on a 2x display.

## Code Example

```typescript
// canvas-setup.ts — Full initialization used by every game

function initCanvas(): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
} {
  const canvas = document.getElementById("game") as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element with id "game" not found');
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get 2D rendering context");
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;

    // Set the internal buffer to physical pixel count
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;

    // Set CSS display size to logical pixel count
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    // Scale context so drawing uses logical pixels
    ctx.scale(dpr, dpr);
  }

  // Initial sizing
  resize();

  // Re-run on window resize or orientation change
  window.addEventListener("resize", resize);

  return {
    canvas,
    ctx,
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

// Usage in any game:
const { canvas, ctx, width, height } = initCanvas();
ctx.fillStyle = "#1a1a2e";
ctx.fillRect(0, 0, width, height);
```

## Visual Result

The code produces a full-window canvas element with a dark navy background. On a standard display (1x DPI), a 1920x1080 window creates a 1920x1080 buffer. On a Retina/HiDPI display (2x), the same window creates a 3840x2160 buffer, but all drawing commands still use the familiar 1920x1080 coordinate space. Text, lines, and shapes appear razor-sharp on both displays. When the user resizes the browser window, the canvas immediately adjusts to fill the new dimensions.

## Used In These Games

- **Pong**: Sets up a fullscreen dark canvas that serves as the court, then draws paddles and ball on top.
- **Tetris**: Initializes a canvas sized to fit the Tetris grid, with the DPI correction ensuring the block edges are crisp.
- **Asteroids**: Uses the full window canvas so the ship can fly anywhere; resize handling ensures the play area adjusts when the window changes.
- **All 50 games**: Every single game calls some variant of this setup routine before any rendering begins.

## Common Pitfalls

- **Forgetting devicePixelRatio**: The canvas looks blurry on phones, tablets, and Retina Macs. Fix: always multiply canvas.width/height by `devicePixelRatio` and call `ctx.scale(dpr, dpr)`.
- **Setting canvas size via CSS only**: Setting `canvas.style.width = '800px'` does not change the drawing buffer. The canvas still has its default 300x150 buffer, stretched to 800px. Fix: always set `canvas.width` and `canvas.height` attributes directly.
- **Not re-scaling after resize**: When you change `canvas.width` or `canvas.height`, the context resets entirely (transforms, styles, everything). Fix: re-apply `ctx.scale(dpr, dpr)` inside the resize handler.
- **Calling getContext twice with different arguments**: The first call locks the context type. A second call with different options returns `null`. Fix: call `getContext('2d')` exactly once and store the result.

## API Reference

- `document.getElementById(id)` — Retrieves the canvas element from the DOM.
- `canvas.getContext('2d')` — Returns the 2D rendering context for drawing.
- `canvas.width` / `canvas.height` — Sets the internal drawing buffer size in pixels.
- `canvas.style.width` / `canvas.style.height` — Sets the CSS display size.
- `window.devicePixelRatio` — Returns the ratio of physical to logical pixels.
- `ctx.scale(x, y)` — Scales all subsequent drawing operations.
- `window.addEventListener('resize', handler)` — Listens for window size changes.
