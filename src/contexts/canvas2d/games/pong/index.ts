import type { GameDefinition } from "@core/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";
import { PONG_HELP } from "./data/help";

export const PongGame: GameDefinition = {
	id: "pong",
	name: "Pong",
	description: "Classic table-tennis arcade game — play vs AI or a friend!",
	icon: "\uD83C\uDFD3",
	color: "#26c6da",
	category: "arcade",
	help: PONG_HELP,
	create(canvas, onExit) {
		const instance = new PlatformAdapter(canvas, onExit);

		instance.start();

		return instance;
	},
};
