# Space Invaders — Tutorial

Build a complete **Space Invaders** game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Intermediate
**Episodes:** 6
**Time:** ~1h 30min total
**Prerequisites:** [Frogger](../20-frogger/README.md)

## What You'll Build

The classic alien-shooting arcade game. Move your ship left and right, fire bullets upward at a marching grid of aliens. They descend row by row — stop them before they reach the bottom.

## Concepts You'll Learn

- Enemy formation movement (march, drop, reverse)
- Bullet spawning and management (player and enemy)
- Entity-vs-entity collision detection
- Destructible shields / barriers
- Wave progression with increasing difficulty

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Player Ship & Movement](./step-1.md) | ~15min | Draw player ship, left/right movement, shooting bullets upward |
| 2 | [Alien Grid & Movement](./step-2.md) | ~15min | 5x11 alien grid, side-to-side movement, step down at edge |
| 3 | [Bullet-Alien Collision](./step-3.md) | ~15min | Player bullets destroy aliens, score tracking, speed-up |
| 4 | [Alien Shooting & Shields](./step-4.md) | ~15min | Aliens shoot back randomly, 4 destructible shield barriers |
| 5 | [UFO Bonus & Waves](./step-5.md) | ~15min | Random UFO for bonus points, wave progression, difficulty scaling |
| 6 | [Lives, Score & Polish](./step-6.md) | ~15min | 3 lives, high score, pixel-art sprites, pause, overlays |

## Final Code

The complete source code is at [`src/contexts/canvas2d/games/space-invaders/`](../src/contexts/canvas2d/games/space-invaders/).

## Next Game

Continue to [Asteroids](../22-asteroids/README.md) — where you'll learn rotational movement and asteroid splitting →
