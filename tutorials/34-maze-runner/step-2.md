# Step 2: Maze Generation Algorithm

**Goal:** Carve paths through the walled grid using recursive backtracking to produce a perfect maze.

**Time:** ~15 minutes

---

## What You'll Build

- **MazeGenerator system** that implements iterative depth-first search (DFS)
- **Wall removal** between adjacent cells to carve passages
- **Neighbour detection** to find unvisited cells during generation
- **Integration** with the engine so a fresh maze is generated on startup

---

## Concepts

- **Recursive Backtracking**: Start at cell (0,0), mark it visited, then randomly pick an unvisited neighbour. Remove the wall between the current cell and the chosen neighbour, move to that neighbour, and repeat. When you hit a dead end (no unvisited neighbours), backtrack along the path until you find a cell with unvisited neighbours. This produces a "perfect maze" -- every cell is reachable and there is exactly one path between any two cells.
- **Iterative DFS with Explicit Stack**: Instead of actual recursion (which can overflow the call stack on large mazes), we use a `while` loop with an array as a stack. The algorithm is identical, but safe for grids of any size.
- **Wall Removal**: When moving from cell `(cx, cy)` to neighbour `(nx, ny)`, we remove the wall on the side we are crossing from in both cells. For example, moving right means removing the `right` wall of the current cell and the `left` wall of the neighbour.
- **`visited` Flag**: Each cell's `visited` boolean prevents the algorithm from revisiting cells, ensuring every cell is carved exactly once.

---

## Code

### 2.1 Create the Maze Generator

**File:** `src/games/maze-runner/systems/MazeGenerator.ts`

This system takes a state with an empty grid, initializes all cells with walls up, then carves passages using iterative DFS.

```typescript
import type { Cell, MazeState } from '../types';

/**
 * Generates a perfect maze using recursive backtracker (iterative DFS).
 */
export class MazeGenerator {
  generate(state: MazeState): void {
    const { mazeW, mazeH } = state;

    // Initialise grid with all walls up
    const grid: Cell[][] = [];

    for (let y = 0; y < mazeH; y++) {
      const row: Cell[] = [];

      for (let x = 0; x < mazeW; x++) {
        row.push({
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false,
        });
      }

      grid.push(row);
    }

    // Iterative DFS with explicit stack (avoids call-stack overflow on large mazes)
    const stack: [number, number][] = [];
    const startX = 0;
    const startY = 0;

    grid[startY][startX].visited = true;
    stack.push([startX, startY]);

    while (stack.length > 0) {
      const [cx, cy] = stack[stack.length - 1];
      const neighbours = this.unvisitedNeighbours(cx, cy, mazeW, mazeH, grid);

      if (neighbours.length === 0) {
        stack.pop();
        continue;
      }

      const [nx, ny] =
        neighbours[Math.floor(Math.random() * neighbours.length)];

      this.removeWall(cx, cy, nx, ny, grid);
      grid[ny][nx].visited = true;
      stack.push([nx, ny]);
    }

    state.grid = grid;
  }

  private unvisitedNeighbours(
    x: number,
    y: number,
    w: number,
    h: number,
    grid: Cell[][],
  ): [number, number][] {
    const dirs: [number, number][] = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ];
    const result: [number, number][] = [];

    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;

      if (nx >= 0 && nx < w && ny >= 0 && ny < h && !grid[ny][nx].visited) {
        result.push([nx, ny]);
      }
    }

    return result;
  }

  private removeWall(
    cx: number,
    cy: number,
    nx: number,
    ny: number,
    grid: Cell[][],
  ): void {
    const dx = nx - cx;
    const dy = ny - cy;

    if (dx === 1) {
      grid[cy][cx].walls.right = false;
      grid[ny][nx].walls.left = false;
    } else if (dx === -1) {
      grid[cy][cx].walls.left = false;
      grid[ny][nx].walls.right = false;
    } else if (dy === 1) {
      grid[cy][cx].walls.bottom = false;
      grid[ny][nx].walls.top = false;
    } else if (dy === -1) {
      grid[cy][cx].walls.top = false;
      grid[ny][nx].walls.bottom = false;
    }
  }
}
```

**What's happening:**
- `generate()` first builds a fresh grid where every cell has all four walls. Then it runs iterative DFS starting from (0,0).
- The main loop peeks at the top of the stack. If the current cell has unvisited neighbours, it randomly picks one, removes the wall between them, marks the neighbour as visited, and pushes it onto the stack.
- When there are no unvisited neighbours (dead end), we pop the stack and backtrack to the previous cell. This continues until the stack is empty, meaning every cell has been visited.
- `unvisitedNeighbours()` checks all four directions and returns only cells that are in bounds and not yet visited.
- `removeWall()` determines which direction we are moving (by computing `dx` and `dy`) and sets the appropriate wall to `false` on both the current cell and the neighbour. This ensures consistency -- if cell A's right wall is open, cell B's left wall is also open.
- Because the algorithm visits every cell exactly once and removes exactly one wall to reach each new cell, the result is a "perfect maze" with no loops and exactly one solution path.

---

### 2.2 Update the Engine

**File:** `src/games/maze-runner/MazeEngine.ts`

Replace the manual `initGrid()` with the MazeGenerator and call it on startup.

```typescript
import type { MazeState } from './types';
import { BASE_MAZE_W, BASE_MAZE_H } from './types';
import { MazeGenerator } from './systems/MazeGenerator';
import { MazeRenderer } from './renderers/MazeRenderer';

export class MazeEngine {
  private ctx: CanvasRenderingContext2D;
  private state: MazeState;
  private running = false;
  private rafId = 0;

  private generator: MazeGenerator;
  private mazeRenderer: MazeRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.createState(1);

    // Systems
    this.generator = new MazeGenerator();

    // Generate the maze
    this.generator.generate(this.state);

    // Renderers
    this.mazeRenderer = new MazeRenderer();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', this.resizeHandler);
  }

  start(): void {
    this.running = true;
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;
    this.mazeRenderer.render(this.ctx, this.state);
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private createState(level: number): MazeState {
    const mazeW = BASE_MAZE_W;
    const mazeH = BASE_MAZE_H;

    return {
      grid: [],
      mazeW,
      mazeH,
      player: { x: 0, y: 0 },
      exit: { x: mazeW - 1, y: mazeH - 1 },
      revealRadius: 3,
      revealed: new Set<string>(),
      level,
      timeLeft: 60,
      won: false,
      lost: false,
      paused: false,
      started: false,
      totalScore: 0,
    };
  }
}
```

**What's happening:**
- We removed the manual `initGrid()` method from Step 1 and replaced it with `this.generator.generate(this.state)`.
- The generator creates the grid internally (all walls up) and then carves passages, writing the result back into `state.grid`.
- Every time you reload the page, you get a different randomly generated maze.

---

## Test It

1. **Run:** `pnpm dev`
2. **Open:** the Maze Runner game in your browser
3. **Observe:**
   - The 10x10 grid now has **passages carved through it** -- many walls are missing
   - No two cells are fully enclosed; every cell is reachable from every other cell
   - **Reload the page** several times and you will see a different maze each time
   - The maze is "perfect" -- there are no loops, just winding corridors and dead ends

Compare to Step 1: instead of a grid of isolated boxes, you now have a real maze with twisting paths.

---

## Challenges

**Easy:**
- Reload several times and look for the longest corridor. Try to trace the path from (0,0) to (9,9) by eye.

**Medium:**
- Change the starting cell to the center of the grid instead of (0,0) and observe how the maze structure changes. (Hint: modify `startX` and `startY` in the generator.)

**Hard:**
- Add a second pass that randomly removes 5 additional walls to create loops in the maze. This makes multiple solution paths possible and changes the feel from a puzzle to an exploration space.

---

## What You Learned

- Implementing iterative depth-first search with an explicit stack for maze generation
- Removing walls between adjacent cells while keeping both sides consistent
- The concept of a "perfect maze" -- every cell reachable, exactly one path between any two cells
- Integrating a generation system into the engine so mazes are created automatically

**Next:** [Step 3: Player Movement Through Walls](./step-3.md) -- add keyboard input and move a player character through the maze, blocked by walls!

---
[<- Previous Step](./step-1.md) | [Back to Game README](./README.md) | [Next Step ->](./step-3.md)
