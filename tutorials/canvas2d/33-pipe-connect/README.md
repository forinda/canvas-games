# Pipe Connect — Tutorial

Build a complete **Pipe Connect** puzzle game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Intermediate
**Episodes:** 5
**Time:** ~1h 15min total
**Prerequisites:** [Word Search](../32-word-search/README.md)

## What You'll Build

A pipe-rotation puzzle where you click tiles to rotate pipe segments until water can flow from the source to the drain. Connect all pipes to complete the puzzle.

## Concepts You'll Learn

- Tile rotation mechanics (90-degree increments)
- Flow/connectivity checking using graph traversal
- Pipe segment types (straight, corner, T-junction, cross)
- Water flow animation through connected pipes
- Puzzle generation with guaranteed solvability

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Pipe Tile Rendering](./step-1.md) | ~15min | Draw different pipe shapes on grid tiles |
| 2 | [Click to Rotate Tiles](./step-2.md) | ~15min | Click a tile to rotate it 90 degrees |
| 3 | [Connectivity Checking](./step-3.md) | ~15min | Check if pipes form a connected path from source to drain |
| 4 | [Water Flow Animation](./step-4.md) | ~15min | Animate water flowing through connected pipes |
| 5 | [Puzzle Generation & Polish](./step-5.md) | ~15min | Generate solvable puzzles, level progression, move counter |

## Final Code

The complete source code is at [`src/contexts/canvas2d/games/pipe-connect/`](../src/contexts/canvas2d/games/pipe-connect/).

## Next Game

Continue to [Maze Runner](../34-maze-runner/README.md) — where you'll learn maze generation algorithms and pathfinding →
