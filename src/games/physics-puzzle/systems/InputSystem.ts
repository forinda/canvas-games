import type { InputHandler } from "@shared/InputHandler";
import type { PuzzleState } from "../types";
import type { InventorySystem } from "./InventorySystem";
import { buildLevel } from "../data/levels";

export class InputSystem implements InputHandler {
	private canvas: HTMLCanvasElement;
	private onExit: () => void;
	private getState: () => PuzzleState;
	private setState: (s: PuzzleState) => void;
	private inventory: InventorySystem;

	private keyHandler: (e: KeyboardEvent) => void;
	private clickHandler: (e: MouseEvent) => void;
	private moveHandler: (e: MouseEvent) => void;
	private upHandler: (e: MouseEvent) => void;
	private resizeHandler: () => void;

	constructor(
		canvas: HTMLCanvasElement,
		onExit: () => void,
		getState: () => PuzzleState,
		setState: (s: PuzzleState) => void,
		inventory: InventorySystem,
	) {
		this.canvas = canvas;
		this.onExit = onExit;
		this.getState = getState;
		this.setState = setState;
		this.inventory = inventory;

		this.keyHandler = (e) => {
			if (e.key === "Escape") this.onExit();

			if (e.key === " ") this.toggleSim();

			if (e.key === "r")
				this.setState(
					buildLevel(
						this.getState().level,
						this.canvas.width,
						this.canvas.height,
					),
				);
		};
		this.clickHandler = (e) => this.handleClick(e);
		this.moveHandler = (e) => this.handleMove(e);
		this.upHandler = () => {
			this.getState().dragging = null;
		};
		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		};
	}

	attach(): void {
		window.addEventListener("keydown", this.keyHandler);
		this.canvas.addEventListener("mousedown", this.clickHandler);
		this.canvas.addEventListener("mousemove", this.moveHandler);
		this.canvas.addEventListener("mouseup", this.upHandler);
		window.addEventListener("resize", this.resizeHandler);
	}

	detach(): void {
		window.removeEventListener("keydown", this.keyHandler);
		this.canvas.removeEventListener("mousedown", this.clickHandler);
		this.canvas.removeEventListener("mousemove", this.moveHandler);
		this.canvas.removeEventListener("mouseup", this.upHandler);
		window.removeEventListener("resize", this.resizeHandler);
	}

	private toggleSim(): void {
		const s = this.getState();

		if (s.solved) {
			const next = buildLevel(
				s.level + 1,
				this.canvas.width,
				this.canvas.height,
			);

			next.started = true;
			this.setState(next);

			return;
		}

		s.simulating = !s.simulating;
		s.started = true;
	}

	private handleClick(e: MouseEvent): void {
		const { x, y } = this.getCoords(e);

		if (x < 80 && y < 40) {
			this.onExit();

			return;
		}

		const s = this.getState();

		if (!s.started) {
			s.started = true;

			return;
		}

		if (s.solved) {
			const next = buildLevel(
				s.level + 1,
				this.canvas.width,
				this.canvas.height,
			);

			next.started = true;
			this.setState(next);

			return;
		}

		if (s.simulating) return;

		// Place piece from inventory
		this.inventory.placeSelected(s, x, y);
	}

	private handleMove(e: MouseEvent): void {
		const s = this.getState();

		if (s.dragging !== null) {
			const { x, y } = this.getCoords(e);
			const body = s.bodies.find((b) => b.id === s.dragging);

			if (body && !s.simulating) {
				body.x = x - s.dragOffX;
				body.y = y - s.dragOffY;
			}
		}
	}

	private getCoords(e: MouseEvent): { x: number; y: number } {
		const rect = this.canvas.getBoundingClientRect();

		return {
			x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
			y: (e.clientY - rect.top) * (this.canvas.height / rect.height),
		};
	}
}
