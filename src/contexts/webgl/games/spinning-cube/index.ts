import type { GameDefinition, GameInstance } from "@core/GameInterface";
import { SpinningCubeEngine } from "./SpinningCubeEngine";

export const SpinningCubeGame: GameDefinition = {
	id: "spinning-cube",
	name: "Spinning Cube",
	description: "Interactive 3D cube!",
	icon: "🧊",
	color: "#ff6f00",
	category: "3d",
	renderContext: "webgl",
	help: {
		goal: "Drag to orbit the camera around a lit, spinning cube. Scroll to zoom.",
		controls: [
			{ key: "Mouse drag", action: "Orbit camera" },
			{ key: "Scroll", action: "Zoom in/out" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"The cube auto-rotates and shifts color over time",
			"This is the simplest WebGL demo — shaders, MVP matrices, and a single draw call",
		],
	},
	touchLayout: "tap-only",
	create(canvas: HTMLCanvasElement, onExit: () => void): GameInstance {
		const engine = new SpinningCubeEngine(canvas, onExit);

		engine.start();

		return engine;
	},
};
