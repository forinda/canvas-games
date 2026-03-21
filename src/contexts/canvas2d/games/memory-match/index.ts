import type { GameDefinition } from "@core/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const MemoryMatchGame: GameDefinition = {
	id: "memory-match",
	name: "Memory Match",
	description: "Flip cards to find matching pairs!",
	icon: "\u{1F0CF}",
	color: "#ab47bc",
	category: "puzzle",
	help: {
		goal: "Find all matching pairs of cards in as few moves and as little time as possible.",
		controls: [
			{ key: "Click", action: "Flip a card" },
			{
				key: "\u2190 / \u2192",
				action: "Change difficulty (before start / after win)",
			},
			{ key: "R", action: "Restart current game" },
			{ key: "P", action: "Pause / Resume" },
			{ key: "H", action: "Toggle help overlay" },
			{ key: "Space", action: "Start / Play again after win" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Start by flipping cards systematically to memorise positions",
			"Focus on remembering unmatched cards rather than random clicking",
			"Try harder difficulties once you master the smaller grids",
		],
	},
	create(canvas, onExit) {
		const instance = new PlatformAdapter(canvas, onExit);

		instance.start();

		return instance;
	},
};
