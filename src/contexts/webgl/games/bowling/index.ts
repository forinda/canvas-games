import type { GameDefinition, GameInstance } from "@core/GameInterface";
import { BowlingEngine } from "./BowlingEngine";

export const BowlingGame: GameDefinition = {
	id: "bowling",
	name: "Bowling",
	description: "Drag to aim, knock down pins!",
	icon: "🎳",
	color: "#ff6f00",
	category: "3d",
	renderContext: "webgl",
	help: {
		goal: "Knock down all 10 pins! Drag up to throw, drag sideways to aim. 10 frames.",
		controls: [
			{ key: "Click + drag up", action: "Set power" },
			{ key: "Drag sideways", action: "Aim direction" },
			{ key: "Release", action: "Throw ball" },
			{ key: "R", action: "Restart" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Aim slightly off-center for a better chance at a strike",
			"Pins knock each other down in chain reactions",
			"10th frame gives bonus rolls for strikes and spares",
		],
	},
	touchLayout: "tap-only",
	create(canvas: HTMLCanvasElement, onExit: () => void): GameInstance {
		const engine = new BowlingEngine(canvas, onExit);

		engine.start();

		return engine;
	},
};
