import type { GameDefinition } from "@core/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const SimonSaysGame: GameDefinition = {
	id: "simon-says",
	name: "Simon Says",
	description: "Repeat the growing color sequence from memory!",
	icon: "\uD83D\uDFE2",
	color: "#4caf50",
	category: "puzzle",
	help: {
		goal: "Watch the color sequence, then repeat it from memory. Each round adds one more color.",
		controls: [
			{ key: "Click", action: "Press a colored quadrant" },
			{ key: "Space", action: "Start / Play again" },
			{ key: "R", action: "Restart game" },
			{ key: "H", action: "Toggle help overlay" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Focus on the pattern, not just individual colors",
			"Speed increases as you progress - stay sharp!",
			"Try to build muscle memory for longer sequences",
		],
	},
	create(canvas, onExit) {
		const instance = new PlatformAdapter(canvas, onExit);

		instance.start();

		return instance;
	},
};
