import type { GameDefinition } from "@core/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const HangmanGame: GameDefinition = {
	id: "hangman",
	category: "puzzle" as const,
	name: "Hangman",
	description: "Guess the word before the hangman is complete!",
	icon: "\u{1F4DD}",
	color: "#8d6e63",
	help: {
		goal: "Guess the hidden word one letter at a time before the hangman is complete.",
		controls: [
			{ key: "A-Z / Click", action: "Guess a letter" },
			{ key: "Space / Enter", action: "Play again after win/loss" },
			{ key: "H", action: "Toggle help overlay" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Start with common vowels: E, A, I, O",
			"Use the category hint to narrow down possibilities",
			"You get 6 wrong guesses — plan carefully",
		],
	},
	create(canvas, onExit) {
		const instance = new PlatformAdapter(canvas, onExit);

		instance.start();

		return instance;
	},
};
