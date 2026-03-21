import type { GameInstance } from "@core/GameInterface";
import { SandEngine } from "../SandEngine";

export class PlatformAdapter implements GameInstance {
	private engine: SandEngine;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.engine = new SandEngine(canvas, onExit);
	}

	start(): void {
		this.engine.start();
	}

	destroy(): void {
		this.engine.destroy();
	}
}
