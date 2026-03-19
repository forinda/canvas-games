import type { InputHandler } from "@shared/InputHandler";
import type { BreakoutState } from "../types";

export class InputSystem implements InputHandler {
	private state: BreakoutState;
	private canvas: HTMLCanvasElement;
	private onExit: () => void;
	private onReset: () => void;

	private mouseMoveHandler: (e: MouseEvent) => void;
	private touchMoveHandler: (e: TouchEvent) => void;
	private keyHandler: (e: KeyboardEvent) => void;
	private clickHandler: (e: MouseEvent) => void;

	constructor(
		state: BreakoutState,
		canvas: HTMLCanvasElement,
		onExit: () => void,
		onReset: () => void,
	) {
		this.state = state;
		this.canvas = canvas;
		this.onExit = onExit;
		this.onReset = onReset;

		this.mouseMoveHandler = (e: MouseEvent) => this.handleMouseMove(e);
		this.touchMoveHandler = (e: TouchEvent) => this.handleTouchMove(e);
		this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
		this.clickHandler = (e: MouseEvent) => this.handleClick(e);
	}

	attach(): void {
		this.canvas.addEventListener("mousemove", this.mouseMoveHandler);
		this.canvas.addEventListener("touchmove", this.touchMoveHandler, {
			passive: false,
		});
		this.canvas.addEventListener("click", this.clickHandler);
		window.addEventListener("keydown", this.keyHandler);
	}

	detach(): void {
		this.canvas.removeEventListener("mousemove", this.mouseMoveHandler);
		this.canvas.removeEventListener("touchmove", this.touchMoveHandler);
		this.canvas.removeEventListener("click", this.clickHandler);
		window.removeEventListener("keydown", this.keyHandler);
	}

	private canvasX(clientX: number): number {
		const rect = this.canvas.getBoundingClientRect();

		return (clientX - rect.left) * (this.canvas.width / rect.width);
	}

	private canvasY(clientY: number): number {
		const rect = this.canvas.getBoundingClientRect();

		return (clientY - rect.top) * (this.canvas.height / rect.height);
	}

	private handleMouseMove(e: MouseEvent): void {
		this.state.mouseX = this.canvasX(e.clientX);
	}

	private handleTouchMove(e: TouchEvent): void {
		e.preventDefault();

		if (e.touches.length > 0) {
			this.state.mouseX = this.canvasX(e.touches[0].clientX);
		}
	}

	private handleKey(e: KeyboardEvent): void {
		const s = this.state;

		if (e.key === "Escape") {
			this.onExit();

			return;
		}

		if (e.key === "p" || e.key === "P") {
			if (s.phase === "playing") s.phase = "paused";
			else if (s.phase === "paused") s.phase = "playing";

			return;
		}

		if (e.key === " " || e.key === "Enter") {
			if (s.phase === "start") {
				s.phase = "playing";

				return;
			}

			if (s.phase === "gameover" || s.phase === "win") {
				this.onReset();

				return;
			}
		}
	}

	private handleClick(e: MouseEvent): void {
		const s = this.state;
		const x = this.canvasX(e.clientX);
		const y = this.canvasY(e.clientY);

		// Exit button (top-left)
		if (x < 80 && y < 40) {
			this.onExit();

			return;
		}

		if (s.phase === "start") {
			s.phase = "playing";

			return;
		}

		if (s.phase === "gameover" || s.phase === "win") {
			this.onReset();

			return;
		}
	}
}
