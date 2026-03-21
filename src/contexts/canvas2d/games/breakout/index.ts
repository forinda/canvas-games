import type { GameDefinition } from "@core/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const BreakoutGame: GameDefinition = {
	id: "breakout",
	category: "arcade" as const,
	name: "Breakout",
	description: "Break all the bricks with your ball!",
	icon: "\uD83E\uDDF1",
	color: "#e74c3c",
	help: {
		goal: "Break all the bricks by bouncing the ball off your paddle.",
		controls: [
			{ key: "Mouse", action: "Move paddle left/right" },
			{ key: "Click", action: "Launch ball / restart" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Catch powerups for wider paddle, multi-ball, or slow ball",
			"Aim for the corners to clear bricks faster",
			"Ball speed increases each level",
		],
	},
	create(canvas, onExit) {
		const instance = new PlatformAdapter(canvas, onExit);

		instance.start();

		return instance;
	},
};
