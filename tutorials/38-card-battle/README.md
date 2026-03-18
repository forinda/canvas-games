# Card Battle — Tutorial

Build a complete **Card Battle** game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Advanced
**Episodes:** 6
**Time:** ~1h 30min total
**Prerequisites:** [Physics Puzzle](../37-physics-puzzle/README.md)

## What You'll Build

A turn-based card battle game where you play attack and defense cards against an AI opponent. Build a deck, manage your hand, and reduce the enemy's health to zero.

## Concepts You'll Learn

- Card data modeling (attack, defense, cost, effects)
- Hand management (draw, play, discard cycle)
- Turn-based combat with energy/mana system
- AI opponent card selection strategy
- Card rendering with stats and artwork areas

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Card Rendering](./step-1.md) | ~15min | Draw card shapes with title, cost, and stats |
| 2 | [Hand Display & Card Selection](./step-2.md) | ~15min | Fan of cards in hand, click to select and play |
| 3 | [Combat System](./step-3.md) | ~15min | Attack and defense resolution, health tracking |
| 4 | [Energy & Draw Phase](./step-4.md) | ~15min | Energy per turn, draw new cards each turn, end-turn button |
| 5 | [AI Opponent](./step-5.md) | ~15min | Computer plays cards based on strategy heuristics |
| 6 | [Deck Building & Polish](./step-6.md) | ~15min | Choose cards for your deck before battle, effects animations |

## Final Code

The complete source code is at [`src/games/card-battle/`](../src/games/card-battle/).

## Next Game

Continue to [Pixel Art](../39-pixel-art/README.md) — where you'll learn drawing tools and color palette management →
