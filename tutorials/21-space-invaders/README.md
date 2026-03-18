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
| 1 | [Project Setup & Ship Rendering](./step-1.md) | ~15min | Draw the player ship and alien grid |
| 2 | [Ship Movement & Shooting](./step-2.md) | ~15min | Move the ship with keys, fire bullets upward |
| 3 | [Alien Formation & Marching](./step-3.md) | ~15min | Aliens march side to side and descend |
| 4 | [Bullet-Alien Collision](./step-4.md) | ~15min | Bullets destroy aliens, aliens shoot back |
| 5 | [Shields & Lives](./step-5.md) | ~15min | Destructible shields, player lives, alien reach = game over |
| 6 | [Waves & Polish](./step-6.md) | ~15min | Faster waves, score multipliers, UFO bonus |

## Final Code

The complete source code is at [`src/games/space-invaders/`](../src/games/space-invaders/).

## Next Game

Continue to [Asteroids](../22-asteroids/README.md) — where you'll learn rotational movement and asteroid splitting →
