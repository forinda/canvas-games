# Bowling — Tutorial

Build an interactive **3D Bowling** game from scratch using TypeScript and raw WebGL2.

**Difficulty:** Intermediate (WebGL)
**Episodes:** 3
**Time:** ~45min total
**Prerequisites:** Spinning Cube tutorial (01), familiarity with MVP matrices and mesh rendering

## What You'll Build

A ten-pin bowling game with a drag-to-aim throw mechanic, rolling ball physics, pin collision with chain reactions, and a full 10-frame scoring system. The camera follows the ball down the lane.

## Concepts You'll Learn

- Building a scene from scaled cube and sphere primitives
- Drag-to-aim input mapping to 3D trajectories
- Simple 2D collision detection (circle vs. circle) in 3D space
- Chain-reaction physics (pin-to-pin knockdowns)
- State machine game flow (aiming, rolling, settling, scoring, gameover)
- Blinn-Phong specular shading with emissive uniforms
- Frame-based scoring logic (strikes, spares, 10th frame bonus)

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Lane & Pins Rendering](./step-1.md) | ~15min | Bowling lane surface, gutters, 10 pins in triangle formation, ball mesh |
| 2 | [Drag-to-Aim & Ball Physics](./step-2.md) | ~15min | Mouse drag input for aim/power, ball rolling with velocity, camera follow |
| 3 | [Pin Collision, Scoring & Frames](./step-3.md) | ~15min | Ball-pin collision, chain reactions, settle animation, 10-frame scoring |

## Final Code

The complete source code is at [`src/contexts/webgl/games/bowling/`](../../../src/contexts/webgl/games/bowling/).

## Shared Utilities Used

- `@webgl/shared/WebGLUtils` — `createProgram`, `createBuffer`, `createVAO`
- `@webgl/shared/Mat4` — perspective, lookAt, identity, translate, scale, rotateX/Y
- `@webgl/shared/Primitives` — `createCube`, `createSphere`

## Next Game

Continue to Racing 3D — where you'll learn waypoint-based AI and chase cameras.
