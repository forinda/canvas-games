import type { InputHandler } from "@core/InputHandler";
import type { DoodleState } from "../types";
import { MOVE_SPEED, JUMP_FORCE } from "../types";

export class InputSystem implements InputHandler {
	private state: DoodleState;
	private onExit: () => void;
	private onRestart: () => void;

	private keys: Set<string>;
	private keyDownHandler: (e: KeyboardEvent) => void;
	private keyUpHandler: (e: KeyboardEvent) => void;

	constructor(state: DoodleState, onExit: () => void, onRestart: () => void) {
		this.state = state;
		this.onExit = onExit;
		this.onRestart = onRestart;
		this.keys = new Set();

		this.keyDownHandler = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				this.onExit();

				return;
			}

			this.keys.add(e.key.toLowerCase());

			if (this.state.phase === "idle") {
				this.state.phase = "playing";
				this.state.player.vy = JUMP_FORCE;

				return;
			}

			if (
				this.state.phase === "dead" &&
				(e.code === "Space" || e.key === " " || e.key === "Enter")
			) {
				this.onRestart();
			}
		};

		this.keyUpHandler = (e: KeyboardEvent) => {
			this.keys.delete(e.key.toLowerCase());
		};
	}

	/** Called each frame by the engine to apply continuous movement */
	applyMovement(): void {
		if (this.state.phase !== "playing") return;

		const p = this.state.player;

		if (this.keys.has("arrowleft") || this.keys.has("a")) {
			p.vx = -MOVE_SPEED;
			p.facingRight = false;
		} else if (this.keys.has("arrowright") || this.keys.has("d")) {
			p.vx = MOVE_SPEED;
			p.facingRight = true;
		}
	}

	attach(): void {
		window.addEventListener("keydown", this.keyDownHandler);
		window.addEventListener("keyup", this.keyUpHandler);
	}

	detach(): void {
		window.removeEventListener("keydown", this.keyDownHandler);
		window.removeEventListener("keyup", this.keyUpHandler);
		this.keys.clear();
	}
}
