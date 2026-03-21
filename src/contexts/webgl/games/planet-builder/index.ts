import type { GameDefinition, GameInstance } from "@core/GameInterface";
import { PlanetBuilderEngine } from "./PlanetBuilderEngine";

export const PlanetBuilderGame: GameDefinition = {
	id: "planet-builder",
	name: "Planet Builder",
	description: "Sculpt a planet!",
	icon: "🌍",
	color: "#ff6f00",
	category: "3d",
	renderContext: "webgl",
	help: {
		goal: "Right-click drag to sculpt the planet. Raise mountains, carve oceans, shape your world!",
		controls: [
			{ key: "Left-drag", action: "Orbit camera" },
			{ key: "Right-drag", action: "Sculpt terrain" },
			{ key: "1", action: "Raise brush" },
			{ key: "2", action: "Lower brush" },
			{ key: "3", action: "Smooth brush" },
			{ key: "R", action: "Reset planet" },
			{ key: "T", action: "Toggle auto-rotate" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Colors change by altitude: water → sand → grass → rock → snow",
			"The atmosphere rim glow is from a Fresnel-like shader effect",
			"Stars are deterministic — same positions every time",
		],
	},
	touchLayout: "tap-only",
	create(canvas: HTMLCanvasElement, onExit: () => void): GameInstance {
		const engine = new PlanetBuilderEngine(canvas, onExit);

		engine.start();

		return engine;
	},
};
