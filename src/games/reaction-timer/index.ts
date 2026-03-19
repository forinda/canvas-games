import type { GameDefinition } from "@shared/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const ReactionTimerGame: GameDefinition = {
	id: "reaction-timer",
	name: "Reaction Timer",
	description: "Test your reflexes — react when the screen turns green!",
	icon: "⏱️",
	color: "#ff5722",
	category: "arcade" as const,
	help: {
		goal: "React as fast as you can when the screen turns green.",
		controls: [
			{ key: "Click / Space", action: "React (click when green)" },
			{ key: "H", action: "Toggle help overlay" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Wait for the red screen to turn green before clicking",
			'Clicking while red counts as "too early" and wastes a round',
			"Your all-time best is saved to localStorage",
			"Average under 250ms is excellent!",
		],
	},
	create(canvas, onExit) {
		const instance = new PlatformAdapter(canvas, onExit);

		instance.start();

		return instance;
	},
};
