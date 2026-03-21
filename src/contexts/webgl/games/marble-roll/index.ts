import type { GameDefinition, GameInstance } from "@core/GameInterface";
import { MarbleRollEngine } from "./MarbleRollEngine";

export const MarbleRollGame: GameDefinition = {
	id: "marble-roll",
	name: "Marble Roll",
	description: "Tilt the platform, roll to the goal!",
	icon: "🔴",
	color: "#ff6f00",
	category: "3d",
	renderContext: "webgl",
	help: {
		goal: "Tilt the platform to roll the marble to the green goal. Collect all gems first!",
		controls: [
			{ key: "Arrow Keys / WASD", action: "Tilt platform" },
			{ key: "Mouse drag", action: "Orbit camera" },
			{ key: "Scroll", action: "Zoom in/out" },
			{ key: "R", action: "Restart level" },
			{ key: "Space", action: "Next level / Retry" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Collect all yellow gems before the goal turns green",
			"Small tilts give more control — don't over-tilt!",
			"The marble bounces off edges but falls off if going too fast",
		],
	},
	touchLayout: "dpad",
	create(canvas: HTMLCanvasElement, onExit: () => void): GameInstance {
		const engine = new MarbleRollEngine(canvas, onExit);

		engine.start();

		return engine;
	},
};
