import type { GameDefinition, GameInstance } from "@core/GameInterface";
import { GameEngine } from "./game-engine";

class TowerDefenseInstance implements GameInstance {
	private engine: GameEngine;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.engine = new GameEngine(canvas, onExit);
	}

	start(): void {
		this.engine.start();
	}

	destroy(): void {
		this.engine.stop();
	}
}

export const TowerDefenseGame: GameDefinition = {
	id: "tower-defense",
	category: "action" as const,
	name: "Tower Defense",
	description: "Place towers, survive the waves!",
	icon: "🏰",
	color: "#2ecc71",
	help: {
		goal: "Place towers to destroy enemies before they reach the exit.",
		controls: [
			{ key: "Click", action: "Select tower / place on grid" },
			{ key: "Right-click", action: "Deselect tower" },
			{ key: "Space", action: "Start next wave" },
			{ key: "P", action: "Pause game" },
			{ key: "ESC", action: "Deselect / exit" },
		],
		tips: [
			"Frost towers slow enemies — great near chokepoints",
			"Upgrade towers for 2.5x damage at level 3",
			"Sell towers at 60% refund to reposition",
			"Sniper towers have the longest range — place them centrally",
		],
	},
	create(canvas: HTMLCanvasElement, onExit: () => void): GameInstance {
		const instance = new TowerDefenseInstance(canvas, onExit);

		instance.start();

		return instance;
	},
};
