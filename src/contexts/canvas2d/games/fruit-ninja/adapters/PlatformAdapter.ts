import type { GameInstance } from "@core/GameInterface";
import { FruitNinjaEngine } from "../FruitNinjaEngine";

export class PlatformAdapter implements GameInstance {
	private engine: FruitNinjaEngine;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.engine = new FruitNinjaEngine(canvas, onExit);
	}

	start(): void {
		this.engine.start();
	}

	destroy(): void {
		this.engine.destroy();
	}
}
