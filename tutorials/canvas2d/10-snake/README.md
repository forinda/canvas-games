# Snake — Tutorial

Build a complete **Snake** game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Beginner
**Episodes:** 5
**Time:** ~1h 15min total
**Prerequisites:** [Balloon Pop](../09-balloon-pop/README.md)

## What You'll Build

The classic Snake game. Guide a snake around the grid eating food to grow longer. Avoid hitting the walls or your own tail. The longer you survive, the higher your score.

## Concepts You'll Learn

- Grid-based continuous movement with a fixed timestep
- Linked-list-style body management (grow on eat)
- Self-collision detection
- Food spawning in unoccupied cells
- Increasing speed as the snake grows

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Grid Drawing](./step-1.md) | ~15min | Draw the game grid and a single snake segment |
| 2 | [Snake Movement & Direction](./step-2.md) | ~15min | Move the snake with arrow keys, prevent reversing |
| 3 | [Food & Growing](./step-3.md) | ~15min | Spawn food, grow the snake when it eats |
| 4 | [Collision & Game Over](./step-4.md) | ~15min | Detect wall and self-collision, show game-over screen |
| 5 | [Speed Scaling & High Score](./step-5.md) | ~15min | Increase speed with length, persist high scores |

## Final Code

The complete source code is at [`src/contexts/canvas2d/games/snake/`](../src/contexts/canvas2d/games/snake/).

## Next Game

Continue to [Pong](../11-pong/README.md) — where you'll learn real-time ball physics and paddle controls →
