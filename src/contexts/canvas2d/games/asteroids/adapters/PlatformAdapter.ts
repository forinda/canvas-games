import type { GameInstance } from "@core/GameInterface";
import { AsteroidsEngine } from "../AsteroidsEngine";

export class PlatformAdapter implements GameInstance {
	private engine: AsteroidsEngine;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.engine = new AsteroidsEngine(canvas, onExit);
	}

	start(): void {
		this.engine.start();
	}

	destroy(): void {
		this.engine.destroy();
	}
}
