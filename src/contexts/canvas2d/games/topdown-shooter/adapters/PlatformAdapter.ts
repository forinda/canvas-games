import type { GameInstance, GameHelp } from "@core/GameInterface";
import { ShooterEngine } from "../ShooterEngine";

export class PlatformAdapter implements GameInstance {
	private engine: ShooterEngine;

	constructor(canvas: HTMLCanvasElement, onExit: () => void, help: GameHelp) {
		this.engine = new ShooterEngine(canvas, onExit, help);
	}

	start(): void {
		this.engine.start();
	}

	destroy(): void {
		this.engine.destroy();
	}
}
