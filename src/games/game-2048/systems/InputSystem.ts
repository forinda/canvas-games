import type { InputHandler } from "@shared/InputHandler";
import type { Game2048State, Direction } from "../types";

export class InputSystem implements InputHandler {
	private state: Game2048State;
	private onExit: () => void;
	private onToggleHelp: () => void;
	private keyHandler: (e: KeyboardEvent) => void;

	constructor(
		state: Game2048State,
		onExit: () => void,
		_onReset: () => void,
		onToggleHelp: () => void,
	) {
		this.state = state;
		this.onExit = onExit;
		this.onToggleHelp = onToggleHelp;

		this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
	}

	attach(): void {
		window.addEventListener("keydown", this.keyHandler);
	}

	detach(): void {
		window.removeEventListener("keydown", this.keyHandler);
	}

	private handleKey(e: KeyboardEvent): void {
		const s = this.state;

		if (e.key === "Escape") {
			e.preventDefault();
			this.onExit();

			return;
		}

		if (e.key === "h" || e.key === "H") {
			e.preventDefault();
			this.onToggleHelp();

			return;
		}

		if (e.key === "r" || e.key === "R") {
			e.preventDefault();
			s.restartRequested = true;

			return;
		}

		// If won and not keepPlaying, allow 'c' to continue
		if (s.won && !s.keepPlaying) {
			if (e.key === "c" || e.key === "C") {
				e.preventDefault();
				s.continueRequested = true;

				return;
			}
		}

		// No moves when game over or won (and not continuing)
		if (s.gameOver || (s.won && !s.keepPlaying)) return;

		// No moves during animation
		if (s.animating) return;

		const dirMap: Record<string, Direction> = {
			ArrowUp: "up",
			ArrowDown: "down",
			ArrowLeft: "left",
			ArrowRight: "right",
			w: "up",
			s: "down",
			a: "left",
			d: "right",
			W: "up",
			S: "down",
			A: "left",
			D: "right",
		};

		const dir = dirMap[e.key];

		if (dir) {
			e.preventDefault();
			s.pendingDirection = dir;
		}
	}
}
