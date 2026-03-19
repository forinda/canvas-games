# Fog of War

## What Is It?

Fog of war hides parts of the game world that the player has not explored or cannot currently see. Think of a strategy game where the map starts completely black. As your units move, they reveal the terrain around them. Areas you have explored but no longer have units near become "greyed out" -- you can see the terrain but not enemy movements.

This system creates tension, encourages exploration, and prevents the player from having perfect information. It is a core mechanic in real-time strategy and roguelike games.

## How It Works

```
Visibility states per tile/cell:
  HIDDEN     = never seen (fully black)
  EXPLORED   = seen before but no unit nearby (greyed / dimmed)
  VISIBLE    = unit currently in range (fully lit)

Reveal algorithm:
  for each friendly unit:
    for each tile within unit.visionRadius:
      if distance(unit, tile) <= visionRadius:
        tile.state = VISIBLE
        tile.everSeen = true

After all units processed:
  for each tile:
    if tile.state !== VISIBLE && tile.everSeen:
      tile.state = EXPLORED
    else if !tile.everSeen:
      tile.state = HIDDEN

Rendering:
  HIDDEN   → draw black overlay (alpha = 1.0)
  EXPLORED → draw dark overlay (alpha = 0.5)
  VISIBLE  → no overlay
```

Grid visualization:

```
  ■ ■ ■ ■ ■ ■ ■ ■      ■ = HIDDEN (black)
  ■ ■ ▒ ▒ ▒ ■ ■ ■      ▒ = EXPLORED (dim)
  ■ ▒ ░ ░ ░ ▒ ■ ■      ░ = VISIBLE (clear)
  ■ ▒ ░ U ░ ▒ ■ ■      U = unit (vision source)
  ■ ▒ ░ ░ ░ ▒ ■ ■
  ■ ■ ▒ ▒ ▒ ■ ■ ■
  ■ ■ ■ ■ ■ ■ ■ ■
```

## Code Example

```typescript
enum Visibility { Hidden, Explored, Visible }

class FogOfWar {
  private grid: Visibility[];
  private everSeen: boolean[];
  private cols: number;
  private rows: number;

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.grid = new Array(cols * rows).fill(Visibility.Hidden);
    this.everSeen = new Array(cols * rows).fill(false);
  }

  resetVisibility(): void {
    for (let i = 0; i < this.grid.length; i++) {
      this.grid[i] = this.everSeen[i]
        ? Visibility.Explored
        : Visibility.Hidden;
    }
  }

  revealAround(cx: number, cy: number, radius: number): void {
    const r2 = radius * radius;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const tx = cx + dx;
        const ty = cy + dy;
        if (tx < 0 || tx >= this.cols || ty < 0 || ty >= this.rows) continue;
        const idx = ty * this.cols + tx;
        this.grid[idx] = Visibility.Visible;
        this.everSeen[idx] = true;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, tileSize: number): void {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const v = this.grid[y * this.cols + x];
        if (v === Visibility.Hidden) {
          ctx.fillStyle = "rgba(0,0,0,1)";
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        } else if (v === Visibility.Explored) {
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
      }
    }
  }
}

// Usage: 20x15 grid, unit at (10,7) with vision radius 3
const fog = new FogOfWar(20, 15);
fog.resetVisibility();
fog.revealAround(10, 7, 3);
```

## Used In These Games

- **Tower Defense**: Fog can hide upcoming parts of the enemy path, forcing the player to scout before placing towers. Towers act as vision sources.
- **City Builder**: Undiscovered map regions are hidden until the player expands roads or sends explorers, encouraging growth in all directions.
- **Snake**: A fog-of-war variant could hide the food location until the snake gets close, adding a search element.

## Common Pitfalls

- **Revealing the entire map permanently**: If explored areas show everything (including enemy positions), there is no reason to maintain vision. Explored tiles should show terrain only, not dynamic entities.
- **Expensive per-frame calculation**: Checking every tile against every unit is O(units x tiles). Optimize by only checking tiles within the bounding box of each unit's vision radius.
- **Hard edges look ugly**: A sharp circle of visibility looks artificial. Smooth the edges with gradient alpha or stepped rings (full, 0.3 alpha, 0.6 alpha) for a softer look.
- **Fog blocks UI interaction**: If the player clicks on a fogged tile to build, should it be allowed? Decide and document the rule: typically you cannot build in HIDDEN areas but can in EXPLORED ones.
