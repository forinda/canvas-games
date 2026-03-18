# Match-3 — Tutorial

Build a complete **Match-3** gem-swapping puzzle from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Advanced
**Episodes:** 6
**Time:** ~1h 30min total
**Prerequisites:** [Maze Runner](../34-maze-runner/README.md)

## What You'll Build

A gem-swapping puzzle game in the style of Bejeweled. Swap adjacent gems to create rows or columns of three or more matching gems. Matched gems disappear and new ones fall in from above.

## Concepts You'll Learn

- Swap-and-match detection (horizontal and vertical runs)
- Cascade/chain reactions when new matches form after drops
- Gravity-based gem falling and board refilling
- Swap animation with tweening
- No-valid-moves detection and board reshuffle

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Gem Grid](./step-1.md) | ~15min | Draw a grid of colorful gems on the canvas |
| 2 | [Gem Swapping](./step-2.md) | ~15min | Click two adjacent gems to swap them |
| 3 | [Match Detection & Removal](./step-3.md) | ~15min | Find runs of 3+ matching gems and remove them |
| 4 | [Gravity & Refill](./step-4.md) | ~15min | Gems fall down to fill gaps, new gems drop from top |
| 5 | [Cascades & Chain Scoring](./step-5.md) | ~15min | Detect new matches after drops, combo multiplier scoring |
| 6 | [Animations & Polish](./step-6.md) | ~15min | Swap tweening, pop effects, no-moves detection, levels |

## Final Code

The complete source code is at [`src/games/match3/`](../src/games/match3/).

## Next Game

Continue to [Gravity Ball](../36-gravity-ball/README.md) — where you'll learn gravity switching and momentum-based puzzles →
