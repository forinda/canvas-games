import type { GameInstance } from "@core/GameInterface";
import { WordSearchEngine } from "../WordSearchEngine";

export class PlatformAdapter implements GameInstance {
	private engine: WordSearchEngine;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.engine = new WordSearchEngine(canvas, onExit);
	}

	start(): void {
		this.engine.start();
	}

	destroy(): void {
		this.engine.destroy();
	}
}
