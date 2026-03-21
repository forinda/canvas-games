import type { GameInstance } from "@core/GameInterface";
import { PongEngine } from "../PongEngine";

export class PlatformAdapter implements GameInstance {
	private engine: PongEngine;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.engine = new PongEngine(canvas, onExit);
	}

	start(): void {
		this.engine.start();
	}

	destroy(): void {
		this.engine.destroy();
	}
}
