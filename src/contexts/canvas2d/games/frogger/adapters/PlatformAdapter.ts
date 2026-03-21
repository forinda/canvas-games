import type { GameInstance } from "@core/GameInterface";
import { FroggerEngine } from "../FroggerEngine";

export class PlatformAdapter implements GameInstance {
	private engine: FroggerEngine;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.engine = new FroggerEngine(canvas, onExit);
	}

	start(): void {
		this.engine.start();
	}

	destroy(): void {
		this.engine.destroy();
	}
}
