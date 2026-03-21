import type { GameDefinition, GameInstance } from "@core/GameInterface";
import { Pong3DEngine } from "./Pong3DEngine";

export const Pong3DGame: GameDefinition = {
	id: "pong-3d",
	name: "3D Pong",
	description: "Classic Pong in 3D!",
	icon: "🏓",
	color: "#ff6f00",
	category: "3d",
	renderContext: "webgl",
	help: {
		goal: "Score 7 points before the AI. Ball speeds up each rally.",
		controls: [
			{ key: "Left/Right or A/D", action: "Move paddle" },
			{ key: "Space", action: "Start / Restart" },
			{ key: "Mouse drag", action: "Orbit camera" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Hit the ball with the paddle edge to angle it",
			"Ball speeds up with each hit",
		],
	},
	touchLayout: "dpad",
	create(canvas: HTMLCanvasElement, onExit: () => void): GameInstance {
		const engine = new Pong3DEngine(canvas, onExit);

		engine.start();

		return engine;
	},
};
