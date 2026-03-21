import type { InputHandler } from "@core/InputHandler";
import type { ColorSwitchState } from "../types";
import { BOUNCE_FORCE } from "../types";

export class InputSystem implements InputHandler {
	private state: ColorSwitchState;
	private canvas: HTMLCanvasElement;
	private onExit: () => void;
	private onRestart: () => void;

	private keyHandler: (e: KeyboardEvent) => void;
	private clickHandler: (e: MouseEvent | TouchEvent) => void;

	constructor(
		state: ColorSwitchState,
		canvas: HTMLCanvasElement,
		onExit: () => void,
		onRestart: () => void,
	) {
		this.state = state;
		this.canvas = canvas;
		this.onExit = onExit;
		this.onRestart = onRestart;

		this.keyHandler = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				this.onExit();

				return;
			}

			if (e.code === "Space" || e.key === " ") {
				e.preventDefault();
				this.handleTap();
			}
		};

		this.clickHandler = (e: MouseEvent | TouchEvent) => {
			e.preventDefault();
			this.handleTap();
		};
	}

	private handleTap(): void {
		const s = this.state;

		if (s.phase === "idle") {
			s.phase = "playing";
			s.ball.velocity = BOUNCE_FORCE;

			return;
		}

		if (s.phase === "playing") {
			s.ball.velocity = BOUNCE_FORCE;

			return;
		}

		if (s.phase === "dead") {
			this.onRestart();
		}
	}

	attach(): void {
		window.addEventListener("keydown", this.keyHandler);
		this.canvas.addEventListener("mousedown", this.clickHandler);
		this.canvas.addEventListener("touchstart", this.clickHandler, {
			passive: false,
		});
	}

	detach(): void {
		window.removeEventListener("keydown", this.keyHandler);
		this.canvas.removeEventListener("mousedown", this.clickHandler);
		this.canvas.removeEventListener("touchstart", this.clickHandler);
	}
}
