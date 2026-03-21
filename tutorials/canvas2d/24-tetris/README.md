# Tetris — Tutorial

Build a complete **Tetris** game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Advanced
**Episodes:** 7
**Time:** ~1h 45min total
**Prerequisites:** [Pac-Man](../23-pacman/README.md)

## What You'll Build

The legendary falling-block puzzle game. Rotate and position tetrominoes as they fall to complete horizontal lines. Cleared lines disappear and everything above drops down.

## Concepts You'll Learn

- Tetromino shapes defined as rotation matrices
- Piece rotation with wall-kick logic
- Line-clearing detection and row collapse
- Next-piece preview and hold system
- Gravity speed increase per level

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Board Rendering](./step-1.md) | ~15min | Draw the 10x20 game board grid |
| 2 | [Tetromino Shapes & Spawning](./step-2.md) | ~15min | Define all 7 tetrominoes, spawn them at the top |
| 3 | [Movement & Rotation](./step-3.md) | ~15min | Move pieces left/right/down, rotate with wall kicks |
| 4 | [Locking & Line Clearing](./step-4.md) | ~15min | Lock pieces in place, detect and clear full lines |
| 5 | [Scoring & Levels](./step-5.md) | ~15min | Score based on lines cleared, increase speed per level |
| 6 | [Next Piece & Hold](./step-6.md) | ~15min | Preview next piece, hold/swap current piece |
| 7 | [Game Over & Polish](./step-7.md) | ~15min | Stack-out detection, line-clear animation, high scores |

## Final Code

The complete source code is at [`src/contexts/canvas2d/games/tetris/`](../src/contexts/canvas2d/games/tetris/).

## Next Game

Continue to [Fruit Ninja](../25-fruit-ninja/README.md) — where you'll learn swipe gesture detection and slicing mechanics →
