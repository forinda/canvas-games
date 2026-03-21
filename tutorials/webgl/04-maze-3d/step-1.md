# Step 1: Maze Generation

**Goal:** Implement a procedural maze generator using iterative DFS (recursive backtracking) that produces a perfect maze grid.

**Time:** ~15 minutes

---

## What You'll Build

- **Cell data structure** — each cell tracks its 4 walls (north, south, east, west) and visited state
- **DFS maze algorithm** — iterative depth-first search that carves passages between cells
- **Perfect maze** — every cell is reachable, exactly one path between any two cells
- **Level scaling** — maze size increases with each level

---

## Concepts

- **Perfect Maze**: A maze where every cell is reachable from every other cell, and there's exactly one path between any two cells. No loops, no isolated areas. This is guaranteed by DFS because it visits every cell exactly once and only removes walls between visited and unvisited cells.

- **Recursive Backtracking (Iterative DFS)**: Start at cell (0,0). Mark it visited. Repeatedly: look at the current cell's unvisited neighbors. If there are any, pick one randomly, remove the wall between them, move there. If there are none, backtrack (pop from the stack). When the stack empties, every cell has been visited.

- **Wall Representation**: Each cell stores 4 booleans for its walls. When we remove a wall between cell A and cell B, we set `A.south = false` AND `B.north = false`. Both sides must be updated — a wall is shared between two cells.

---

## Code

### 1.1 — Cell and Grid Types

**File:** `src/contexts/webgl/games/maze-3d/types.ts`

```typescript
export const CELL_SIZE = 3;        // world units per cell
export const WALL_HEIGHT = 2.5;    // how tall walls are
export const WALL_THICK = 0.15;    // wall thickness
export const PLAYER_RADIUS = 0.3;  // collision radius
export const PLAYER_HEIGHT = 1.6;  // camera Y position (eye level)

export interface CellWalls {
    north: boolean;
    south: boolean;
    east: boolean;
    west: boolean;
}

export interface MazeCell {
    row: number;
    col: number;
    walls: CellWalls;
    visited: boolean;  // used during generation only
}

export function getMazeSize(level: number): { rows: number; cols: number } {
    const base = 5 + level * 2;
    return { rows: Math.min(base, 15), cols: Math.min(base, 15) };
}
```

**What's happening:**
- `CELL_SIZE = 3` means each cell is a 3x3 unit area in 3D space. Large enough to walk through comfortably.
- `WALL_HEIGHT = 2.5` with `PLAYER_HEIGHT = 1.6` means the player can't see over walls — they need to navigate by walking.
- `getMazeSize` starts at 5x5 and grows by 2 per level, capping at 15x15. A 15x15 maze has 225 cells — complex enough to be challenging.
- `visited` is only used during generation. Once the maze is built, it's irrelevant.

---

### 1.2 — The DFS Algorithm

**File:** `src/contexts/webgl/games/maze-3d/mazeGen.ts`

```typescript
export function generateMaze(rows: number, cols: number): MazeCell[][] {
    // Initialize grid with all walls up
    const grid: MazeCell[][] = [];
    for (let r = 0; r < rows; r++) {
        const row: MazeCell[] = [];
        for (let c = 0; c < cols; c++) {
            row.push({
                row: r, col: c,
                walls: { north: true, south: true, east: true, west: true },
                visited: false,
            });
        }
        grid.push(row);
    }

    // DFS with explicit stack (avoids call-stack overflow on large mazes)
    const stack: MazeCell[] = [];
    const start = grid[0][0];
    start.visited = true;
    stack.push(start);

    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const neighbors = getUnvisitedNeighbors(grid, current, rows, cols);

        if (neighbors.length === 0) {
            stack.pop();  // backtrack
            continue;
        }

        // Pick random unvisited neighbor
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        removeWall(current, next);
        next.visited = true;
        stack.push(next);
    }

    return grid;
}
```

**What's happening:**
- **Initialization**: Every cell starts with all 4 walls up. The grid is a 2D array indexed by `[row][col]`.
- **Explicit stack**: Instead of recursive function calls, we use an array as a stack. `stack[stack.length - 1]` is the current cell (peek). `stack.pop()` backtracks. This handles mazes of any size without risk of stack overflow.
- **Random neighbor selection**: `Math.floor(Math.random() * neighbors.length)` picks randomly from available directions, creating a different maze each time.
- The algorithm terminates when the stack empties — meaning it's backtracked all the way to the start, having visited every reachable cell.

---

### 1.3 — Neighbor Finding and Wall Removal

```typescript
function getUnvisitedNeighbors(
    grid: MazeCell[][], cell: MazeCell,
    rows: number, cols: number
): MazeCell[] {
    const { row, col } = cell;
    const result: MazeCell[] = [];

    if (row > 0 && !grid[row - 1][col].visited)
        result.push(grid[row - 1][col]);          // north
    if (row < rows - 1 && !grid[row + 1][col].visited)
        result.push(grid[row + 1][col]);           // south
    if (col > 0 && !grid[row][col - 1].visited)
        result.push(grid[row][col - 1]);           // west
    if (col < cols - 1 && !grid[row][col + 1].visited)
        result.push(grid[row][col + 1]);           // east

    return result;
}

function removeWall(a: MazeCell, b: MazeCell): void {
    const dr = b.row - a.row;
    const dc = b.col - a.col;

    if (dr === -1)      { a.walls.north = false; b.walls.south = false; }
    else if (dr === 1)  { a.walls.south = false; b.walls.north = false; }
    else if (dc === -1) { a.walls.west = false;  b.walls.east = false;  }
    else if (dc === 1)  { a.walls.east = false;  b.walls.west = false;  }
}
```

**What's happening:**
- **Neighbor bounds check**: `row > 0` ensures we don't access `grid[-1]`. Each direction is checked independently.
- **Wall removal is bidirectional**: If cell A is north of cell B, removing the wall between them means `A.south = false` AND `B.north = false`. Forgetting one side would create a one-way wall — visible from one cell but not the other.
- `dr` and `dc` (delta row/col) determine the direction: `dr = -1` means B is north of A, `dc = 1` means B is east of A.

---

## Test It

At this point the maze generation is pure data — no rendering yet. You can verify it works by logging the grid:

```typescript
const grid = generateMaze(5, 5);
console.log(grid.map(row =>
    row.map(c => {
        let s = "";
        if (c.walls.north) s += "N";
        if (c.walls.south) s += "S";
        if (c.walls.east) s += "E";
        if (c.walls.west) s += "W";
        return s.padEnd(5);
    }).join("|")
).join("\n"));
```

You should see that:
- Every cell has been visited (the algorithm touched all 25 cells)
- No cell has all 4 walls (at least one passage in/out)
- The pattern is random each time

---

## Challenges

**Easy:**
- Change the start cell from `grid[0][0]` to `grid[rows-1][cols-1]`. The maze structure will be different but still perfect.

**Medium:**
- Count how many times the algorithm backtracks. Add a counter inside the `if (neighbors.length === 0)` block. For a 5x5 maze, how often does it backtrack?

**Hard:**
- Modify the algorithm to create a "biased" maze: when picking a random neighbor, prefer south and east (weight them 2x). This creates mazes with longer corridors running down-right.

---

## What You Learned

- DFS with backtracking generates perfect mazes (exactly one path between any two cells)
- An explicit stack avoids recursion limits and handles large mazes
- Wall removal is bidirectional — both cells sharing a wall must be updated
- `getMazeSize` scales difficulty by increasing grid dimensions per level

**Next:** We'll convert this grid data into 3D wall geometry and render it with fog.

---
[Back to README](./README.md) | [Next Step →](./step-2.md)
