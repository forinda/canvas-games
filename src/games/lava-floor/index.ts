import type { GameDefinition } from "@shared/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const LavaFloorGame: GameDefinition = {
	id: "lava-floor",
	category: "action" as const,
	name: "Lava Floor",
	description: "Jump between sinking platforms — the floor is lava!",
	icon: "\u{1F30B}",
	color: "#ff5722",
	help: {
		goal: "Survive as long as possible by jumping between platforms before they sink into the lava.",
		controls: [
			{ key: "Arrow Left / Right", action: "Move horizontally" },
			{ key: "Space", action: "Jump" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Platforms sink 2 seconds after you land on them",
			"New platforms slide in from the sides — keep moving",
			"You can wrap around the screen edges horizontally",
			"Difficulty increases over time — platforms spawn faster",
			"Time your jumps carefully to land on fresh platforms",
		],
	},
	create(canvas, onExit) {
		const instance = new PlatformAdapter(canvas, onExit);

		instance.start();

		return instance;
	},
};
