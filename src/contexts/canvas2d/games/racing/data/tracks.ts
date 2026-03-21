import type { TrackDefinition } from "../types";

/**
 * Default track: an oval-ish loop with curves.
 * Waypoints form a closed loop; the last connects back to the first.
 */
export const defaultTrack: TrackDefinition = {
	name: "Grand Circuit",
	roadWidth: 100,
	startAngle: 0,
	waypoints: [
		// Bottom straight (start/finish)
		{ x: 400, y: 600 },
		{ x: 700, y: 600 },
		{ x: 1000, y: 600 },
		// Bottom-right curve
		{ x: 1200, y: 550 },
		{ x: 1350, y: 420 },
		// Right straight up
		{ x: 1380, y: 250 },
		// Top-right curve
		{ x: 1300, y: 100 },
		{ x: 1150, y: 30 },
		// Top straight
		{ x: 900, y: 0 },
		{ x: 650, y: -20 },
		{ x: 400, y: 0 },
		// Top-left curve
		{ x: 250, y: 60 },
		{ x: 130, y: 180 },
		// Left straight down
		{ x: 100, y: 350 },
		// Bottom-left curve
		{ x: 140, y: 500 },
		{ x: 250, y: 590 },
	],
};
