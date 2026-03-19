import type { GameDefinition } from "@shared/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const WhackAMoleGame: GameDefinition = {
	id: "whack-a-mole",
	category: "arcade" as const,
	name: "Whack-a-Mole",
	description: "Whack moles, dodge bombs, chase combos!",
	icon: "🔨",
	color: "#8d6e63",
	help: {
		goal: "Whack as many moles as possible in 60 seconds. Avoid bombs!",
		controls: [
			{ key: "Click", action: "Whack a mole (or bomb)" },
			{ key: "P", action: "Pause game" },
			{ key: "Space", action: "Start / Restart" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Consecutive hits build a combo multiplier (up to x5)",
			"Bombs appear from round 2 — hitting one costs 20 points and resets combo",
			"Moles appear faster as the round progresses",
			"Missing a click resets your combo streak",
		],
	},
	create(canvas, onExit) {
		const instance = new PlatformAdapter(canvas, onExit);

		instance.start();

		return instance;
	},
};
