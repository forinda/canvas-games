import type { InputHandler } from "@core/InputHandler";
import type { MazeState } from "../types.ts";

export type MoveDirection = "up" | "down" | "left" | "right";

/**
 * Captures arrow-key and WASD input, queues a single move direction.
 * Also handles Pause (P), Help (H), restart (Space), and exit (ESC).
 */
export class InputSystem implements InputHandler {
	private state: MazeState;
	private onExit: () => void;
	private onReset: () => void;
	private onToggleHelp: () => void;
	private handler: (e: KeyboardEvent) => void;

	/** The most recent queued direction (consumed by PlayerSystem) */
	pendingDir: MoveDirection | null = null;

	constructor(
		state: MazeState,
		onExit: () => void,
		onReset: () => void,
		onToggleHelp: () => void,
	) {
		this.state = state;
		this.onExit = onExit;
		this.onReset = onReset;
		this.onToggleHelp = onToggleHelp;

		this.handler = (e: KeyboardEvent) => {
			const key = e.key;

			// Exit
			if (key === "Escape") {
				e.preventDefault();
				this.onExit();

				return;
			}

			// Help toggle
			if (key === "h" || key === "H") {
				e.preventDefault();
				this.onToggleHelp();

				return;
			}

			// Pause
			if (key === "p" || key === "P") {
				e.preventDefault();

				if (this.state.started && !this.state.won && !this.state.lost) {
					this.state.paused = !this.state.paused;
				}

				return;
			}

			// Restart / start
			if (key === " ") {
				e.preventDefault();

				if (!this.state.started || this.state.won || this.state.lost) {
					this.onReset();
				}

				return;
			}

			// Movement (only when playing)
			if (
				this.state.paused ||
				this.state.won ||
				this.state.lost ||
				!this.state.started
			)
				return;

			let dir: MoveDirection | null = null;

			if (key === "ArrowUp" || key === "w" || key === "W") dir = "up";
			else if (key === "ArrowDown" || key === "s" || key === "S") dir = "down";
			else if (key === "ArrowLeft" || key === "a" || key === "A") dir = "left";
			else if (key === "ArrowRight" || key === "d" || key === "D")
				dir = "right";

			if (dir) {
				e.preventDefault();
				this.pendingDir = dir;
			}
		};
	}

	attach(): void {
		window.addEventListener("keydown", this.handler);
	}

	detach(): void {
		window.removeEventListener("keydown", this.handler);
	}
}
