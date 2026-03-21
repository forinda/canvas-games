import type { GameDefinition, GameInstance } from "@core/GameInterface";
import { Chess3DEngine } from "./Chess3DEngine";

export const Chess3DGame: GameDefinition = {
	id: "chess-3d",
	name: "3D Chess",
	description: "Chess with 3D pieces!",
	icon: "♟️",
	color: "#ff6f00",
	category: "3d",
	renderContext: "webgl",
	help: {
		goal: "Play chess against the AI. Click a piece to select, click a green square to move.",
		controls: [
			{ key: "Click", action: "Select piece / Move" },
			{ key: "Mouse drag", action: "Orbit camera" },
			{ key: "Scroll", action: "Zoom" },
			{ key: "R", action: "Restart" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Green squares show legal moves",
			"Pawns auto-promote to queens",
			"The AI prefers captures",
		],
	},
	touchLayout: "tap-only",
	create(canvas: HTMLCanvasElement, onExit: () => void): GameInstance {
		const engine = new Chess3DEngine(canvas, onExit);

		engine.start();

		return engine;
	},
};
