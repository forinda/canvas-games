# Pac-Man — Tutorial

Build a complete **Pac-Man** game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Advanced
**Episodes:** 7
**Time:** ~1h 45min total
**Prerequisites:** [Asteroids](../22-asteroids/README.md)

## What You'll Build

The iconic maze-chase game. Navigate Pac-Man through a maze eating dots while avoiding four ghosts, each with unique AI behavior. Eat power pellets to turn the tables and chase the ghosts.

## Concepts You'll Learn

- Tile-based maze rendering from a 2D map array
- Unique enemy AI behaviors (chase, scatter, frightened)
- Pathfinding with target tiles per ghost
- Power-up state that reverses hunter/prey roles
- Animated mouth and ghost sprite rendering

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Maze Rendering](./step-1.md) | ~15min | Draw the maze from a tile map array |
| 2 | [Pac-Man Movement](./step-2.md) | ~15min | Move Pac-Man through the maze with arrow keys |
| 3 | [Dot Eating & Score](./step-3.md) | ~15min | Eat dots and power pellets, track score |
| 4 | [Ghost Rendering & Basic Movement](./step-4.md) | ~15min | Draw four ghosts that move through the maze |
| 5 | [Ghost AI Behaviors](./step-5.md) | ~15min | Each ghost targets differently (Blinky chases, Pinky ambushes, etc.) |
| 6 | [Power Pellets & Frightened Mode](./step-6.md) | ~15min | Ghosts turn blue and flee when a power pellet is eaten |
| 7 | [Levels, Lives & Polish](./step-7.md) | ~15min | Level progression, extra lives, fruit bonuses, animations |

## Final Code

The complete source code is at [`src/games/pacman/`](../src/games/pacman/).

## Next Game

Continue to [Tetris](../24-tetris/README.md) — where you'll learn piece rotation systems and line-clearing mechanics →
