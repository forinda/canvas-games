# Fruit Ninja — Tutorial

Build a complete **Fruit Ninja** slicing game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Intermediate
**Episodes:** 5
**Time:** ~1h 15min total
**Prerequisites:** [Tetris](../24-tetris/README.md)

## What You'll Build

Fruits are tossed into the air and you slice them by swiping across the screen with your mouse. Avoid bombs and don't let too many fruits fall unsliced.

## Concepts You'll Learn

- Mouse/touch swipe gesture detection and trail rendering
- Line-segment-to-circle intersection (slice detection)
- Objects tossed with parabolic arcs (launch physics)
- Splitting objects into halves on slice
- Blade trail effect using fading line segments

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Fruit & Gravity](./step-1.md) | ~15min | Define 6 fruit types, launch upward with parabolic arcs |
| 2 | [Mouse Trail & Slicing](./step-2.md) | ~15min | Track mouse as blade trail, line-circle intersection, split into halves |
| 3 | [Juice Particles & Combos](./step-3.md) | ~15min | Juice splash particles on slice, combo bonus for multi-slice swipes |
| 4 | [Bombs & Lives](./step-4.md) | ~15min | Bomb fruits that end the game, 3-life system for missed fruits |
| 5 | [Score, Waves & Polish](./step-5.md) | ~15min | High score, wave difficulty, start/pause/game-over overlays |

## Final Code

The complete source code is at [`src/contexts/canvas2d/games/fruit-ninja/`](../src/contexts/canvas2d/games/fruit-ninja/).

## Next Game

Continue to [Typing Speed](../26-typing-speed/README.md) — where you'll learn real-time text input and WPM calculation →
