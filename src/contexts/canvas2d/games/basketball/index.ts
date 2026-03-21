import type { GameDefinition } from "@core/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const BasketballGame: GameDefinition = {
	id: "basketball",
	category: "action" as const,
	name: "Basketball",
	description: "Shoot hoops with click-and-drag aiming!",
	icon: "\uD83C\uDFC0",
	color: "#ff7043",
	help: {
		goal: "Score as many baskets as possible before the 30-second shot clock expires.",
		controls: [
			{
				key: "Click+Drag",
				action: "Aim shot (drag direction and length set trajectory)",
			},
			{ key: "Release", action: "Shoot the ball" },
			{ key: "H", action: "Toggle help overlay" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Drag away from the hoop — the ball launches in the opposite direction",
			"Longer drag = more power, aim high for a better arc",
			"Consecutive baskets give streak bonus points (+1 per streak, max +5)",
			"Each basket adds 5 seconds to the shot clock",
			"The hoop moves to a new position after each shot",
		],
	},
	create(canvas, onExit) {
		const instance = new PlatformAdapter(canvas, onExit, BasketballGame.help!);

		instance.start();

		return instance;
	},
};
