import type { InputHandler } from "@core/InputHandler";
import type { SokobanState, Dir } from "../types";

const DIR_MAP: Record<string, Dir> = {
	ArrowUp: { dx: 0, dy: -1 },
	ArrowDown: { dx: 0, dy: 1 },
	ArrowLeft: { dx: -1, dy: 0 },
	ArrowRight: { dx: 1, dy: 0 },
	w: { dx: 0, dy: -1 },
	s: { dx: 0, dy: 1 },
	a: { dx: -1, dy: 0 },
	d: { dx: 1, dy: 0 },
};

export class InputSystem implements InputHandler {
	private handler: (e: KeyboardEvent) => void;
	private state: SokobanState;
	private onExit: () => void;
	private onToggleHelp: () => void;

	constructor(
		state: SokobanState,
		_canvas: HTMLCanvasElement,
		onExit: () => void,
		onToggleHelp: () => void,
	) {
		this.state = state;
		this.onExit = onExit;
		this.onToggleHelp = onToggleHelp;
		this.handler = (e: KeyboardEvent) => this.handleKey(e);
	}

	attach(): void {
		window.addEventListener("keydown", this.handler);
	}

	detach(): void {
		window.removeEventListener("keydown", this.handler);
	}

	private handleKey(e: KeyboardEvent): void {
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

		// Advance to next level when current is complete
		if (this.state.levelComplete && !this.state.gameWon) {
			if (key === " " || key === "Enter") {
				e.preventDefault();
				this.state.advanceRequested = true;

				return;
			}
		}

		// Restart on game won
		if (this.state.gameWon) {
			if (key === " " || key === "Enter") {
				e.preventDefault();
				this.state.level = 0;
				this.state.restartRequested = true;
				this.state.gameWon = false;

				return;
			}
		}

		// Don't process game input if level is complete
		if (this.state.levelComplete) return;

		// Undo
		if (key === "z" || key === "Z") {
			e.preventDefault();
			this.state.undoRequested = true;

			return;
		}

		// Restart level
		if (key === "r" || key === "R") {
			e.preventDefault();
			this.state.restartRequested = true;

			return;
		}

		// Direction
		const dir = DIR_MAP[key];

		if (dir) {
			e.preventDefault();
			this.state.queuedDir = dir;
		}
	}
}
