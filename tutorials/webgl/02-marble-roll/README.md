# Marble Roll — Tutorial

Build a **3D Marble Roll** game where you tilt a platform to guide a marble, collect gems, and reach the goal.

**Difficulty:** Beginner-Intermediate (WebGL)
**Episodes:** 3
**Time:** ~45min total
**Prerequisites:** Spinning Cube tutorial (01)

## What You'll Build

A lit platform that tilts via arrow keys. A shiny marble rolls under simulated gravity, bouncing off edges. Collect spinning golden gems, then reach the green goal marker to advance through progressively larger levels.

## Concepts You'll Learn

- Blinn-Phong specular lighting with a `uCameraPos` uniform
- Creating multiple meshes (sphere, plane, cube) and drawing each with different model matrices
- Tilt-based physics: gravity projected along a tilted surface
- Smooth input interpolation and friction
- Per-object color uniforms for multi-object scenes
- Level data structures and game phase management

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Shaders, Sphere & Platform](./step-1.md) | ~15min | Blinn-Phong shaders, sphere + plane + cube meshes, lit platform with marble |
| 2 | [Tilt Physics & Input](./step-2.md) | ~15min | Keyboard-driven tilt, gravity on tilted surface, friction, edge bounce, fall detection |
| 3 | [Gems, Goal & Levels](./step-3.md) | ~15min | Spinning gem collectibles, goal marker, level progression, game phases |

## Final Code

The complete source code is at [`src/contexts/webgl/games/marble-roll/`](../../../src/contexts/webgl/games/marble-roll/).

## Shared Utilities Used

- `@webgl/shared/WebGLUtils` — `createProgram`, `createBuffer`, `createVAO`
- `@webgl/shared/Mat4` — perspective, lookAt, rotateX/Z, translate, scale, identity
- `@webgl/shared/Vec3` — create (for manual mat4 x vec3 transforms)
- `@webgl/shared/Primitives` — `createSphere`, `createPlane`, `createCube`
- `@webgl/shared/Camera` — `OrbitalCamera`

## Next Game

Continue to 3D Pong — where you'll learn ball physics, AI opponents, and scoring systems.
