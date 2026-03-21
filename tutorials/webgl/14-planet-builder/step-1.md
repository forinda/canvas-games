# Step 1: Sphere Rendering & Altitude Shader

**Goal:** Render a high-resolution sphere with an altitude-based coloring shader that creates distinct biome bands (water, sand, grass, forest, rock, snow).

**Time:** ~15 minutes

---

## What You'll Build

- A **high-resolution sphere** (40 segments) as the planet base
- An **altitude-based fragment shader** that colors the surface by height
- **Auto-rotation** for a spinning planet effect
- **Dark space background** as a foundation for the starfield

---

## Concepts

- **High segment count**: `createSphere(1.0, 40)` generates ~3200 vertices and ~6400 triangles. This is much higher than the typical 16-segment sphere used for game objects, but necessary for smooth sculpting. Each vertex is an independent deformation point.

- **Altitude-based coloring**: The fragment shader checks `length(localPosition)` — the distance from the origin in local space. For a unit sphere, this starts at 1.0. Values below 1.0 are "below sea level" (water), values above are land. Different altitude ranges map to biome colors: sand, grass, forest, rock, snow.

- **Local vs. world position**: The shader receives both `vWorldPos` (after model rotation) and `vLocalPos` (raw vertex position). Altitude coloring uses `vLocalPos` because it doesn't change with rotation — the biome should be "painted on" the surface, not shift as the planet spins.

---

## Code

### 1.1 — Planet State

**File:** `src/contexts/webgl/games/planet-builder/types.ts`

```typescript
export const SPHERE_SEGMENTS = 40;
export const BASE_RADIUS = 1.0;
export const ROTATE_SPEED = 0.3;

export type BrushMode = "raise" | "lower" | "smooth";

export interface PlanetState {
    /** Per-vertex deformation offsets (radial displacement) */
    deform: Float32Array;
    brushMode: BrushMode;
    autoRotate: boolean;
    rotationY: number;
}
```

**What's happening:**
- `SPHERE_SEGMENTS = 40` — high resolution for smooth sculpting.
- `BASE_RADIUS = 1.0` — the undeformed sphere is a unit sphere.
- `deform` is a `Float32Array` with one value per vertex. Positive values raise terrain, negative values create valleys.
- `ROTATE_SPEED = 0.3` rad/sec — gentle auto-rotation.

---

### 1.2 — Altitude-Based Fragment Shader

**File:** `src/contexts/webgl/games/planet-builder/shaders.ts`

```typescript
export const VERT_SRC = /* glsl */ `#version 300 es
precision mediump float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;

out vec3 vNormal;
out vec3 vWorldPos;
out vec3 vLocalPos;

void main() {
    vec4 worldPos = uModel * vec4(aPosition, 1.0);
    vWorldPos = worldPos.xyz;
    vLocalPos = aPosition;       // unrotated position for altitude
    vNormal = mat3(uModel) * aNormal;
    gl_Position = uProjection * uView * worldPos;
}
`;

export const FRAG_SRC = /* glsl */ `#version 300 es
precision mediump float;

in vec3 vNormal;
in vec3 vWorldPos;
in vec3 vLocalPos;

uniform vec3 uLightDir;
uniform vec3 uColor;
uniform vec3 uCameraPos;
uniform float uEmissive;
uniform float uUsePlanetColor;

out vec4 fragColor;

void main() {
    vec3 norm = normalize(vNormal);
    float diffuse = max(dot(norm, uLightDir), 0.0);
    float ambient = 0.15;

    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    vec3 halfDir = normalize(uLightDir + viewDir);
    float spec = pow(max(dot(norm, halfDir), 0.0), 24.0);

    vec3 baseColor = uColor;

    // Altitude-based coloring for the planet
    if (uUsePlanetColor > 0.5) {
        float altitude = length(vLocalPos);
        float seaLevel = 1.0;

        if (altitude < seaLevel - 0.02) {
            baseColor = vec3(0.1, 0.25, 0.6);       // deep water
        } else if (altitude < seaLevel + 0.01) {
            baseColor = vec3(0.15, 0.4, 0.7);        // shallow water
        } else if (altitude < seaLevel + 0.05) {
            baseColor = vec3(0.76, 0.7, 0.5);         // sand/beach
        } else if (altitude < seaLevel + 0.15) {
            baseColor = vec3(0.2, 0.55, 0.15);        // grass
        } else if (altitude < seaLevel + 0.3) {
            baseColor = vec3(0.35, 0.45, 0.25);       // forest
        } else if (altitude < seaLevel + 0.45) {
            baseColor = vec3(0.45, 0.4, 0.35);        // rock
        } else {
            baseColor = vec3(0.9, 0.92, 0.95);        // snow
        }
    }

    vec3 lit = baseColor * (ambient + diffuse * 0.75) + vec3(1.0) * spec * 0.2;
    vec3 color = mix(lit, baseColor, uEmissive);

    fragColor = vec4(color, 1.0);
}
`;
```

**What's happening:**
- The vertex shader passes `vLocalPos = aPosition` — this is the raw vertex position before model rotation. For a unit sphere, `length(vLocalPos) = 1.0` on the undeformed surface.
- `uUsePlanetColor` is a flag: 1.0 for the planet (use altitude coloring), 0.0 for other objects (use `uColor`).
- **Biome bands**: `altitude < 0.98` = deep water (dark blue), `< 1.01` = shallow water (lighter blue), `< 1.05` = sand, `< 1.15` = grass, `< 1.3` = forest, `< 1.45` = rock, else snow.
- These thresholds are relative to the base radius (1.0). A deformation of +0.3 would create a mountain with forest/rock bands.

---

### 1.3 — Sphere Rendering with Rotation

**File:** `src/contexts/webgl/games/planet-builder/PlanetBuilderEngine.ts`

```typescript
private render(): void {
    const { gl, canvas } = this;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);

    // ... camera setup ...

    gl.uniform1f(this.uUsePlanetColor, 1.0);

    // Planet with auto-rotation
    Mat4.identity(this.modelMatrix);
    Mat4.rotateY(this.modelMatrix, this.modelMatrix, this.state.rotationY);
    gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
    gl.uniform3f(this.uColor, 0.3, 0.5, 0.2);

    gl.bindVertexArray(this.planetVAO);
    gl.drawElements(gl.TRIANGLES, this.planetIndexCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
}

// In loop():
if (this.state.autoRotate) {
    this.state.rotationY += ROTATE_SPEED * (1 / 60);
}
```

**What's happening:**
- The planet's model matrix is just a Y rotation — no translation (centered at origin) and no scale (unit sphere).
- `rotationY` increases each frame by `ROTATE_SPEED / 60` radians (assuming ~60fps).
- `uUsePlanetColor = 1.0` activates the altitude coloring. The `uColor` fallback is still set but ignored.
- The planet uses its own VAO (`planetVAO`) separate from the cube mesh — this will become dynamic in step 2.

---

## Test It

```bash
pnpm dev
```

1. Select "Planet Builder" from the 3D category
2. You should see a **smooth sphere** slowly rotating
3. The sphere should be uniformly colored (no deformation yet, so altitude is constant at 1.0)
4. At altitude 1.0, the shader shows the **shallow water** color (blue-green)
5. **Orbit** the camera to view from different angles
6. The dark background is the **space** backdrop — stars come in step 4

---

## Challenges

**Easy:**
- Change `BASE_RADIUS` from 1.0 to 1.5. How does this affect the altitude coloring thresholds?

**Medium:**
- Add a third biome band: between forest and rock, add a "tundra" color `vec3(0.55, 0.5, 0.45)` at altitude range `[seaLevel + 0.3, seaLevel + 0.38]`.

**Hard:**
- Add latitude-based biome modification: use `abs(vLocalPos.y / length(vLocalPos))` as a latitude factor. Near the poles (high latitude), lower the snow threshold so poles are snowy even at low altitude.

---

## What You Learned

- A 40-segment sphere provides ~3200 vertices for smooth sculpting
- `vLocalPos` in the shader provides the unrotated vertex position for altitude calculations
- Altitude-based coloring uses `length(localPos)` compared to threshold ranges for biome bands
- `uUsePlanetColor` flag lets the same shader serve both the planet and non-planet objects
- Auto-rotation with a simple `rotationY` increment creates a spinning globe effect

**Next:** We'll add per-vertex deformation and dynamic buffer updates.

---
[Back to README](./README.md) | [Next Step →](./step-2.md)
