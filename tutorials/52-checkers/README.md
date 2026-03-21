# Checkers -- Tutorial

Build a complete **Checkers** game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Intermediate
**Episodes:** 6
**Time:** ~1h 30min total
**Prerequisites:** [Brick Builder](../50-brick-builder/README.md)

## What You'll Build

A fully playable Checkers game with a classic wooden board, red and black pieces, click-to-move controls, forced captures, multi-jump chains, king promotion with crown rendering, two-player hot-seat mode, and a minimax AI opponent with alpha-beta pruning.

## Concepts You'll Learn

- 8x8 board layout with alternating light/dark squares
- Piece rendering with radial gradients and shadows
- Diagonal move validation for regular pieces and kings
- Forced capture rules and recursive multi-jump chains
- King promotion and crown drawing
- Game-over detection (no pieces or no legal moves)
- Minimax AI with alpha-beta pruning and positional evaluation
- Mode selector UI and HUD overlays

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Board Setup & Rendering](./step-1.md) | ~15min | Types, constants, and the 8x8 checkerboard with labels |
| 2 | [Piece Rendering & Selection](./step-2.md) | ~15min | Gradient pieces with shadows, click-to-select highlighting |
| 3 | [Move Validation & Jumps](./step-3.md) | ~15min | Diagonal moves, single jumps, legal move indicators |
| 4 | [Forced Captures & Multi-Jumps](./step-4.md) | ~15min | Mandatory captures, recursive jump chains, turn switching |
| 5 | [King Promotion & Game Logic](./step-5.md) | ~15min | Crown rendering, win/draw detection, undo, pause overlay |
| 6 | [AI Opponent & Polish](./step-6.md) | ~15min | Minimax with alpha-beta pruning, mode selector, HUD |

## Final Code

The complete source code is at [`src/games/checkers/`](../../src/games/checkers/).

## Next Game

Continue building your game development skills with the next tutorial in the series.
