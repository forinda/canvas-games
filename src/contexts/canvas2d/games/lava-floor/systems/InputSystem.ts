import type { InputHandler } from "@core/InputHandler";
import type { LavaState } from "../types";

export class InputSystem implements InputHandler {
	private state: LavaState;
	private onExit: () => void;
	private onRestart: () => void;

	private keyDownHandler: (e: KeyboardEvent) => void;
	private keyUpHandler: (e: KeyboardEvent) => void;

	constructor(
		state: LavaState,
		_canvas: HTMLCanvasElement,
		onExit: () => void,
		onRestart: () => void,
	) {
		this.state = state;
		this.onExit = onExit;
		this.onRestart = onRestart;

		this.keyDownHandler = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				this.onExit();

				return;
			}

			if (this.state.phase === "dead") {
				if (e.code === "Space" || e.key === " ") {
					e.preventDefault();
					this.onRestart();
				}

				return;
			}

			if (this.state.phase === "idle") {
				if (
					e.code === "Space" ||
					e.key === " " ||
					e.key === "ArrowLeft" ||
					e.key === "ArrowRight"
				) {
					e.preventDefault();
					this.state.phase = "playing";
				}
			}

			if (e.key === "ArrowLeft") {
				e.preventDefault();
				this.state.leftHeld = true;
			}

			if (e.key === "ArrowRight") {
				e.preventDefault();
				this.state.rightHeld = true;
			}

			if (e.code === "Space" || e.key === " ") {
				e.preventDefault();
				this.state.jumpPressed = true;
			}
		};

		this.keyUpHandler = (e: KeyboardEvent) => {
			if (e.key === "ArrowLeft") {
				this.state.leftHeld = false;
			}

			if (e.key === "ArrowRight") {
				this.state.rightHeld = false;
			}

			if (e.code === "Space" || e.key === " ") {
				this.state.jumpPressed = false;
			}
		};
	}

	attach(): void {
		window.addEventListener("keydown", this.keyDownHandler);
		window.addEventListener("keyup", this.keyUpHandler);
	}

	detach(): void {
		window.removeEventListener("keydown", this.keyDownHandler);
		window.removeEventListener("keyup", this.keyUpHandler);
	}
}
