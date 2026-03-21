# Color Switch — Tutorial

Build a complete **Color Switch** game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Intermediate
**Episodes:** 5
**Time:** ~1h 15min total
**Prerequisites:** [Lava Floor](../18-lava-floor/README.md)

## What You'll Build

A vertical-scrolling game where a colored ball bounces upward through rotating multi-colored obstacles. You can only pass through the section of each obstacle that matches your ball's current color.

## Concepts You'll Learn

- Color-matching collision logic
- Rotating obstacles with Canvas transformations (rotate, translate)
- Color-switch pickups that change the ball's color
- Arc and ring drawing for circular obstacles
- Precise angular collision detection

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Ball Rendering](./step-1.md) | ~15min | Draw a colored ball and a static multi-colored ring |
| 2 | [Tap-to-Jump & Scrolling](./step-2.md) | ~15min | Tap to bounce upward, scroll the world down |
| 3 | [Rotating Obstacles](./step-3.md) | ~15min | Obstacles rotate continuously, different shapes |
| 4 | [Color Matching & Gates](./step-4.md) | ~15min | Pass through matching colors, die on mismatches |
| 5 | [Color Switches & Polish](./step-5.md) | ~15min | Pickups that change ball color, scoring, effects |

## Final Code

The complete source code is at [`src/contexts/canvas2d/games/color-switch/`](../src/contexts/canvas2d/games/color-switch/).

## Next Game

Continue to [Frogger](../20-frogger/README.md) — where you'll learn lane-based movement and traffic patterns →
