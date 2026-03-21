import type { GameInstance } from "@core/GameInterface";
import { SokobanEngine } from "../SokobanEngine";

export class PlatformAdapter implements GameInstance {
	private engine: SokobanEngine;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.engine = new SokobanEngine(canvas, onExit);
	}

	start(): void {
		this.engine.start();
	}

	destroy(): void {
		this.engine.destroy();
	}
}
