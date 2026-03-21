# Planet Builder — Tutorial

Build an interactive **3D Planet Builder** from scratch using TypeScript and raw WebGL2.

**Difficulty:** Advanced (WebGL)
**Episodes:** 4
**Time:** ~1h total
**Prerequisites:** Spinning Cube tutorial (01), familiarity with sphere primitives, orbital camera, ray casting

## What You'll Build

An interactive planet sculptor where you right-click-drag to raise, lower, or smooth terrain on a sphere. The planet auto-rotates, colors itself based on altitude (water, sand, grass, rock, snow), and sits in a starfield with atmospheric rim glow. Features dynamic buffer updates and real-time normal recomputation.

## Concepts You'll Learn

- High-resolution sphere mesh generation (40 segments)
- Altitude-based coloring in the fragment shader (biome bands)
- Per-vertex radial deformation (raise/lower terrain along normals)
- Dynamic GPU buffers with `gl.DYNAMIC_DRAW` and `bufferSubData`
- Angular brush falloff for sculpting on a sphere surface
- Real-time normal recomputation from face normals
- Smooth brush mode (dampen deformation toward zero)
- Atmosphere rim glow using Fresnel-like `pow(1 - dot(N, V), 3)`
- Deterministic star placement from index-based golden ratio

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Sphere Rendering & Altitude Shader](./step-1.md) | ~15min | High-res sphere, altitude-based coloring, auto-rotation, stars |
| 2 | [Deformation & Dynamic Buffers](./step-2.md) | ~15min | Per-vertex displacement, dynamic buffer updates, ray-sphere intersection |
| 3 | [Brush Modes & Normal Recomputation](./step-3.md) | ~15min | Raise/lower/smooth brushes, angular falloff, face normal recomputation |
| 4 | [Atmosphere Glow & Stars](./step-4.md) | ~15min | Fresnel rim glow, deterministic starfield, brush indicator, polish |

## Final Code

The complete source code is at [`src/contexts/webgl/games/planet-builder/`](../../../src/contexts/webgl/games/planet-builder/).

## Shared Utilities Used

- `@webgl/shared/WebGLUtils` — `createProgram`, `createBuffer`, `createVAO`
- `@webgl/shared/Mat4` — perspective, identity, rotateY, multiply, invert
- `@webgl/shared/Camera` — `OrbitalCamera`
- `@webgl/shared/Primitives` — `createSphere`, `createCube`

## Previous Game

This is the final WebGL tutorial in the series. Congratulations on making it here!
