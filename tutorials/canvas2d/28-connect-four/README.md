# Connect Four — Tutorial

Build a complete **Connect Four** game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Intermediate
**Episodes:** 5
**Time:** ~1h 15min total
**Prerequisites:** [Rhythm Tap](../27-rhythm-tap/README.md)

## What You'll Build

The classic two-player strategy game. Drop colored discs into a 7-column grid. The first player to connect four discs in a row (horizontally, vertically, or diagonally) wins.

## Concepts You'll Learn

- Column-drop mechanics with gravity animation
- Four-in-a-row detection in all directions
- Hover preview showing where a disc will land
- Simple AI opponent using basic heuristics
- Drop animation with easing

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Board Rendering](./step-1.md) | ~15min | Draw the 7x6 grid with circular slots |
| 2 | [Disc Dropping & Turns](./step-2.md) | ~15min | Click a column to drop a disc, alternate turns |
| 3 | [Win Detection](./step-3.md) | ~15min | Check for four in a row horizontally, vertically, diagonally |
| 4 | [AI Opponent](./step-4.md) | ~15min | Computer player that blocks wins and seeks its own |
| 5 | [Drop Animation & Polish](./step-5.md) | ~15min | Animated disc drop, column hover preview, winning highlight |

## Final Code

The complete source code is at [`src/contexts/canvas2d/games/connect-four/`](../src/contexts/canvas2d/games/connect-four/).

## Next Game

Continue to [Sokoban](../29-sokoban/README.md) — where you'll learn box-pushing puzzle logic and undo systems →
