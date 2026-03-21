# Ant Colony — Tutorial

Build a complete **Ant Colony** simulation from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Advanced
**Episodes:** 6
**Time:** ~1h 30min total
**Prerequisites:** [City Builder](../45-city-builder/README.md)

## What You'll Build

A simulation where ants leave pheromone trails to find and collect food, then carry it back to the colony. Watch emergent pathfinding behavior arise from simple rules.

## Concepts You'll Learn

- Agent-based simulation with simple behavioral rules
- Pheromone trail laying and evaporation
- Emergent behavior from local interactions
- Steering behaviors (wander, follow gradient)
- Pheromone grid rendering with fading intensity

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Ant Rendering](./step-1.md) | ~15min | Draw the colony, food sources, and wandering ants |
| 2 | [Ant Movement & Wandering](./step-2.md) | ~15min | Ants move randomly, bounce off walls |
| 3 | [Pheromone Trails](./step-3.md) | ~15min | Ants lay pheromone trails that evaporate over time |
| 4 | [Food Collection & Return](./step-4.md) | ~15min | Ants pick up food, follow pheromones back to colony |
| 5 | [Trail Following & Optimization](./step-5.md) | ~15min | Ants follow stronger pheromone trails, paths optimize |
| 6 | [Obstacles & Polish](./step-6.md) | ~15min | Place obstacles, multiple food sources, speed controls |

## Final Code

The complete source code is at [`src/contexts/canvas2d/games/ant-colony/`](../src/contexts/canvas2d/games/ant-colony/).

## Next Game

Continue to [Tower Defense](../47-tower-defense/README.md) — where you'll learn pathfinding, tower placement, and wave management →
