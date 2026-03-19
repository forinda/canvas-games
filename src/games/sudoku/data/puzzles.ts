import { GRID, BOX, type Difficulty, DIFFICULTY_PRESETS } from "../types";

/**
 * Create an empty 9x9 grid filled with zeroes.
 */
function emptyGrid(): number[][] {
	return Array.from({ length: GRID }, () => Array(GRID).fill(0));
}

/**
 * Shuffle an array in-place (Fisher-Yates).
 */
function shuffle<T>(arr: T[]): T[] {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));

		[arr[i], arr[j]] = [arr[j], arr[i]];
	}

	return arr;
}

/**
 * Check whether placing `num` at (row, col) is valid.
 */
function isValid(
	grid: number[][],
	row: number,
	col: number,
	num: number,
): boolean {
	// Row check
	for (let c = 0; c < GRID; c++) {
		if (grid[row][c] === num) return false;
	}

	// Column check
	for (let r = 0; r < GRID; r++) {
		if (grid[r][col] === num) return false;
	}

	// Box check
	const boxR = Math.floor(row / BOX) * BOX;
	const boxC = Math.floor(col / BOX) * BOX;

	for (let r = boxR; r < boxR + BOX; r++) {
		for (let c = boxC; c < boxC + BOX; c++) {
			if (grid[r][c] === num) return false;
		}
	}

	return true;
}

/**
 * Fill the grid completely using backtracking with randomised candidates.
 */
function fillGrid(grid: number[][]): boolean {
	for (let r = 0; r < GRID; r++) {
		for (let c = 0; c < GRID; c++) {
			if (grid[r][c] !== 0) continue;

			const candidates = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

			for (const num of candidates) {
				if (isValid(grid, r, c, num)) {
					grid[r][c] = num;

					if (fillGrid(grid)) return true;

					grid[r][c] = 0;
				}
			}

			return false; // no valid candidate — backtrack
		}
	}

	return true; // entire grid filled
}

/**
 * Count solutions (up to limit) to determine uniqueness.
 */
function countSolutions(grid: number[][], limit: number): number {
	for (let r = 0; r < GRID; r++) {
		for (let c = 0; c < GRID; c++) {
			if (grid[r][c] !== 0) continue;

			let count = 0;

			for (let num = 1; num <= GRID; num++) {
				if (isValid(grid, r, c, num)) {
					grid[r][c] = num;
					count += countSolutions(grid, limit - count);
					grid[r][c] = 0;

					if (count >= limit) return count;
				}
			}

			return count;
		}
	}

	return 1; // no empty cells → found a solution
}

/**
 * Remove cells from a fully-solved grid to create a puzzle.
 * Ensures a unique solution by checking after each removal.
 */
function removeCells(solution: number[][], givens: number): number[][] {
	const puzzle = solution.map((row) => [...row]);
	const cellsToRemove = GRID * GRID - givens;

	// Build list of all positions and shuffle
	const positions: [number, number][] = [];

	for (let r = 0; r < GRID; r++) {
		for (let c = 0; c < GRID; c++) {
			positions.push([r, c]);
		}
	}

	shuffle(positions);

	let removed = 0;

	for (const [r, c] of positions) {
		if (removed >= cellsToRemove) break;

		const backup = puzzle[r][c];

		puzzle[r][c] = 0;

		// Check uniqueness
		const copy = puzzle.map((row) => [...row]);

		if (countSolutions(copy, 2) !== 1) {
			puzzle[r][c] = backup; // restore — removal breaks uniqueness
		} else {
			removed++;
		}
	}

	return puzzle;
}

export interface GeneratedPuzzle {
	puzzle: number[][];
	solution: number[][];
}

/**
 * Generate a new Sudoku puzzle for the given difficulty.
 */
export function generatePuzzle(difficulty: Difficulty): GeneratedPuzzle {
	const solution = emptyGrid();

	fillGrid(solution);

	const { givens } = DIFFICULTY_PRESETS[difficulty];
	const puzzle = removeCells(solution, givens);

	return { puzzle, solution };
}
