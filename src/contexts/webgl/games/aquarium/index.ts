import type { GameDefinition, GameInstance } from "@core/GameInterface";
import { AquariumEngine } from "./AquariumEngine";

export const AquariumGame: GameDefinition = {
	id: "aquarium",
	name: "Aquarium",
	description: "Relaxing fish tank!",
	icon: "🐠",
	color: "#ff6f00",
	category: "3d",
	renderContext: "webgl",
	help: {
		goal: "Watch fish swim with flocking AI. Click or press Space to drop food!",
		controls: [
			{ key: "Click / Space", action: "Drop food" },
			{ key: "Mouse drag", action: "Orbit camera" },
			{ key: "Scroll", action: "Zoom" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Fish flock together using separation, alignment, and cohesion",
			"Drop food and watch fish swim toward it",
			"Bubbles rise from the bottom",
		],
	},
	touchLayout: "tap-only",
	create(canvas: HTMLCanvasElement, onExit: () => void): GameInstance {
		const engine = new AquariumEngine(canvas, onExit);

		engine.start();

		return engine;
	},
};
