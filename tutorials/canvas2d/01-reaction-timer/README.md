# Reaction Timer — Tutorial

Build a complete **Reaction Timer** game from scratch using TypeScript and HTML5 Canvas. This is the first game in the series and introduces the core skills you'll use in every game.

**Difficulty:** Beginner
**Episodes:** 3
**Time:** ~45 minutes total
**Prerequisites:** Basic TypeScript knowledge

## What You'll Build

A full-screen reaction time tester: the screen turns red (wait), then green (click NOW!). Click too early = blue screen penalty. After 5 rounds, see your average reaction time.

## Concepts You'll Learn

- Setting up a Vite + TypeScript + Canvas project
- Canvas rendering basics (fillRect, fillText, colors)
- Game states and transitions (waiting → ready → result)
- Mouse click event handling
- Timing with `performance.now()`
- requestAnimationFrame game loop
- localStorage for persisting best scores

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Canvas Basics](./step-1.md) | ~15min | Vite project, canvas element, full-screen colored rectangle |
| 2 | [Game States & Click Handling](./step-2.md) | ~15min | Red/green/blue screens, click detection, reaction timing |
| 3 | [Rounds, Scoring & Polish](./step-3.md) | ~15min | 5-round system, average/best tracking, localStorage, overlays |

## Final Code

The complete source code is at [`src/contexts/canvas2d/games/reaction-timer/`](../src/contexts/canvas2d/games/reaction-timer/).

## Next Game

Continue to [Lights Out](../02-lights-out/README.md) — where you'll learn grid rendering and toggle logic →
