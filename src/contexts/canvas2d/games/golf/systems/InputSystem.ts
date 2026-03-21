import type { InputHandler } from "@core/InputHandler";
import type { GolfState, Vec2 } from "../types";

export class InputSystem implements InputHandler {
	private canvas: HTMLCanvasElement;
	private state: GolfState;
	private onExit: () => void;
	private onReset: () => void;

	private mouseDownHandler: (e: MouseEvent) => void;
	private mouseMoveHandler: (e: MouseEvent) => void;
	private mouseUpHandler: (e: MouseEvent) => void;
	private keyHandler: (e: KeyboardEvent) => void;
	private touchStartHandler: (e: TouchEvent) => void;
	private touchMoveHandler: (e: TouchEvent) => void;
	private touchEndHandler: (e: TouchEvent) => void;

	constructor(
		canvas: HTMLCanvasElement,
		state: GolfState,
		onExit: () => void,
		onReset: () => void,
		onPutt: (power: number, angle: number) => void,
	) {
		this.canvas = canvas;
		this.state = state;
		this.onExit = onExit;
		this.onReset = onReset;

		this.mouseDownHandler = (e: MouseEvent) => {
			const pos = this.getCanvasPos(e.clientX, e.clientY);

			this.handlePointerDown(pos, onPutt);
		};

		this.mouseMoveHandler = (e: MouseEvent) => {
			const pos = this.getCanvasPos(e.clientX, e.clientY);

			this.handlePointerMove(pos);
		};

		this.mouseUpHandler = (e: MouseEvent) => {
			const pos = this.getCanvasPos(e.clientX, e.clientY);

			this.handlePointerUp(pos, onPutt);
		};

		this.touchStartHandler = (e: TouchEvent) => {
			e.preventDefault();
			const touch = e.touches[0];
			const pos = this.getCanvasPos(touch.clientX, touch.clientY);

			this.handlePointerDown(pos, onPutt);
		};

		this.touchMoveHandler = (e: TouchEvent) => {
			e.preventDefault();
			const touch = e.touches[0];
			const pos = this.getCanvasPos(touch.clientX, touch.clientY);

			this.handlePointerMove(pos);
		};

		this.touchEndHandler = (e: TouchEvent) => {
			e.preventDefault();

			if (this.state.aimStart) {
				const aimEnd = this.state.aimEnd ?? this.state.aimStart;

				this.handlePointerUp(aimEnd, onPutt);
			}
		};

		this.keyHandler = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				this.onExit();

				return;
			}

			if (e.key === "h" || e.key === "H") {
				this.state.showHelp = !this.state.showHelp;

				return;
			}

			if (e.key === "r" || e.key === "R") {
				this.onReset();

				return;
			}
		};
	}

	private getCanvasPos(clientX: number, clientY: number): Vec2 {
		const rect = this.canvas.getBoundingClientRect();

		return {
			x: clientX - rect.left,
			y: clientY - rect.top,
		};
	}

	private handlePointerDown(
		pos: Vec2,
		_onPutt: (power: number, angle: number) => void,
	): void {
		const s = this.state;

		if (s.ballMoving || s.holeSunk || s.gameComplete || s.showHelp) return;

		const ballScreenX = s.ball.pos.x + s.courseOffsetX;
		const ballScreenY = s.ball.pos.y + s.courseOffsetY;
		const dx = pos.x - ballScreenX;
		const dy = pos.y - ballScreenY;
		const dist = Math.sqrt(dx * dx + dy * dy);

		if (dist < 40) {
			s.aiming = true;
			s.aimStart = { x: pos.x, y: pos.y };
			s.aimEnd = { x: pos.x, y: pos.y };
		}
	}

	private handlePointerMove(pos: Vec2): void {
		if (this.state.aiming) {
			this.state.aimEnd = { x: pos.x, y: pos.y };
		}
	}

	private handlePointerUp(
		_pos: Vec2,
		onPutt: (power: number, angle: number) => void,
	): void {
		const s = this.state;

		if (!s.aiming || !s.aimStart || !s.aimEnd) return;

		const dx = s.aimStart.x - s.aimEnd.x;
		const dy = s.aimStart.y - s.aimEnd.y;
		const dist = Math.sqrt(dx * dx + dy * dy);

		if (dist > 5) {
			const angle = Math.atan2(dy, dx);
			const power = Math.min(dist, 200);

			onPutt(power, angle);
		}

		s.aiming = false;
		s.aimStart = null;
		s.aimEnd = null;
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
}
