import type { GameInstance } from "@core/GameInterface";
import { MinesweeperEngine } from "../MinesweeperEngine";

export class PlatformAdapter implements GameInstance {
	private engine: MinesweeperEngine;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.engine = new MinesweeperEngine(canvas, onExit);
	}

	start(): void {
		this.engine.start();
	}

	destroy(): void {
		this.engine.destroy();
	}
}
