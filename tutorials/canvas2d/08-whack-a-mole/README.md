# Whack-a-Mole — Tutorial

Build a complete **Whack-a-Mole** game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Beginner
**Episodes:** 4
**Time:** ~1h total
**Prerequisites:** [Simon Says](../07-simon-says/README.md)

## What You'll Build

A fast-paced reaction game where moles pop up from holes at random intervals. Click them before they disappear to earn points. The game speeds up as your score grows.

## Concepts You'll Learn

- Timed random spawning with setTimeout/setInterval
- Hit detection (click position vs. target area)
- Sprite-like animations (pop-up and hide)
- Countdown timer for timed gameplay
- Difficulty scaling over time

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Hole Grid](./step-1.md) | ~15min | Draw a grid of mole holes on the canvas |
| 2 | [Mole Pop-Up & Click Detection](./step-2.md) | ~15min | Randomly show moles, detect clicks on them |
| 3 | [Scoring & Countdown Timer](./step-3.md) | ~15min | Track score, add a 30-second countdown |
| 4 | [Speed Ramp & Polish](./step-4.md) | ~15min | Increase speed over time, add bonk animation, game-over screen |

## Final Code

The complete source code is at [`src/contexts/canvas2d/games/whack-a-mole/`](../src/contexts/canvas2d/games/whack-a-mole/).

## Next Game

Continue to [Balloon Pop](../09-balloon-pop/README.md) — where you'll learn floating object movement and click-to-destroy mechanics →
