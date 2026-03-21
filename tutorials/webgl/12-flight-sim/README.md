# Flight Sim — Tutorial

Build an interactive **3D Flight Simulator** from scratch using TypeScript and raw WebGL2.

**Difficulty:** Intermediate–Advanced (WebGL)
**Episodes:** 4
**Time:** ~1h total
**Prerequisites:** Spinning Cube tutorial (01), familiarity with MVP matrices, mesh generation

## What You'll Build

A flight simulator where you fly a plane over procedurally generated terrain, collecting rings scattered above the landscape. Features value-noise heightmap generation, a multi-part plane model, pitch/roll/yaw flight controls with bank turning, ring collection with collision detection, a chase camera, and atmospheric fog.

## Concepts You'll Learn

- Procedural heightmap generation using multi-octave value noise
- Terrain mesh construction from a height grid (positions, normals, indices)
- Bilinear height interpolation for smooth terrain sampling
- Multi-part plane model from cubes (fuselage, wings, tail, stabilizer)
- Pitch/roll/yaw flight controls with bank-to-yaw coupling
- Ring rendering from sphere primitives in a circle pattern
- Sphere collision for ring collection
- Chase camera following the plane's heading
- Exponential fog for atmospheric depth

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Terrain Heightmap & Mesh](./step-1.md) | ~15min | Value noise heightmap, terrain mesh with computed normals |
| 2 | [Plane Model & Controls](./step-2.md) | ~15min | Multi-part plane from cubes, pitch/roll/yaw flight physics |
| 3 | [Ring Collection & Collision](./step-3.md) | ~15min | Rings from sphere primitives, sphere collision, ground crash detection |
| 4 | [Chase Camera & Fog](./step-4.md) | ~15min | Third-person chase camera, atmospheric fog, win/crash states |

## Final Code

The complete source code is at [`src/contexts/webgl/games/flight-sim/`](../../../src/contexts/webgl/games/flight-sim/).

## Shared Utilities Used

- `@webgl/shared/WebGLUtils` — `createProgram`, `createBuffer`, `createVAO`
- `@webgl/shared/Mat4` — perspective, lookAt, identity, translate, scale, rotateX/Y/Z
- `@webgl/shared/Primitives` — `createCube`, `createSphere`

## Next Game

Continue to Aquarium — where you'll learn boid flocking AI and underwater shading.
