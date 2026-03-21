# Spinning Cube — Tutorial

Build an interactive **3D Spinning Cube** from scratch using TypeScript and raw WebGL2.

**Difficulty:** Beginner (WebGL)
**Episodes:** 4
**Time:** ~1h total
**Prerequisites:** Familiarity with Canvas 2D games in this project

## What You'll Build

A lit, auto-rotating 3D cube rendered with WebGL2. Drag to orbit the camera, scroll to zoom. The cube shifts colors over time via a time-based uniform in the fragment shader.

## Concepts You'll Learn

- WebGL2 rendering context and the shader pipeline
- Vertex and fragment shaders in GLSL 300 es
- Model-View-Projection (MVP) matrix transforms
- Vertex Array Objects (VAOs) and buffer setup
- Directional diffuse lighting
- Orbital camera with mouse interaction

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [WebGL Context & Shaders](./step-1.md) | ~15min | Get a WebGL2 context, write vertex + fragment shaders, render a colored triangle |
| 2 | [Cube Geometry & MVP Matrices](./step-2.md) | ~15min | Build cube vertices/normals, set up VAO, apply model-view-projection transforms |
| 3 | [Lighting & Auto-Rotation](./step-3.md) | ~15min | Add directional diffuse lighting, time-based color shift, auto-rotation |
| 4 | [Orbital Camera & Polish](./step-4.md) | ~15min | Mouse-drag orbit, scroll zoom, resize handling, ESC exit, game registration |

## Final Code

The complete source code is at [`src/contexts/webgl/games/spinning-cube/`](../../../src/contexts/webgl/games/spinning-cube/).

## Shared Utilities Used

- `@webgl/shared/WebGLUtils` — `createProgram`, `createBuffer`, `createVAO`
- `@webgl/shared/Mat4` — perspective, lookAt, rotateX/Y, identity
- `@webgl/shared/Primitives` — `createCube`
- `@webgl/shared/Camera` — `OrbitalCamera`

## Next Game

Continue to Marble Roll — where you'll learn surface physics and directional lighting →
