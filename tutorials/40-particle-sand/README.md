# Particle Sand — Tutorial

Build a complete **Particle Sand** simulation from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Intermediate
**Episodes:** 5
**Time:** ~1h 15min total
**Prerequisites:** [Pixel Art](../39-pixel-art/README.md)

## What You'll Build

A falling-sand simulation where you spawn different particle types (sand, water, fire, stone) and watch them interact. Particles fall, flow, and react based on cellular automata rules.

## Concepts You'll Learn

- Cellular automata simulation on a pixel grid
- Different particle behaviors (fall, flow, spread, burn)
- Particle interaction rules (water extinguishes fire, etc.)
- Efficient pixel-buffer rendering with ImageData
- Brush sizes and particle type selection

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Pixel Grid](./step-1.md) | ~15min | Set up a grid and render individual colored pixels |
| 2 | [Sand Particles & Gravity](./step-2.md) | ~15min | Spawn sand that falls and piles up realistically |
| 3 | [Water & Flow Physics](./step-3.md) | ~15min | Water particles that flow sideways and settle |
| 4 | [Fire, Stone & Interactions](./step-4.md) | ~15min | Fire that spreads, stone that blocks, element interactions |
| 5 | [Brush Tools & Polish](./step-5.md) | ~15min | Adjustable brush size, element palette, clear button |

## Final Code

The complete source code is at [`src/games/particle-sand/`](../src/games/particle-sand/).

## Next Game

Continue to [Platformer](../41-platformer/README.md) — where you'll learn full platformer movement, enemies, and level design →
