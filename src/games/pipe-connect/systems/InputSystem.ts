import type { InputHandler } from "@shared/InputHandler";
import type { PipeState } from "../types";
import { ROTATIONS } from "../types";

export class InputSystem implements InputHandler {
	private state: PipeState;
	private canvas: HTMLCanvasElement;
	private onExit: () => void;
	private onReset: () => void;
	private onNextLevel: () => void;
	private onToggleHelp: () => void;

	private clickHandler: (e: MouseEvent) => void;
	private keyHandler: (e: KeyboardEvent) => void;

	constructor(
		state: PipeState,
		canvas: HTMLCanvasElement,
		onExit: () => void,
		onReset: () => void,
		onNextLevel: () => void,
		onToggleHelp: () => void,
	) {
		this.state = state;
		this.canvas = canvas;
		this.onExit = onExit;
		this.onReset = onReset;
		this.onNextLevel = onNextLevel;
		this.onToggleHelp = onToggleHelp;

		this.clickHandler = this.handleClick.bind(this);
		this.keyHandler = this.handleKey.bind(this);
	}

	attach(): void {
		this.canvas.addEventListener("click", this.clickHandler);
		window.addEventListener("keydown", this.keyHandler);
	}

	detach(): void {
		this.canvas.removeEventListener("click", this.clickHandler);
		window.removeEventListener("keydown", this.keyHandler);
	}

	/** Update reference when state is replaced */
	setState(state: PipeState): void {
		this.state = state;
	}

	private handleClick(e: MouseEvent): void {
		if (this.state.status === "won") return;

		const rect = this.canvas.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;

		const col = Math.floor((mx - this.state.offsetX) / this.state.cellSize);
		const row = Math.floor((my - this.state.offsetY) / this.state.cellSize);

		if (row < 0 || row >= this.state.rows || col < 0 || col >= this.state.cols)
			return;

		// Rotate the pipe 90 degrees clockwise
		const pipe = this.state.grid[row][col];
		const currentIdx = ROTATIONS.indexOf(pipe.rotation);

		pipe.rotation = ROTATIONS[(currentIdx + 1) % ROTATIONS.length];
		this.state.moves++;
	}

	private handleKey(e: KeyboardEvent): void {
		switch (e.key) {
			case "Escape":
				this.onExit();
				break;
			case "r":
			case "R":
				this.onReset();
				break;
			case "h":
			case "H":
				this.onToggleHelp();
				break;
			case "n":
			case "N":
				if (this.state.status === "won") {
					this.onNextLevel();
				}

				break;
		}
	}
}
