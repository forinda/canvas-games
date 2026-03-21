import type { GameDefinition } from "@core/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

const help = {
	goal: "Rotate pipes to connect the source (S) to the drain (D) and let water flow through.",
	controls: [
		{ key: "Left Click", action: "Rotate a pipe 90 degrees clockwise" },
		{ key: "N", action: "Next level (after winning)" },
		{ key: "R", action: "Restart current level" },
		{ key: "H", action: "Toggle help overlay" },
		{ key: "ESC", action: "Exit to menu" },
	],
	tips: [
		"Start from the source and work outward toward the drain",
		"Connected pipes fill with blue water automatically",
		"Cross pipes connect in all four directions — very useful",
		"Levels increase grid size as you progress",
		"Fewer moves = better score — plan your rotations",
	],
};

export const PipeConnectGame: GameDefinition = {
	id: "pipe-connect",
	name: "Pipe Connect",
	description:
		"Rotate pipes to connect the source to the drain and let water flow!",
	icon: "\u{1F527}",
	color: "#26a69a",
	category: "puzzle",
	help,
	create(canvas, onExit) {
		const instance = new PlatformAdapter(canvas, onExit, help);

		instance.start();

		return instance;
	},
};
