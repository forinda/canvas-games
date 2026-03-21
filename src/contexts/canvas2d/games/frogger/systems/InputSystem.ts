import type { InputHandler } from "@core/InputHandler";
import type { FroggerState } from "../types";
import { COLS, ROWS } from "../types";

const HOP_DURATION = 0.1; // seconds for hop animation

export class InputSystem implements InputHandler {
	private state: FroggerState;
	private onExit: () => void;
	private onReset: () => void;
	private keyHandler: (e: KeyboardEvent) => void;

	constructor(state: FroggerState, onExit: () => void, onReset: () => void) {
		this.state = state;
		this.onExit = onExit;
		this.onReset = onReset;
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
			this.onExit();

			return;
		}

		if (e.key === "p" || e.key === "P") {
			if (s.started && !s.gameOver) {
				s.paused = !s.paused;
			}

			return;
		}

		if (e.key === " " || e.key === "Enter") {
			if (s.gameOver) {
				this.onReset();

				return;
			}

			if (!s.started) {
				s.started = true;

				return;
			}
		}

		if (s.paused || s.gameOver || s.dying || s.levelComplete) return;

		if (!s.started) s.started = true;

		// Prevent double-hopping while already mid-hop
		if (s.frog.hopping) return;

		let dc = 0;
		let dr = 0;

		switch (e.key) {
			case "ArrowUp":
			case "w":
			case "W":
				dr = -1;
				break;
			case "ArrowDown":
			case "s":
			case "S":
				dr = 1;
				break;
			case "ArrowLeft":
			case "a":
			case "A":
				dc = -1;
				break;
			case "ArrowRight":
			case "d":
			case "D":
				dc = 1;
				break;
			default:
				return;
		}

		e.preventDefault();

		const newCol = s.frog.col + dc;
		const newRow = s.frog.row + dr;

		if (newCol < 0 || newCol >= COLS) return;

		if (newRow < 0 || newRow >= ROWS) return;

		// Start hop animation
		s.frog.col = newCol;
		s.frog.row = newRow;
		s.frog.offsetX = -dc * s.cellW;
		s.frog.offsetY = -dr * s.cellH;
		s.frog.hopping = true;
		s.frog.hopTimer = HOP_DURATION;
	}
}
