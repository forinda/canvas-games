import type { GameDefinition } from "@shared/GameInterface.ts";
import { PlatformAdapter } from "./adapters/PlatformAdapter.ts";

export const ChessGame: GameDefinition = {
	id: "chess",
	name: "Chess",
	description: "Classic strategy board game — checkmate the king to win!",
	icon: "\u265F\uFE0F",
	color: "#5d4037",
	category: "strategy",
	help: {
		goal: "Checkmate your opponent's king — trap it so it cannot escape capture.",
		controls: [
			{ key: "Click", action: "Select piece, then click destination" },
			{ key: "R", action: "Restart game" },
			{ key: "M", action: "Change game mode" },
			{ key: "U", action: "Undo last move" },
			{ key: "H", action: "Toggle help overlay" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Control the center of the board early",
			"Develop knights and bishops before the queen",
			"Castle early to protect your king",
			"In AI mode, the computer plays as Black",
			"Look for forks, pins, and skewers to win material",
		],
	},
	create(canvas, onExit) {
		const instance = new PlatformAdapter(canvas, onExit);

		instance.start();

		return instance;
	},
};
