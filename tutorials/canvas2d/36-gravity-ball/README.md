# Gravity Ball — Tutorial

Build a complete **Gravity Ball** puzzle-platformer from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Intermediate
**Episodes:** 5
**Time:** ~1h 15min total
**Prerequisites:** [Match-3](../35-match3/README.md)

## What You'll Build

A puzzle-platformer where you control the direction of gravity. Flip gravity up, down, left, or right to guide a ball through obstacle-filled levels to reach the exit.

## Concepts You'll Learn

- Gravity direction switching (four directions)
- Momentum and inertia when gravity changes
- Tile-based level design with hazards
- Ball-to-wall collision with sliding
- Level progression with increasing complexity

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Level Rendering](./step-1.md) | ~15min | Draw a tile-based level with walls and the ball |
| 2 | [Gravity & Ball Physics](./step-2.md) | ~15min | Ball falls in the current gravity direction |
| 3 | [Gravity Switching Controls](./step-3.md) | ~15min | Press arrow keys to change gravity direction |
| 4 | [Hazards & Goal Detection](./step-4.md) | ~15min | Spikes kill the ball, reaching the exit completes the level |
| 5 | [Multiple Levels & Polish](./step-5.md) | ~15min | Several puzzle levels, death animation, move counter |

## Final Code

The complete source code is at [`src/contexts/canvas2d/games/gravity-ball/`](../src/contexts/canvas2d/games/gravity-ball/).

## Next Game

Continue to [Physics Puzzle](../37-physics-puzzle/README.md) — where you'll learn rigid body simulation and constraint solving →
