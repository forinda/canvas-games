import type { InputHandler } from "@core/InputHandler";
import type { InvadersState } from "../types";

/**
 * Captures keyboard state and writes a snapshot into InvadersState.input
 * each time `poll()` is called.
 */
export class InputSystem implements InputHandler {
	private keys = new Set<string>();
	private shootPressed = false;
	private pausePressed = false;

	private onKeyDown = (e: KeyboardEvent) => {
		if (["ArrowLeft", "ArrowRight", " ", "Escape", "p", "P"].includes(e.key)) {
			e.preventDefault();
		}

		this.keys.add(e.key);

		if (e.key === " ") this.shootPressed = true;

		if (e.key === "Escape" || e.key === "p" || e.key === "P")
			this.pausePressed = true;
	};

	private onKeyUp = (e: KeyboardEvent) => {
		this.keys.delete(e.key);
	};

	attach(): void {
		window.addEventListener("keydown", this.onKeyDown);
		window.addEventListener("keyup", this.onKeyUp);
	}

	detach(): void {
		window.removeEventListener("keydown", this.onKeyDown);
		window.removeEventListener("keyup", this.onKeyUp);
		this.keys.clear();
	}

	/** Write current input snapshot into state. Call once per frame. */
	poll(state: InvadersState): void {
		state.input.left = this.keys.has("ArrowLeft");
		state.input.right = this.keys.has("ArrowRight");
		state.input.shoot = this.shootPressed;
		state.input.pause = this.pausePressed;
		// Consume single-fire flags
		this.shootPressed = false;
		this.pausePressed = false;
	}
}
