import type { GameHelp } from "@core/GameInterface";

export const IDLE_CLICKER_HELP: GameHelp = {
	goal: "Click to earn coins, buy upgrades, and build a passive income empire!",
	controls: [
		{ key: "Left Click (Coin)", action: "Earn coins" },
		{ key: "Left Click (Shop)", action: "Buy upgrade" },
		{ key: "Scroll Wheel", action: "Scroll shop panel" },
		{ key: "H", action: "Toggle help overlay" },
		{ key: "ESC", action: "Exit to menu" },
	],
	tips: [
		"Each upgrade produces coins per second automatically",
		"Upgrade costs increase with each purchase (cost x 1.15)",
		"Click power grows with your CPS — buy upgrades to click harder",
		"Progress auto-saves every 30 seconds and on exit",
		"You earn offline income (up to 8 hours) when you return",
		"Background color evolves as your total earnings grow",
	],
};
