import type { Updatable } from "@core/Updatable";
import type { WordSearchState, Direction, Cell } from "../types";
import {
	DIRECTION_VECTORS,
	GRID_ROWS,
	GRID_COLS,
	WORDS_PER_PUZZLE,
} from "../types";
import { getRandomTheme } from "../data/words";

const ALL_DIRECTIONS: Direction[] = [
	"right",
	"left",
	"down",
	"up",
	"down-right",
	"down-left",
	"up-right",
	"up-left",
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export class BoardSystem implements Updatable<WordSearchState> {
	/** Generate a new puzzle into the state */
	initBoard(state: WordSearchState): void {
		const theme = getRandomTheme();

		state.theme = theme.name;
		state.rows = GRID_ROWS;
		state.cols = GRID_COLS;
		state.status = "playing";
		state.timer = 0;
		state.selection = [];
		state.dragging = false;
		state.dragStart = null;
		state.pointerPos = null;
		state.foundColors = new Map();

		// Initialize empty grid
		const grid: Cell[][] = [];

		for (let r = 0; r < GRID_ROWS; r++) {
			grid[r] = [];

			for (let c = 0; c < GRID_COLS; c++) {
				grid[r][c] = { letter: "", row: r, col: c };
			}
		}

		// Shuffle and pick words
		const shuffled = [...theme.words].sort(() => Math.random() - 0.5);
		const toPlace = shuffled.slice(0, WORDS_PER_PUZZLE);

		state.placedWords = [];

		for (const word of toPlace) {
			const placed = this.placeWord(grid, word);

			if (placed) {
				state.placedWords.push(placed);
			}
		}

		// Fill remaining cells with random letters
		for (let r = 0; r < GRID_ROWS; r++) {
			for (let c = 0; c < GRID_COLS; c++) {
				if (grid[r][c].letter === "") {
					grid[r][c].letter = ALPHABET[Math.floor(Math.random() * 26)];
				}
			}
		}

		state.grid = grid;
	}

	private placeWord(
		grid: Cell[][],
		word: string,
	): WordSearchState["placedWords"][0] | null {
		const dirs = [...ALL_DIRECTIONS].sort(() => Math.random() - 0.5);

		for (const dir of dirs) {
			const { dr, dc } = DIRECTION_VECTORS[dir];
			const positions = this.getValidPositions(word.length, dir);

			// Shuffle positions
			positions.sort(() => Math.random() - 0.5);

			for (const { row, col } of positions) {
				if (this.canPlace(grid, word, row, col, dr, dc)) {
					const cells: { row: number; col: number }[] = [];

					for (let i = 0; i < word.length; i++) {
						const r = row + i * dr;
						const c = col + i * dc;

						grid[r][c].letter = word[i];
						cells.push({ row: r, col: c });
					}

					return {
						word,
						startRow: row,
						startCol: col,
						direction: dir,
						found: false,
						cells,
					};
				}
			}
		}

		return null;
	}

	private getValidPositions(
		length: number,
		dir: Direction,
	): { row: number; col: number }[] {
		const { dr, dc } = DIRECTION_VECTORS[dir];
		const positions: { row: number; col: number }[] = [];

		for (let r = 0; r < GRID_ROWS; r++) {
			for (let c = 0; c < GRID_COLS; c++) {
				const endR = r + (length - 1) * dr;
				const endC = c + (length - 1) * dc;

				if (endR >= 0 && endR < GRID_ROWS && endC >= 0 && endC < GRID_COLS) {
					positions.push({ row: r, col: c });
				}
			}
		}

		return positions;
	}

	private canPlace(
		grid: Cell[][],
		word: string,
		row: number,
		col: number,
		dr: number,
		dc: number,
	): boolean {
		for (let i = 0; i < word.length; i++) {
			const r = row + i * dr;
			const c = col + i * dc;
			const existing = grid[r][c].letter;

			if (existing !== "" && existing !== word[i]) {
				return false;
			}
		}

		return true;
	}

	update(state: WordSearchState, dt: number): void {
		if (state.status === "playing") {
			state.timer += dt / 1000;
		}
	}
}
