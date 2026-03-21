import type { InputHandler } from "@core/InputHandler";
import type { SimonState, Color } from "../types";
import { INPUT_FLASH_DURATION } from "../types";
import type { SequenceSystem } from "./SequenceSystem";

/**
 * Handles mouse clicks on colored quadrants and keyboard shortcuts.
 */
export class InputSystem implements InputHandler {
	private state: SimonState;
	private canvas: HTMLCanvasElement;
	private sequenceSystem: SequenceSystem;
	private onExit: () => void;
	private onRestart: () => void;
	private onToggleHelp: () => void;

	private handleClick: (e: MouseEvent) => void;
	private handleKeyDown: (e: KeyboardEvent) => void;

	constructor(
		state: SimonState,
		canvas: HTMLCanvasElement,
		sequenceSystem: SequenceSystem,
		onExit: () => void,
		onRestart: () => void,
		onToggleHelp: () => void,
	) {
		this.state = state;
		this.canvas = canvas;
		this.sequenceSystem = sequenceSystem;
		this.onExit = onExit;
		this.onRestart = onRestart;
		this.onToggleHelp = onToggleHelp;

		this.handleClick = this.onClick.bind(this);
		this.handleKeyDown = this.onKeyDown.bind(this);
	}

	attach(): void {
		this.canvas.addEventListener("click", this.handleClick);
		window.addEventListener("keydown", this.handleKeyDown);
	}

	detach(): void {
		this.canvas.removeEventListener("click", this.handleClick);
		window.removeEventListener("keydown", this.handleKeyDown);
	}

	/** Determine which color quadrant was clicked based on canvas coordinates */
	private getClickedColor(mx: number, my: number): Color | null {
		const s = this.state;
		const cx = s.canvasW / 2;
		const cy = s.canvasH / 2;
		const size = Math.min(s.canvasW, s.canvasH) * 0.35;

		// Check if click is within the game board area (exclude center circle)
		const dx = mx - cx;
		const dy = my - cy;
		const dist = Math.sqrt(dx * dx + dy * dy);

		// Too close to center or too far from board
		const innerRadius = size * 0.18;
		const outerRadius = size;

		if (dist < innerRadius || dist > outerRadius) return null;

		// Determine quadrant
		if (dx <= 0 && dy <= 0) return "red"; // top-left

		if (dx > 0 && dy <= 0) return "green"; // top-right

		if (dx <= 0 && dy > 0) return "blue"; // bottom-left

		if (dx > 0 && dy > 0) return "yellow"; // bottom-right

		return null;
	}

	private onClick(e: MouseEvent): void {
		const s = this.state;

		if (!s.started) {
			this.sequenceSystem.startNewGame(s);

			return;
		}

		if (s.phase === "gameover") {
			this.sequenceSystem.startNewGame(s);

			return;
		}

		if (s.phase !== "input") return;

		const rect = this.canvas.getBoundingClientRect();
		const mx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
		const my = (e.clientY - rect.top) * (this.canvas.height / rect.height);

		const color = this.getClickedColor(mx, my);

		if (!color) return;

		// Flash the clicked color
		s.activeColor = color;
		s.inputFlashTimer = INPUT_FLASH_DURATION;

		this.sequenceSystem.verifyInput(s, color);
	}

	private onKeyDown(e: KeyboardEvent): void {
		const s = this.state;

		switch (e.key.toLowerCase()) {
			case "escape":
				this.onExit();
				break;
			case "h":
				this.onToggleHelp();
				break;
			case " ":
				e.preventDefault();

				if (!s.started || s.phase === "gameover") {
					this.sequenceSystem.startNewGame(s);
				}

				break;
			case "r":
				this.onRestart();
				break;
		}
	}
}
