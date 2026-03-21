import type { GameInstance } from "@core/GameInterface";
import { HangmanEngine } from "../HangmanEngine";

export class PlatformAdapter implements GameInstance {
	private engine: HangmanEngine;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.engine = new HangmanEngine(canvas, onExit);
	}

	start(): void {
		this.engine.start();
	}

	destroy(): void {
		this.engine.destroy();
	}
}
