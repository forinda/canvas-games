import type { GameInstance, GameHelp } from "@core/GameInterface";
import { PixelArtEngine } from "../PixelArtEngine";

export class PlatformAdapter implements GameInstance {
	private engine: PixelArtEngine;

	constructor(canvas: HTMLCanvasElement, onExit: () => void, help: GameHelp) {
		this.engine = new PixelArtEngine(canvas, onExit, help);
	}

	start(): void {
		this.engine.start();
	}

	destroy(): void {
		this.engine.destroy();
	}
}
