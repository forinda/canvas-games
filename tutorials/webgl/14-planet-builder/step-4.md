# Step 4: Atmosphere Glow & Stars

**Goal:** Add an atmospheric rim glow effect to the planet, a deterministic starfield, and a visual brush mode indicator.

**Time:** ~15 minutes

---

## What You'll Build

- **Atmospheric rim glow** using a Fresnel-like edge effect in the fragment shader
- **Deterministic starfield** — 40 stars placed using the golden ratio for even distribution
- **Brush mode indicator** — a small colored cube showing the current mode
- **Complete polish** — the finished planet builder experience

---

## Concepts

- **Fresnel rim glow**: When viewing a surface at a grazing angle, more light is reflected (think of a lake surface — reflective at shallow angles, transparent looking straight down). For atmosphere, we use `pow(1 - dot(N, V), 3)` — where N is the surface normal and V is the view direction. At the planet's edge (grazing angle), this approaches 1.0, creating a glowing rim.

- **Golden ratio distribution**: Placing stars randomly on a sphere creates uneven clusters. Instead, we use the golden angle (2.399 radians) to distribute stars evenly. Each star's position is derived deterministically from its index — no randomness needed, and the distribution is nearly uniform.

- **Spherical coordinate conversion**: Star positions use `(phi, theta)` → `(sin(theta)*cos(phi), sin(theta)*sin(phi), cos(theta))` to convert angles to 3D Cartesian coordinates on a sphere of radius 15.

---

## Code

### 4.1 — Atmosphere Rim Glow

**File:** `src/contexts/webgl/games/planet-builder/shaders.ts`

```typescript
// In fragment shader, after computing lit color:

// Atmosphere rim glow
float rim = 1.0 - max(dot(norm, viewDir), 0.0);
rim = pow(rim, 3.0) * 0.4;
color += vec3(0.3, 0.5, 0.9) * rim;
```

**What's happening:**
- `dot(norm, viewDir)` is 1.0 when looking straight at the surface (face-on) and 0.0 at the edge (grazing).
- `1 - dot` inverts this: 0 face-on, 1 at edge.
- `pow(..., 3.0)` concentrates the glow at the very edge. Without the power, the glow would be too spread out.
- `* 0.4` scales the intensity — subtle but visible.
- `vec3(0.3, 0.5, 0.9)` is a blue-white atmosphere color. Added to the lit surface color, it creates a thin blue halo around the planet.
- This is the same math used for Fresnel reflections in physically-based rendering, simplified for a stylized atmosphere effect.

---

### 4.2 — Deterministic Starfield

**File:** `src/contexts/webgl/games/planet-builder/PlanetBuilderEngine.ts`

```typescript
// In render():
gl.uniform1f(this.uUsePlanetColor, 0.0);
gl.uniform1f(this.uEmissive, 1.0);

for (let i = 0; i < 40; i++) {
    // Golden ratio distribution on a sphere
    const phi = (i * 2.399) % (Math.PI * 2);
    const theta = Math.acos(1 - 2 * ((i * 0.618) % 1));
    const dist = 15;
    const sx = Math.sin(theta) * Math.cos(phi) * dist;
    const sy = Math.sin(theta) * Math.sin(phi) * dist;
    const sz = Math.cos(theta) * dist;

    this.drawBox(sx, sy, sz, 0.03, 0.03, 0.03, 0.9, 0.9, 1.0);
}

gl.uniform1f(this.uEmissive, 0.0);
```

**What's happening:**
- **40 stars** distributed on a sphere of radius 15 (far enough to be behind the planet from any camera angle).
- `phi = (i * 2.399) % (2 * PI)` — the golden angle (137.5 degrees). Each successive star is rotated by this angle, ensuring even angular distribution.
- `theta = acos(1 - 2 * ((i * 0.618) % 1))` — maps the golden ratio (`0.618...`) to a latitude. The `acos(1 - 2x)` formula converts a uniform [0,1] value to a uniform distribution on the sphere.
- Each star is a tiny cube (0.03 units) with `uEmissive = 1.0` — fully self-lit white.
- `uUsePlanetColor = 0.0` ensures stars use `uColor` directly, not altitude coloring.
- **Deterministic** — same 40 positions every time. No `Math.random()`, so stars don't change on reload.

---

### 4.3 — Brush Mode Indicator

```typescript
// In render():
const modeColors: Record<BrushMode, [number, number, number]> = {
    raise: [0.2, 0.8, 0.2],  // green
    lower: [0.8, 0.2, 0.2],  // red
    smooth: [0.2, 0.5, 0.8], // blue
};
const mc = modeColors[this.state.brushMode];

gl.uniform1f(this.uEmissive, 0.6);
this.drawBox(-2, 2, 0, 0.15, 0.15, 0.15, mc[0], mc[1], mc[2]);
gl.uniform1f(this.uEmissive, 0.0);
```

**What's happening:**
- A small emissive cube in the upper-left area of the scene (world space `[-2, 2, 0]`).
- Green for raise, red for lower, blue for smooth — intuitive color coding.
- `uEmissive = 0.6` makes it stand out against the dark background.
- This is a "world-space HUD" — it moves with the camera but is always visible. A proper HUD would use a separate orthographic projection, but this is simpler.

---

### 4.4 — Right-Click Sculpt Controls

```typescript
// In constructor:
this.mouseDownHandler = (e: MouseEvent) => {
    if (e.button === 2) { // right-click
        e.preventDefault();
        this.isDragging = true;
    }
};
this.mouseMoveHandler = (e: MouseEvent) => {
    if (!this.isDragging) return;
    this.sculptAt(e.clientX, e.clientY);
};
this.mouseUpHandler = () => {
    this.isDragging = false;
};

canvas.addEventListener("mousedown", this.mouseDownHandler);
window.addEventListener("mousemove", this.mouseMoveHandler);
window.addEventListener("mouseup", this.mouseUpHandler);
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
```

**What's happening:**
- **Right-click** sculpts (button === 2). Left-click is reserved for the orbital camera.
- `contextmenu` is prevented so right-click doesn't open the browser menu.
- `isDragging` tracks whether the right mouse button is held — sculpting happens continuously during drag via `mouseMoveHandler`.
- Each `mousemove` event triggers `sculptAt()`, which runs the full brush + normal recomputation + GPU upload pipeline.

---

## Test It

```bash
pnpm dev
```

1. Select "Planet Builder" from the 3D category
2. The planet should have a **blue atmospheric rim glow** visible at the edges
3. **40 white stars** should be visible in the dark background
4. A **colored indicator cube** should show the current brush mode (green = raise)
5. Press **2** — indicator turns red (lower mode)
6. Press **3** — indicator turns blue (smooth mode)
7. **Right-click drag** to sculpt — the planet deforms with correct lighting and altitude colors
8. **Left-click drag** to orbit the camera
9. Press **T** to toggle auto-rotation
10. Press **R** to reset the planet to a smooth sphere
11. Create mountains, craters, and smooth plains — watch the biome colors change!

---

## Challenges

**Easy:**
- Change the atmosphere color from `vec3(0.3, 0.5, 0.9)` to orange `vec3(0.9, 0.5, 0.2)` for a Mars-like atmosphere.

**Medium:**
- Add star twinkling: multiply each star's color by `0.7 + sin(time * 3 + i * 1.5) * 0.3` to create a pulsing brightness effect.

**Hard:**
- Add a moon: render a second, smaller sphere orbiting the planet at a distance. Apply a simple gray texture (no altitude coloring) and give it its own rotation.

---

## What You Learned

- Fresnel rim glow uses `pow(1 - dot(N, V), exponent)` to create an atmospheric edge effect
- Golden ratio distribution (`i * 2.399` for angle, `i * 0.618` for latitude) places points evenly on a sphere
- `acos(1 - 2x)` converts a uniform distribution to uniform coverage on a sphere surface
- A small emissive cube serves as a minimal world-space brush mode indicator
- Right-click sculpting with left-click camera orbit requires separating mouse button handling
- The complete planet builder pipeline: input → ray-sphere hit → angular brush → deform array → radial displacement → normal recompute → GPU upload

**Congratulations!** You've completed all 14 WebGL tutorials. You've progressed from a spinning cube to procedural terrain, boid AI, chess logic, and now real-time mesh sculpting with dynamic GPU buffers.

---
[← Previous Step](./step-3.md) | [Back to README](./README.md)
