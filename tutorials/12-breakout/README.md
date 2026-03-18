# Breakout — Tutorial

Build a complete **Breakout** brick-breaking game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Intermediate
**Episodes:** 6
**Time:** ~1h 30min total
**Prerequisites:** [Pong](../11-pong/README.md)

## What You'll Build

A paddle-and-ball game where you destroy rows of colored bricks. Bounce the ball off your paddle to break bricks above. Clear all bricks to advance to harder levels.

## Concepts You'll Learn

- Brick grid layout and destruction tracking
- Ball-to-rectangle collision with edge detection
- Power-ups (multi-ball, wider paddle, etc.)
- Level progression with new brick patterns
- Lives system and ball-launch mechanics

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Brick Layout](./step-1.md) | ~15min | Draw rows of colored bricks on the canvas |
| 2 | [Ball & Paddle Movement](./step-2.md) | ~15min | Move the paddle with mouse/keys, launch the ball |
| 3 | [Brick Collision & Destruction](./step-3.md) | ~15min | Detect ball-brick collisions, remove hit bricks |
| 4 | [Scoring & Lives](./step-4.md) | ~15min | Track score per brick, lose a life when the ball falls |
| 5 | [Power-Ups](./step-5.md) | ~15min | Falling power-ups from broken bricks (wide paddle, multi-ball) |
| 6 | [Levels & Polish](./step-6.md) | ~15min | Multiple brick patterns, increasing speed, victory screen |

## Final Code

The complete source code is at [`src/games/breakout/`](../src/games/breakout/).

## Next Game

Continue to [Flappy Bird](../13-flappy-bird/README.md) — where you'll learn gravity physics and obstacle scrolling →
