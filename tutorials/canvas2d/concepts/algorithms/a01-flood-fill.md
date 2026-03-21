# Flood Fill

## What Is It?

Flood fill is the algorithm behind the "paint bucket" tool in every image editor. You click on a pixel, and the tool fills outward in every direction, coloring every connected pixel that matches the original color. It stops when it hits a boundary -- a pixel of a different color.

In games, the same idea applies to grids. Imagine a Minesweeper board: you click an empty cell with zero adjacent mines, and the game reveals a whole region of empty cells at once. It does this by starting at the clicked cell and "flooding" outward through every neighbor that is also empty. The flood stops at cells that have adjacent mines, because those cells show a number instead of continuing the spread.

You can implement flood fill with either Breadth-First Search (BFS) or Depth-First Search (DFS). BFS uses a queue and fills in expanding rings outward from the start. DFS uses a stack (or recursion) and follows one path as deep as possible before backtracking. Both visit the same set of cells; they just visit them in a different order.

## The Algorithm

```
1. Start at the target cell (row, col).
2. Record the original value at that cell.
3. If the original value already equals the fill value, stop (nothing to do).
4. Add (row, col) to a queue (BFS) or stack (DFS).
5. While the queue/stack is not empty:
   a. Remove a cell from the queue/stack.
   b. If the cell is out of bounds, skip it.
   c. If the cell's value != original value, skip it.
   d. Set the cell's value to the fill value.
   e. Add all 4 neighbors (up, down, left, right) to the queue/stack.
```

### ASCII Diagram -- BFS Flood Fill

Starting grid (0 = empty, 1 = wall, clicking cell marked `*`):

```
  0 1 2 3 4
0 [ ][ ][#][ ][ ]
1 [ ][*][ ][ ][#]
2 [ ][ ][#][ ][ ]
3 [#][ ][ ][ ][ ]
4 [ ][ ][#][ ][ ]

Step 1: Fill (1,1), enqueue neighbors
  0 1 2 3 4
0 [ ][ ][#][ ][ ]
1 [ ][X][ ][ ][#]
2 [ ][ ][#][ ][ ]

Step 2: Fill (0,1), (1,0), (1,2), (2,1)
  0 1 2 3 4
0 [ ][X][#][ ][ ]
1 [X][X][X][ ][#]
2 [ ][X][#][ ][ ]

Step 3: Continue expanding...
  0 1 2 3 4
0 [X][X][#][ ][ ]
1 [X][X][X][ ][#]
2 [X][X][#][ ][ ]
3 [#][X][ ][ ][ ]

...until walls block all paths.
```

## Code Example

```typescript
type Grid = number[][];

function floodFillBFS(
  grid: Grid,
  startRow: number,
  startCol: number,
  fillValue: number
): void {
  const rows = grid.length;
  const cols = grid[0].length;
  const original = grid[startRow][startCol];

  if (original === fillValue) return;

  const queue: [number, number][] = [[startRow, startCol]];
  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
  ];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;

    if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
    if (grid[r][c] !== original) continue;

    grid[r][c] = fillValue;

    for (const [dr, dc] of directions) {
      queue.push([r + dr, c + dc]);
    }
  }
}

// Usage: reveal empty cells in Minesweeper
const board: Grid = [
  [0, 0, 1, 0],
  [0, 0, 0, 1],
  [1, 0, 0, 0],
  [0, 0, 1, 0],
];

floodFillBFS(board, 0, 0, 9); // fills connected 0s with 9
```

## Complexity

| Metric | Big O |
|--------|-------|
| Time   | O(R x C) where R = rows, C = columns. Each cell is visited at most once. |
| Space  | O(R x C) in the worst case -- the queue/stack may hold every cell. |

## Used In These Games

- **Minesweeper**: When you click an empty cell (zero adjacent mines), flood fill reveals all connected empty cells and their numbered borders.
- **Go / Weiqi**: Detecting captured groups -- flood fill from a stone to see if the group has any liberties (empty neighbors).
- **Paint programs / pixel art tools**: The bucket-fill tool is a direct application.
- **Match-3 games**: Finding connected groups of same-colored tiles.

## Common Pitfalls

- **Stack overflow with recursive DFS**: On large grids (e.g., 1000x1000), recursive flood fill will exceed the call stack. Use an explicit stack or BFS queue instead.
- **Forgetting the base case**: If `fillValue === originalValue`, the algorithm loops forever because filled cells still match the original. Always check this before starting.
- **Using `shift()` on large arrays**: `Array.shift()` in JavaScript is O(n). For performance-critical BFS, use an index pointer or a proper queue data structure instead of shifting.
- **8-directional vs 4-directional**: Decide whether diagonal neighbors count. Minesweeper uses 8-directional adjacency for mine counting but 4-directional is more common for flood fill.

## Further Reading

- [Wikipedia: Flood Fill](https://en.wikipedia.org/wiki/Flood_fill)
- [Minesweeper auto-reveal implementation](https://en.wikipedia.org/wiki/Minesweeper_(video_game))
- BFS vs DFS trade-offs for grid traversal
