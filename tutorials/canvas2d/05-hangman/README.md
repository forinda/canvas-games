# Hangman — Tutorial

Build a complete **Hangman** word-guessing game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Beginner
**Episodes:** 4
**Time:** ~1h total
**Prerequisites:** [Tic-Tac-Toe](../04-tic-tac-toe/README.md)

## What You'll Build

A classic Hangman game where you guess letters to reveal a hidden word. Each wrong guess draws another body part on the gallows. Six wrong guesses and it's game over.

## Concepts You'll Learn

- Keyboard event handling (keydown)
- Drawing multi-part figures with Canvas lines and arcs
- Word masking and letter-reveal logic
- Managing a word list and random selection

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Gallows Drawing](./step-1.md) | ~15min | Draw the gallows structure on the canvas |
| 2 | [Word Display & Keyboard Input](./step-2.md) | ~15min | Show blanks for the hidden word, capture letter guesses |
| 3 | [Guess Logic & Figure Drawing](./step-3.md) | ~15min | Reveal correct letters, draw body parts for wrong guesses |
| 4 | [Win/Lose Screens & Polish](./step-4.md) | ~15min | End-game states, used-letter display, word categories |

## Final Code

The complete source code is at [`src/contexts/canvas2d/games/hangman/`](../src/contexts/canvas2d/games/hangman/).

## Next Game

Continue to [2048](../06-2048/README.md) — where you'll learn grid sliding mechanics and tile merging →
