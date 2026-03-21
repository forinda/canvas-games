import type { GameDefinition, GameInstance } from "@core/GameInterface";
import { VoxelBuilderEngine } from "./VoxelBuilderEngine";

export const VoxelBuilderGame: GameDefinition = {
	id: "voxel-builder",
	name: "Voxel Builder",
	description: "Build with 3D blocks!",
	icon: "🧱",
	color: "#ff6f00",
	category: "3d",
	renderContext: "webgl",
	help: {
		goal: "Place and remove voxel blocks on a 3D grid. Build anything you want!",
		controls: [
			{ key: "Arrow Keys / WASD", action: "Move cursor X/Z" },
			{ key: "Q / E", action: "Move cursor down / up" },
			{ key: "Space", action: "Place block" },
			{ key: "X / Delete", action: "Remove block" },
			{ key: "1-8", action: "Select block type" },
			{ key: "Mouse drag", action: "Orbit camera" },
			{ key: "Scroll", action: "Zoom" },
			{ key: "Ctrl+C", action: "Clear all" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"8 block types: Grass, Dirt, Stone, Wood, Sand, Water, Brick, Snow",
			"The cursor pulses with the selected block color",
			"Fully hidden blocks are skipped for performance",
		],
	},
	touchLayout: "dpad-action",
	create(canvas: HTMLCanvasElement, onExit: () => void): GameInstance {
		const engine = new VoxelBuilderEngine(canvas, onExit);

		engine.start();

		return engine;
	},
};
