# Asteroids — Tutorial

Build a complete **Asteroids** game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Intermediate
**Episodes:** 6
**Time:** ~1h 30min total
**Prerequisites:** [Space Invaders](../21-space-invaders/README.md)

## What You'll Build

Pilot a spaceship that can rotate and thrust in any direction. Shoot asteroids to break them into smaller pieces. Clear all asteroids to advance to the next wave.

## Concepts You'll Learn

- Rotational movement with thrust vectors (sin/cos)
- Screen wrapping for all entities
- Asteroid splitting into smaller fragments
- Polygon rendering with random jagged shapes
- Inertia-based movement (no friction in space)

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Ship Rendering](./step-1.md) | ~15min | Draw a triangular ship that rotates |
| 2 | [Rotation, Thrust & Inertia](./step-2.md) | ~15min | Rotate with keys, thrust forward, drift with inertia |
| 3 | [Shooting Bullets](./step-3.md) | ~15min | Fire bullets in the ship's facing direction |
| 4 | [Asteroid Spawning & Splitting](./step-4.md) | ~15min | Random asteroids that split into smaller pieces when hit |
| 5 | [Screen Wrapping & Collision](./step-5.md) | ~15min | All entities wrap around edges, asteroid-ship collision |
| 6 | [Waves, Scoring & Polish](./step-6.md) | ~15min | Increasing waves, score by size, lives, hyperspace |

## Final Code

The complete source code is at [`src/contexts/canvas2d/games/asteroids/`](../src/contexts/canvas2d/games/asteroids/).

## Next Game

Continue to [Pac-Man](../23-pacman/README.md) — where you'll learn maze navigation and enemy AI behaviors →
