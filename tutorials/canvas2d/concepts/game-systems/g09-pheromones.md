# Pheromone Trails

## What Is It?

Pheromones are invisible markers that agents leave behind as they move, creating trails that influence the behavior of other agents. Think of how ants find food: one ant wanders randomly and finds sugar. On the way back to the nest, it leaves a chemical trail. Other ants smell the trail and follow it, reinforcing the path. Over time, the shortest path gets the strongest trail because ants traverse it faster and more often.

In games, pheromone systems create emergent behavior -- complex-looking group intelligence from simple individual rules. No central pathfinding is needed; the "intelligence" emerges from the trail network.

## How It Works

```
Grid of pheromone values (float per cell):

  Each frame:
    1. Agents deposit pheromone at their current cell
       grid[x][y] += depositAmount

    2. Agents choose next move biased toward stronger pheromone
       probability(direction) ∝ pheromone(neighbor) + smallBias

    3. All pheromone decays
       grid[x][y] *= decayRate   (e.g., 0.995 per frame)

    4. Optionally, pheromone diffuses to neighbors
       grid[x][y] = average(neighbors) * diffusionRate

Decay is critical: without it, old paths never fade and the
system cannot adapt to changes (e.g., blocked path).
```

Emergent path formation:

```
  Nest (N)                        Food (F)
    N . . . . . . . . . F
    N . . . # # # . . . F     # = obstacle
    N . . # # # # # . . F
    N . . . . . . . . . F

  After many ants:
    N → → → → . . ↗ → → F     Strong trail forms around
    N . . . ↑ # # ↑ . . F     the obstacle via the
    N . . # # # # # . . F     shortest viable route
    N → → → → → → → → → F
```

## Code Example

```typescript
class PheromoneGrid {
  private grid: Float32Array;
  private cols: number;
  private rows: number;
  private decayRate: number;

  constructor(cols: number, rows: number, decayRate = 0.995) {
    this.cols = cols;
    this.rows = rows;
    this.decayRate = decayRate;
    this.grid = new Float32Array(cols * rows);
  }

  deposit(x: number, y: number, amount: number): void {
    if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
      this.grid[y * this.cols + x] = Math.min(
        this.grid[y * this.cols + x] + amount,
        1.0 // cap at 1.0
      );
    }
  }

  get(x: number, y: number): number {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return 0;
    return this.grid[y * this.cols + x];
  }

  decay(): void {
    for (let i = 0; i < this.grid.length; i++) {
      this.grid[i] *= this.decayRate;
      if (this.grid[i] < 0.001) this.grid[i] = 0;
    }
  }

  // Agent picks direction biased by pheromone strength
  chooseBest(cx: number, cy: number): { dx: number; dy: number } {
    const dirs = [
      { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
      { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
    ];
    let best = dirs[0];
    let bestVal = -1;
    for (const d of dirs) {
      const val = this.get(cx + d.dx, cy + d.dy) + Math.random() * 0.1;
      if (val > bestVal) { bestVal = val; best = d; }
    }
    return best;
  }

  draw(ctx: CanvasRenderingContext2D, tileSize: number): void {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const val = this.grid[y * this.cols + x];
        if (val > 0.01) {
          ctx.fillStyle = `rgba(0, 255, 100, ${val * 0.5})`;
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
      }
    }
  }
}
```

## Used In These Games

- **Tower Defense**: Enemies could leave pheromone trails marking "safe" paths. When a tower kills enemies on a route, the trail weakens and future enemies explore alternatives -- emergent pathfinding without A*.
- **City Builder**: Simulated citizens leave "traffic pheromones" on roads. Heavy pheromone areas indicate congestion, prompting the player to build alternate routes.
- **Snake**: A trail-based variant where the snake leaves a fading trail that it must avoid (similar to the body, but time-based rather than position-based).

## Common Pitfalls

- **No decay leads to saturation**: If pheromone only accumulates, every cell maxes out and the gradient disappears. The trail becomes useless because all directions look equally strong.
- **Decay too fast**: If pheromone fades before other agents reach it, no trail forms. Balance decay rate with agent speed and world size.
- **Randomness overwhelms signal**: The random bias in direction choice should be small relative to pheromone values. If randomness dominates, agents ignore trails entirely.
- **Performance on large grids**: A 1000x1000 pheromone grid updated every frame is one million operations. Use `Float32Array` instead of regular arrays, skip cells with zero pheromone, or update decay every N frames.
