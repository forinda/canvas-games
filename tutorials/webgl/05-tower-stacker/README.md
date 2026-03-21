# Tower Stacker — Tutorial

Build a **3D Tower Stacker** game where you time block drops, slice overhangs, and stack as high as possible.

**Difficulty:** Beginner-Intermediate (WebGL)
**Episodes:** 3
**Time:** ~45min total
**Prerequisites:** Spinning Cube tutorial (01)

## What You'll Build

A block swings back and forth above the tower. Press Space to drop it. The overhanging part gets sliced off and falls away. Perfect placements keep the full block width. The block swings faster as you go higher. Camera smoothly follows the growing tower. HSL-based colors create a rainbow gradient.

## Concepts You'll Learn

- Alpha blending for semi-transparent preview blocks
- Overlap clipping: computing intersection of two rectangles
- Falling physics with rotation for sliced offcut pieces
- Smooth camera follow that tracks the tower height
- HSL to RGB color conversion for gradient block colors
- Timing-based gameplay with increasing difficulty

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Swinging Block & Timing](./step-1.md) | ~15min | Alpha shader, swinging block, alternating X/Z axes, Space to drop |
| 2 | [Overlap Clipping & Falling](./step-2.md) | ~15min | Overlap computation, block slicing, falling offcut pieces with rotation |
| 3 | [Camera Follow & Scoring](./step-3.md) | ~15min | Smooth camera Y follow, HSL colors, perfect streak detection, game registration |

## Final Code

The complete source code is at [`src/contexts/webgl/games/tower-stacker/`](../../../src/contexts/webgl/games/tower-stacker/).

## Shared Utilities Used

- `@webgl/shared/WebGLUtils` — `createProgram`, `createBuffer`, `createVAO`
- `@webgl/shared/Mat4` — perspective, lookAt, translate, scale, rotateX/Z, identity
- `@webgl/shared/Primitives` — `createCube`

## Next Game

Continue to Endless Runner — where you'll learn lane systems, procedural obstacles, and linear fog.
