export const GRID_SIZE = 16;
export const VOXEL_SIZE = 1;

export interface BlockType {
	name: string;
	color: [number, number, number];
}

export const BLOCK_TYPES: BlockType[] = [
	{ name: "Grass", color: [0.3, 0.65, 0.2] },
	{ name: "Dirt", color: [0.55, 0.35, 0.2] },
	{ name: "Stone", color: [0.5, 0.5, 0.5] },
	{ name: "Wood", color: [0.6, 0.4, 0.2] },
	{ name: "Sand", color: [0.85, 0.78, 0.55] },
	{ name: "Water", color: [0.2, 0.4, 0.8] },
	{ name: "Brick", color: [0.7, 0.25, 0.2] },
	{ name: "Snow", color: [0.9, 0.92, 0.95] },
];

export interface Voxel {
	typeIdx: number;
}

export interface VoxelBuilderState {
	/** 3D grid: grid[y][z][x], null = empty */
	grid: (Voxel | null)[][][];
	/** Currently selected block type */
	selectedType: number;
	/** Cursor position in grid coords */
	cursorX: number;
	cursorY: number;
	cursorZ: number;
	/** Total blocks placed */
	blockCount: number;
}
