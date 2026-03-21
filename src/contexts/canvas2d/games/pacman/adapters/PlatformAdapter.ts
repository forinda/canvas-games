import type { GameInstance } from "@core/GameInterface";
import type { GameHelp } from "@core/GameInterface";
import { PacManEngine } from "../PacManEngine";

export class PlatformAdapter implements GameInstance {
	private engine: PacManEngine;

	constructor(canvas: HTMLCanvasElement, onExit: () => void, help: GameHelp) {
		this.engine = new PacManEngine(canvas, onExit, help);
	}

	start(): void {
		this.engine.start();
	}

	destroy(): void {
		this.engine.destroy();
	}
}
