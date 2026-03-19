import type { GameDefinition } from "@shared/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const AsteroidsGame: GameDefinition = {
	id: "asteroids",
	category: "arcade" as const,
	name: "Asteroids",
	description: "Destroy asteroids, survive the void!",
	icon: "🚀",
	color: "#9b59b6",
	help: {
		goal: "Destroy all asteroids without getting hit. Survive infinite waves!",
		controls: [
			{ key: "Left/Right", action: "Rotate ship" },
			{ key: "Up", action: "Thrust forward" },
			{ key: "Space", action: "Shoot" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Large asteroids split into 2 medium, medium into 2 small",
			"Your ship has momentum — thrust opposite to brake",
			"Screen wraps — use it to your advantage",
			"Brief invulnerability after losing a life",
		],
	},
	create(canvas, onExit) {
		const instance = new PlatformAdapter(canvas, onExit);

		instance.start();

		return instance;
	},
};
