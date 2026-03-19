# Helicopter — Tutorial

Build a complete **Helicopter** cave-flyer game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Intermediate
**Episodes:** 4
**Time:** ~1h total
**Prerequisites:** [Flappy Bird](../13-flappy-bird/README.md)

## What You'll Build

A helicopter that flies through an endless, narrowing cave. Hold the mouse to thrust upward and release to fall. Avoid the cave ceiling, floor, and obstacles for as long as possible.

## Concepts You'll Learn

- Continuous thrust (hold vs. tap) input model
- Procedural terrain generation with narrowing corridors
- Smooth scrolling cave walls using line segments
- Obstacle spawning inside the cave
- Distance-based scoring

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Helicopter & Controls](./step-1.md) | ~15min | Draw helicopter with animated rotor, hold-to-rise / release-to-fall physics |
| 2 | [Cave Generation](./step-2.md) | ~15min | Procedural cave with random-walk walls, left-scrolling, gap narrows over time |
| 3 | [Obstacles & Collision](./step-3.md) | ~15min | Stalactite/stalagmite obstacles, cave wall and obstacle collision, death state |
| 4 | [Score, Speed & Polish](./step-4.md) | ~15min | Distance scoring, speed ramp, localStorage best, star background, death effects |

## Final Code

The complete source code is at [`src/games/helicopter/`](../src/games/helicopter/).

## Next Game

Continue to [Doodle Jump](../15-doodle-jump/README.md) — where you'll learn vertical scrolling and platform generation →
