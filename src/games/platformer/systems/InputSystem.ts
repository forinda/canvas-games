import type { InputHandler } from "@shared/InputHandler";
import type { Updatable } from "@shared/Updatable";
import type { PlatState } from "../types";
import { MOVE_SPEED, JUMP_SPEED } from "../types";

export class InputSystem implements InputHandler, Updatable<PlatState> {
	private keys: Set<string> = new Set();
	private keyDownHandler: (e: KeyboardEvent) => void;
	private keyUpHandler: (e: KeyboardEvent) => void;
	private onExit: () => void;

	constructor(onExit: () => void) {
		this.onExit = onExit;
		this.keyDownHandler = (e: KeyboardEvent) => {
			this.keys.add(e.key);

			if (e.key === "Escape") this.onExit();
		};
		this.keyUpHandler = (e: KeyboardEvent) => {
			this.keys.delete(e.key);
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

	update(state: PlatState, _dt: number): void {
		state.vx = 0;

		if (this.keys.has("ArrowLeft") || this.keys.has("a")) {
			state.vx = -MOVE_SPEED;
			state.facing = -1;
		}

		if (this.keys.has("ArrowRight") || this.keys.has("d")) {
			state.vx = MOVE_SPEED;
			state.facing = 1;
		}

		if (
			(this.keys.has("ArrowUp") || this.keys.has("w") || this.keys.has(" ")) &&
			state.onGround
		) {
			state.vy = JUMP_SPEED;
			state.onGround = false;
		}
	}
}
