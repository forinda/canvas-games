import type { GameDefinition } from "@shared/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const SokobanGame: GameDefinition = {
	id: "sokoban",
	category: "puzzle" as const,
	name: "Sokoban",
	description: "Push boxes onto targets in this classic puzzle game!",
	icon: "📦",
	color: "#795548",
	help: {
		goal: "Push all boxes onto the red target markers.",
		controls: [
			{ key: "Arrow Keys / WASD", action: "Move player" },
			{ key: "Z", action: "Undo last move" },
			{ key: "R", action: "Restart current level" },
			{ key: "Space / Enter", action: "Next level (when complete)" },
			{ key: "H", action: "Toggle help overlay" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"You can only push boxes, never pull them.",
			"Use undo freely — there is no penalty.",
			"Boxes in corners (not on targets) are stuck forever.",
			"Plan your moves before pushing — think ahead!",
		],
	},
	create(canvas, onExit) {
		const instance = new PlatformAdapter(canvas, onExit);

		instance.start();

		return instance;
	},
};
