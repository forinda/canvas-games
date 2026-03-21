import type { GameInstance } from "@core/GameInterface";
import { CityEngine } from "../CityEngine";

export class PlatformAdapter implements GameInstance {
	private engine: CityEngine;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.engine = new CityEngine(canvas, onExit);
	}

	start(): void {
		this.engine.start();
	}

	destroy(): void {
		this.engine.destroy();
	}
}
