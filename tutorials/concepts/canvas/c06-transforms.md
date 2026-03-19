# Transforms

## What Is It?

Transforms let you move, rotate, and scale the entire coordinate system of the canvas rather than recalculating the position of every point in a shape. Instead of figuring out the rotated coordinates of every vertex of a spaceship, you translate to the ship's center, rotate the context by the ship's heading angle, and then draw the ship as if it were facing right at the origin. The canvas applies the rotation for you.

The three core transforms are `translate(x, y)`, `rotate(angle)`, and `scale(sx, sy)`. These compound on each other: if you translate by (100, 100) and then rotate by 45 degrees, the rotation happens around the point (100, 100). This is exactly what you want for game objects -- translate to the object's position, rotate to its orientation, then draw it at the local origin.

The catch is that transforms are persistent and cumulative. If you rotate and never undo it, everything drawn afterward is also rotated. The `save()` and `restore()` methods manage this by pushing and popping the entire drawing state (transforms, styles, clipping) onto a stack. The pattern is always: `save()` before changing transforms, draw your object, then `restore()` to revert to the previous state. This is the backbone of how every game draws independently-positioned, independently-rotated objects.

## How It Works

```
Transform stack:
  save()     → push current state onto stack
  translate() → shift the origin
  rotate()    → rotate the coordinate system
  scale()     → scale the coordinate system
  restore()  → pop state from stack (undo all changes since save)

Rotation pivot:
  Without translate:            With translate:
  Rotates around (0,0)          Rotates around (cx,cy)

  ┌──────────┐                  ┌──────────┐
  │ ╲        │                  │          │
  │  ╲ ← rotated around        │    ↻     │ ← rotated around
  │   ╲  top-left               │  (cx,cy) │    object center
  └──────────┘                  └──────────┘

  The correct pattern:
  1. save()
  2. translate(cx, cy)    ← move origin to object center
  3. rotate(angle)        ← rotate around new origin
  4. draw shape centered at (0, 0)
  5. restore()
```

Transforms affect everything drawn after them: shapes, text, images, even other transform calls. They do NOT affect previously drawn content. The canvas is like a painting -- once pixels are on it, they stay where they are.

## Code Example

```typescript
// transforms.ts — Rotating spaceship and spinning Tetris piece

function drawSpaceship(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number, // radians, 0 = pointing right
  size: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Draw ship pointing right, centered at origin
  ctx.fillStyle = "#00ff88";
  ctx.beginPath();
  ctx.moveTo(size, 0);              // nose (right)
  ctx.lineTo(-size * 0.7, -size * 0.5); // top-left wing
  ctx.lineTo(-size * 0.4, 0);           // rear indent
  ctx.lineTo(-size * 0.7, size * 0.5);  // bottom-left wing
  ctx.closePath();
  ctx.fill();

  // Thruster flame (flickers based on time)
  const flicker = 0.7 + Math.random() * 0.3;
  ctx.fillStyle = "rgba(255, 150, 0, 0.8)";
  ctx.beginPath();
  ctx.moveTo(-size * 0.4, -size * 0.15);
  ctx.lineTo(-size * 0.4 - size * 0.5 * flicker, 0);
  ctx.lineTo(-size * 0.4, size * 0.15);
  ctx.closePath();
  ctx.fill();

  ctx.restore(); // Back to world coordinates
}

function drawTetrisPiece(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  rotation: number, // 0, PI/2, PI, or 3PI/2
  blocks: [number, number][] // relative cell positions
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  // Draw each block of the piece centered around origin
  ctx.fillStyle = "#00ccff";
  ctx.strokeStyle = "#008899";
  ctx.lineWidth = 2;

  for (const [bx, by] of blocks) {
    const drawX = (bx - 0.5) * cellSize;
    const drawY = (by - 0.5) * cellSize;
    ctx.fillRect(drawX, drawY, cellSize - 1, cellSize - 1);
    ctx.strokeRect(drawX, drawY, cellSize - 1, cellSize - 1);
  }

  ctx.restore();
}

// Nested transforms: a turret on a tank
function drawTank(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bodyAngle: number,
  turretAngle: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(bodyAngle);

  // Tank body
  ctx.fillStyle = "#556b2f";
  ctx.fillRect(-25, -15, 50, 30);

  // Turret (rotates independently on top of body)
  ctx.save(); // nested save
  ctx.rotate(turretAngle - bodyAngle); // turret has its own angle
  ctx.fillStyle = "#6b8e23";
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(0, -3, 30, 6); // barrel
  ctx.restore(); // back to body transform

  ctx.restore(); // back to world transform
}

// Usage in game loop
function render(ctx: CanvasRenderingContext2D, time: number): void {
  const shipAngle = time * 0.001; // slow rotation
  drawSpaceship(ctx, 400, 300, shipAngle, 20);

  // T-piece in Tetris
  const tBlocks: [number, number][] = [[0, 0], [1, 0], [2, 0], [1, 1]];
  drawTetrisPiece(ctx, 200, 200, 30, Math.PI / 2, tBlocks);
}
```

## Visual Result

The spaceship appears as a green arrow-like polygon pointing in the direction of its angle, with a flickering orange thruster flame at the rear. As the angle changes each frame, the entire ship rotates smoothly around its center point. The Tetris T-piece appears as four cyan blocks arranged in a T-shape, rotated 90 degrees clockwise. The tank shows a dark green rectangular body rotated to its heading, with an olive-green circular turret on top that can rotate independently to aim at a target. All rotations happen around the objects' own centers, not the canvas corner.

## Used In These Games

- **Asteroids**: The player ship rotates freely using `translate` + `rotate`. Asteroid shapes also rotate slowly for visual flair.
- **Racing**: The player car and AI cars rotate to match their heading direction on the track using `translate` + `rotate`.
- **Top-Down Shooter**: The player character rotates to face the mouse cursor. Bullets are drawn at the aim angle using rotation transforms.
- **Color Switch**: The rotating gate obstacles spin continuously using `translate` to the gate center and `rotate` by an increasing angle each frame.
- **Golf**: The aim line rotates around the ball position to show the shot direction, using `translate` + `rotate` before drawing the line.
- **Tower Defense**: Tower turrets rotate to face incoming enemies using nested transforms (tower position + turret angle).
- **Tetris**: Pieces rotate in 90-degree increments. The transform system handles drawing each rotation state cleanly.
- **Fruit Ninja**: Sliced fruit halves rotate as they fly apart, each half using `translate` + `rotate` with increasing angular velocity.
- **Pac-Man**: Pac-Man's facing direction is handled by rotating the drawing context before drawing the arc-based mouth.
- **Zombie Survival**: The player character rotates to face the nearest zombie or the mouse aim direction.
- **Ant Colony**: Individual ants rotate to face their movement direction as they navigate between the colony and food sources.
- **Helicopter**: The helicopter rotor blades spin using rotation transforms centered on the rotor hub.

## Common Pitfalls

- **Forgetting `restore()`**: Without `restore()`, every subsequent draw call is affected by the transform. Objects stack rotations and translations, flying off screen. Fix: always pair `save()` with `restore()`. Use a try/finally block in complex code.
- **Rotating around the wrong point**: Calling `rotate()` before `translate()` rotates around (0,0) -- the top-left corner. Fix: always `translate()` to the object's center first, then `rotate()`.
- **Scaling text unintentionally**: If you `scale(2, 2)` to zoom in, text drawn afterward is also scaled and may look blurry. Fix: `restore()` before drawing text, or adjust font size manually instead of using scale.
- **Transform order matters**: `translate` then `rotate` is different from `rotate` then `translate`. In the second case, the translation direction is rotated. Fix: for object rendering, always translate first, then rotate.

## API Reference

- `ctx.save()` — Pushes the current drawing state (transforms, styles, clip) onto a stack.
- `ctx.restore()` — Pops the most recently saved state from the stack.
- `ctx.translate(x, y)` — Shifts the origin of the coordinate system.
- `ctx.rotate(angle)` — Rotates the coordinate system clockwise by the given angle in radians.
- `ctx.scale(sx, sy)` — Scales the coordinate system. Negative values mirror/flip.
- `ctx.setTransform(a, b, c, d, e, f)` — Replaces the current transform matrix directly.
- `ctx.resetTransform()` — Resets the transform to the identity matrix.
