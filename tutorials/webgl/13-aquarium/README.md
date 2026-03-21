# Aquarium — Tutorial

Build an interactive **3D Aquarium** from scratch using TypeScript and raw WebGL2.

**Difficulty:** Intermediate–Advanced (WebGL)
**Episodes:** 3
**Time:** ~45min total
**Prerequisites:** Spinning Cube tutorial (01), familiarity with orbital camera and scene composition

## What You'll Build

A virtual aquarium with 15 colorful fish exhibiting boid flocking behavior, animated tails, decorations (rocks, seaweed), food particles that sink, rising bubbles, and an underwater caustic lighting effect in the fragment shader. Click or press Space to drop food and watch the fish swarm toward it.

## Concepts You'll Learn

- Tank scene construction with floor, walls, rocks, and animated seaweed
- Boid flocking AI with separation, alignment, and cohesion rules
- Food attraction as an additional steering force
- Animated fish tails using sine-wave rotation
- HSL-to-RGB color generation for varied fish colors
- Underwater caustic shader effect using sin/sin wave interference
- Depth-based blue tinting for underwater atmosphere
- Rising bubble animation with time-based positioning

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Tank & Decorations](./step-1.md) | ~15min | Sand floor, glass walls, rocks, animated seaweed, orbital camera |
| 2 | [Fish Boid Flocking AI](./step-2.md) | ~15min | 15 fish with separation/alignment/cohesion, tank bounds, tail animation |
| 3 | [Food, Caustics & Bubbles](./step-3.md) | ~15min | Click-to-feed, food attraction, caustic shader, depth tinting, bubbles |

## Final Code

The complete source code is at [`src/contexts/webgl/games/aquarium/`](../../../src/contexts/webgl/games/aquarium/).

## Shared Utilities Used

- `@webgl/shared/WebGLUtils` — `createProgram`, `createBuffer`, `createVAO`
- `@webgl/shared/Mat4` — perspective, identity, translate, scale, rotateY
- `@webgl/shared/Camera` — `OrbitalCamera`
- `@webgl/shared/Primitives` — `createCube`, `createSphere`

## Next Game

Continue to Planet Builder — where you'll learn sphere deformation, dynamic buffers, and altitude-based shading.
