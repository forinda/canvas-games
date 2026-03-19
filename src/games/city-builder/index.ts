import type { GameDefinition } from "@shared/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const CityBuilderGame: GameDefinition = {
	id: "city-builder",
	category: "strategy" as const,
	name: "City Builder",
	description: "Build and manage your city!",
	icon: "\u{1F3D9}\uFE0F",
	color: "#3498db",
	help: {
		goal: "Build a thriving city by managing population, food, power, and happiness.",
		controls: [
			{ key: "1-6", action: "Select building type" },
			{ key: "Click", action: "Place building on grid" },
			{ key: "+/-", action: "Change game speed" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Build houses for population, farms for food, power plants for energy",
			"Factories generate income but reduce happiness",
			"Parks boost happiness — place them near houses",
			"Watch your food and power — shortages cause problems",
		],
	},
	create(canvas, onExit) {
		const inst = new PlatformAdapter(canvas, onExit);

		inst.start();

		return inst;
	},
};
