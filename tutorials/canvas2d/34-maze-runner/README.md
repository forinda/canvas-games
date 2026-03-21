# Maze Runner — Tutorial

Build a complete **Maze Runner** game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Intermediate
**Episodes:** 5
**Time:** ~1h 15min total
**Prerequisites:** [Pipe Connect](../33-pipe-connect/README.md)

## What You'll Build

Navigate through procedurally generated mazes. Move your character from start to finish as quickly as possible. Mazes grow larger and more complex as you progress.

## Concepts You'll Learn

- Maze generation using recursive backtracking
- Wall representation with a cell/wall data structure
- Player movement constrained by walls
- Fog-of-war revealing explored areas
- Timer-based speedrun scoring

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Maze Grid](./step-1.md) | ~15min | Draw a grid of cells with walls on all sides |
| 2 | [Maze Generation Algorithm](./step-2.md) | ~15min | Carve paths using recursive backtracking |
| 3 | [Player Movement Through Walls](./step-3.md) | ~15min | Move the player, block movement through walls |
| 4 | [Fog of War & Goal](./step-4.md) | ~15min | Reveal only nearby cells, detect reaching the exit |
| 5 | [Larger Mazes & Polish](./step-5.md) | ~15min | Increasing maze sizes, timer, breadcrumb trail |

## Final Code

The complete source code is at [`src/contexts/canvas2d/games/maze-runner/`](../src/contexts/canvas2d/games/maze-runner/).

## Next Game

Continue to [Match-3](../35-match3/README.md) — where you'll learn gem-swapping, cascade matching, and board refilling →
