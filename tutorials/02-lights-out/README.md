# Lights Out — Tutorial

Build a complete **Lights Out** puzzle game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Beginner
**Episodes:** 4
**Time:** ~1h total
**Prerequisites:** [Reaction Timer](../01-reaction-timer/README.md)

## What You'll Build

A classic grid-based puzzle where clicking a cell toggles it and its neighbors on or off. Your goal is to turn all the lights out.

## Concepts You'll Learn

- Rendering a 2D grid on Canvas
- Toggle logic (flipping a cell and its neighbors)
- Win-condition detection
- Move counting and reset functionality

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Grid Rendering](./step-1.md) | ~15min | Draw a 5x5 grid of colored cells on the canvas |
| 2 | [Click to Toggle](./step-2.md) | ~15min | Click a cell to toggle it and its orthogonal neighbors |
| 3 | [Win Detection & Restart](./step-3.md) | ~15min | Detect when all lights are off, show a win screen, add restart |
| 4 | [Move Counter & Polish](./step-4.md) | ~15min | Track moves, add animations, randomize starting puzzles |

## Final Code

The complete source code is at [`src/games/lights-out/`](../src/games/lights-out/).

## Next Game

Continue to [Memory Match](../03-memory-match/README.md) — where you'll learn card-flip animations and pair-matching logic →
