import type { GameInstance, GameHelp } from "@core/GameInterface";
import { SudokuEngine } from "../SudokuEngine";

export class PlatformAdapter implements GameInstance {
	private engine: SudokuEngine;

	constructor(
		canvas: HTMLCanvasElement,
		onExit: () => void,
		helpData: GameHelp,
	) {
		this.engine = new SudokuEngine(canvas, onExit, helpData);
	}

	start(): void {
		this.engine.start();
	}

	destroy(): void {
		this.engine.destroy();
	}
}
