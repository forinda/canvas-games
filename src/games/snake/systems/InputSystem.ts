import type { InputHandler } from "@shared/InputHandler";
import type { SnakeState, Direction } from "../types";
import type { TouchControls } from "@shared/TouchControls";

export class InputSystem implements InputHandler {
	private state: SnakeState;
	private canvas: HTMLCanvasElement;
	private onExit: () => void;
	private onReset: () => void;
	private keyHandler: (e: KeyboardEvent) => void;
	private clickHandler: (e: MouseEvent) => void;
	private touchControls: TouchControls | null;
	private lastTouchDir: Direction | null = null;

	constructor(
		state: SnakeState,
		canvas: HTMLCanvasElement,
		onExit: () => void,
		onReset: () => void,
		touchControls: TouchControls | null = null,
	) {
		this.state = state;
		this.canvas = canvas;
		this.onExit = onExit;
		this.onReset = onReset;
		this.touchControls = touchControls;
		this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
		this.clickHandler = (e: MouseEvent) => this.handleClick(e);
	}

	attach(): void {
		window.addEventListener("keydown", this.keyHandler);
		this.canvas.addEventListener("click", this.clickHandler);
		this.touchControls?.attach();
	}

	detach(): void {
		window.removeEventListener("keydown", this.keyHandler);
		this.canvas.removeEventListener("click", this.clickHandler);
		this.touchControls?.detach();
	}

	/** Poll touch controls each frame — call from engine update */
	pollTouch(): void {
		if (!this.touchControls?.visible) return;

		const s = this.state;
		const touch = this.touchControls.getState();

		// Determine direction from touch d-pad
		let touchDir: Direction | null = null;

		if (touch.up) touchDir = "up";
		else if (touch.down) touchDir = "down";
		else if (touch.left) touchDir = "left";
		else if (touch.right) touchDir = "right";

		// Only change direction on new press (not while held)
		if (touchDir && touchDir !== this.lastTouchDir) {
			const opposites: Record<string, string> = {
				up: "down",
				down: "up",
				left: "right",
				right: "left",
			};

			if (opposites[touchDir] !== s.dir) {
				s.nextDir = touchDir;
			}

			if (!s.started) s.started = true;
		}

		this.lastTouchDir = touchDir;
	}

	private handleKey(e: KeyboardEvent): void {
		const s = this.state;

		if (e.key === "Escape") {
			this.onExit();

			return;
		}

		if (e.key === "p" || e.key === "P") {
			s.paused = !s.paused;

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

		const dirs: Record<string, Direction> = {
			ArrowUp: "up",
			ArrowDown: "down",
			ArrowLeft: "left",
			ArrowRight: "right",
			w: "up",
			s: "down",
			a: "left",
			d: "right",
		};
		const newDir = dirs[e.key];

		if (!newDir) return;

		if (!s.started) s.started = true;

		const opposites: Record<string, string> = {
			up: "down",
			down: "up",
			left: "right",
			right: "left",
		};

		if (opposites[newDir] !== s.dir) {
			s.nextDir = newDir;
		}
	}

	private handleClick(e: MouseEvent): void {
		const s = this.state;
		const rect = this.canvas.getBoundingClientRect();
		const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
		const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
		const W = this.canvas.width;
		const H = this.canvas.height;

		// Exit button (top-left)
		if (x < 80 && y < 40) {
			this.onExit();

			return;
		}

		if (s.gameOver) {
			// Restart area (center)
			if (x > W * 0.35 && x < W * 0.65 && y > H * 0.5 && y < H * 0.65) {
				this.onReset();
			}

			return;
		}

		if (!s.started) {
			s.started = true;
		}
	}
}
