import type { GameInstance, GameHelp } from "@core/GameInterface";
import { Game2048Engine } from "../Game2048Engine";

export class PlatformAdapter implements GameInstance {
	private engine: Game2048Engine;

	constructor(canvas: HTMLCanvasElement, onExit: () => void, help: GameHelp) {
		this.engine = new Game2048Engine(canvas, onExit, help);
	}

	start(): void {
		this.engine.start();
	}

	destroy(): void {
		this.engine.destroy();
	}
}
