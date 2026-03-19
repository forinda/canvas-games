import type { GameDefinition, GameHelp } from "@shared/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const pacmanHelp: GameHelp = {
	goal: "Eat all dots while avoiding ghosts. Power pellets let you eat ghosts!",
	controls: [
		{ key: "Arrow Keys / WASD", action: "Move Pac-Man" },
		{ key: "P", action: "Pause / Resume" },
		{ key: "Space", action: "Restart after game over" },
		{ key: "H", action: "Toggle help overlay" },
		{ key: "ESC", action: "Exit to menu" },
	],
	tips: [
		"Power pellets make ghosts frightened (blue) for 8 seconds",
		"Eating ghosts in sequence gives 200, 400, 800, 1600 points",
		"Each ghost has a unique chase personality — learn their patterns",
		"Ghosts alternate between scatter and chase modes",
	],
};

export const PacManGame: GameDefinition = {
	id: "pacman",
	name: "Pac-Man",
	description: "Navigate the maze, eat dots, avoid ghosts!",
	icon: "\uD83D\uDC7B",
	color: "#ffeb3b",
	category: "arcade" as const,
	help: pacmanHelp,
	create(canvas, onExit) {
		const instance = new PlatformAdapter(canvas, onExit, pacmanHelp);

		instance.start();

		return instance;
	},
};
