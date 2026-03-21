import type { InputHandler } from "@shared/InputHandler";
import type { TouchControls } from "@shared/TouchControls";
import type { RacingState } from "../types";

export interface RacingInput {
	up: boolean;
	down: boolean;
	left: boolean;
	right: boolean;
}

export class InputSystem implements InputHandler {
	readonly keys: RacingInput = {
		up: false,
		down: false,
		left: false,
		right: false,
	};

	private state: RacingState;
	private onExit: () => void;
	private onReset: () => void;
	private onToggleHelp: () => void;
	private touchControls: TouchControls | null;

	private keyDownHandler: (e: KeyboardEvent) => void;
	private keyUpHandler: (e: KeyboardEvent) => void;

	constructor(
		state: RacingState,
		onExit: () => void,
		onReset: () => void,
		onToggleHelp: () => void,
		touchControls?: TouchControls,
	) {
		this.state = state;
		this.onExit = onExit;
		this.onReset = onReset;
		this.onToggleHelp = onToggleHelp;
		this.touchControls = touchControls ?? null;

		this.keyDownHandler = (e: KeyboardEvent) => this.onKeyDown(e);
		this.keyUpHandler = (e: KeyboardEvent) => this.onKeyUp(e);
	}

	attach(): void {
		window.addEventListener("keydown", this.keyDownHandler);
		window.addEventListener("keyup", this.keyUpHandler);
		this.touchControls?.attach();
	}

	detach(): void {
		window.removeEventListener("keydown", this.keyDownHandler);
		window.removeEventListener("keyup", this.keyUpHandler);
		this.touchControls?.detach();
	}

	pollTouch(): void {
		if (!this.touchControls?.visible) return;

		const t = this.touchControls.getState();

		this.keys.up = this.keys.up || t.up;
		this.keys.down = this.keys.down || t.down;
		this.keys.left = this.keys.left || t.left;
		this.keys.right = this.keys.right || t.right;
	}

	private mapKey(code: string): keyof RacingInput | null {
		switch (code) {
			case "ArrowUp":
			case "KeyW":
				return "up";
			case "ArrowDown":
			case "KeyS":
				return "down";
			case "ArrowLeft":
			case "KeyA":
				return "left";
			case "ArrowRight":
			case "KeyD":
				return "right";
			default:
				return null;
		}
	}

	private onKeyDown(e: KeyboardEvent): void {
		const mapped = this.mapKey(e.code);

		if (mapped) {
			e.preventDefault();
			this.keys[mapped] = true;

			return;
		}

		if (e.code === "Escape") {
			e.preventDefault();
			this.onExit();

			return;
		}

		if (e.code === "KeyP") {
			e.preventDefault();

			if (this.state.phase === "racing") {
				this.state.paused = !this.state.paused;
			}

			return;
		}

		if (e.code === "KeyH") {
			e.preventDefault();
			this.onToggleHelp();

			return;
		}

		if (e.code === "Space" || e.code === "KeyR") {
			e.preventDefault();

			if (this.state.phase === "finished") {
				this.onReset();
			}

			return;
		}
	}

	private onKeyUp(e: KeyboardEvent): void {
		const mapped = this.mapKey(e.code);

		if (mapped) {
			e.preventDefault();
			this.keys[mapped] = false;
		}
	}
}
