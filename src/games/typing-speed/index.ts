import type { GameDefinition } from "@shared/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const TypingSpeedGame: GameDefinition = {
	id: "typing-speed",
	name: "Typing Speed",
	description: "Type falling words before they hit the bottom!",
	icon: "\u2328\uFE0F",
	color: "#00897b",
	category: "arcade" as const,
	help: {
		goal: "Type falling words before they reach the bottom. Survive as long as you can!",
		controls: [
			{ key: "A-Z", action: "Type letters to match falling words" },
			{ key: "Backspace", action: "Delete last typed letter" },
			{ key: "P", action: "Pause / Resume" },
			{ key: "H", action: "Toggle help overlay" },
			{ key: "Space / Enter", action: "Restart after game over" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Words auto-target the closest matching word to the bottom",
			"Longer words give more points (length x 10)",
			"Speed and spawn rate increase over time",
			"Watch for words in the danger zone at the bottom",
		],
	},
	create(canvas, onExit) {
		const instance = new PlatformAdapter(canvas, onExit);

		instance.start();

		return instance;
	},
};
