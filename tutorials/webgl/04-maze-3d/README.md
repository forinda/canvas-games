# 3D Maze — Tutorial

Build a **first-person 3D maze** with procedural generation, wall collision, distance fog, and progressive difficulty.

**Difficulty:** Intermediate (WebGL)
**Episodes:** 4
**Time:** ~1h total
**Prerequisites:** Spinning Cube tutorial (01)

## What You'll Build

A first-person maze navigator. Click the canvas to lock the mouse, look around freely, and use WASD to walk through procedurally generated corridors. Distance fog limits visibility, creating tension. A glowing green pillar marks the exit. Each level generates a larger maze.

## Concepts You'll Learn

- Procedural maze generation (DFS/recursive backtracking)
- Converting a 2D grid to 3D wall geometry (scaled cubes)
- First-person camera with pointer lock and WASD movement
- Wall collision detection for an FPS-style player
- Distance fog in the fragment shader
- Level progression with increasing maze size

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Maze Generation](./step-1.md) | ~15min | DFS maze algorithm, grid data structure, cell/wall representation |
| 2 | [Wall Geometry & Rendering](./step-2.md) | ~15min | Fog shader, floor/ceiling, wall cubes from grid data, exit marker |
| 3 | [FPS Camera & Collision](./step-3.md) | ~15min | Pointer-lock FPS camera, WASD movement, wall push-back collision |
| 4 | [Fog, Levels & Polish](./step-4.md) | ~15min | Distance fog tuning, level progression, win detection, game registration |

## Final Code

The complete source code is at [`src/contexts/webgl/games/maze-3d/`](../../../src/contexts/webgl/games/maze-3d/).

## Shared Utilities Used

- `@webgl/shared/WebGLUtils` — `createProgram`, `createBuffer`, `createVAO`
- `@webgl/shared/Mat4` — perspective, lookAt, translate, scale, identity
- `@webgl/shared/Primitives` — `createCube`
- `@webgl/shared/Camera` — `FPSCamera`

## Next Game

Continue to Tower Stacker — where you'll learn timing mechanics, overlap clipping, and camera follow.
