# The WebGL Shader Pipeline

## What Is It?

The shader pipeline is the sequence of stages that transforms your 3D vertex data into colored pixels on screen. Unlike Canvas 2D where you call `fillRect` or `drawImage` and the browser handles everything, WebGL requires you to write two small GPU programs (shaders) that define how vertices are positioned and how pixels are colored.

## How It Works

```
Your JavaScript                        GPU Pipeline
─────────────────                      ─────────────

vertex data (positions, normals)  ──►  Vertex Shader (runs per vertex)
                                          │ Transforms positions
                                          │ Passes data to fragment shader
                                          ▼
                                       Rasterization (automatic)
                                          │ Fills triangles with pixels
                                          │ Interpolates vertex outputs
                                          ▼
                                       Fragment Shader (runs per pixel)
                                          │ Decides pixel color
                                          │ Applies lighting, textures
                                          ▼
                                       Depth Test + Blending (automatic)
                                          │ Discards hidden pixels
                                          ▼
                                       Screen
```

### Vertex Shader

Runs once per vertex. Its job is to transform a 3D position into a 2D screen position.

```glsl
#version 300 es
precision mediump float;

// Input: data from your buffers
layout(location = 0) in vec3 aPosition;  // 3D position
layout(location = 1) in vec3 aNormal;    // surface normal

// Uniforms: values uploaded from JavaScript (same for all vertices)
uniform mat4 uModel;       // object transform (rotation, position)
uniform mat4 uView;        // camera position/orientation
uniform mat4 uProjection;  // perspective (distant = smaller)

// Output: passed to the fragment shader (interpolated across the triangle)
out vec3 vNormal;

void main() {
    vNormal = mat3(uModel) * aNormal;
    gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
}
```

### Fragment Shader

Runs once per pixel (fragment). Its job is to decide what color that pixel should be.

```glsl
#version 300 es
precision mediump float;

// Input: interpolated from vertex shader outputs
in vec3 vNormal;

// Uniforms
uniform vec3 uLightDir;

// Output: the pixel's final color
out vec4 fragColor;

void main() {
    vec3 norm = normalize(vNormal);
    float light = max(dot(norm, uLightDir), 0.0);
    fragColor = vec4(vec3(light), 1.0);
}
```

### Rasterization (Automatic)

The GPU takes the 3 transformed vertices of each triangle and fills in all the pixels between them. Values marked `out` in the vertex shader are automatically **interpolated** — if one vertex has normal (0,1,0) and another has (1,0,0), a pixel halfway between them gets (0.5, 0.5, 0).

## Data Flow

```
JavaScript                 →  GPU
─────────────────────────     ────────────────────────
Typed arrays (Float32Array) → Buffers (gl.bufferData)
                              ↓
VAO binds buffers to         → Vertex attributes (in vec3 aPosition)
attribute locations
                              ↓
gl.uniform* calls            → Uniforms (uniform mat4 uModel)
                              ↓
gl.drawElements              → Triggers the pipeline
```

## Key Terms

| Term | Meaning |
|------|---------|
| **Attribute** | Per-vertex input (position, normal, UV). Different for every vertex. |
| **Uniform** | Per-draw-call input (matrices, time, light). Same for all vertices/fragments in one draw. |
| **Varying** | Output from vertex shader, interpolated, input to fragment shader. In GLSL 300 es, these are `out` (vertex) and `in` (fragment). |
| **VAO** | Vertex Array Object — captures which buffers feed which attributes. Switch meshes by binding a different VAO. |
| **Program** | A linked pair of vertex + fragment shaders. You can have multiple programs and switch between them with `gl.useProgram`. |

## Common Pitfalls

1. **Forgetting `#version 300 es`** — must be the very first line, no whitespace before it.
2. **Precision declaration** — `precision mediump float;` is required in fragment shaders (optional but good practice in vertex shaders).
3. **Attribute locations** — `layout(location = N)` in GLSL must match the `N` in `vertexAttribPointer(N, ...)`.
4. **Matrix multiplication order** — `Projection × View × Model × position`. Right-to-left: position is first transformed by Model, then View, then Projection.
5. **Column-major matrices** — WebGL uses column-major order. Our `Mat4` module produces column-major Float32Arrays, so `gl.uniformMatrix4fv(loc, false, data)` always uses `false` for the transpose parameter.

## Used In

- **Every WebGL game** — all 3D games in this project use the shader pipeline
- Spinning Cube is the simplest example (1 draw call, 1 program)
- More complex games use multiple programs (e.g., one for objects, one for particles)
