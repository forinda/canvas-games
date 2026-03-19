# Clipping

## What Is It?

Clipping restricts all subsequent drawing to a specific region of the canvas. You define a path (any shape -- rectangle, circle, polygon), call `clip()`, and from that point on, nothing draws outside that clipping region. Pixels that fall outside the clip are simply discarded. This lets you create masks, viewports, peek-through holes, and reveal effects without manually calculating which pixels to draw and which to skip.

The most intuitive example is Whack-a-Mole: each hole is a circular clipping region. You clip to the hole shape, then draw the mole moving upward. The parts of the mole that extend beyond the hole boundary are automatically hidden, creating the illusion that the mole is popping up from inside the hole. Without clipping, you would need to calculate exactly which portion of the mole sprite is visible at each frame -- a much harder problem.

Clipping is part of the canvas state, so it is saved and restored with `save()` and `restore()`. The critical pattern is: `save()`, define path, `clip()`, draw content, `restore()`. If you forget `restore()`, the clip persists and everything drawn afterward is constrained to that region. Clipping regions can be nested (each `clip()` intersects with the current clip), but they cannot be expanded without `restore()`.

## How It Works

```
Clipping lifecycle:
  1. save()          ← preserve current state
  2. beginPath()     ← define the clip shape
  3. arc() / rect()  ← any path commands
  4. clip()          ← activate the clip
  5. draw stuff      ← only pixels inside the clip appear
  6. restore()       ← remove the clip

Without clipping:         With circular clip:
┌──────────────┐          ┌──────────────┐
│  ┌────────┐  │          │     ╭──╮     │
│  │ MOLE   │  │          │   ╭─┤MO├─╮   │
│  │ IMAGE  │  │    →     │   │ │LE│ │   │
│  │        │  │          │   ╰─┤  ├─╯   │
│  └────────┘  │          │     ╰──╯     │  ← only mole inside
│   (hole)     │          │   (hole)     │     the circle shows
└──────────────┘          └──────────────┘

Nested clips = intersection:
  ┌──────┐
  │ Clip │   ╭────╮
  │  A   │ ∩ │Clip│  = only the overlapping region
  │      │   │ B  │
  └──────┘   ╰────╯
```

## Code Example

```typescript
// clipping.ts — Whack-a-Mole holes and viewport scrolling

interface MoleHole {
  x: number;
  y: number;
  radius: number;
  moleOffset: number; // -1 (fully hidden) to 1 (fully up)
}

function drawMoleInHole(
  ctx: CanvasRenderingContext2D,
  hole: MoleHole
): void {
  const { x, y, radius, moleOffset } = hole;

  // Draw the dark hole background
  ctx.fillStyle = "#1a0a00";
  ctx.beginPath();
  ctx.ellipse(x, y, radius, radius * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Clip to the hole shape so the mole is hidden outside it
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, radius, radius * 0.5, 0, 0, Math.PI * 2);
  ctx.clip();

  // Draw the mole (slides up based on moleOffset)
  const moleY = y + radius * (1 - moleOffset);
  const moleRadius = radius * 0.7;

  // Mole body
  ctx.fillStyle = "#8B4513";
  ctx.beginPath();
  ctx.arc(x, moleY, moleRadius, 0, Math.PI * 2);
  ctx.fill();

  // Mole face
  ctx.fillStyle = "#D2691E";
  ctx.beginPath();
  ctx.arc(x, moleY - moleRadius * 0.1, moleRadius * 0.7, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.arc(x - moleRadius * 0.25, moleY - moleRadius * 0.3, 3, 0, Math.PI * 2);
  ctx.arc(x + moleRadius * 0.25, moleY - moleRadius * 0.3, 3, 0, Math.PI * 2);
  ctx.fill();

  // Nose
  ctx.fillStyle = "#ff6688";
  ctx.beginPath();
  ctx.arc(x, moleY - moleRadius * 0.05, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore(); // removes the clip

  // Hole rim drawn ON TOP (after clip is removed)
  ctx.strokeStyle = "#3a2a00";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y, radius, radius * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();
}

// Viewport clipping for a scrollable game map
function drawScrollableMap(
  ctx: CanvasRenderingContext2D,
  viewportX: number,
  viewportY: number,
  viewportW: number,
  viewportH: number,
  scrollX: number,
  scrollY: number,
  drawMap: (ctx: CanvasRenderingContext2D) => void
): void {
  ctx.save();

  // Clip to viewport bounds
  ctx.beginPath();
  ctx.rect(viewportX, viewportY, viewportW, viewportH);
  ctx.clip();

  // Translate to scroll position within the clipped viewport
  ctx.translate(viewportX - scrollX, viewportY - scrollY);

  // Draw the full map; anything outside the viewport is clipped
  drawMap(ctx);

  ctx.restore();

  // Viewport border (drawn after clip is removed)
  ctx.strokeStyle = "#666666";
  ctx.lineWidth = 2;
  ctx.strokeRect(viewportX, viewportY, viewportW, viewportH);
}

// Reveal effect (circular wipe transition)
function drawCircularReveal(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  revealRadius: number,
  drawScene: (ctx: CanvasRenderingContext2D) => void
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, revealRadius, 0, Math.PI * 2);
  ctx.clip();
  drawScene(ctx);
  ctx.restore();
}
```

## Visual Result

Each Whack-a-Mole hole appears as a dark ellipse. When a mole pops up, its brown circular body rises from below the hole. The portion of the mole below the hole's elliptical boundary is invisible (clipped away), creating the convincing illusion that the mole is emerging from inside the hole. The hole rim is drawn after the clip is removed, so it overlaps the mole's edges cleanly. The scrollable map shows only the portion of the game world inside the viewport rectangle; content outside the viewport is invisible. The circular reveal shows the new scene expanding outward from a center point as the radius grows, like an iris wipe transition.

## Used In These Games

- **Whack-a-Mole**: Each hole clips the mole character so it appears to pop up from inside the ground. This is the primary visual mechanic.
- **Tower Defense**: The minimap viewport clips the overhead map view to a small rectangular region in the corner.
- **Pac-Man**: The maze viewport could use clipping to prevent drawing ghosts that have exited the visible area (optimization).
- **Platformer**: Side-scrolling games use viewport clipping to constrain the visible world to the screen bounds while the level extends beyond.
- **Card games (Memory Match)**: A card face clipping effect can reveal the card image as it "flips" by narrowing the clip width.

## Common Pitfalls

- **Forgetting `restore()` after `clip()`**: The clip persists indefinitely. Everything drawn after -- score, menus, overlays -- is constrained to the clip region. Fix: always wrap `clip()` in a `save()`/`restore()` pair.
- **Trying to expand a clip**: You cannot make a clip region larger; you can only intersect it with a new (smaller or overlapping) region. Fix: `restore()` to remove the current clip before defining a new, larger one.
- **Clipping without `beginPath()`**: If you add to an existing path and then `clip()`, you get the intersection of the old and new paths, which may not be what you expect. Fix: always call `beginPath()` before defining a clip shape.
- **Performance with many clips per frame**: Each `save()`/`clip()`/`restore()` cycle has overhead. Clipping 100 individual holes per frame is measurably slower than clipping a single combined path. Fix: combine multiple clip shapes into one path with multiple sub-paths before calling `clip()` once.

## API Reference

- `ctx.clip()` — Constrains all future drawing to the current path shape.
- `ctx.clip(fillRule)` — Clips using a fill rule: `"nonzero"` (default) or `"evenodd"`.
- `ctx.beginPath()` — Starts a new path for defining the clip shape.
- `ctx.rect(x, y, w, h)` — Adds a rectangle to the path (for rectangular clips).
- `ctx.arc(x, y, r, start, end)` — Adds a circle/arc to the path (for circular clips).
- `ctx.ellipse(x, y, rx, ry, rotation, start, end)` — Adds an ellipse to the path.
- `ctx.save()` — Saves the current clipping region (required before `clip()`).
- `ctx.restore()` — Restores the previous clipping region.
