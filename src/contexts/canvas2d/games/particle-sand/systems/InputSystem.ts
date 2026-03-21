import type { InputHandler } from "@core/InputHandler";
import type { SandState, ParticleType } from "../types";
import { PARTICLE_TYPES, CELL_SIZE } from "../types";

export class InputSystem implements InputHandler {
	private state: SandState;
	private canvas: HTMLCanvasElement;
	private onExit: () => void;
	private onClear: () => void;
	private onToggleHelp: () => void;

	private keyHandler: (e: KeyboardEvent) => void;
	private mouseDownHandler: (e: MouseEvent) => void;
	private mouseMoveHandler: (e: MouseEvent) => void;
	private mouseUpHandler: (e: MouseEvent) => void;
	private touchStartHandler: (e: TouchEvent) => void;
	private touchMoveHandler: (e: TouchEvent) => void;
	private touchEndHandler: (e: TouchEvent) => void;

	constructor(
		state: SandState,
		canvas: HTMLCanvasElement,
		onExit: () => void,
		onClear: () => void,
		onToggleHelp: () => void,
	) {
		this.state = state;
		this.canvas = canvas;
		this.onExit = onExit;
		this.onClear = onClear;
		this.onToggleHelp = onToggleHelp;

		this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
		this.mouseDownHandler = (e: MouseEvent) => this.handleMouseDown(e);
		this.mouseMoveHandler = (e: MouseEvent) => this.handleMouseMove(e);
		this.mouseUpHandler = () => this.handleMouseUp();
		this.touchStartHandler = (e: TouchEvent) => this.handleTouchStart(e);
		this.touchMoveHandler = (e: TouchEvent) => this.handleTouchMove(e);
		this.touchEndHandler = () => this.handleMouseUp();
	}

	attach(): void {
		window.addEventListener("keydown", this.keyHandler);
		this.canvas.addEventListener("mousedown", this.mouseDownHandler);
		window.addEventListener("mousemove", this.mouseMoveHandler);
		window.addEventListener("mouseup", this.mouseUpHandler);
		this.canvas.addEventListener("touchstart", this.touchStartHandler, {
			passive: false,
		});
		window.addEventListener("touchmove", this.touchMoveHandler, {
			passive: false,
		});
		window.addEventListener("touchend", this.touchEndHandler);
	}

	detach(): void {
		window.removeEventListener("keydown", this.keyHandler);
		this.canvas.removeEventListener("mousedown", this.mouseDownHandler);
		window.removeEventListener("mousemove", this.mouseMoveHandler);
		window.removeEventListener("mouseup", this.mouseUpHandler);
		this.canvas.removeEventListener("touchstart", this.touchStartHandler);
		window.removeEventListener("touchmove", this.touchMoveHandler);
		window.removeEventListener("touchend", this.touchEndHandler);
	}

	private handleKey(e: KeyboardEvent): void {
		if (e.key === "Escape") {
			this.onExit();

			return;
		}

		if (e.key === "h" || e.key === "H") {
			this.onToggleHelp();

			return;
		}

		if (e.key === "p" || e.key === "P") {
			this.state.paused = !this.state.paused;

			return;
		}

		if (e.key === "c" || e.key === "C") {
			this.onClear();

			return;
		}

		// Number keys 1-5 select particle type
		const num = parseInt(e.key, 10);

		if (num >= 1 && num <= PARTICLE_TYPES.length) {
			this.state.selectedType = PARTICLE_TYPES[num - 1] as ParticleType;

			return;
		}

		// Bracket keys adjust brush size
		if (e.key === "[" || e.key === "-") {
			this.state.brushSize = Math.max(1, this.state.brushSize - 1);
		}

		if (e.key === "]" || e.key === "=") {
			this.state.brushSize = Math.min(10, this.state.brushSize + 1);
		}
	}

	private updateMousePos(clientX: number, clientY: number): void {
		const rect = this.canvas.getBoundingClientRect();
		const scaleX = this.canvas.width / rect.width;
		const scaleY = this.canvas.height / rect.height;

		this.state.mouseX = Math.floor(
			((clientX - rect.left) * scaleX) / CELL_SIZE,
		);
		this.state.mouseY = Math.floor(((clientY - rect.top) * scaleY) / CELL_SIZE);
	}

	private handleMouseDown(e: MouseEvent): void {
		// Check exit button area
		const rect = this.canvas.getBoundingClientRect();
		const scaleX = this.canvas.width / rect.width;
		const scaleY = this.canvas.height / rect.height;
		const x = (e.clientX - rect.left) * scaleX;
		const y = (e.clientY - rect.top) * scaleY;

		if (x < 80 && y < 36) {
			this.onExit();

			return;
		}

		// Check palette clicks (bottom bar)
		const H = this.canvas.height;

		if (y > H - 50) {
			this.handlePaletteClick(x);

			return;
		}

		this.state.mouseDown = true;
		this.updateMousePos(e.clientX, e.clientY);
	}

	private handleMouseMove(e: MouseEvent): void {
		this.updateMousePos(e.clientX, e.clientY);
	}

	private handleMouseUp(): void {
		this.state.mouseDown = false;
	}

	private handleTouchStart(e: TouchEvent): void {
		e.preventDefault();

		if (e.touches.length > 0) {
			const t = e.touches[0];

			this.state.mouseDown = true;
			this.updateMousePos(t.clientX, t.clientY);
		}
	}

	private handleTouchMove(e: TouchEvent): void {
		e.preventDefault();

		if (e.touches.length > 0) {
			const t = e.touches[0];

			this.updateMousePos(t.clientX, t.clientY);
		}
	}

	private handlePaletteClick(x: number): void {
		const W = this.canvas.width;
		const paletteW = PARTICLE_TYPES.length * 70;
		const startX = (W - paletteW) / 2;
		const idx = Math.floor((x - startX) / 70);

		if (idx >= 0 && idx < PARTICLE_TYPES.length) {
			this.state.selectedType = PARTICLE_TYPES[idx] as ParticleType;
		}
	}
}
