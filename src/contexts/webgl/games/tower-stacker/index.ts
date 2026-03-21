import type { GameDefinition, GameInstance } from "@core/GameInterface";
import { TowerStackerEngine } from "./TowerStackerEngine";

export const TowerStackerGame: GameDefinition = {
	id: "tower-stacker",
	name: "Tower Stacker",
	description: "Time your drops, stack high!",
	icon: "🏗️",
	color: "#ff6f00",
	category: "3d",
	renderContext: "webgl",
	help: {
		goal: "Stack blocks by timing your drop. Overhanging parts get cut off. How high can you go?",
		controls: [
			{ key: "Space / Tap", action: "Drop block" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Perfect placements keep the full block width",
			"The block swings faster as you go higher",
			"Tap to restart after game over",
		],
	},
	touchLayout: "flap",
	create(canvas: HTMLCanvasElement, onExit: () => void): GameInstance {
		const engine = new TowerStackerEngine(canvas, onExit);

		engine.start();

		return engine;
	},
};
