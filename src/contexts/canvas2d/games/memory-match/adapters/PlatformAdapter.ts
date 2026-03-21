import type { GameInstance } from "@core/GameInterface";
import { MemoryEngine } from "../MemoryEngine";

export class PlatformAdapter implements GameInstance {
	private engine: MemoryEngine;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.engine = new MemoryEngine(canvas, onExit);
	}

	start(): void {
		this.engine.start();
	}

	destroy(): void {
		this.engine.destroy();
	}
}
