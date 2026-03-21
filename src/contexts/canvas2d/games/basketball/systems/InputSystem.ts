import type { InputHandler } from "@core/InputHandler";
import type { BasketballState } from "../types";
import { BALL_RADIUS, POWER_SCALE, MAX_POWER } from "../types";

export class InputSystem implements InputHandler {
	private state: BasketballState;
	private canvas: HTMLCanvasElement;
	private onExit: () => void;
	private onReset: () => void;
	private onShoot: (vx: number, vy: number) => void;

	private mouseDownHandler: (e: MouseEvent) => void;
	private mouseMoveHandler: (e: MouseEvent) => void;
	private mouseUpHandler: (e: MouseEvent) => void;
	private touchStartHandler: (e: TouchEvent) => void;
	private touchMoveHandler: (e: TouchEvent) => void;
	private touchEndHandler: (e: TouchEvent) => void;
	private keyHandler: (e: KeyboardEvent) => void;

	constructor(
		state: BasketballState,
		canvas: HTMLCanvasElement,
		onExit: () => void,
		onReset: () => void,
		onShoot: (vx: number, vy: number) => void,
	) {
		this.state = state;
		this.canvas = canvas;
		this.onExit = onExit;
		this.onReset = onReset;
		this.onShoot = onShoot;

		this.mouseDownHandler = (e: MouseEvent) =>
			this.handleDown(this.canvasX(e.clientX), this.canvasY(e.clientY));
		this.mouseMoveHandler = (e: MouseEvent) =>
			this.handleMove(this.canvasX(e.clientX), this.canvasY(e.clientY));
		this.mouseUpHandler = (_e: MouseEvent) => this.handleUp();
		this.touchStartHandler = (e: TouchEvent) => {
			e.preventDefault();

			if (e.touches.length > 0) {
				this.handleDown(
					this.canvasX(e.touches[0].clientX),
					this.canvasY(e.touches[0].clientY),
				);
			}
		};
		this.touchMoveHandler = (e: TouchEvent) => {
			e.preventDefault();

			if (e.touches.length > 0) {
				this.handleMove(
					this.canvasX(e.touches[0].clientX),
					this.canvasY(e.touches[0].clientY),
				);
			}
		};
		this.touchEndHandler = (e: TouchEvent) => {
			e.preventDefault();
			this.handleUp();
		};
		this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
	}

	attach(): void {
		this.canvas.addEventListener("mousedown", this.mouseDownHandler);
		this.canvas.addEventListener("mousemove", this.mouseMoveHandler);
		this.canvas.addEventListener("mouseup", this.mouseUpHandler);
		this.canvas.addEventListener("touchstart", this.touchStartHandler, {
			passive: false,
		});
		this.canvas.addEventListener("touchmove", this.touchMoveHandler, {
			passive: false,
		});
		this.canvas.addEventListener("touchend", this.touchEndHandler, {
			passive: false,
		});
		window.addEventListener("keydown", this.keyHandler);
	}

	detach(): void {
		this.canvas.removeEventListener("mousedown", this.mouseDownHandler);
		this.canvas.removeEventListener("mousemove", this.mouseMoveHandler);
		this.canvas.removeEventListener("mouseup", this.mouseUpHandler);
		this.canvas.removeEventListener("touchstart", this.touchStartHandler);
		this.canvas.removeEventListener("touchmove", this.touchMoveHandler);
		this.canvas.removeEventListener("touchend", this.touchEndHandler);
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

	private handleDown(x: number, y: number): void {
		const s = this.state;

		if (s.phase === "start") {
			s.phase = "playing";

			return;
		}

		if (s.phase === "gameover") {
			this.onReset();

			return;
		}

		if (s.phase !== "playing") return;

		if (s.ball.inFlight) return;

		// Check if clicking near the ball
		const dx = x - s.ball.x;
		const dy = y - s.ball.y;
		const dist = Math.sqrt(dx * dx + dy * dy);

		if (dist < BALL_RADIUS * 4) {
			s.aim.dragging = true;
			s.aim.startX = x;
			s.aim.startY = y;
			s.aim.currentX = x;
			s.aim.currentY = y;
		}
	}

	private handleMove(x: number, y: number): void {
		const s = this.state;

		if (!s.aim.dragging) return;

		s.aim.currentX = x;
		s.aim.currentY = y;
	}

	private handleUp(): void {
		const s = this.state;

		if (!s.aim.dragging) return;

		s.aim.dragging = false;

		if (s.phase !== "playing" || s.ball.inFlight) return;

		const dx = s.aim.startX - s.aim.currentX;
		const dy = s.aim.startY - s.aim.currentY;
		const power = Math.sqrt(dx * dx + dy * dy);

		if (power < 10) return;

		let vx = dx * POWER_SCALE;
		let vy = dy * POWER_SCALE;

		const mag = Math.sqrt(vx * vx + vy * vy);

		if (mag > MAX_POWER) {
			const scale = MAX_POWER / mag;

			vx *= scale;
			vy *= scale;
		}

		this.onShoot(vx, vy);
	}

	private handleKey(e: KeyboardEvent): void {
		const s = this.state;

		if (e.key === "Escape") {
			this.onExit();

			return;
		}

		if (e.key === "h" || e.key === "H") {
			return; // handled by engine for help overlay
		}

		if (e.key === " " || e.key === "Enter") {
			if (s.phase === "start") {
				s.phase = "playing";

				return;
			}

			if (s.phase === "gameover") {
				this.onReset();

				return;
			}
		}
	}
}
