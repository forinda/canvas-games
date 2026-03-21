# Word Search — Tutorial

Build a complete **Word Search** puzzle game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Intermediate
**Episodes:** 5
**Time:** ~1h 15min total
**Prerequisites:** [Sudoku](../31-sudoku/README.md)

## What You'll Build

A word search puzzle where words are hidden in a grid of letters. Drag across letters to select and find words. Words can be placed horizontally, vertically, or diagonally.

## Concepts You'll Learn

- Word placement algorithm (fit words in 8 directions)
- Drag-to-select interaction across grid cells
- Letter grid generation with random fill
- Highlight found words with colored overlays
- Word list display with strikethrough for found words

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Letter Grid](./step-1.md) | ~15min | Draw a grid of random letters on the canvas |
| 2 | [Word Placement Algorithm](./step-2.md) | ~15min | Place words into the grid in various directions |
| 3 | [Drag-to-Select Letters](./step-3.md) | ~15min | Click and drag across cells to highlight a selection |
| 4 | [Word Matching & Highlighting](./step-4.md) | ~15min | Check selections against the word list, highlight found words |
| 5 | [Word List Display & Polish](./step-5.md) | ~15min | Show the word list, cross off found words, win screen |

## Final Code

The complete source code is at [`src/contexts/canvas2d/games/word-search/`](../src/contexts/canvas2d/games/word-search/).

## Next Game

Continue to [Pipe Connect](../33-pipe-connect/README.md) — where you'll learn tile rotation puzzles and flow connectivity →
