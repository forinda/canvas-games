# Top-Down Shooter — Tutorial

Build a complete **Top-Down Shooter** game from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Advanced
**Episodes:** 7
**Time:** ~1h 45min total
**Prerequisites:** [Platformer](../41-platformer/README.md)

## What You'll Build

A top-down action game where you move with WASD and aim with the mouse. Fight waves of enemies, pick up weapon upgrades, and survive as long as possible.

## Concepts You'll Learn

- WASD + mouse-aim dual-input control scheme
- Aim-toward-cursor angle calculation (atan2)
- Wave-based enemy spawning with scaling difficulty
- Multiple weapon types (pistol, shotgun, rapid fire)
- Health pickups and damage feedback

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Project Setup & Player Rendering](./step-1.md) | ~15min | Draw the player and arena from a top-down view |
| 2 | [WASD Movement & Mouse Aiming](./step-2.md) | ~15min | Move with keys, rotate to face the mouse cursor |
| 3 | [Shooting & Bullets](./step-3.md) | ~15min | Click to fire bullets toward the cursor |
| 4 | [Enemies & Waves](./step-4.md) | ~15min | Enemies spawn in waves and chase the player |
| 5 | [Weapons & Pickups](./step-5.md) | ~15min | Weapon upgrades, health drops, ammo management |
| 6 | [Damage, Effects & Polish](./step-6.md) | ~15min | Hit feedback, explosions, wave counter, pause overlay |
| 7 | [Start Screen, Game Over & High Scores](./step-7.md) | ~15min | Title screen, game-over screen, restart, persistent high scores |

## Final Code

The complete source code is at [`src/games/topdown-shooter/`](../src/games/topdown-shooter/).

## Next Game

Continue to [Racing](../43-racing/README.md) — where you'll learn track rendering, lap timing, and vehicle physics →
