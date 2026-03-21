import type { GameDefinition } from "@core/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const FlappyBirdGame: GameDefinition = {
	id: "flappy-bird",
	category: "arcade" as const,
	name: "Flappy Bird",
	description: "Tap to flap through the pipes!",
	icon: "🐦",
	color: "#f1c40f",
	help: {
		goal: "Fly through pipe gaps without hitting them or the ground.",
		controls: [
			{ key: "Space / Click", action: "Flap upward" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Tap rhythmically — small frequent flaps give more control",
			"The bird rotates with velocity — watch the angle",
			"Pipes have consistent gaps — stay centered",
		],
	},
	create(canvas, onExit) {
		const instance = new PlatformAdapter(canvas, onExit);

		instance.start();

		return instance;
	},
};
