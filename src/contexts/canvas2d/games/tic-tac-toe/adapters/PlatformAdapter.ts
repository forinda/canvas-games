import type { GameInstance } from "@core/GameInterface";
import { TicTacToeEngine } from "../TicTacToeEngine.ts";

export class PlatformAdapter implements GameInstance {
	private engine: TicTacToeEngine;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.engine = new TicTacToeEngine(canvas, onExit);
	}

	start(): void {
		this.engine.start();
	}

	destroy(): void {
		this.engine.destroy();
	}
}
