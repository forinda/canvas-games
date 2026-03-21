# Memory Match — Tutorial

Build a complete **Memory Match** card game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Beginner
**Episodes:** 5
**Time:** ~1h 15min total
**Prerequisites:** [Lights Out](../02-lights-out/README.md)

## What You'll Build

A card-matching memory game where you flip two cards at a time, trying to find all matching pairs. Track your moves and time to beat your best score.

## Concepts You'll Learn

- Card-flip reveal/hide animations
- Pair-matching logic with temporary display
- Shuffling algorithms (Fisher-Yates)
- Timer-based gameplay tracking
- Rendering icons and symbols on Canvas

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Card Grid](./step-1.md) | ~15min | Render a grid of face-down cards on the canvas |
| 2 | [Card Flipping & Reveal](./step-2.md) | ~15min | Click to flip cards, show symbols underneath |
| 3 | [Pair Matching Logic](./step-3.md) | ~15min | Check for matches, keep or hide pairs after a delay |
| 4 | [Scoring & Win Screen](./step-4.md) | ~15min | Track moves and time, detect when all pairs are found |
| 5 | [Shuffle, Levels & Polish](./step-5.md) | ~15min | Fisher-Yates shuffle, difficulty levels, flip animations |

## Final Code

The complete source code is at [`src/contexts/canvas2d/games/memory-match/`](../src/contexts/canvas2d/games/memory-match/).

## Next Game

Continue to [Tic-Tac-Toe](../04-tic-tac-toe/README.md) — where you'll learn turn-based gameplay and simple AI →
