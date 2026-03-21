import type { GameDefinition, GameInstance } from "@core/GameInterface";
import { Racing3DEngine } from "./Racing3DEngine";

export const Racing3DGame: GameDefinition = {
	id: "racing-3d",
	name: "Racing 3D",
	description: "Third-person racing with AI!",
	icon: "🏎️",
	color: "#ff6f00",
	category: "3d",
	renderContext: "webgl",
	help: {
		goal: "Complete 3 laps around the track before the AI opponents.",
		controls: [
			{ key: "Up / W", action: "Accelerate" },
			{ key: "Down / S", action: "Brake" },
			{ key: "Left/Right or A/D", action: "Steer" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Going off-track slows you down significantly",
			"Ease off the gas before sharp turns",
		],
	},
	touchLayout: "dpad",
	create(canvas: HTMLCanvasElement, onExit: () => void): GameInstance {
		const engine = new Racing3DEngine(canvas, onExit);

		engine.start();

		return engine;
	},
};
