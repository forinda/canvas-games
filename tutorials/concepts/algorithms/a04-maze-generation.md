# Maze Generation (Recursive Backtracker)

## What Is It?

The recursive backtracker is the most common algorithm for generating perfect mazes -- mazes with exactly one path between any two cells and no loops. It works by carving passages through a grid of walls using depth-first search. Starting from a random cell, it picks a random unvisited neighbor, carves a passage to it, and repeats. When it reaches a dead end (all neighbors already visited), it backtracks along its path until it finds a cell with unvisited neighbors.

Think of it like a worm burrowing through solid rock. The worm moves forward in a random direction, carving tunnels as it goes. When it cannot move forward anymore, it backs up through its own tunnel until it finds a side wall it can break through. The result is a winding, organic-looking maze with long corridors and relatively few dead ends compared to other algorithms.

The algorithm uses a stack to remember the path. Each time you move to a new cell, push it onto the stack. When you hit a dead end, pop cells off the stack until you find one with unvisited neighbors. This explicit stack replaces recursion and avoids stack overflow on large grids.

## The Algorithm

```
1. Create a grid where every cell is surrounded by walls.
2. Pick a starting cell, mark it visited, push it onto a stack.
3. While the stack is not empty:
   a. Let current = top of stack.
   b. Find all unvisited neighbors of current.
   c. If there are unvisited neighbors:
      - Pick one at random.
      - Remove the wall between current and that neighbor.
      - Mark the neighbor as visited.
      - Push the neighbor onto the stack.
   d. Else:
      - Pop current off the stack (backtrack).
```

### Step-by-Step Maze Growing

```
Initial grid (all walls):
  +--+--+--+--+
  |  |  |  |  |
  +--+--+--+--+
  |  |  |  |  |
  +--+--+--+--+
  |  |  |  |  |
  +--+--+--+--+

Step 1: Start at (0,0). Visit, push. Pick neighbor (0,1). Carve east.
  +--+--+--+--+
  |     |  |  |
  +--+--+--+--+
  |  |  |  |  |
  +--+--+--+--+
  |  |  |  |  |
  +--+--+--+--+

Step 2: At (0,1). Pick neighbor (1,1). Carve south.
  +--+--+--+--+
  |     |  |  |
  +--+  +--+--+
  |  |  |  |  |
  +--+--+--+--+
  |  |  |  |  |
  +--+--+--+--+

Step 3: At (1,1). Pick neighbor (1,0). Carve west.
  +--+--+--+--+
  |     |  |  |
  +--+  +--+--+
  |     |  |  |
  +--+--+--+--+
  |  |  |  |  |
  +--+--+--+--+

Step 4: At (1,0). Pick neighbor (2,0). Carve south.
  +--+--+--+--+
  |     |  |  |
  +--+  +--+--+
  |     |  |  |
  +  +--+--+--+
  |  |  |  |  |
  +--+--+--+--+

Step 5: At (2,0). No unvisited neighbors except (2,1).
  Carve east. Continue...

  ...many steps later, the finished maze:
  +--+--+--+--+
  |        |  |
  +  +--+  +  +
  |  |     |  |
  +  +  +--+  +
  |     |     |
  +--+--+--+--+
```

## Code Example

```typescript
interface Cell {
  row: number;
  col: number;
  visited: boolean;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
}

function createGrid(rows: number, cols: number): Cell[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      row: r, col: c, visited: false,
      walls: { top: true, right: true, bottom: true, left: true },
    }))
  );
}

function generateMaze(rows: number, cols: number): Cell[][] {
  const grid = createGrid(rows, cols);
  const stack: Cell[] = [];
  const start = grid[0][0];
  start.visited = true;
  stack.push(start);

  const directions: [number, number, string, string][] = [
    [-1, 0, "top", "bottom"],
    [1, 0, "bottom", "top"],
    [0, -1, "left", "right"],
    [0, 1, "right", "left"],
  ];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = directions
      .map(([dr, dc, wall, opposite]) => {
        const nr = current.row + dr;
        const nc = current.col + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return null;
        if (grid[nr][nc].visited) return null;
        return { cell: grid[nr][nc], wall, opposite };
      })
      .filter(Boolean) as { cell: Cell; wall: string; opposite: string }[];

    if (neighbors.length === 0) {
      stack.pop(); // backtrack
      continue;
    }

    const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
    (current.walls as any)[pick.wall] = false;
    (pick.cell.walls as any)[pick.opposite] = false;
    pick.cell.visited = true;
    stack.push(pick.cell);
  }

  return grid;
}
```

## Complexity

| Metric | Big O |
|--------|-------|
| Time   | O(R x C) -- every cell is visited exactly once. |
| Space  | O(R x C) -- the stack can hold every cell in the worst case (a single long corridor). |

## Used In These Games

- **Maze Runner / Maze games**: Direct application -- generate a random maze for the player to navigate.
- **Roguelike dungeon generation**: Generate maze-like corridors, then carve out rooms by removing clusters of walls.
- **Puzzle games**: Create solvable mazes as puzzle elements.
- **Procedural level design**: Maze structure ensures connectivity -- every room is reachable from every other room.

## Common Pitfalls

- **Confusing cell coordinates with wall coordinates**: Walls exist between cells. A common bug is removing the wrong wall, creating disconnected passages.
- **Not randomizing neighbor selection**: If you always pick neighbors in the same order (e.g., always north first), you get a biased maze with long corridors in one direction.
- **Stack overflow with actual recursion**: On a 100x100 grid, recursion depth can reach 10,000. Use an explicit stack.
- **Forgetting to remove walls on both sides**: When you carve from cell A to cell B, you must remove A's wall toward B AND B's wall toward A.

## Further Reading

- [Wikipedia: Maze generation algorithm](https://en.wikipedia.org/wiki/Maze_generation_algorithm)
- [Jamis Buck's maze algorithm visualizations](https://weblog.jamisbuck.org/2011/2/7/maze-generation-algorithm-recap)
- Comparison of maze algorithms: recursive backtracker, Prim's, Kruskal's, Eller's
