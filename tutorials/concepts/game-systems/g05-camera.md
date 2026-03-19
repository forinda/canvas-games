# Camera System

## What Is It?

A camera system controls which part of a large game world is visible on the screen. Think of it as a window sliding over a painting: the painting (world) is bigger than the window (viewport), and the camera determines which portion you see. When the player moves right, the camera follows, revealing new terrain while hiding what is behind.

Without a camera, every game object would need to fit within the canvas dimensions. With one, you can build worlds many times larger than the screen.

## How It Works

```
Core idea:
  screenX = worldX - camera.x
  screenY = worldY - camera.y

The camera position defines the top-left corner of the viewport in world space.

Smooth follow with lerp (linear interpolation):
  camera.x += (target.x - camera.x) * lerpFactor * dt
  camera.y += (target.y - camera.y) * lerpFactor * dt

  lerpFactor:
    0.01 - 0.03  very lazy, cinematic
    0.05 - 0.10  smooth game camera
    0.20 - 1.00  snappy, nearly instant

Clamping to world bounds:
  camera.x = clamp(camera.x, 0, worldWidth - viewportWidth)
  camera.y = clamp(camera.y, 0, worldHeight - viewportHeight)
```

ASCII diagram:

```
  World:
  ┌──────────────────────────────────┐
  │                                  │
  │     ┌──────────────┐             │
  │     │  Viewport    │             │
  │     │    (camera)  │             │
  │     │       P ←player            │
  │     └──────────────┘             │
  │                                  │
  └──────────────────────────────────┘
```

## Code Example

```typescript
interface Camera {
  x: number;
  y: number;
  width: number;   // viewport width
  height: number;  // viewport height
}

interface WorldBounds {
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function updateCamera(
  cam: Camera,
  targetX: number,
  targetY: number,
  world: WorldBounds,
  dt: number
): void {
  // Center camera on target
  const desiredX = targetX - cam.width / 2;
  const desiredY = targetY - cam.height / 2;

  // Smooth follow (lerp)
  const lerpSpeed = 5.0; // higher = snappier
  cam.x += (desiredX - cam.x) * lerpSpeed * dt;
  cam.y += (desiredY - cam.y) * lerpSpeed * dt;

  // Clamp to world bounds so we never show outside the map
  cam.x = clamp(cam.x, 0, world.width - cam.width);
  cam.y = clamp(cam.y, 0, world.height - cam.height);
}

function worldToScreen(worldX: number, worldY: number, cam: Camera) {
  return { x: worldX - cam.x, y: worldY - cam.y };
}

// Usage in render
function render(ctx: CanvasRenderingContext2D, cam: Camera): void {
  ctx.save();
  ctx.translate(-cam.x, -cam.y); // shift everything by camera offset
  // Draw world objects at their world positions...
  // drawPlayer(player.x, player.y);
  // drawPlatforms(platforms);
  ctx.restore();
  // Draw HUD at screen positions (no camera offset)
}

const camera: Camera = { x: 0, y: 0, width: 800, height: 600 };
const world: WorldBounds = { width: 3200, height: 600 };
updateCamera(camera, 1600, 300, world, 1 / 60);
```

## Used In These Games

- **Platformer**: The `CameraSystem` in `src/games/platformer/systems/CameraSystem.ts` follows the player horizontally and vertically with smooth interpolation, clamped to level bounds.
- **City Builder**: The camera pans across the city grid when the player drags or uses edge scrolling, revealing different parts of the map.
- **Tower Defense**: The camera may be fixed (single-screen map) or pannable for larger maps. UI elements like the build menu are drawn in screen space, not world space.

## Common Pitfalls

- **Drawing HUD with camera offset**: If you draw the score text at world position (100, 50) with the camera applied, it scrolls off-screen. Draw HUD elements after `ctx.restore()`, in screen space.
- **Lerp factor not scaled by dt**: Using `cam.x += (target - cam.x) * 0.1` without `* dt` makes the camera speed frame-rate dependent. At 120 fps the camera is twice as snappy as at 60 fps.
- **Not clamping to world edges**: Without clamping, the camera can reveal empty space beyond the map boundaries, which looks broken.
- **Forgetting to transform mouse input**: If the camera has scrolled, a click at screen position (200, 300) corresponds to world position (200 + cam.x, 300 + cam.y). Forgetting this offset makes click targets misaligned.
