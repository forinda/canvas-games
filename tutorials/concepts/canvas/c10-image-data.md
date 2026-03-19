# Image Data (Pixel Manipulation)

## What Is It?

Most Canvas drawing uses high-level methods like `fillRect` and `arc`. But sometimes you need to work at the pixel level -- reading, modifying, or writing individual pixels directly. The `ImageData` API gives you a raw `Uint8ClampedArray` where every four consecutive bytes represent one pixel's red, green, blue, and alpha channels. This is the lowest-level drawing API the canvas offers, and it is the only way to achieve effects like per-pixel physics simulations, custom filters, and procedural textures.

The Particle Sand game is the primary example: each cell in the simulation grid maps directly to a pixel (or small block of pixels) on the canvas. Instead of calling `fillRect` tens of thousands of times per frame (which is slow), you write each cell's color directly into an `ImageData` buffer and then paint the entire buffer to the canvas in a single `putImageData` call. This is dramatically faster for dense, per-pixel rendering.

You can also use `getImageData` to read existing pixels from the canvas -- useful for collision detection based on pixel color, screen capture, or applying post-processing effects like blur or color shifting to the entire rendered frame.

## How It Works

```
ImageData structure:
  const imageData = ctx.createImageData(width, height)
  const pixels = imageData.data  // Uint8ClampedArray

  Every 4 bytes = 1 pixel:
  pixels[0] = R    pixels[1] = G    pixels[2] = B    pixels[3] = A
  pixels[4] = R    pixels[5] = G    pixels[6] = B    pixels[7] = A
  ...

  Pixel at (x, y):
  index = (y * width + x) * 4
  pixels[index + 0] = red    (0-255)
  pixels[index + 1] = green  (0-255)
  pixels[index + 2] = blue   (0-255)
  pixels[index + 3] = alpha  (0-255)

  Three operations:
  createImageData(w, h)     → new blank buffer (all transparent black)
  putImageData(data, x, y)  → write buffer to canvas
  getImageData(x, y, w, h)  → read pixels from canvas into buffer

  Memory layout for a 4x3 image:
  Row 0: [R,G,B,A] [R,G,B,A] [R,G,B,A] [R,G,B,A]
  Row 1: [R,G,B,A] [R,G,B,A] [R,G,B,A] [R,G,B,A]
  Row 2: [R,G,B,A] [R,G,B,A] [R,G,B,A] [R,G,B,A]
  Total bytes = 4 * 3 * 4 = 48
```

## Code Example

```typescript
// image-data.ts — Particle Sand rendering and procedural starfield

interface SandGrid {
  width: number;
  height: number;
  cells: Uint8Array; // 0 = empty, 1 = sand, 2 = water, 3 = stone
}

const CELL_COLORS: Record<number, [number, number, number]> = {
  0: [10, 10, 20],      // empty (dark background)
  1: [220, 180, 80],    // sand (golden)
  2: [40, 80, 200],     // water (blue)
  3: [120, 120, 120],   // stone (gray)
};

function renderSandGrid(
  ctx: CanvasRenderingContext2D,
  grid: SandGrid,
  scale: number // pixels per cell (e.g., 4 means each cell = 4x4 pixels)
): void {
  const displayW = grid.width * scale;
  const displayH = grid.height * scale;
  const imageData = ctx.createImageData(displayW, displayH);
  const pixels = imageData.data;

  for (let gy = 0; gy < grid.height; gy++) {
    for (let gx = 0; gx < grid.width; gx++) {
      const cellType = grid.cells[gy * grid.width + gx];
      const [r, g, b] = CELL_COLORS[cellType] ?? [0, 0, 0];

      // Add slight noise for visual texture
      const noise = Math.floor(Math.random() * 15) - 7;

      // Fill a scale x scale block for each cell
      for (let py = 0; py < scale; py++) {
        for (let px = 0; px < scale; px++) {
          const screenX = gx * scale + px;
          const screenY = gy * scale + py;
          const idx = (screenY * displayW + screenX) * 4;

          pixels[idx + 0] = Math.min(255, Math.max(0, r + noise));
          pixels[idx + 1] = Math.min(255, Math.max(0, g + noise));
          pixels[idx + 2] = Math.min(255, Math.max(0, b + noise));
          pixels[idx + 3] = 255; // fully opaque
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

// Procedural starfield background using ImageData
function renderStarfield(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  starDensity: number // 0 to 1
): void {
  const imageData = ctx.createImageData(width, height);
  const pixels = imageData.data;

  // Fill with dark space
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i + 0] = 5;   // R
    pixels[i + 1] = 5;   // G
    pixels[i + 2] = 15;  // B
    pixels[i + 3] = 255; // A
  }

  // Scatter stars
  const numStars = Math.floor(width * height * starDensity * 0.001);
  for (let s = 0; s < numStars; s++) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    const brightness = 150 + Math.floor(Math.random() * 105);
    const idx = (y * width + x) * 4;

    pixels[idx + 0] = brightness;
    pixels[idx + 1] = brightness;
    pixels[idx + 2] = brightness + Math.floor(Math.random() * 30);
    pixels[idx + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
}

// Reading pixels for color-based collision
function getPixelColor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): { r: number; g: number; b: number; a: number } {
  const imageData = ctx.getImageData(x, y, 1, 1);
  const [r, g, b, a] = imageData.data;
  return { r, g, b, a };
}
```

## Visual Result

The sand simulation renders as a grid where each cell appears as a small colored block: golden-yellow for sand particles, blue for water, gray for stone, and near-black for empty space. Each cell has slight random color variation that gives the surface a natural, grainy texture rather than flat solid colors. The starfield renders as a dark navy background scattered with bright white and slightly blue-tinted pixels of varying brightness, creating a convincing deep-space backdrop. Both effects render the entire scene in a single `putImageData` call, making them very efficient despite covering every pixel.

## Used In These Games

- **Particle Sand**: The entire rendering system uses `ImageData`. Each simulation cell maps to a block of pixels in the buffer. This is the only practical way to render tens of thousands of particles at 60fps.
- **Asteroids / Space Invaders**: The starfield background is generated procedurally using per-pixel writes into an `ImageData` buffer.
- **Game of Life**: Each cell (alive or dead) maps to a pixel or small block, rendered via `putImageData` for bulk efficiency.
- **Any pixel-art style game**: When rendering at a low resolution and scaling up, `ImageData` gives direct control over every pixel.

## Common Pitfalls

- **Slow per-pixel loops in JavaScript**: Iterating over every pixel in a large canvas (e.g., 1920x1080 = 2 million pixels, 8 million array accesses) takes time. Fix: minimize the canvas size for pixel operations (render at a lower resolution, then scale up with CSS or `drawImage`).
- **`getImageData` is expensive**: It forces the GPU to sync with the CPU and copies pixel data. Calling it every frame or multiple times per frame kills performance. Fix: cache the result, minimize the read region, or avoid reading pixels when possible.
- **CORS restrictions on `getImageData`**: If you draw an image from another domain onto the canvas, `getImageData` throws a security error (tainted canvas). Fix: serve images from the same origin or configure CORS headers.
- **Forgetting alpha channel**: `createImageData` initializes all bytes to 0, including alpha. If you set RGB but forget to set alpha to 255, your pixels are fully transparent and invisible. Fix: always set `pixels[idx + 3] = 255` for opaque pixels.
- **Off-by-one in index calculation**: The formula `(y * width + x) * 4` uses the `ImageData` width, not the canvas width. If they differ, pixels end up in wrong positions. Fix: always use `imageData.width` for index calculations.

## API Reference

- `ctx.createImageData(width, height)` — Creates a new blank `ImageData` buffer (all pixels transparent black).
- `ctx.putImageData(imageData, dx, dy)` — Writes the buffer directly to the canvas at position (dx, dy).
- `ctx.getImageData(sx, sy, sw, sh)` — Reads pixels from the canvas into a new `ImageData` buffer.
- `imageData.data` — The `Uint8ClampedArray` containing pixel data (RGBA, 4 bytes per pixel).
- `imageData.width` — The width of the image data in pixels.
- `imageData.height` — The height of the image data in pixels.
