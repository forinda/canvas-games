import type { InputHandler } from "@shared/InputHandler.ts";
import type { GameState } from "../types.ts";

export interface InputSnapshot {
	moveX: number; // -1, 0, 1
	moveY: number; // -1, 0, 1
	aimX: number; // canvas-space
	aimY: number; // canvas-space
	shooting: boolean;
	placeBarricade: boolean;
	pause: boolean;
	help: boolean;
}

export class InputSystem implements InputHandler {
	private canvas: HTMLCanvasElement;
	private keys = new Set<string>();
	private mouseX = 0;
	private mouseY = 0;
	private mouseDown = false;
	private placeFlag = false;
	private pauseFlag = false;
	private helpFlag = false;

	// Bound handlers
	private _onKeyDown: (e: KeyboardEvent) => void;
	private _onKeyUp: (e: KeyboardEvent) => void;
	private _onMouseMove: (e: MouseEvent) => void;
	private _onMouseDown: (e: MouseEvent) => void;
	private _onMouseUp: (e: MouseEvent) => void;
	private _onContext: (e: MouseEvent) => void;

	constructor(canvas: HTMLCanvasElement, _getState: () => GameState) {
		this.canvas = canvas;

		this._onKeyDown = (e: KeyboardEvent) => {
			this.keys.add(e.key.toLowerCase());

			if (e.key.toLowerCase() === "e") this.placeFlag = true;

			if (e.key.toLowerCase() === "p" || e.key === "Escape")
				this.pauseFlag = true;

			if (e.key.toLowerCase() === "h") this.helpFlag = true;
		};
		this._onKeyUp = (e: KeyboardEvent) => {
			this.keys.delete(e.key.toLowerCase());
		};
		this._onMouseMove = (e: MouseEvent) => {
			const rect = this.canvas.getBoundingClientRect();
			const scaleX = this.canvas.width / rect.width;
			const scaleY = this.canvas.height / rect.height;

			this.mouseX = (e.clientX - rect.left) * scaleX;
			this.mouseY = (e.clientY - rect.top) * scaleY;
		};
		this._onMouseDown = (e: MouseEvent) => {
			if (e.button === 0) this.mouseDown = true;
		};
		this._onMouseUp = (e: MouseEvent) => {
			if (e.button === 0) this.mouseDown = false;
		};
		this._onContext = (e: MouseEvent) => {
			e.preventDefault();
		};
	}

	attach(): void {
		window.addEventListener("keydown", this._onKeyDown);
		window.addEventListener("keyup", this._onKeyUp);
		this.canvas.addEventListener("mousemove", this._onMouseMove);
		this.canvas.addEventListener("mousedown", this._onMouseDown);
		this.canvas.addEventListener("mouseup", this._onMouseUp);
		this.canvas.addEventListener("contextmenu", this._onContext);
	}

	detach(): void {
		window.removeEventListener("keydown", this._onKeyDown);
		window.removeEventListener("keyup", this._onKeyUp);
		this.canvas.removeEventListener("mousemove", this._onMouseMove);
		this.canvas.removeEventListener("mousedown", this._onMouseDown);
		this.canvas.removeEventListener("mouseup", this._onMouseUp);
		this.canvas.removeEventListener("contextmenu", this._onContext);
	}

	/** Read and consume single-frame flags */
	snapshot(): InputSnapshot {
		const moveX =
			(this.keys.has("d") || this.keys.has("arrowright") ? 1 : 0) -
			(this.keys.has("a") || this.keys.has("arrowleft") ? 1 : 0);
		const moveY =
			(this.keys.has("s") || this.keys.has("arrowdown") ? 1 : 0) -
			(this.keys.has("w") || this.keys.has("arrowup") ? 1 : 0);

		const snap: InputSnapshot = {
			moveX,
			moveY,
			aimX: this.mouseX,
			aimY: this.mouseY,
			shooting: this.mouseDown,
			placeBarricade: this.placeFlag,
			pause: this.pauseFlag,
			help: this.helpFlag,
		};

		// Consume flags
		this.placeFlag = false;
		this.pauseFlag = false;
		this.helpFlag = false;

		return snap;
	}
}
