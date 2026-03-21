import type { GameDefinition, GameInstance } from "@core/GameInterface";
import { Maze3DEngine } from "./Maze3DEngine";

export const Maze3DGame: GameDefinition = {
	id: "maze-3d",
	name: "3D Maze",
	description: "First-person maze escape!",
	icon: "🏗️",
	color: "#ff6f00",
	category: "3d",
	renderContext: "webgl",
	help: {
		goal: "Navigate the maze in first-person to find the glowing exit. Mazes grow larger each level.",
		controls: [
			{ key: "WASD", action: "Move" },
			{ key: "Mouse", action: "Look around (click to lock)" },
			{ key: "Space", action: "Next level (after winning)" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Click the canvas to lock the mouse for looking",
			"Follow the right wall to eventually find any exit",
			"The green pillar marks the exit — look for its glow through the fog",
		],
	},
	touchLayout: "dual-stick",
	create(canvas: HTMLCanvasElement, onExit: () => void): GameInstance {
		const engine = new Maze3DEngine(canvas, onExit);

		engine.start();

		return engine;
	},
};
