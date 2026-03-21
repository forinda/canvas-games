# Tower Defense — Tutorial

Build a complete **Tower Defense** game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Advanced
**Episodes:** 8
**Time:** ~2h total
**Prerequisites:** [Ant Colony](../46-ant-colony/README.md)

## What You'll Build

A tower defense game where enemies follow a path and you place towers along the route to destroy them. Earn currency from kills to build and upgrade towers. Survive all waves to win.

## Concepts You'll Learn

- Pathfinding along predefined waypoints
- Tower targeting (nearest, strongest, first)
- Projectile tracking toward moving targets
- Wave definition and spawning schedules
- Tower upgrade trees and placement validation

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Map Rendering](./step-1.md) | ~15min | Draw the map with a path from entry to exit |
| 2 | [Enemy Spawning & Pathing](./step-2.md) | ~15min | Enemies spawn and follow the waypoint path |
| 3 | [Tower Placement](./step-3.md) | ~15min | Click to place towers along the path edges |
| 4 | [Tower Shooting & Projectiles](./step-4.md) | ~15min | Towers target enemies and fire projectiles |
| 5 | [Damage, Health & Currency](./step-5.md) | ~15min | Enemies take damage and die, earn currency from kills |
| 6 | [Wave System](./step-6.md) | ~15min | Define waves with different enemy types and counts |
| 7 | [Tower Upgrades](./step-7.md) | ~15min | Upgrade towers for more damage, range, or speed |
| 8 | [Lives, UI & Polish](./step-8.md) | ~15min | Lives system, wave preview, tower range display, victory screen |

## Final Code

The complete source code is at [`src/contexts/canvas2d/games/tower-defense/`](../src/contexts/canvas2d/games/tower-defense/).

## Next Game

Continue to [Fishing](../48-fishing/README.md) — where you'll learn cast-and-reel mechanics and tension-based minigames →
