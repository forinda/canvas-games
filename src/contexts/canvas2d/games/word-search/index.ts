import type { GameDefinition } from "@core/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const WordSearchGame: GameDefinition = {
	id: "word-search",
	category: "puzzle" as const,
	name: "Word Search",
	description: "Find hidden words in a grid of letters!",
	icon: "\u{1F524}",
	color: "#5c6bc0",
	help: {
		goal: "Find all hidden words in the letter grid by clicking and dragging.",
		controls: [
			{ key: "Click + Drag", action: "Select letters in a line" },
			{ key: "R", action: "New puzzle (random theme)" },
			{ key: "H", action: "Toggle help overlay" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Words can be horizontal, vertical, diagonal, or reversed",
			"Drag in the direction of the word to highlight it",
			"Found words stay highlighted with a colored line",
			"Check the word list on the right to see remaining words",
		],
	},
	create(canvas, onExit) {
		const instance = new PlatformAdapter(canvas, onExit);

		instance.start();

		return instance;
	},
};
