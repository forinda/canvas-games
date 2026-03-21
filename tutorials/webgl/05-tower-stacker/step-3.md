# Step 3: Camera Follow & Scoring

**Goal:** Add smooth camera follow that tracks the tower height, HSL-based rainbow colors, perfect streak tracking, and game registration.

**Time:** ~15 minutes

---

## What You'll Build

- **Smooth camera Y-follow** — camera rises as the tower grows, always keeping the action in frame
- **HSL color gradient** — each block gets a unique hue based on its stack position
- **Perfect streak tracking** — consecutive perfect placements are counted
- **Fixed-angle camera** — looking at the tower from a fixed angle (no orbital camera)
- **Game registration** with tap-based touch layout

---

## Concepts

- **Camera Follow with Lerp**: The camera has a `targetCameraY` that jumps to `topBlock.y + 5` on each drop. The actual `cameraY` interpolates toward it: `cameraY += (target - cameraY) * 2 * dt`. This creates a smooth rise instead of a jarring jump.

- **HSL to RGB**: Instead of hardcoded colors, each block's hue is `(level * 37) % 360`. The `* 37` is a prime multiplier that ensures adjacent blocks have very different hues (no two neighbors are similar). HSL with fixed saturation/lightness creates a pleasant rainbow.

- **Fixed Camera Angle**: Unlike previous games with orbital cameras, Tower Stacker uses `Mat4.lookAt` from a fixed angle `(6, cameraY, 6)` looking at `(0, cameraY - 3, 0)`. The camera only moves vertically, keeping the isometric perspective stable.

---

## Code

### 3.1 — Smooth Camera Follow

```typescript
private cameraY = 5;
private targetCameraY = 5;

// In update():
this.cameraY += (this.targetCameraY - this.cameraY) * 2 * dt;

// After each successful drop (in handleDrop):
const newTop = s.stack[s.stack.length - 1];
this.targetCameraY = newTop.y + 5;

// In render():
const camX = 6;
const camZ = 6;

Mat4.lookAt(this.viewMatrix,
    [camX, this.cameraY, camZ],
    [0, this.cameraY - 3, 0],
    [0, 1, 0]
);
```

**What's happening:**
- `this.cameraY += (target - cameraY) * 2 * dt` — at 60fps, this moves about 3% of the remaining distance per frame. The camera smoothly "catches up" to the tower top.
- The camera looks at `(0, cameraY - 3, 0)` — slightly below its own Y position. This tilts the view downward, showing both the tower top and the approaching swinging block.
- `camX = camZ = 6` places the camera at a 45-degree isometric angle, giving a clear view of both X and Z swing axes.
- `targetCameraY = newTop.y + 5` keeps 5 units of headroom above the tower top, enough to see the swinging block and a few stacked blocks below.

---

### 3.2 — HSL to RGB Color Conversion

```typescript
private levelColor(level: number): { r: number; g: number; b: number } {
    const hue = (level * 37) % 360;
    const s = 0.6;   // saturation
    const l = 0.55;  // lightness

    // HSL to RGB conversion
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;

    if (hue < 60)       { r = c; g = x; }
    else if (hue < 120) { r = x; g = c; }
    else if (hue < 180) { g = c; b = x; }
    else if (hue < 240) { g = x; b = c; }
    else if (hue < 300) { r = x; b = c; }
    else                { r = c; b = x; }

    return { r: r + m, g: g + m, b: b + m };
}
```

**What's happening:**
- `hue = (level * 37) % 360` — the prime multiplier 37 ensures blocks cycle through the color wheel with large hue jumps. Block 0 = 0 (red), Block 1 = 37 (orange-yellow), Block 2 = 74 (yellow-green), etc.
- `s = 0.6, l = 0.55` gives saturated but not garish colors. Lightness 0.55 (slightly above mid) looks good with the Blinn-Phong lighting.
- The standard HSL-to-RGB algorithm divides the hue wheel into 6 sectors of 60 degrees each, computing the two non-zero components differently in each sector.
- `+ m` shifts all channels up by the lightness offset, converting from the "chroma" space to actual RGB.

---

### 3.3 — Perfect Streak and Game State

```typescript
// In handleDrop, after perfect detection:
if (isPerfect) {
    s.perfectStreak++;
    // Keep full width — placed at top block's position
    s.stack.push({
        x: top.x, z: s.currentZ,
        w: s.currentW, d: s.currentD,
        y: newY, ...color,
    });
} else {
    s.perfectStreak = 0;
    // ... slicing logic ...
}

// After placing:
s.score++;
s.swingOnX = !s.swingOnX;
s.swingPos = -SWING_RANGE;  // reset to left/back
s.swingSpeed = Math.min(SWING_SPEED_MAX, s.swingSpeed + SWING_SPEED_INC);
```

**What's happening:**
- `perfectStreak` counts consecutive perfect placements. This could be used for bonus scoring or visual effects (not yet implemented in the base game, but a natural extension).
- On perfect: the block keeps its full `currentW/currentD` and is positioned at the previous top's center (`top.x`), not the swing position. This auto-corrects small misalignments.
- `swingPos = -SWING_RANGE` always resets to the left/back edge, giving the player a consistent starting position for the next drop.
- `swingSpeed` increases by `SWING_SPEED_INC = 0.15` per drop, making timing progressively harder.

---

### 3.4 — Game Registration

**File:** `src/contexts/webgl/games/tower-stacker/index.ts`

```typescript
export const TowerStackerGame: GameDefinition = {
    id: "tower-stacker",
    name: "Tower Stacker",
    description: "Time your drops, stack high!",
    icon: "🏗️",
    color: "#ff6f00",
    category: "3d",
    renderContext: "webgl",
    touchLayout: "flap",
    help: {
        goal: "Stack blocks by timing your drop. How high can you go?",
        controls: [
            { key: "Space / Tap", action: "Drop block" },
            { key: "ESC", action: "Exit to menu" },
        ],
        tips: [
            "Perfect placements keep the full block width",
            "The block swings faster as you go higher",
            "Tap to restart after game over",
        ],
    },
    create(canvas, onExit) {
        const engine = new TowerStackerEngine(canvas, onExit);
        engine.start();
        return engine;
    },
};
```

**What's happening:**
- `touchLayout: "flap"` provides a simple full-screen tap zone — ideal for a one-button game. No directional controls needed.
- Touch support is also added directly: the engine listens for `touchstart` on the canvas and calls `handleDrop()`, providing native mobile support alongside the touch layout system.

---

## Test It

```bash
pnpm dev
```

1. Stack blocks — each should have a **different color** (rainbow progression)
2. The **camera** should smoothly rise as the tower grows
3. Make several **perfect placements** in a row — blocks should keep full width
4. Stack high enough for the **swing speed** to become challenging
5. **Game over** then **Space/tap** to restart — camera should reset to bottom
6. On mobile, **tap anywhere** to drop

---

## Challenges

**Easy:**
- Change the HSL multiplier from 37 to 10. Adjacent blocks now have similar colors — notice how this hurts readability.

**Medium:**
- Display the perfect streak: change perfect blocks to a brighter lightness (`l = 0.75`) so consecutive perfect placements create a visible bright band in the tower.

**Hard:**
- Add a "grow back" mechanic: after 5 consecutive perfect placements, the next block's width grows by 0.2 (up to `START_SIZE`). This rewards consistent perfection with a chance to recover from earlier mistakes.

---

## What You Learned

- Camera lerp (`cameraY += (target - cameraY) * speed * dt`) creates smooth follow
- HSL with a prime hue multiplier generates distinct colors for adjacent blocks
- Fixed camera angles (no orbital control) can be ideal for games with a single interaction axis
- `touchLayout: "flap"` plus direct `touchstart` handling provides universal input for one-button games
- Perfect streak tracking enables future bonus mechanics

---

## Complete Architecture

```
src/contexts/webgl/games/tower-stacker/
├── shaders.ts              ← Blinn-Phong + uAlpha fragment shader
├── types.ts                ← Block, FallingPiece, StackerState + constants
├── TowerStackerEngine.ts   ← WebGL2 engine: swing, overlap, falling, camera
└── index.ts                ← GameDefinition export for registry
```

**Congratulations!** You've built a complete tower stacking game with overlap clipping, falling physics, and smooth camera follow. The interval intersection math and camera lerp are patterns useful in many game types.

---
[← Previous Step](./step-2.md) | [Back to README](./README.md)
