# City Builder — Tutorial

Build a complete **City Builder** simulation from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Advanced
**Episodes:** 7
**Time:** ~1h 45min total
**Prerequisites:** [Zombie Survival](../44-zombie-survival/README.md)

## What You'll Build

A simple city builder where you place residential, commercial, and industrial zones on a grid. Manage resources, provide power and water, and grow your population.

## Concepts You'll Learn

- Grid-based building placement with zoning types
- Resource economy simulation (money, power, water)
- Population growth based on zone satisfaction
- Tick-based simulation loop for income and consumption
- Isometric or top-down camera with pan and zoom

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Grid Map](./step-1.md) | ~15min | Draw a pannable grid map with terrain |
| 2 | [Building Placement](./step-2.md) | ~15min | Select building types and place them on the grid |
| 3 | [Resource System](./step-3.md) | ~15min | Track money, power, and water; buildings consume resources |
| 4 | [Population & Zones](./step-4.md) | ~15min | Residential zones grow population, commercial generates income |
| 5 | [Simulation Loop](./step-5.md) | ~15min | Tick-based updates, income/expense cycle, satisfaction score |
| 6 | [UI & Polish](./step-6.md) | ~15min | Resource bars, building tooltips, demolish tool, exit handler |
| 7 | [Save/Load & Final Integration](./step-7.md) | ~15min | Persist city to localStorage, auto-save, game registration |

## Final Code

The complete source code is at [`src/contexts/canvas2d/games/city-builder/`](../src/contexts/canvas2d/games/city-builder/).

## Next Game

Continue to [Ant Colony](../46-ant-colony/README.md) — where you'll learn emergent behavior and pheromone trail simulation →
