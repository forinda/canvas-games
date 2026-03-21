# Endless Runner — Tutorial

Build a **3D Endless Runner** with lane switching, jumping, obstacles, coins, and linear fog.

**Difficulty:** Intermediate (WebGL)
**Episodes:** 3
**Time:** ~45min total
**Prerequisites:** Spinning Cube tutorial (01)

## What You'll Build

A third-person runner on a 3-lane track stretching into the distance. The player switches lanes to dodge obstacles and jumps over low barriers. Coins spin in free lanes. Speed increases over time. Linear fog fades the track into a sky-blue horizon, with ground segments providing depth perspective.

## Concepts You'll Learn

- Lane-based movement with smooth interpolation
- Jump physics (velocity + gravity) with ground detection
- Procedural obstacle spawning with lane-aware placement
- Chase camera that follows the player
- Linear fog in the fragment shader (near/far planes)
- Speed ramp that increases difficulty over time

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Lane System & Player](./step-1.md) | ~15min | Linear fog shader, 3-lane track, player cube + sphere head, lane switching |
| 2 | [Obstacles & Jumping](./step-2.md) | ~15min | Procedural obstacle spawning, 3 obstacle types, jump physics, collision |
| 3 | [Coins, Fog & Speed Ramp](./step-3.md) | ~15min | Spinning coin collectibles, fog tuning, speed ramp, game registration |

## Final Code

The complete source code is at [`src/contexts/webgl/games/endless-runner/`](../../../src/contexts/webgl/games/endless-runner/).

## Shared Utilities Used

- `@webgl/shared/WebGLUtils` — `createProgram`, `createBuffer`, `createVAO`
- `@webgl/shared/Mat4` — perspective, lookAt, translate, scale, rotateY, identity
- `@webgl/shared/Primitives` — `createCube`, `createSphere`

## Next Game

Continue to Space Shooter — where you'll learn projectile systems, enemy AI, and explosion effects.
