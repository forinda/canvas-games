import type { GameDefinition } from "@shared/GameInterface.ts";
import { PlatformAdapter } from "./adapters/PlatformAdapter.ts";

export const ConnectFourGame: GameDefinition = {
	id: "connect-four",
	name: "Connect Four",
	description:
		"Classic two-player strategy game — drop discs to connect four in a row!",
	icon: "\u{1F534}",
	color: "#e53935",
	category: "strategy",
	help: {
		goal: "Drop discs to connect four in a row horizontally, vertically, or diagonally.",
		controls: [
			{ key: "Click", action: "Drop a disc in the selected column" },
			{ key: "R", action: "Restart current game" },
			{ key: "M", action: "Change game mode" },
			{ key: "H", action: "Toggle help overlay" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Control the center column for a strategic advantage",
			"Try to build multiple threats at once",
			"Block your opponent before they connect four",
		],
	},
	create(canvas, onExit) {
		const instance = new PlatformAdapter(canvas, onExit);

		instance.start();

		return instance;
	},
};
