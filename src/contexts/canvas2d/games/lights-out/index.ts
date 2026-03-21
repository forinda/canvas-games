import type { GameDefinition } from "@core/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const LightsOutGame: GameDefinition = {
	id: "lights-out",
	name: "Lights Out",
	description:
		"Toggle lights to turn them all off — but each click flips the neighbours too!",
	icon: "\u{1F4A1}",
	color: "#ffca28",
	category: "puzzle" as const,
	help: {
		goal: "Turn off every light on the board to complete each level.",
		controls: [
			{ key: "Left Click", action: "Toggle a cell and its 4 neighbours" },
			{ key: "N", action: "Next level (after completing one)" },
			{ key: "R", action: "Restart current level" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Each click toggles the clicked cell plus up/down/left/right neighbours",
			"Corner clicks only affect 3 cells, edge clicks affect 4",
			"Try working row by row from top to bottom",
			"Every level is guaranteed to be solvable",
			"Fewer moves is better — challenge yourself!",
		],
	},
	create(canvas, onExit) {
		const instance = new PlatformAdapter(canvas, onExit);

		instance.start();

		return instance;
	},
};
