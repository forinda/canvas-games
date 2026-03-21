# Step 3: Lighting & Auto-Rotation

**Goal:** Add directional diffuse lighting, a time-based color shift, and auto-rotation to the cube.

**Time:** ~15 minutes

---

## What You'll Build

- **Diffuse lighting** — faces angled toward the light are bright, faces away are dark
- **Ambient light** — a minimum brightness so no face is fully black
- **Time-based color shift** — the cube's hue slowly changes using a `uTime` uniform
- **Auto-rotation** — the cube spins on two axes simultaneously

---

## Concepts

- **Diffuse Lighting (Lambert's cosine law)**: The brightness of a surface depends on the angle between the surface normal and the light direction. `dot(normal, lightDir)` gives a value from -1 to 1. We clamp to 0 (no negative light) and use it as a multiplier.

- **Ambient Light**: A constant minimum brightness added to the diffuse term. Without it, faces pointing away from the light would be pure black, which looks unnatural.

- **Time Uniform**: A `float` uploaded from JavaScript each frame containing elapsed seconds. The shader uses `sin(uTime * speed)` to create smooth oscillating effects.

- **Matrix Rotation**: `Mat4.rotateY` and `Mat4.rotateX` modify the model matrix. Applying both creates a tumbling motion. The angle increases with `time` so it spins continuously.

---

## Code

### 3.1 — Updated Fragment Shader

Update the fragment shader in `shaders.ts` to add lighting and color shift:

```glsl
// In the fragment shader's main():
vec3 norm = normalize(vNormal);

// Per-face color derived from the normal direction
vec3 baseColor = vec3(
    abs(norm.x) * 0.4 + 0.3,
    abs(norm.y) * 0.4 + 0.3,
    abs(norm.z) * 0.6 + 0.3
);

// Subtle hue shift over time
baseColor.r += sin(uTime * 0.7) * 0.08;
baseColor.g += sin(uTime * 1.1 + 1.0) * 0.08;
baseColor.b += sin(uTime * 0.9 + 2.0) * 0.08;

// Diffuse lighting
float diffuse = max(dot(norm, uLightDir), 0.0);
float ambient = 0.25;
float light = ambient + diffuse * 0.75;

fragColor = vec4(baseColor * light, 1.0);
```

**What's happening:**
- `abs(norm.x/y/z)` gives each face a unique color: X-facing faces are reddish, Y-facing are greenish, Z-facing are bluish.
- `sin(uTime * frequency + phase)` creates smooth oscillation. Different frequencies and phases per channel mean the colors shift independently — creating a subtle rainbow drift.
- `max(dot(norm, uLightDir), 0.0)` is the Lambert diffuse term. When the normal points toward the light, `dot` is near 1.0 (bright). When perpendicular, it's 0 (dark). When pointing away, it would be negative — `max` clamps it to 0.
- `ambient + diffuse * 0.75` means the darkest a face can be is 25% brightness (the ambient term), and the brightest is 100%.

---

### 3.2 — Auto-Rotation in the Model Matrix

In the render method, rotate the model matrix based on elapsed time:

```typescript
private render(): void {
    const { gl, canvas } = this;
    const time = performance.now() / 1000 - this.startTime;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);

    // Model matrix — auto-rotation on two axes
    Mat4.identity(this.modelMatrix);
    Mat4.rotateY(this.modelMatrix, this.modelMatrix, time * 0.5);
    Mat4.rotateX(this.modelMatrix, this.modelMatrix, time * 0.3);

    // ... projection, view, draw (same as before)

    // Upload time and light direction
    gl.uniform3f(this.uLightDir, 0.5, 0.7, 0.5);
    gl.uniform1f(this.uTime, time);
}
```

**What's happening:**
- `time * 0.5` means half a radian per second around Y (one full revolution every ~12.6 seconds).
- `time * 0.3` is slower around X. The two different speeds create a tumbling motion that never quite repeats.
- `Mat4.identity` resets the matrix each frame before applying fresh rotations. Without this, rotations would accumulate and the numbers would grow until floating-point precision breaks down.
- Light direction `(0.5, 0.7, 0.5)` points roughly up and to the right. It doesn't need to be perfectly normalized — the shader normalizes the interpolated normal anyway.

---

### 3.3 — The Game Loop

```typescript
start(): void {
    this.running = true;
    this.startTime = performance.now() / 1000;
    this.loop();
}

private loop(): void {
    if (!this.running) return;
    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
}
```

**What's happening:**
- `startTime` is recorded once so `time` starts at 0 when the game begins.
- `requestAnimationFrame` syncs to the display's refresh rate (typically 60fps). The browser only calls back when the tab is visible, automatically pausing when hidden.
- `this.running` is the kill switch — `destroy()` sets it to false, and the loop exits on the next frame.

---

## Test It

```bash
pnpm dev
```

1. The cube should now **rotate** smoothly on two axes
2. **Lighting** should be visible — faces pointing toward the light are brighter
3. **Colors** should slowly shift over time
4. The **dark background** should contrast nicely with the lit cube

---

## Challenges

**Easy:**
- Change the rotation speeds: `time * 2.0` for Y and `time * 1.5` for X. How does it feel?

**Medium:**
- Change the light direction to `(-0.5, -0.7, -0.5)` — the light now comes from the opposite side. Which faces are bright now?

**Hard:**
- Add a second light source in the fragment shader. Create `uLightDir2` uniform, compute a second diffuse term, and add them together (clamped to 1.0). What does two-light illumination look like?

---

## What You Learned

- Lambert's cosine law: `dot(normal, lightDir)` gives surface brightness
- Ambient light prevents faces from going fully black
- `sin(time * freq)` creates smooth oscillating effects in shaders
- Model matrix rotation: `rotateY` + `rotateX` with different speeds creates tumbling
- `requestAnimationFrame` syncs rendering to the display refresh rate

**Next:** We'll add orbital camera controls so you can drag to rotate the view and scroll to zoom.

---
[← Previous Step](./step-2.md) | [Back to README](./README.md) | [Next Step →](./step-4.md)
