import type { GameDefinition } from "@shared/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const BalloonPopGame: GameDefinition = {
	id: "balloon-pop",
	category: "arcade" as const,
	name: "Balloon Pop",
	description: "Pop colorful balloons before they float away!",
	icon: "\uD83C\uDF88",
	color: "#e91e63",
	help: {
		goal: "Pop as many balloons as possible in 90 seconds. Don't let them escape!",
		controls: [
			{ key: "Click / Tap", action: "Pop a balloon" },
			{ key: "P", action: "Pause game" },
			{ key: "Space", action: "Start / Restart" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Smaller balloons are worth more points",
			"Pop balloons quickly to build a combo multiplier (up to x10)",
			"Missing a click resets your combo streak",
			"Balloons that escape off the top cost you a life (5 total)",
			"Spawn rate increases over time — stay sharp!",
		],
	},
	create(canvas, onExit) {
		const instance = new PlatformAdapter(canvas, onExit);

		instance.start();

		return instance;
	},
};
