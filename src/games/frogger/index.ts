import type { GameDefinition } from "@shared/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const FroggerGame: GameDefinition = {
	id: "frogger",
	name: "Frogger",
	description: "Guide the frog across busy roads and rivers!",
	icon: "🐸",
	color: "#4caf50",
	category: "arcade" as const,
	help: {
		goal: "Guide the frog across traffic and rivers to reach all 5 lily pads.",
		controls: [
			{ key: "Arrow Keys / WASD", action: "Hop one cell in that direction" },
			{ key: "P", action: "Pause / resume" },
			{ key: "H", action: "Toggle help overlay" },
			{ key: "Space / Enter", action: "Restart after game over" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Time your hops carefully — watch traffic before moving",
			"On river lanes you must land on a log or you drown",
			"The frog rides logs — watch out for the screen edges",
			"Fill all 5 lily pads to clear the level",
			"Speed increases each level — stay alert!",
		],
	},
	create(canvas, onExit) {
		const instance = new PlatformAdapter(canvas, onExit);

		instance.start();

		return instance;
	},
};
