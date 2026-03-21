import type { GameDefinition, GameInstance } from "@core/GameInterface";
import { EndlessRunnerEngine } from "./EndlessRunnerEngine";

export const EndlessRunnerGame: GameDefinition = {
	id: "endless-runner",
	name: "Endless Runner",
	description: "Dodge, jump, collect coins!",
	icon: "🏃",
	color: "#ff6f00",
	category: "3d",
	renderContext: "webgl",
	help: {
		goal: "Run as far as you can! Dodge obstacles, jump over low ones, collect coins.",
		controls: [
			{ key: "Left/Right or A/D", action: "Switch lanes" },
			{ key: "Space / Up / W", action: "Jump" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Jump over yellow (low) obstacles",
			"Speed increases over time — stay sharp",
			"Coins spawn in free lanes",
		],
	},
	touchLayout: "dpad-jump",
	create(canvas: HTMLCanvasElement, onExit: () => void): GameInstance {
		const engine = new EndlessRunnerEngine(canvas, onExit);

		engine.start();

		return engine;
	},
};
