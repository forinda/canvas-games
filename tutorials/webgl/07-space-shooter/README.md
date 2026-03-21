# Space Shooter — Tutorial

Build a **3D Space Shooter** with a movable ship, bullets, asteroids, enemies, explosions, and a lives system.

**Difficulty:** Intermediate (WebGL)
**Episodes:** 3
**Time:** ~45min total
**Prerequisites:** Spinning Cube tutorial (01)

## What You'll Build

A top-down space shooter rendered in 3D. Your ship (body + wings + glowing engine) moves via mouse and keyboard. Green bullets fly forward. Asteroids tumble toward you with varying sizes and HP. Red enemy ships strafe and shoot back. Explosions bloom as expanding glowing spheres. Three lives, score on kills, increasing spawn rate.

## Concepts You'll Learn

- Multi-part ship rendering (body, wings, engine glow)
- Projectile system with cooldown and object pooling via arrays
- Asteroid spawning with random size, speed, rotation, and HP
- Enemy AI with strafing movement and periodic shooting
- Sphere-based explosion effects using emissive + scale animation
- Invulnerability timer with visual blink feedback

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Ship & Shooting](./step-1.md) | ~15min | Emissive shader, multi-part ship, mouse + keyboard input, bullet system |
| 2 | [Asteroids & Enemies](./step-2.md) | ~15min | Asteroid spawning with tumble, enemy ships with strafing AI, bullet-target collision |
| 3 | [Explosions, Lives & Scoring](./step-3.md) | ~15min | Expanding explosion spheres, lives system, invulnerability blink, game registration |

## Final Code

The complete source code is at [`src/contexts/webgl/games/space-shooter/`](../../../src/contexts/webgl/games/space-shooter/).

## Shared Utilities Used

- `@webgl/shared/WebGLUtils` — `createProgram`, `createBuffer`, `createVAO`
- `@webgl/shared/Mat4` — perspective, lookAt, translate, scale, rotateX/Y, identity
- `@webgl/shared/Primitives` — `createCube`, `createSphere`

## Previous Game

This is the final WebGL tutorial! You've learned shaders, lighting, physics, procedural generation, camera systems, and game state management.
