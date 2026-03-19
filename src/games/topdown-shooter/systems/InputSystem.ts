import type { InputHandler } from "@shared/InputHandler";
import type { ShooterState } from "../types";

export class InputSystem implements InputHandler {
	private state: ShooterState;
	private canvas: HTMLCanvasElement;
	private onExit: () => void;
	private onRestart: () => void;
	private onToggleHelp: () => void;

	private keyDown = (e: KeyboardEvent): void => {
		const key = e.key.toLowerCase();

		this.state.keys.add(key);

		if (key === "escape") {
			this.onExit();

			return;
		}

		if (key === "h") {
			this.onToggleHelp();

			return;
		}

		if (key === "p" && this.state.started && !this.state.gameOver) {
			this.state.paused = !this.state.paused;

			return;
		}

		if (!this.state.started || this.state.gameOver) {
			if (key === " " || key === "enter") {
				this.onRestart();
			}
		}
	};

	private keyUp = (e: KeyboardEvent): void => {
		this.state.keys.delete(e.key.toLowerCase());
	};

	private mouseMove = (e: MouseEvent): void => {
		const rect = this.canvas.getBoundingClientRect();

		this.state.mouse.x = e.clientX - rect.left;
		this.state.mouse.y = e.clientY - rect.top;
	};

	private mouseDownHandler = (): void => {
		this.state.mouseDown = true;

		if (!this.state.started) {
			this.onRestart();
		}
	};

	private mouseUpHandler = (): void => {
		this.state.mouseDown = false;
	};

	constructor(
		state: ShooterState,
		canvas: HTMLCanvasElement,
		onExit: () => void,
		onRestart: () => void,
		onToggleHelp: () => void,
	) {
		this.state = state;
		this.canvas = canvas;
		this.onExit = onExit;
		this.onRestart = onRestart;
		this.onToggleHelp = onToggleHelp;
	}

	attach(): void {
		window.addEventListener("keydown", this.keyDown);
		window.addEventListener("keyup", this.keyUp);
		this.canvas.addEventListener("mousemove", this.mouseMove);
		this.canvas.addEventListener("mousedown", this.mouseDownHandler);
		this.canvas.addEventListener("mouseup", this.mouseUpHandler);
	}

	detach(): void {
		window.removeEventListener("keydown", this.keyDown);
		window.removeEventListener("keyup", this.keyUp);
		this.canvas.removeEventListener("mousemove", this.mouseMove);
		this.canvas.removeEventListener("mousedown", this.mouseDownHandler);
		this.canvas.removeEventListener("mouseup", this.mouseUpHandler);
		this.state.keys.clear();
		this.state.mouseDown = false;
	}
}
