# Chess -- Tutorial

Build a complete **Chess** game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Advanced
**Episodes:** 6
**Time:** ~2h total
**Prerequisites:** [Platformer](../41-platformer/README.md)

## What You'll Build

A fully-featured chess game with an alternating-color board, Unicode piece rendering, click-to-select-and-move interaction, full move validation for all six piece types, check/checkmate/stalemate detection, a minimax AI opponent with alpha-beta pruning, and special moves including castling, en passant, and pawn promotion.

## Concepts You'll Learn

- Board game state management with an 8x8 grid of typed cells
- Piece rendering using Unicode chess symbols on a Canvas
- Move generation for sliding, jumping, and pawn-specific movement
- Filtering pseudo-legal moves to enforce check constraints
- Minimax tree search with alpha-beta pruning for AI
- Piece-square tables for positional evaluation
- Special move handling: castling, en passant, pawn promotion

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Board Setup & Rendering](./step-1.md) | ~20min | Types, initial board, alternating-color grid, and piece rendering |
| 2 | [Selection & Input Handling](./step-2.md) | ~20min | Click-to-select pieces, highlight selected square, and input system |
| 3 | [Move Validation & Legal Moves](./step-3.md) | ~25min | Pseudo-legal move generation for all piece types, legal move filtering |
| 4 | [Executing Moves & Game Flow](./step-4.md) | ~20min | Move execution, turn switching, captured pieces, move history with notation |
| 5 | [Check, Checkmate & Special Moves](./step-5.md) | ~20min | Check/checkmate/stalemate detection, castling, en passant, pawn promotion |
| 6 | [AI Opponent with Minimax](./step-6.md) | ~20min | Minimax with alpha-beta pruning, piece-square tables, game mode selection |

## Final Code

The complete source code is at [`src/games/chess/`](../../src/games/chess/).

## Next Game

Continue to the next tutorial in the series to keep building your game development skills.
