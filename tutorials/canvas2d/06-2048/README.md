# 2048 — Tutorial

Build a complete **2048** sliding-tile puzzle from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Beginner
**Episodes:** 5
**Time:** ~1h 15min total
**Prerequisites:** [Hangman](../05-hangman/README.md)

## What You'll Build

The addictive 2048 number puzzle. Slide tiles in four directions to merge matching numbers. Reach the 2048 tile to win, or keep going for a high score.

## Concepts You'll Learn

- Arrow-key input handling for four-directional movement
- Grid sliding and tile merging algorithms
- Spawning new tiles in empty cells
- Smooth tile-sliding animations
- Score tracking with high-score persistence

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Grid Rendering](./step-1.md) | ~15min | Draw a 4x4 grid with numbered, color-coded tiles |
| 2 | [Slide & Merge Logic](./step-2.md) | ~15min | Implement tile sliding and merging in one direction |
| 3 | [Four Directions & Spawning](./step-3.md) | ~15min | Handle all four arrow keys, spawn new tiles after each move |
| 4 | [Win & Game Over Detection](./step-4.md) | ~15min | Detect the 2048 tile and no-moves-left conditions |
| 5 | [Animations & High Score](./step-5.md) | ~15min | Slide animations, score display, localStorage high score |

## Final Code

The complete source code is at [`src/contexts/canvas2d/games/2048/`](../src/contexts/canvas2d/games/2048/).

## Next Game

Continue to [Simon Says](../07-simon-says/README.md) — where you'll learn sequence memorization and audio feedback →
