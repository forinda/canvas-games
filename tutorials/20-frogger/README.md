# Frogger — Tutorial

Build a complete **Frogger** arcade game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Intermediate
**Episodes:** 6
**Time:** ~1h 30min total
**Prerequisites:** [Color Switch](../19-color-switch/README.md)

## What You'll Build

Guide a frog across busy roads and a dangerous river to reach home. Dodge cars, hop on logs, and avoid the water in this classic arcade recreation.

## Concepts You'll Learn

- Lane-based level layout with different hazard types
- Moving platforms (logs, turtles) the player rides on
- Multi-lane traffic patterns with varying speeds
- Discrete grid-based player movement
- Lives system with safe-zone checkpoints

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Lane Drawing](./step-1.md) | ~15min | Draw road lanes, river lanes, and safe zones |
| 2 | [Frog Movement](./step-2.md) | ~15min | Move the frog one cell at a time with arrow keys |
| 3 | [Traffic & Cars](./step-3.md) | ~15min | Cars scroll across road lanes at different speeds |
| 4 | [River, Logs & Riding](./step-4.md) | ~15min | Logs scroll across river lanes, frog rides on them |
| 5 | [Collision & Lives](./step-5.md) | ~15min | Die from cars or water, track lives, respawn |
| 6 | [Home Slots & Polish](./step-6.md) | ~15min | Fill all five home slots to win, level progression |

## Final Code

The complete source code is at [`src/games/frogger/`](../src/games/frogger/).

## Next Game

Continue to [Space Invaders](../21-space-invaders/README.md) — where you'll learn enemy formations and bullet mechanics →
