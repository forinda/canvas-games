import type { GameDefinition, GameInstance } from "@core/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter.ts";

export const ZombieSurvivalGame: GameDefinition = {
	id: "zombie-survival",
	category: "action" as const,
	name: "Zombie Survival",
	description: "Survive waves of zombies in a dark arena with limited ammo!",
	icon: "\uD83E\uDDDF",
	color: "#27ae60",
	help: {
		goal: "Survive as many zombie waves as possible. Day = scavenge, Night = fight!",
		controls: [
			{ key: "W/A/S/D", action: "Move player" },
			{ key: "Mouse", action: "Aim flashlight / weapon" },
			{ key: "Click", action: "Shoot" },
			{ key: "E", action: "Place barricade (costs resources)" },
			{ key: "P / ESC", action: "Pause" },
			{ key: "H", action: "Toggle help overlay" },
			{ key: "R", action: "Restart (game over screen)" },
		],
		tips: [
			"During the day you auto-scavenge ammo and resources",
			"Place barricades before nightfall to slow zombies",
			"Runners are fast but fragile, Tanks are slow but tough",
			"Your flashlight cone is the only light at night",
			"Conserve ammo - zombie count increases each wave",
		],
	},
	create(canvas: HTMLCanvasElement, onExit: () => void): GameInstance {
		const instance = new PlatformAdapter(canvas, onExit);

		instance.start();

		return instance;
	},
};
