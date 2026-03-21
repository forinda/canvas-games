import type { GameDefinition, GameInstance } from "@core/GameInterface";
import { FlightSimEngine } from "./FlightSimEngine";

export const FlightSimGame: GameDefinition = {
	id: "flight-sim",
	name: "Flight Sim",
	description: "Fly over procedural terrain!",
	icon: "✈️",
	color: "#ff6f00",
	category: "3d",
	renderContext: "webgl",
	help: {
		goal: "Fly through all golden rings without crashing into the terrain.",
		controls: [
			{ key: "Up / W", action: "Pitch down (dive)" },
			{ key: "Down / S", action: "Pitch up (climb)" },
			{ key: "Left / A", action: "Roll left" },
			{ key: "Right / D", action: "Roll right" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Rolling turns the plane — bank to steer",
			"Stay above the terrain or you'll crash",
			"The world wraps around at the edges",
		],
	},
	touchLayout: "dpad",
	create(canvas: HTMLCanvasElement, onExit: () => void): GameInstance {
		const engine = new FlightSimEngine(canvas, onExit);

		engine.start();

		return engine;
	},
};
