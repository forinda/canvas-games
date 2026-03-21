import type { GameInstance } from "@core/GameInterface";
import { ReactionEngine } from "../ReactionEngine";

export class PlatformAdapter implements GameInstance {
	private engine: ReactionEngine;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.engine = new ReactionEngine(canvas, onExit);
	}

	start(): void {
		this.engine.start();
	}

	destroy(): void {
		this.engine.destroy();
	}
}
