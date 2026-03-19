import type { GameDefinition } from "@shared/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const GravityBallGame: GameDefinition = {
	id: "gravity-ball",
	category: "puzzle" as const,
	name: "Gravity Ball",
	description: "Flip gravity to guide the ball through maze puzzles!",
	icon: "\u26ab",
	color: "#78909c",
	help: {
		goal: "Guide the ball to the green exit by changing gravity direction.",
		controls: [
			{ key: "Arrow Keys / WASD", action: "Change gravity direction" },
			{ key: "R", action: "Restart current level" },
			{ key: "Space / Enter", action: "Next level (when complete)" },
			{ key: "H", action: "Toggle help overlay" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"The ball rolls until it hits a wall.",
			"Plan your gravity flips ahead of time.",
			"Fewer moves = better mastery!",
			"Some levels require creative sequences.",
		],
	},
	create(canvas, onExit) {
		const instance = new PlatformAdapter(canvas, onExit);

		instance.start();

		return instance;
	},
};
