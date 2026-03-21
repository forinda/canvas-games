# Racing 3D — Tutorial

Build an interactive **3D Racing** game from scratch using TypeScript and raw WebGL2.

**Difficulty:** Intermediate (WebGL)
**Episodes:** 3
**Time:** ~45min total
**Prerequisites:** Spinning Cube tutorial (01), familiarity with MVP matrices and scene rendering

## What You'll Build

A third-person racing game with a waypoint-based track, keyboard steering with friction physics, 3 AI opponents, a chase camera, lap counting, and distance-based fog.

## Concepts You'll Learn

- Waypoint-based track generation from a loop of control points
- Track segment rendering by computing midpoints, lengths, and angles
- Angle-based car steering with speed-dependent turning
- Friction differentiation (on-track vs. off-track)
- Waypoint-following AI with angle normalization
- Chase camera that follows behind the player
- Exponential distance fog in the fragment shader
- Position ranking by laps and waypoints

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Track & Car Rendering](./step-1.md) | ~15min | Ground plane, track segments from waypoints, car body + roof from cubes |
| 2 | [Steering, Physics & AI](./step-2.md) | ~15min | Keyboard steering, friction model, on/off-track detection, waypoint-following AI |
| 3 | [Chase Camera, Laps & Positions](./step-3.md) | ~15min | Third-person chase camera, fog shader, lap counting, position ranking, countdown |

## Final Code

The complete source code is at [`src/contexts/webgl/games/racing-3d/`](../../../src/contexts/webgl/games/racing-3d/).

## Shared Utilities Used

- `@webgl/shared/WebGLUtils` — `createProgram`, `createBuffer`, `createVAO`
- `@webgl/shared/Mat4` — perspective, lookAt, identity, translate, scale, rotateY
- `@webgl/shared/Primitives` — `createCube`, `createPlane`

## Next Game

Continue to Voxel Builder — where you'll learn 3D grid data structures and occlusion culling.
