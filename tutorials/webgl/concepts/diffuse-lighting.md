# Diffuse Lighting (Lambert)

## What Is It?

Diffuse lighting simulates how real surfaces scatter light. When light hits a surface head-on, it appears bright. When light hits at a steep angle, it appears dim. When the surface faces away from the light, it receives no light at all. This is the most basic and essential lighting model in 3D graphics.

## How It Works

```
Light Source ──────────►  Surface Normal
                          ↑
                          │  angle θ
                          │
                    ██████████████  Surface

brightness = cos(θ) = dot(normal, lightDir)

θ = 0°   → dot = 1.0 → fully lit (light hits head-on)
θ = 45°  → dot = 0.7 → mostly lit
θ = 90°  → dot = 0.0 → no light (grazing angle)
θ > 90°  → dot < 0   → clamped to 0 (surface faces away)
```

### The Math

Lambert's cosine law states that the reflected intensity is proportional to the cosine of the angle between the surface normal and the light direction.

In GLSL:
```glsl
float diffuse = max(dot(normalize(vNormal), uLightDir), 0.0);
```

- `normalize(vNormal)` — ensure the normal is unit length (interpolation can shorten it)
- `uLightDir` — a normalized vector pointing **toward** the light source
- `dot(a, b)` — returns `cos(θ)` when both vectors are unit length
- `max(..., 0.0)` — clamp negative values (surface facing away from light)

### Adding Ambient Light

Pure diffuse lighting makes back-facing surfaces completely black, which looks unnatural. Adding a constant ambient term ensures a minimum brightness:

```glsl
float ambient = 0.25;
float light = ambient + diffuse * 0.75;
// Darkest: 0.25 (facing away from light)
// Brightest: 1.0 (facing directly at light)
```

## Code Example

### Fragment Shader

```glsl
#version 300 es
precision mediump float;

in vec3 vNormal;        // interpolated from vertex shader
uniform vec3 uLightDir; // direction TO the light (normalized)

out vec4 fragColor;

void main() {
    vec3 norm = normalize(vNormal);

    // Diffuse term
    float diffuse = max(dot(norm, uLightDir), 0.0);

    // Combine ambient + diffuse
    float ambient = 0.2;
    float brightness = ambient + diffuse * 0.8;

    // Apply to base color
    vec3 baseColor = vec3(0.4, 0.6, 0.8); // light blue
    fragColor = vec4(baseColor * brightness, 1.0);
}
```

### Vertex Shader (Normal Transform)

Normals must be transformed by the model matrix to stay correct when the object rotates:

```glsl
// CORRECT — use mat3 (rotation only, no translation)
vNormal = mat3(uModel) * aNormal;

// WRONG — mat4 includes translation, breaks the normal
// vNormal = (uModel * vec4(aNormal, 1.0)).xyz;
```

Why `mat3`? A normal is a **direction**, not a position. Translating a direction makes no sense. `mat3(uModel)` extracts just the rotation/scale part.

### JavaScript (Uploading Light Direction)

```typescript
// Light coming from upper-right-front
gl.uniform3f(uLightDir, 0.5, 0.7, 0.5);
```

The direction should be roughly normalized. Exact normalization isn't critical since the fragment shader normalizes the interpolated normal anyway.

## Visual Comparison

```
No Lighting          Diffuse Only         Ambient + Diffuse
┌──────────┐        ┌──────────┐        ┌──────────┐
│          │        │██▓▓░░    │        │██▓▓▒▒░░  │
│  flat    │        │██▓▓░░    │        │██▓▓▒▒░░  │
│  color   │        │██        │        │▓▓▒▒░░    │
│          │        │  (black) │        │  (dim)    │
└──────────┘        └──────────┘        └──────────┘
Looks fake          Too harsh            Natural
```

## Common Pitfalls

1. **Un-normalized normals** — interpolation across a triangle can shorten the normal vector. Always `normalize()` in the fragment shader.
2. **Light direction backwards** — `uLightDir` should point **toward** the light. If you pass the direction *from* the light, everything lights backwards.
3. **Using `mat4` for normals** — includes translation, which corrupts the normal direction.
4. **No ambient** — surfaces facing away from the light are pure black, which looks like a rendering bug.
5. **Non-uniform scale** — if the model matrix has non-uniform scale (e.g., `scale(1, 2, 1)`), normals become skewed. The fix is to use the **inverse-transpose** of the model matrix: `mat3(transpose(inverse(uModel)))`. For uniform scale, `mat3(uModel)` works fine.

## Used In

- **Spinning Cube** — per-face diffuse lighting with ambient
- **Marble Roll** — sphere appears 3D thanks to smooth normal interpolation
- **3D Pong** — table and paddles are lit to show depth
- **Every WebGL game** — diffuse lighting is the baseline for all 3D rendering
