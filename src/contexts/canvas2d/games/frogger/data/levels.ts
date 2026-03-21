import type { LaneDescriptor } from "../types";

/**
 * Returns the 13-row lane layout for a given level.
 * Higher levels increase speeds.
 */
export function buildLanes(level: number): LaneDescriptor[] {
	const s = 1 + (level - 1) * 0.15; // speed multiplier

	return [
		// Row 0 — goal (lily-pad row)
		{ kind: "goal", speed: 0, direction: 1, objects: [] },

		// Rows 1–5 — river (logs)
		{
			kind: "river",
			speed: 50 * s,
			direction: -1,
			objects: [{ width: 3, gap: 3 }],
		},
		{
			kind: "river",
			speed: 35 * s,
			direction: 1,
			objects: [{ width: 4, gap: 2 }],
		},
		{
			kind: "river",
			speed: 55 * s,
			direction: -1,
			objects: [{ width: 2, gap: 3 }],
		},
		{
			kind: "river",
			speed: 40 * s,
			direction: 1,
			objects: [{ width: 3, gap: 4 }],
		},
		{
			kind: "river",
			speed: 60 * s,
			direction: -1,
			objects: [{ width: 4, gap: 3 }],
		},

		// Row 6 — safe zone (median)
		{ kind: "safe", speed: 0, direction: 1, objects: [] },

		// Rows 7–11 — road (vehicles)
		{
			kind: "road",
			speed: 60 * s,
			direction: -1,
			objects: [{ width: 1, gap: 4 }],
		},
		{
			kind: "road",
			speed: 40 * s,
			direction: 1,
			objects: [{ width: 2, gap: 3 }],
		},
		{
			kind: "road",
			speed: 75 * s,
			direction: -1,
			objects: [{ width: 1, gap: 5 }],
		},
		{
			kind: "road",
			speed: 50 * s,
			direction: 1,
			objects: [{ width: 2, gap: 4 }],
		},
		{
			kind: "road",
			speed: 65 * s,
			direction: -1,
			objects: [{ width: 1, gap: 3 }],
		},

		// Row 12 — start zone
		{ kind: "start", speed: 0, direction: 1, objects: [] },
	];
}

/** Colours used for each vehicle in a lane (cycles) */
export const VEHICLE_COLORS = [
	"#e53935",
	"#fb8c00",
	"#fdd835",
	"#8e24aa",
	"#1e88e5",
];
