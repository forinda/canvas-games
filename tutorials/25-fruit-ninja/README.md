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
| 1 | [Project Setup & Fruit Drawing](./step-1.md) | ~15min | Draw colorful fruit shapes on the canvas |
| 2 | [Fruit Tossing Physics](./step-2.md) | ~15min | Launch fruits upward from below with gravity arcs |
| 3 | [Swipe Detection & Slicing](./step-3.md) | ~15min | Track mouse movement, detect swipe intersections with fruit |
| 4 | [Slice Halves & Scoring](./step-4.md) | ~15min | Split sliced fruit into falling halves, track score |
| 5 | [Bombs, Combos & Polish](./step-5.md) | ~15min | Bombs that end the game, combo bonuses, blade trail effect |

## Final Code

The complete source code is at [`src/games/fruit-ninja/`](../src/games/fruit-ninja/).

## Next Game

Continue to [Typing Speed](../26-typing-speed/README.md) — where you'll learn real-time text input and WPM calculation →
