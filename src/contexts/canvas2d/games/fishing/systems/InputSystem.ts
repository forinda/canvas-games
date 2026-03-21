import type { InputHandler } from "@core/InputHandler";
import type { FishingState } from "../types";

export class InputSystem implements InputHandler {
	private keydownHandler: (e: KeyboardEvent) => void;
	private keyupHandler: (e: KeyboardEvent) => void;
	private clickHandler: (e: MouseEvent) => void;
	private state: FishingState;
	private canvas: HTMLCanvasElement;
	private onExit: () => void;
	private onReset: () => void;
	private onToggleCatalog: () => void;
	private onToggleHelp: () => void;

	constructor(
		state: FishingState,
		canvas: HTMLCanvasElement,
		onExit: () => void,
		onReset: () => void,
		onToggleCatalog: () => void,
		onToggleHelp: () => void,
	) {
		this.state = state;
		this.canvas = canvas;
		this.onExit = onExit;
		this.onReset = onReset;
		this.onToggleCatalog = onToggleCatalog;
		this.onToggleHelp = onToggleHelp;
		this.keydownHandler = this.handleKeyDown.bind(this);
		this.keyupHandler = this.handleKeyUp.bind(this);
		this.clickHandler = this.handleClick.bind(this);
	}

	attach(): void {
		window.addEventListener("keydown", this.keydownHandler);
		window.addEventListener("keyup", this.keyupHandler);
		this.canvas.addEventListener("click", this.clickHandler);
	}

	detach(): void {
		window.removeEventListener("keydown", this.keydownHandler);
		window.removeEventListener("keyup", this.keyupHandler);
		this.canvas.removeEventListener("click", this.clickHandler);
	}

	private handleKeyDown(e: KeyboardEvent): void {
		const s = this.state;

		if (e.key === "Escape") {
			this.onExit();

			return;
		}

		if (e.key === "h" || e.key === "H") {
			this.onToggleHelp();

			return;
		}

		if (e.key === "c" || e.key === "C") {
			this.onToggleCatalog();

			return;
		}

		if (e.key === "r" || e.key === "R") {
			if (s.phase === "idle") {
				this.onReset();
			}

			return;
		}

		if (e.key === " ") {
			e.preventDefault();

			if (s.phase === "idle") {
				// Start charging cast
				s.phase = "casting";
				s.castCharging = true;
				s.castPower = 0;
			} else if (s.phase === "hooking") {
				// Try to hook the fish
				s.hookSuccess = true;
			} else if (s.phase === "reeling") {
				s.reelHolding = true;
			}
		}
	}

	private handleKeyUp(e: KeyboardEvent): void {
		const s = this.state;

		if (e.key === " ") {
			e.preventDefault();

			if (s.phase === "casting" && s.castCharging) {
				// Release cast
				s.castCharging = false;
			} else if (s.phase === "reeling") {
				s.reelHolding = false;
			}
		}
	}

	private handleClick(_e: MouseEvent): void {
		const s = this.state;

		if (s.phase === "hooking") {
			s.hookSuccess = true;
		}
	}
}
