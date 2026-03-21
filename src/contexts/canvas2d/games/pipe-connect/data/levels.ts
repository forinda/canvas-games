import type { Pipe, PipeType, Rotation, PipeState } from "../types";
import {
	ROTATIONS,
	getOpenings,
	DIR_OFFSETS,
	gridSizeForLevel,
} from "../types";

const PIPE_TYPES: PipeType[] = ["straight", "elbow", "tee", "cross"];

function randomRotation(): Rotation {
	return ROTATIONS[Math.floor(Math.random() * ROTATIONS.length)];
}

function randomPipeType(): PipeType {
	// Weighted: fewer crosses, more straights/elbows
	const weights: [PipeType, number][] = [
		["straight", 4],
		["elbow", 4],
		["tee", 2],
		["cross", 1],
	];
	const total = weights.reduce((s, w) => s + w[1], 0);
	let r = Math.random() * total;

	for (const [t, w] of weights) {
		r -= w;

		if (r <= 0) return t;
	}

	return "straight";
}

function createPipe(
	type: PipeType,
	rotation: Rotation,
	isSource = false,
	isDrain = false,
): Pipe {
	return {
		type,
		rotation,
		connected: isSource,
		waterFill: isSource ? 1 : 0,
		isSource,
		isDrain,
	};
}

/**
 * Generate a solvable level:
 * 1. Place source at top-left area, drain at bottom-right area
 * 2. Build a random path from source to drain using DFS
 * 3. For each cell on the path, choose a pipe type/rotation that has the required openings
 * 4. Fill remaining cells with random pipes
 * 5. Scramble all rotations so the player needs to solve it
 */
export function generateLevel(state: PipeState): void {
	const size = gridSizeForLevel(state.level);

	state.rows = size;
	state.cols = size;

	// Place source and drain
	state.sourceRow = 0;
	state.sourceCol = 0;
	state.drainRow = size - 1;
	state.drainCol = size - 1;

	// Build a path from source to drain using random walk
	const path = buildPath(
		size,
		state.sourceRow,
		state.sourceCol,
		state.drainRow,
		state.drainCol,
	);

	// Create the grid
	const grid: Pipe[][] = [];

	for (let r = 0; r < size; r++) {
		grid[r] = [];

		for (let c = 0; c < size; c++) {
			grid[r][c] = createPipe("straight", 0);
		}
	}

	// For each cell on the path, determine which directions it needs to connect
	const pathSet = new Map<string, number>();

	path.forEach((p, i) => pathSet.set(`${p[0]},${p[1]}`, i));

	for (let i = 0; i < path.length; i++) {
		const [r, c] = path[i];
		const neededDirs: number[] = [];

		if (i > 0) {
			const [pr, pc] = path[i - 1];
			const dr = r - pr;
			const dc = c - pc;

			// Find which direction the previous cell is from current cell
			for (let d = 0; d < 4; d++) {
				if (DIR_OFFSETS[d][0] === -dr && DIR_OFFSETS[d][1] === -dc) {
					neededDirs.push(d);
					break;
				}
			}
		}

		if (i < path.length - 1) {
			const [nr, nc] = path[i + 1];
			const dr = nr - r;
			const dc = nc - c;

			for (let d = 0; d < 4; d++) {
				if (DIR_OFFSETS[d][0] === dr && DIR_OFFSETS[d][1] === dc) {
					neededDirs.push(d);
					break;
				}
			}
		}

		// Find a pipe type + rotation that has at least these openings
		const { type, rotation } = findPipeForDirections(neededDirs);
		const isSource = r === state.sourceRow && c === state.sourceCol;
		const isDrain = r === state.drainRow && c === state.drainCol;

		grid[r][c] = createPipe(type, rotation, isSource, isDrain);
	}

	// Fill non-path cells with random pipes
	for (let r = 0; r < size; r++) {
		for (let c = 0; c < size; c++) {
			if (!pathSet.has(`${r},${c}`)) {
				grid[r][c] = createPipe(randomPipeType(), randomRotation());
			}
		}
	}

	// Store the solution rotations, then scramble
	// Just scramble all non-source rotations
	for (let r = 0; r < size; r++) {
		for (let c = 0; c < size; c++) {
			grid[r][c].rotation = randomRotation();
			grid[r][c].connected = false;
			grid[r][c].waterFill = 0;

			if (grid[r][c].isSource) {
				grid[r][c].connected = true;
				grid[r][c].waterFill = 1;
			}
		}
	}

	state.grid = grid;
	state.moves = 0;
	state.timer = 0;
	state.status = "playing";
}

/** Build a random path from (sr,sc) to (dr,dc) on a size x size grid */
function buildPath(
	size: number,
	sr: number,
	sc: number,
	dr: number,
	dc: number,
): [number, number][] {
	const visited = new Set<string>();
	const path: [number, number][] = [];

	function dfs(r: number, c: number): boolean {
		if (r === dr && c === dc) {
			path.push([r, c]);

			return true;
		}

		visited.add(`${r},${c}`);
		path.push([r, c]);

		// Shuffle directions, but bias toward the target
		const dirs = [0, 1, 2, 3].sort(() => {
			// Bias: prefer directions that move toward target
			return Math.random() - 0.3;
		});

		// Sort to prefer directions closer to target
		dirs.sort((a, b) => {
			const [ar, ac] = DIR_OFFSETS[a];
			const [br, bc] = DIR_OFFSETS[b];
			const distA = Math.abs(r + ar - dr) + Math.abs(c + ac - dc);
			const distB = Math.abs(r + br - dr) + Math.abs(c + bc - dc);

			return distA - distB + (Math.random() - 0.5) * 3;
		});

		for (const d of dirs) {
			const nr = r + DIR_OFFSETS[d][0];
			const nc = c + DIR_OFFSETS[d][1];

			if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;

			if (visited.has(`${nr},${nc}`)) continue;

			if (dfs(nr, nc)) return true;
		}

		path.pop();

		return false;
	}

	dfs(sr, sc);

	return path;
}

/** Find a pipe type and rotation whose openings include all needed directions */
function findPipeForDirections(neededDirs: number[]): {
	type: PipeType;
	rotation: Rotation;
} {
	// Try each pipe type and rotation
	for (const type of PIPE_TYPES) {
		for (const rotation of ROTATIONS) {
			const pipe: Pipe = {
				type,
				rotation,
				connected: false,
				waterFill: 0,
				isSource: false,
				isDrain: false,
			};
			const openings = getOpenings(pipe);

			if (neededDirs.every((d) => openings.includes(d))) {
				// Prefer minimal openings to avoid trivially easy puzzles
				if (openings.length <= neededDirs.length + 1) {
					return { type, rotation };
				}
			}
		}
	}

	// Fallback: cross pipe works for any combo
	return { type: "cross", rotation: 0 };
}
