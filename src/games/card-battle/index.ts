import type { GameDefinition } from "@shared/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const CardBattleGame: GameDefinition = {
	id: "card-battle",
	category: "strategy" as const,
	name: "Card Battle",
	description: "Defeat enemies with your card deck!",
	icon: "🃏",
	color: "#8e44ad",
	help: {
		goal: "Defeat 3 increasingly difficult enemies using your card deck.",
		controls: [
			{ key: "Click Card", action: "Play a card from your hand" },
			{ key: "End Turn", action: "Finish your turn" },
			{ key: "H", action: "Toggle help overlay" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"You draw 3 cards and get 3 energy each turn",
			"Block absorbs damage but resets each turn",
			"Special cards have unique bonus effects",
			"Save heals for when you really need them",
		],
	},
	create(canvas, onExit) {
		const instance = new PlatformAdapter(canvas, onExit);

		instance.start();

		return instance;
	},
};
