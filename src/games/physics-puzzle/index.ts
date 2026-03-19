import type { GameDefinition } from "@shared/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const PhysicsPuzzleGame: GameDefinition = {
	id: "physics-puzzle",
	category: "puzzle" as const,
	name: "Physics Puzzle",
	description: "Place pieces, simulate physics!",
	icon: "\uD83E\uDDE9",
	color: "#f59e0b",
	help: {
		goal: "Place pieces to guide the ball to the star using physics!",
		controls: [
			{ key: "Click", action: "Place piece from inventory" },
			{ key: "Space", action: "Start/stop simulation" },
			{ key: "R", action: "Reset level" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Place planks as ramps to redirect the ball",
			"Boxes can act as bridges over gaps",
			"The ball bounces — use walls to your advantage",
			"If the ball falls off screen, press R to retry",
		],
	},
	create(canvas, onExit) {
		const inst = new PlatformAdapter(canvas, onExit);

		inst.start();

		return inst;
	},
};
