import type { LevelDef } from "../types";

/**
 * 15 puzzle levels for Gravity Ball.
 * Each level requires the player to flip gravity in the right sequence
 * so the ball rolls into the exit.
 * Coordinate system: (0,0) is top-left. Walls form the boundaries and obstacles.
 */
export const LEVELS: LevelDef[] = [
	// Level 1 — Tutorial: simple drop down to exit
	{
		width: 7,
		height: 7,
		ballStart: { x: 3, y: 1 },
		exit: { x: 3, y: 5 },
		walls: [
			// Border walls
			...border(7, 7),
			// Small platform
			{ x: 2, y: 3 },
			{ x: 4, y: 3 },
		],
	},

	// Level 2 — Go right then down
	{
		width: 9,
		height: 7,
		ballStart: { x: 1, y: 1 },
		exit: { x: 7, y: 5 },
		walls: [
			...border(9, 7),
			{ x: 3, y: 1 },
			{ x: 3, y: 2 },
			{ x: 3, y: 3 },
			{ x: 5, y: 3 },
			{ x: 5, y: 4 },
			{ x: 5, y: 5 },
		],
	},

	// Level 3 — Zigzag down-right-down
	{
		width: 9,
		height: 9,
		ballStart: { x: 1, y: 1 },
		exit: { x: 7, y: 7 },
		walls: [
			...border(9, 9),
			{ x: 1, y: 3 },
			{ x: 2, y: 3 },
			{ x: 3, y: 3 },
			{ x: 5, y: 3 },
			{ x: 6, y: 3 },
			{ x: 7, y: 3 },
			{ x: 3, y: 5 },
			{ x: 4, y: 5 },
			{ x: 5, y: 5 },
			{ x: 5, y: 6 },
			{ x: 5, y: 7 },
		],
	},

	// Level 4 — U-turn: down, right, up, right, down
	{
		width: 11,
		height: 7,
		ballStart: { x: 1, y: 1 },
		exit: { x: 9, y: 5 },
		walls: [
			...border(11, 7),
			{ x: 3, y: 1 },
			{ x: 3, y: 2 },
			{ x: 3, y: 3 },
			{ x: 5, y: 3 },
			{ x: 5, y: 4 },
			{ x: 5, y: 5 },
			{ x: 7, y: 1 },
			{ x: 7, y: 2 },
			{ x: 7, y: 3 },
		],
	},

	// Level 5 — Spiral inward
	{
		width: 9,
		height: 9,
		ballStart: { x: 1, y: 1 },
		exit: { x: 4, y: 4 },
		walls: [
			...border(9, 9),
			// Inner spiral walls
			{ x: 2, y: 3 },
			{ x: 3, y: 3 },
			{ x: 4, y: 3 },
			{ x: 5, y: 3 },
			{ x: 6, y: 3 },
			{ x: 6, y: 4 },
			{ x: 6, y: 5 },
			{ x: 6, y: 6 },
			{ x: 5, y: 6 },
			{ x: 4, y: 6 },
			{ x: 3, y: 6 },
			{ x: 3, y: 5 },
		],
	},

	// Level 6 — Corridor maze
	{
		width: 11,
		height: 9,
		ballStart: { x: 1, y: 1 },
		exit: { x: 9, y: 7 },
		walls: [
			...border(11, 9),
			{ x: 3, y: 1 },
			{ x: 3, y: 2 },
			{ x: 3, y: 3 },
			{ x: 3, y: 4 },
			{ x: 5, y: 4 },
			{ x: 5, y: 5 },
			{ x: 5, y: 6 },
			{ x: 5, y: 7 },
			{ x: 7, y: 1 },
			{ x: 7, y: 2 },
			{ x: 7, y: 3 },
			{ x: 7, y: 4 },
		],
	},

	// Level 7 — Island hopping
	{
		width: 11,
		height: 9,
		ballStart: { x: 1, y: 1 },
		exit: { x: 9, y: 7 },
		walls: [
			...border(11, 9),
			{ x: 3, y: 3 },
			{ x: 4, y: 3 },
			{ x: 3, y: 4 },
			{ x: 6, y: 5 },
			{ x: 7, y: 5 },
			{ x: 7, y: 6 },
			{ x: 4, y: 7 },
			{ x: 5, y: 7 },
		],
	},

	// Level 8 — Narrow passages
	{
		width: 11,
		height: 11,
		ballStart: { x: 1, y: 1 },
		exit: { x: 9, y: 9 },
		walls: [
			...border(11, 11),
			{ x: 3, y: 1 },
			{ x: 3, y: 2 },
			{ x: 3, y: 3 },
			{ x: 3, y: 5 },
			{ x: 3, y: 6 },
			{ x: 3, y: 7 },
			{ x: 5, y: 3 },
			{ x: 5, y: 4 },
			{ x: 5, y: 5 },
			{ x: 7, y: 5 },
			{ x: 7, y: 6 },
			{ x: 7, y: 7 },
			{ x: 7, y: 8 },
			{ x: 7, y: 9 },
			{ x: 5, y: 7 },
			{ x: 5, y: 8 },
			{ x: 5, y: 9 },
		],
	},

	// Level 9 — Open room with pillars
	{
		width: 11,
		height: 11,
		ballStart: { x: 1, y: 1 },
		exit: { x: 9, y: 9 },
		walls: [
			...border(11, 11),
			{ x: 3, y: 3 },
			{ x: 7, y: 3 },
			{ x: 5, y: 5 },
			{ x: 3, y: 7 },
			{ x: 7, y: 7 },
			{ x: 5, y: 3 },
			{ x: 5, y: 7 },
			{ x: 3, y: 5 },
			{ x: 7, y: 5 },
		],
	},

	// Level 10 — Winding path
	{
		width: 13,
		height: 9,
		ballStart: { x: 1, y: 1 },
		exit: { x: 11, y: 7 },
		walls: [
			...border(13, 9),
			{ x: 2, y: 3 },
			{ x: 3, y: 3 },
			{ x: 4, y: 3 },
			{ x: 4, y: 4 },
			{ x: 6, y: 2 },
			{ x: 6, y: 3 },
			{ x: 6, y: 4 },
			{ x: 6, y: 5 },
			{ x: 8, y: 4 },
			{ x: 8, y: 5 },
			{ x: 8, y: 6 },
			{ x: 8, y: 7 },
			{ x: 10, y: 2 },
			{ x: 10, y: 3 },
			{ x: 10, y: 4 },
			{ x: 10, y: 5 },
		],
	},

	// Level 11 — Multi-chamber
	{
		width: 13,
		height: 11,
		ballStart: { x: 1, y: 1 },
		exit: { x: 11, y: 9 },
		walls: [
			...border(13, 11),
			// Vertical divider with gap
			{ x: 4, y: 1 },
			{ x: 4, y: 2 },
			{ x: 4, y: 3 },
			{ x: 4, y: 5 },
			{ x: 4, y: 6 },
			{ x: 4, y: 7 },
			{ x: 4, y: 8 },
			{ x: 4, y: 9 },
			// Second divider
			{ x: 8, y: 1 },
			{ x: 8, y: 2 },
			{ x: 8, y: 3 },
			{ x: 8, y: 4 },
			{ x: 8, y: 5 },
			{ x: 8, y: 7 },
			{ x: 8, y: 8 },
			{ x: 8, y: 9 },
			// Internal obstacles
			{ x: 2, y: 5 },
			{ x: 6, y: 3 },
			{ x: 6, y: 7 },
			{ x: 10, y: 5 },
		],
	},

	// Level 12 — Labyrinth
	{
		width: 13,
		height: 13,
		ballStart: { x: 1, y: 1 },
		exit: { x: 11, y: 11 },
		walls: [
			...border(13, 13),
			{ x: 3, y: 1 },
			{ x: 3, y: 2 },
			{ x: 3, y: 3 },
			{ x: 3, y: 4 },
			{ x: 3, y: 5 },
			{ x: 5, y: 3 },
			{ x: 5, y: 4 },
			{ x: 5, y: 5 },
			{ x: 5, y: 6 },
			{ x: 5, y: 7 },
			{ x: 5, y: 8 },
			{ x: 5, y: 9 },
			{ x: 7, y: 1 },
			{ x: 7, y: 2 },
			{ x: 7, y: 3 },
			{ x: 7, y: 5 },
			{ x: 7, y: 6 },
			{ x: 7, y: 7 },
			{ x: 9, y: 3 },
			{ x: 9, y: 4 },
			{ x: 9, y: 5 },
			{ x: 9, y: 6 },
			{ x: 9, y: 7 },
			{ x: 9, y: 8 },
			{ x: 9, y: 9 },
			{ x: 9, y: 10 },
			{ x: 9, y: 11 },
			{ x: 3, y: 7 },
			{ x: 3, y: 8 },
			{ x: 3, y: 9 },
			{ x: 3, y: 10 },
			{ x: 3, y: 11 },
			{ x: 7, y: 9 },
			{ x: 7, y: 10 },
			{ x: 7, y: 11 },
		],
	},

	// Level 13 — Checkerboard obstacles
	{
		width: 11,
		height: 11,
		ballStart: { x: 1, y: 1 },
		exit: { x: 9, y: 9 },
		walls: [
			...border(11, 11),
			{ x: 2, y: 4 },
			{ x: 4, y: 2 },
			{ x: 4, y: 4 },
			{ x: 4, y: 6 },
			{ x: 4, y: 8 },
			{ x: 6, y: 2 },
			{ x: 6, y: 4 },
			{ x: 6, y: 6 },
			{ x: 6, y: 8 },
			{ x: 8, y: 4 },
			{ x: 8, y: 6 },
			{ x: 2, y: 6 },
			{ x: 2, y: 8 },
			{ x: 8, y: 2 },
			{ x: 8, y: 8 },
		],
	},

	// Level 14 — Funnel
	{
		width: 13,
		height: 13,
		ballStart: { x: 1, y: 1 },
		exit: { x: 6, y: 11 },
		walls: [
			...border(13, 13),
			// Funnel walls narrowing to center
			{ x: 2, y: 3 },
			{ x: 3, y: 3 },
			{ x: 9, y: 3 },
			{ x: 10, y: 3 },
			{ x: 3, y: 5 },
			{ x: 4, y: 5 },
			{ x: 8, y: 5 },
			{ x: 9, y: 5 },
			{ x: 4, y: 7 },
			{ x: 5, y: 7 },
			{ x: 7, y: 7 },
			{ x: 8, y: 7 },
			{ x: 5, y: 9 },
			{ x: 7, y: 9 },
			// Blocker
			{ x: 6, y: 5 },
			{ x: 3, y: 8 },
			{ x: 9, y: 8 },
			{ x: 2, y: 10 },
			{ x: 10, y: 10 },
		],
	},

	// Level 15 — Final challenge: complex maze
	{
		width: 15,
		height: 13,
		ballStart: { x: 1, y: 1 },
		exit: { x: 13, y: 11 },
		walls: [
			...border(15, 13),
			// Maze structure
			{ x: 3, y: 1 },
			{ x: 3, y: 2 },
			{ x: 3, y: 3 },
			{ x: 3, y: 4 },
			{ x: 5, y: 3 },
			{ x: 5, y: 4 },
			{ x: 5, y: 5 },
			{ x: 5, y: 6 },
			{ x: 5, y: 7 },
			{ x: 7, y: 1 },
			{ x: 7, y: 2 },
			{ x: 7, y: 3 },
			{ x: 7, y: 5 },
			{ x: 7, y: 6 },
			{ x: 7, y: 7 },
			{ x: 7, y: 8 },
			{ x: 9, y: 3 },
			{ x: 9, y: 4 },
			{ x: 9, y: 5 },
			{ x: 9, y: 7 },
			{ x: 9, y: 8 },
			{ x: 9, y: 9 },
			{ x: 9, y: 10 },
			{ x: 9, y: 11 },
			{ x: 11, y: 1 },
			{ x: 11, y: 2 },
			{ x: 11, y: 3 },
			{ x: 11, y: 4 },
			{ x: 11, y: 5 },
			{ x: 11, y: 7 },
			{ x: 11, y: 8 },
			{ x: 11, y: 9 },
			{ x: 3, y: 6 },
			{ x: 3, y: 7 },
			{ x: 3, y: 8 },
			{ x: 3, y: 9 },
			{ x: 3, y: 10 },
			{ x: 3, y: 11 },
			{ x: 5, y: 9 },
			{ x: 5, y: 10 },
			{ x: 5, y: 11 },
			{ x: 13, y: 5 },
			{ x: 13, y: 6 },
			{ x: 13, y: 7 },
		],
	},
];

/** Helper: generate border walls for a grid of given width x height */
function border(w: number, h: number): { x: number; y: number }[] {
	const result: { x: number; y: number }[] = [];

	for (let x = 0; x < w; x++) {
		result.push({ x, y: 0 });
		result.push({ x, y: h - 1 });
	}

	for (let y = 1; y < h - 1; y++) {
		result.push({ x: 0, y });
		result.push({ x: w - 1, y });
	}

	return result;
}
