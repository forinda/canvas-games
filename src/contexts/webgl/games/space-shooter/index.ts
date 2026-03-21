import type { GameDefinition, GameInstance } from "@core/GameInterface";
import { SpaceShooterEngine } from "./SpaceShooterEngine";

export const SpaceShooterGame: GameDefinition = {
	id: "space-shooter",
	name: "Space Shooter",
	description: "Shoot asteroids & enemies in 3D!",
	icon: "🚀",
	color: "#ff6f00",
	category: "3d",
	renderContext: "webgl",
	help: {
		goal: "Destroy asteroids and enemy ships. Survive as long as you can!",
		controls: [
			{ key: "Mouse / WASD", action: "Move ship" },
			{ key: "Click / Space", action: "Shoot" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Hold Space for rapid fire",
			"Enemies shoot red bullets — dodge them",
			"Larger asteroids take more hits",
		],
	},
	touchLayout: "tap-only",
	create(canvas: HTMLCanvasElement, onExit: () => void): GameInstance {
		const engine = new SpaceShooterEngine(canvas, onExit);

		engine.start();

		return engine;
	},
};
