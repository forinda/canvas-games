# Greedy Best-First Pathfinding

## What Is It?

Greedy best-first search is a pathfinding algorithm that always moves toward the goal as directly as possible. At each step, it evaluates all available next moves and picks the one that appears closest to the destination, using a heuristic function (typically straight-line distance). It is "greedy" because it makes the locally optimal choice at every step without considering the overall path cost.

In Pac-Man, the ghosts use a variant of this approach. When a ghost reaches an intersection, it looks at each possible direction (excluding reversing), calculates which direction brings it closest to its target tile, and picks that one. The ghost does not plan a full path through the maze -- it just picks the best-looking direction at each intersection. This is fast, simple, and produces convincingly purposeful behavior.

The trade-off is that greedy best-first does NOT guarantee the shortest path. It can get trapped behind walls, taking long detours when a shorter route existed. For ghosts, that is actually a feature -- it makes their movement predictable enough for the player to learn patterns, while still being threatening. For a game where you need optimal paths, use A* instead.

## The Algorithm

```
function greedyBestFirst(start, goal, grid):
  openSet = priority queue ordered by heuristic(node, goal)
  add start to openSet
  cameFrom = {}

  while openSet is not empty:
    current = remove node with lowest heuristic from openSet

    if current == goal:
      return reconstructPath(cameFrom, current)

    for each neighbor of current:
      if neighbor is walkable and not yet visited:
        cameFrom[neighbor] = current
        add neighbor to openSet

  return null  // no path found
```

### Pac-Man Ghost Decision at an Intersection

```
  The maze around the ghost:

       [wall]
         |
  [wall]-+-[open]-[open]-...-[target]
         |
       [open]
         |
       [open]

  Ghost is at (+). It can go RIGHT or DOWN (not back the way it came).

  Heuristic: straight-line distance to target tile.

  RIGHT: distance to target = 5 tiles
  DOWN:  distance to target = 8 tiles

  Ghost picks RIGHT (lower heuristic).


  Full intersection decision tree:

                    Ghost at intersection
                   /        |         \
              Left(7)   Up(wall)   Right(5)   Down(8)
                                     ^
                              CHOSEN (closest to target)


  Compared to A* (optimal pathfinding):

    Greedy:  G ---> . ---> . ---> . ---> . ---> T
              (follows heuristic, may detour around walls)

    A*:      G -> . -> . -> T
              (considers actual distance traveled + heuristic)
```

### Grid Example

```
  S = start, T = target, # = wall, . = open

    S . . # . .
    . # . # . .
    . # . . . .
    . . # # # .
    . . . . . T

  Greedy best-first expands cells closest to T first:

    S 2 . # . .       Numbers show expansion order.
    1 # 3 # . .       Greedy goes almost straight toward T,
    . # 4 5 6 .       even though it has to navigate around walls.
    . . # # # 7
    . . . . . T(8)

  It finds a path, but it may not be the shortest one.
```

## Code Example

```typescript
interface Tile { row: number; col: number; }

function heuristic(a: Tile, b: Tile): number {
  // Manhattan distance (for grid movement)
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function greedyBestFirst(
  grid: number[][],  // 0 = walkable, 1 = wall
  start: Tile,
  goal: Tile
): Tile[] | null {
  const rows = grid.length;
  const cols = grid[0].length;
  const key = (t: Tile) => `${t.row},${t.col}`;

  // Simple priority queue (array sorted on insert)
  const open: { tile: Tile; h: number }[] = [];
  const visited = new Set<string>();
  const cameFrom = new Map<string, Tile>();

  open.push({ tile: start, h: heuristic(start, goal) });
  visited.add(key(start));

  const dirs: [number, number][] = [[-1,0],[1,0],[0,-1],[0,1]];

  while (open.length > 0) {
    open.sort((a, b) => a.h - b.h);
    const { tile: current } = open.shift()!;

    if (current.row === goal.row && current.col === goal.col) {
      // Reconstruct path
      const path: Tile[] = [current];
      let k = key(current);
      while (cameFrom.has(k)) {
        const prev = cameFrom.get(k)!;
        path.unshift(prev);
        k = key(prev);
      }
      return path;
    }

    for (const [dr, dc] of dirs) {
      const nr = current.row + dr;
      const nc = current.col + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (grid[nr][nc] === 1) continue;
      const neighbor: Tile = { row: nr, col: nc };
      if (visited.has(key(neighbor))) continue;

      visited.add(key(neighbor));
      cameFrom.set(key(neighbor), current);
      open.push({ tile: neighbor, h: heuristic(neighbor, goal) });
    }
  }

  return null; // no path
}
```

## Complexity

| Metric | Big O |
|--------|-------|
| Time   | O(b^m) worst case, where b = branching factor, m = max depth. In practice, much faster due to heuristic guidance. |
| Space  | O(b^m) -- stores all visited nodes and the open set. |

Compared to A*: greedy best-first is faster (expands fewer nodes on average) but does not guarantee the shortest path.

## Used In These Games

- **Pac-Man**: Ghost AI. Each ghost targets a different tile (Blinky targets Pac-Man directly, Pinky targets 4 tiles ahead, etc.) and uses greedy direction selection at intersections.
- **Simple enemy AI**: Any game where enemies should "chase" the player without needing optimal paths.
- **Fog-of-war navigation**: When the full map is unknown, greedy navigation toward the last known position is a reasonable strategy.
- **Real-time strategy (basic units)**: Quick pathfinding for many units when A* would be too slow.

## Common Pitfalls

- **Getting stuck in U-shaped obstacles**: Greedy best-first can walk into a dead end and spend a long time exploring inside it, because the heuristic keeps saying "the goal is close" even though a wall is in the way.
- **Confusing greedy best-first with A***: A* uses `f(n) = g(n) + h(n)` (actual cost so far + heuristic). Greedy uses only `f(n) = h(n)`. That missing `g(n)` is why greedy does not find shortest paths.
- **Using Euclidean distance on a grid**: If movement is 4-directional, Manhattan distance is the correct heuristic. Euclidean distance underestimates in a way that can cause suboptimal expansion order.
- **Not restricting ghost reversal**: In Pac-Man, ghosts cannot reverse direction at intersections (except during mode changes). Without this rule, the ghost oscillates between two tiles.

## Further Reading

- [The Pac-Man Dossier -- Ghost AI](https://www.gamedeveloper.com/design/the-pac-man-dossier)
- [Red Blob Games: Introduction to A*](https://www.redblobgames.com/pathfinding/a-star/introduction.html)
- [Wikipedia: Best-first search](https://en.wikipedia.org/wiki/Best-first_search)
