import type { GameDefinition } from "@core/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const CheckersGame: GameDefinition = {
	id: "checkers",
	category: "strategy" as const,
	name: "Checkers",
	description: "Classic board game of strategy and captures",
	icon: "\uD83D\uDD34",
	color: "#b71c1c",
	help: {
		goal: "Capture all opponent pieces or block them from moving.",
		controls: [
			{ key: "Click", action: "Select piece / Move to square" },
			{ key: "H", action: "Pause / Resume" },
			{ key: "R", action: "Restart (after game over)" },
			{ key: "ESC", action: "Back to mode select / Exit" },
		],
		tips: [
			"Jumps are mandatory — if you can capture, you must",
			"Multi-jump chains: keep jumping if more captures are available",
			"Reach the opposite row to crown a King (moves in all 4 diagonals)",
			"Kings are worth 1.5x — protect yours and target theirs",
			"Control the center of the board for stronger positioning",
			"In AI mode you play Red; the AI plays Black",
		],
	},
	create(canvas, onExit) {
		const instance = new PlatformAdapter(canvas, onExit);

		instance.start();

		return instance;
	},
};
