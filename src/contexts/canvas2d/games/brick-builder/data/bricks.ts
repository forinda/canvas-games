import type { BrickTemplate } from "../types";

/** All available brick templates */
export const BRICK_TEMPLATES: readonly BrickTemplate[] = [
	{ id: "1x1", label: "1×1", w: 1, h: 1 },
	{ id: "2x1", label: "2×1", w: 2, h: 1 },
	{ id: "3x1", label: "3×1", w: 3, h: 1 },
	{ id: "4x1", label: "4×1", w: 4, h: 1 },
	{ id: "2x2", label: "2×2", w: 2, h: 2 },
];
