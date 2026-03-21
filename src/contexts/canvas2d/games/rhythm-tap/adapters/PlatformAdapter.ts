import type { GameInstance } from "@core/GameInterface";
import { RhythmEngine } from "../RhythmEngine";

export class PlatformAdapter implements GameInstance {
	private engine: RhythmEngine;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.engine = new RhythmEngine(canvas, onExit);
	}

	start(): void {
		this.engine.start();
	}

	destroy(): void {
		this.engine.destroy();
	}
}
