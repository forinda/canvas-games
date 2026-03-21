# Voxel Builder — Tutorial

Build an interactive **3D Voxel Builder** from scratch using TypeScript and raw WebGL2.

**Difficulty:** Intermediate (WebGL)
**Episodes:** 3
**Time:** ~45min total
**Prerequisites:** Spinning Cube tutorial (01), familiarity with MVP matrices and orbital camera

## What You'll Build

A Minecraft-inspired voxel editor where you navigate a 3D cursor through a 16x16x16 grid, place and remove colored blocks from 8 material types, and orbit the camera around your creation. Features occlusion culling to skip rendering fully buried blocks.

## Concepts You'll Learn

- 3D array data structures for voxel grids (`grid[y][z][x]`)
- Keyboard-driven 3D cursor navigation
- Block placement and removal in a sparse voxel grid
- Occlusion culling — skipping voxels surrounded on all 6 sides
- Transparent cursor rendering with alpha blending
- Block type palette with visual selection indicator
- Edge-darkened voxel shading for a blocky aesthetic

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Grid & Block Rendering](./step-1.md) | ~15min | 3D voxel grid, ground plane with grid lines, cube rendering per voxel |
| 2 | [Cursor & Place/Remove](./step-2.md) | ~15min | Keyboard cursor movement, block placement, block removal, palette selection |
| 3 | [Block Types & Occlusion Culling](./step-3.md) | ~15min | 8 material types, occlusion culling, edge-darkened shader, palette display |

## Final Code

The complete source code is at [`src/contexts/webgl/games/voxel-builder/`](../../../src/contexts/webgl/games/voxel-builder/).

## Shared Utilities Used

- `@webgl/shared/WebGLUtils` — `createProgram`, `createBuffer`, `createVAO`
- `@webgl/shared/Mat4` — perspective, identity, translate, scale
- `@webgl/shared/Camera` — `OrbitalCamera`
- `@webgl/shared/Primitives` — `createCube`, `createPlane`

## Next Game

Continue to Chess 3D — where you'll learn piece rendering from primitives and ray-picking.
