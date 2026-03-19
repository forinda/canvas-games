import type { GameDefinition } from "@shared/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const PlatformerGame: GameDefinition = {
	id: "platformer",
	category: "action" as const,
	name: "Platformer",
	description: "Jump, collect coins, reach the flag!",
	icon: "\u{1F3C3}",
	color: "#60a5fa",
	help: {
		goal: "Reach the flag at the end of each level. Collect coins and stomp enemies!",
		controls: [
			{ key: "Arrow Keys / WASD", action: "Move left/right" },
			{ key: "Space / W / Up", action: "Jump" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Jump on enemies from above to stomp them for bonus points",
			"Brown platforms crumble — move quickly!",
			"Blue platforms move — time your jumps",
			"Levels get harder with more enemies and gaps",
		],
	},
	create(canvas, onExit) {
		const inst = new PlatformAdapter(canvas, onExit);

		inst.start();

		return inst;
	},
};
