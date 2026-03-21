# Simon Says — Tutorial

Build a complete **Simon Says** memory game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Beginner
**Episodes:** 4
**Time:** ~1h total
**Prerequisites:** [2048](../06-2048/README.md)

## What You'll Build

A color-and-sound memory game where the computer plays an ever-growing sequence of colors and you must repeat it back. One mistake and the game is over.

## Concepts You'll Learn

- Sequence playback with timed delays
- Audio feedback using the Web Audio API
- Comparing user input against a stored sequence
- Button highlight animations
- Increasing difficulty over rounds

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Color Buttons](./step-1.md) | ~15min | Draw four colored quadrants on the canvas |
| 2 | [Sequence Playback](./step-2.md) | ~15min | Generate and animate a growing color sequence |
| 3 | [Player Input & Validation](./step-3.md) | ~15min | Capture clicks, compare against the sequence |
| 4 | [Audio, Scoring & Polish](./step-4.md) | ~15min | Add tones for each color, track high round, speed up |

## Final Code

The complete source code is at [`src/contexts/canvas2d/games/simon-says/`](../src/contexts/canvas2d/games/simon-says/).

## Next Game

Continue to [Whack-a-Mole](../08-whack-a-mole/README.md) — where you'll learn timed spawning and hit detection →
