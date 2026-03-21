import type { GameHelp } from "@core/GameInterface";

export const GAME_NAME = "Ant Colony";
export const GAME_COLOR = "#6d4c41";

export const antColonyHelp: GameHelp = {
	goal: "Build a thriving ant colony. Forage food, dig tunnels, and survive the winter.",
	controls: [
		{ key: "Left Click", action: "Place food source" },
		{ key: "Right Click", action: "Dig tunnel waypoint" },
		{ key: "1", action: "Increase forager ratio" },
		{ key: "2", action: "Increase builder ratio" },
		{ key: "3", action: "Increase idle ratio" },
		{ key: "P", action: "Pause / resume" },
		{ key: "H", action: "Toggle help" },
		{ key: "ESC", action: "Exit to menu" },
	],
	tips: [
		"Place food near the colony so foragers return quickly.",
		"Builders extend tunnels - tunnels increase max population.",
		"Stock up on food before winter or ants will starve!",
		"Food spawns naturally in spring/summer but not in winter.",
		"Ants leave pheromone trails that others follow.",
	],
};
