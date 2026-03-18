import type { Updatable } from '@shared/Updatable.ts';
import type { Cell, MazeState } from '../types.ts';

/**
 * Generates a perfect maze using recursive backtracker (DFS).
 * As an Updatable it is invoked once when a new level starts.
 */
export class MazeGenerator implements Updatable<MazeState> {
  /** Generate a fresh maze and write it into the state */
  update(state: MazeState, _dt: number): void {
    this.generate(state);
  }

  generate(state: MazeState): void {
    const { mazeW, mazeH } = state;

    // Initialise grid
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

      const [nx, ny] = neighbours[Math.floor(Math.random() * neighbours.length)];
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
