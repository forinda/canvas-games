# 3D Pong — Tutorial

Build a **3D Pong** game with a glowing ball, AI opponent, wall bounces, and first-to-7 scoring.

**Difficulty:** Beginner-Intermediate (WebGL)
**Episodes:** 3
**Time:** ~45min total
**Prerequisites:** Spinning Cube tutorial (01), Marble Roll recommended

## What You'll Build

A classic Pong game rendered in 3D with a top-down perspective. A glowing ball bounces between player and AI paddles on a dark table with side walls. The ball speeds up each rally. Score is shown as colored cubes along the table edges. First to 7 wins.

## Concepts You'll Learn

- Emissive lighting via a `uEmissive` uniform (self-lit objects like the ball)
- Axis-aligned bounding box (AABB) paddle collision
- Ball angle based on paddle hit position
- Simple AI with speed-limited tracking
- Game flow state machine: start, playing, scored, win
- Score visualization without a text HUD

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Table & Paddles](./step-1.md) | ~15min | Emissive shader, table surface, walls, player + AI paddles |
| 2 | [Ball Physics & AI](./step-2.md) | ~15min | Ball movement, wall bounce, paddle collision with angled return, AI tracking |
| 3 | [Scoring & Game Flow](./step-3.md) | ~15min | Score detection, score cubes, game phases, speed ramp, win condition |

## Final Code

The complete source code is at [`src/contexts/webgl/games/pong-3d/`](../../../src/contexts/webgl/games/pong-3d/).

## Shared Utilities Used

- `@webgl/shared/WebGLUtils` — `createProgram`, `createBuffer`, `createVAO`
- `@webgl/shared/Mat4` — perspective, lookAt, translate, scale, identity
- `@webgl/shared/Primitives` — `createCube`, `createSphere`
- `@webgl/shared/Camera` — `OrbitalCamera`

## Next Game

Continue to 3D Maze — where you'll learn procedural generation, first-person cameras, and fog.
