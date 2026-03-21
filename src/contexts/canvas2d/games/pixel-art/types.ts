export type Tool = "draw" | "erase" | "fill" | "eyedropper";

export type GridSize = 16 | 32 | 64;

export const GRID_SIZES: GridSize[] = [16, 32, 64];

export const DEFAULT_GRID_SIZE: GridSize = 32;

export const COLOR_PALETTE: string[] = [
	"#000000", // black
	"#ffffff", // white
	"#ff0000", // red
	"#00ff00", // green
	"#0000ff", // blue
	"#ffff00", // yellow
	"#ff00ff", // magenta
	"#00ffff", // cyan
	"#ff8800", // orange
	"#8800ff", // purple
	"#0088ff", // sky blue
	"#ff0088", // hot pink
	"#88ff00", // lime
	"#884400", // brown
	"#888888", // gray
	"#444444", // dark gray
];

export interface PixelArtState {
	grid: (string | null)[][];
	gridSize: GridSize;
	currentTool: Tool;
	currentColor: string;
	hoverX: number;
	hoverY: number;
	hoverActive: boolean;
	isDrawing: boolean;
	canvasWidth: number;
	canvasHeight: number;
}

export const HUD_HEIGHT = 100;

export function createEmptyGrid(size: GridSize): (string | null)[][] {
	const grid: (string | null)[][] = [];

	for (let y = 0; y < size; y++) {
		const row: (string | null)[] = [];

		for (let x = 0; x < size; x++) {
			row.push(null);
		}

		grid.push(row);
	}

	return grid;
}
