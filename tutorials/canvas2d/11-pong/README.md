# Pong — Tutorial

Build a complete **Pong** game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Intermediate
**Episodes:** 5
**Time:** ~1h 15min total
**Prerequisites:** [Snake](../10-snake/README.md)

## What You'll Build

The original arcade classic. Two paddles and a bouncing ball — play against a friend or a computer-controlled opponent. First to the target score wins.

## Concepts You'll Learn

- Real-time ball movement with velocity vectors
- Paddle-ball collision and reflection angles
- Simple AI for computer-controlled paddle
- Score-based win conditions
- Delta-time-based smooth animation

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Court Drawing](./step-1.md) | ~15min | Draw the court, net, paddles, and ball |
| 2 | [Ball Movement & Wall Bouncing](./step-2.md) | ~15min | Move the ball with velocity, bounce off top and bottom |
| 3 | [Paddle Controls & Collision](./step-3.md) | ~15min | Move paddles with keys, detect ball-paddle collisions |
| 4 | [AI Opponent & Scoring](./step-4.md) | ~15min | Add computer paddle AI, track and display scores |
| 5 | [Serve System & Polish](./step-5.md) | ~15min | Serve after each point, speed up over rallies, win screen |

## Final Code

The complete source code is at [`src/contexts/canvas2d/games/pong/`](../src/contexts/canvas2d/games/pong/).

## Next Game

Continue to [Breakout](../12-breakout/README.md) — where you'll learn brick layouts and multi-object collision →
