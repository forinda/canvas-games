# Physics Puzzle — Tutorial

Build a complete **Physics Puzzle** game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Advanced
**Episodes:** 6
**Time:** ~1h 30min total
**Prerequisites:** [Gravity Ball](../36-gravity-ball/README.md)

## What You'll Build

A physics-based puzzle game where you draw lines and shapes to guide a ball into a goal. Use ramps, seesaws, and other objects to create a Rube Goldberg-style chain of events.

## Concepts You'll Learn

- Simple rigid body physics (gravity, velocity, mass)
- Circle-to-line and circle-to-rectangle collision response
- Drawing lines on canvas that become physics objects
- Pivot joints and seesaw mechanics
- Simulation stepping with fixed timestep

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Physics World](./step-1.md) | ~15min | Set up a physics simulation with gravity and a ball |
| 2 | [Static Platforms & Collision](./step-2.md) | ~15min | Add static platforms, detect and resolve collisions |
| 3 | [Draw-to-Create Lines](./step-3.md) | ~15min | Draw lines with the mouse that become physical ramps |
| 4 | [Dynamic Objects & Interactions](./step-4.md) | ~15min | Add boxes, seesaws, and bouncy surfaces |
| 5 | [Goal Detection & Levels](./step-5.md) | ~15min | Ball reaching the goal completes the level, load next |
| 6 | [Undo, Reset & Polish](./step-6.md) | ~15min | Undo drawn lines, restart simulation, star rating |

## Final Code

The complete source code is at [`src/contexts/canvas2d/games/physics-puzzle/`](../src/contexts/canvas2d/games/physics-puzzle/).

## Next Game

Continue to [Card Battle](../38-card-battle/README.md) — where you'll learn card game systems and turn-based combat →
