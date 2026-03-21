import type { GameInstance } from "@core/GameInterface";
import { Match3Engine } from "../Match3Engine";

export class PlatformAdapter implements GameInstance {
	private engine: Match3Engine;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.engine = new Match3Engine(canvas, onExit);
	}

	start(): void {
		this.engine.start();
	}

	destroy(): void {
		this.engine.destroy();
	}
}
