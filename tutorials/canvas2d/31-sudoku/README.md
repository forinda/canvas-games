# Sudoku — Tutorial

Build a complete **Sudoku** puzzle game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Advanced
**Episodes:** 6
**Time:** ~1h 30min total
**Prerequisites:** [Minesweeper](../30-minesweeper/README.md)

## What You'll Build

A full Sudoku puzzle game with generated puzzles, input validation, pencil marks, and hints. Fill the 9x9 grid so every row, column, and 3x3 box contains the digits 1-9.

## Concepts You'll Learn

- Sudoku puzzle generation and solver algorithms
- Row/column/box constraint validation
- Pencil-mark (candidate) note system
- Cell selection and number input via keyboard
- Hint system that reveals a correct cell

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Grid Rendering](./step-1.md) | ~15min | Draw the 9x9 Sudoku grid with thick box borders |
| 2 | [Cell Selection & Number Input](./step-2.md) | ~15min | Click to select cells, type numbers to fill them |
| 3 | [Validation & Error Highlighting](./step-3.md) | ~15min | Highlight conflicts in rows, columns, and boxes |
| 4 | [Pencil Marks](./step-4.md) | ~15min | Toggle candidate numbers as small notes in cells |
| 5 | [Puzzle Generation](./step-5.md) | ~15min | Generate valid puzzles with unique solutions |
| 6 | [Hints, Timer & Polish](./step-6.md) | ~15min | Hint button, elapsed timer, difficulty levels, completion screen |

## Final Code

The complete source code is at [`src/contexts/canvas2d/games/sudoku/`](../src/contexts/canvas2d/games/sudoku/).

## Next Game

Continue to [Word Search](../32-word-search/README.md) — where you'll learn word placement algorithms and drag-to-select →
