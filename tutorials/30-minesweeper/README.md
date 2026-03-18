# Minesweeper — Tutorial

Build a complete **Minesweeper** game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Intermediate
**Episodes:** 5
**Time:** ~1h 15min total
**Prerequisites:** [Sokoban](../29-sokoban/README.md)

## What You'll Build

The classic mine-finding puzzle. Click cells to reveal them — numbers tell you how many adjacent mines exist. Flag suspected mines with right-click. Reveal all safe cells to win.

## Concepts You'll Learn

- Mine placement with first-click safety guarantee
- Neighbor counting algorithm (adjacent mine count)
- Flood-fill auto-reveal for zero-count cells
- Right-click flagging mechanics
- Timer and remaining-mine counter

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Grid Rendering](./step-1.md) | ~15min | Draw a grid of covered cells on the canvas |
| 2 | [Mine Placement & Neighbor Counts](./step-2.md) | ~15min | Place mines randomly, calculate neighbor counts |
| 3 | [Click to Reveal & Flood Fill](./step-3.md) | ~15min | Reveal cells on click, auto-expand zeros with flood fill |
| 4 | [Flagging & Win/Lose Detection](./step-4.md) | ~15min | Right-click to flag, detect win (all safe revealed) or loss (mine hit) |
| 5 | [Timer, Counter & Polish](./step-5.md) | ~15min | Mine counter, elapsed timer, difficulty presets, first-click safety |

## Final Code

The complete source code is at [`src/games/minesweeper/`](../src/games/minesweeper/).

## Next Game

Continue to [Sudoku](../31-sudoku/README.md) — where you'll learn puzzle generation, validation, and pencil-mark systems →
