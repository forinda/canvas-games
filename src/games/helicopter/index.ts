import type { GameDefinition } from "@shared/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const HelicopterGame: GameDefinition = {
	id: "helicopter",
	category: "arcade" as const,
	name: "Helicopter",
	description: "Navigate a helicopter through an endless cave!",
	icon: "\u{1F681}",
	color: "#66bb6a",
	help: {
		goal: "Fly as far as possible without crashing into cave walls or obstacles.",
		controls: [
			{ key: "Hold Space / Click", action: "Rise (lift)" },
			{ key: "Release", action: "Fall (gravity)" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Hold to rise, release to descend — smooth movements are key",
			"The cave narrows over time so stay alert",
			"Speed increases gradually — anticipate obstacles early",
			"Watch for stalactites and stalagmites inside the cave",
		],
	},
	create(canvas, onExit) {
		const instance = new PlatformAdapter(canvas, onExit);

		instance.start();

		return instance;
	},
};
