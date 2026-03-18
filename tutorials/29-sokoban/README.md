# Sokoban — Tutorial

Build a complete **Sokoban** box-pushing puzzle from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Intermediate
**Episodes:** 5
**Time:** ~1h 15min total
**Prerequisites:** [Connect Four](../28-connect-four/README.md)

## What You'll Build

A classic warehouse puzzle game. Push boxes onto target locations. You can only push (not pull) one box at a time. Plan your moves carefully — boxes can get stuck against walls.

## Concepts You'll Learn

- Box-pushing mechanics (push validation, wall blocking)
- Level loading from string-based map definitions
- Undo/redo move history stack
- Goal-completion detection (all boxes on targets)
- Multiple puzzle levels of increasing difficulty

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Level Rendering](./step-1.md) | ~15min | Parse a level string and draw walls, floors, and targets |
| 2 | [Player Movement & Box Pushing](./step-2.md) | ~15min | Move the player, push boxes, block illegal moves |
| 3 | [Win Detection & Level Loading](./step-3.md) | ~15min | Detect all boxes on targets, load the next level |
| 4 | [Undo System](./step-4.md) | ~15min | Track move history, undo with a keypress |
| 5 | [Move Counter & Polish](./step-5.md) | ~15min | Count moves, level select screen, smooth movement |

## Final Code

The complete source code is at [`src/games/sokoban/`](../src/games/sokoban/).

## Next Game

Continue to [Minesweeper](../30-minesweeper/README.md) — where you'll learn flood-fill reveal and mine-counting logic →
