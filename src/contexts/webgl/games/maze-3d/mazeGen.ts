import type { MazeCell } from "./types";

/**
 * Generate a perfect maze using iterative DFS (recursive backtracking).
 * Every cell is reachable from every other cell — exactly one path between any two cells.
 */
export function generateMaze(rows: number, cols: number): MazeCell[][] {
	// Initialize grid with all walls up
	const grid: MazeCell[][] = [];

	for (let r = 0; r < rows; r++) {
		const row: MazeCell[] = [];

		for (let c = 0; c < cols; c++) {
			row.push({
				row: r,
				col: c,
				walls: { north: true, south: true, east: true, west: true },
				visited: false,
			});
		}

		grid.push(row);
	}

	// DFS with explicit stack
	const stack: MazeCell[] = [];
	const start = grid[0][0];

	start.visited = true;
	stack.push(start);

	while (stack.length > 0) {
		const current = stack[stack.length - 1];
		const neighbors = getUnvisitedNeighbors(grid, current, rows, cols);

		if (neighbors.length === 0) {
			stack.pop();
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

function getUnvisitedNeighbors(
	grid: MazeCell[][],
	cell: MazeCell,
	rows: number,
	cols: number,
): MazeCell[] {
	const { row, col } = cell;
	const result: MazeCell[] = [];

	if (row > 0 && !grid[row - 1][col].visited) result.push(grid[row - 1][col]);

	if (row < rows - 1 && !grid[row + 1][col].visited)
		result.push(grid[row + 1][col]);

	if (col > 0 && !grid[row][col - 1].visited) result.push(grid[row][col - 1]);

	if (col < cols - 1 && !grid[row][col + 1].visited)
		result.push(grid[row][col + 1]);

	return result;
}

function removeWall(a: MazeCell, b: MazeCell): void {
	const dr = b.row - a.row;
	const dc = b.col - a.col;

	if (dr === -1) {
		a.walls.north = false;
		b.walls.south = false;
	} else if (dr === 1) {
		a.walls.south = false;
		b.walls.north = false;
	} else if (dc === -1) {
		a.walls.west = false;
		b.walls.east = false;
	} else if (dc === 1) {
		a.walls.east = false;
		b.walls.west = false;
	}
}
