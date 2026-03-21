import type { InputHandler } from "@core/InputHandler";
import type { BrickBuilderState } from "../types";
import { CELL_SIZE, GRID_COLS, GRID_ROWS, BRICK_COLORS } from "../types";
import { BRICK_TEMPLATES } from "../data/bricks";
import type { BuildSystem } from "./BuildSystem";

export class InputSystem implements InputHandler {
	private state: BrickBuilderState;
	private canvas: HTMLCanvasElement;
	private onExit: () => void;
	private buildSystem: BuildSystem;

	private boundMouseMove: (e: MouseEvent) => void;
	private boundMouseDown: (e: MouseEvent) => void;
	private boundContextMenu: (e: MouseEvent) => void;
	private boundWheel: (e: WheelEvent) => void;
	private boundKeyDown: (e: KeyboardEvent) => void;

	constructor(
		state: BrickBuilderState,
		canvas: HTMLCanvasElement,
		onExit: () => void,
		buildSystem: BuildSystem,
	) {
		this.state = state;
		this.canvas = canvas;
		this.onExit = onExit;
		this.buildSystem = buildSystem;

		this.boundMouseMove = this.handleMouseMove.bind(this);
		this.boundMouseDown = this.handleMouseDown.bind(this);
		this.boundContextMenu = this.handleContextMenu.bind(this);
		this.boundWheel = this.handleWheel.bind(this);
		this.boundKeyDown = this.handleKeyDown.bind(this);
	}

	attach(): void {
		this.canvas.addEventListener("mousemove", this.boundMouseMove);
		this.canvas.addEventListener("mousedown", this.boundMouseDown);
		this.canvas.addEventListener("contextmenu", this.boundContextMenu);
		this.canvas.addEventListener("wheel", this.boundWheel, { passive: false });
		window.addEventListener("keydown", this.boundKeyDown);
	}

	detach(): void {
		this.canvas.removeEventListener("mousemove", this.boundMouseMove);
		this.canvas.removeEventListener("mousedown", this.boundMouseDown);
		this.canvas.removeEventListener("contextmenu", this.boundContextMenu);
		this.canvas.removeEventListener("wheel", this.boundWheel);
		window.removeEventListener("keydown", this.boundKeyDown);
	}

	private handleMouseMove(e: MouseEvent): void {
		const rect = this.canvas.getBoundingClientRect();
		const s = this.state;

		s.mouseX = e.clientX - rect.left;
		s.mouseY = e.clientY - rect.top;

		// Check if mouse is over the grid
		const gx = Math.floor((s.mouseX - s.gridOffsetX) / CELL_SIZE);
		const gy = Math.floor((s.mouseY - s.gridOffsetY) / CELL_SIZE);

		s.mouseOnGrid = gx >= 0 && gy >= 0 && gx < GRID_COLS && gy < GRID_ROWS;
		s.hoverGridX = Math.max(0, Math.min(gx, GRID_COLS - 1));
		s.hoverGridY = Math.max(0, Math.min(gy, GRID_ROWS - 1));
	}

	private handleMouseDown(e: MouseEvent): void {
		const s = this.state;

		if (s.helpVisible) {
			s.helpVisible = false;

			return;
		}

		// Left click
		if (e.button === 0) {
			// Check palette click
			if (this.handlePaletteClick(s.mouseX, s.mouseY)) {
				return;
			}

			// Check color picker click
			if (this.handleColorPickerClick(s.mouseX, s.mouseY)) {
				return;
			}

			// Check clear button click
			if (this.handleClearButtonClick(s.mouseX, s.mouseY)) {
				return;
			}

			// Place brick on grid
			if (s.mouseOnGrid) {
				const template = BRICK_TEMPLATES[s.selectedTemplateIndex];
				const bw = s.rotated ? template.h : template.w;
				const bh = s.rotated ? template.w : template.h;
				const color = BRICK_COLORS[s.selectedColorIndex];

				this.buildSystem.placeBrick(
					s,
					s.hoverGridX,
					s.hoverGridY,
					bw,
					bh,
					color,
				);
			}
		}

		// Right click - remove brick
		if (e.button === 2) {
			if (s.mouseOnGrid) {
				this.buildSystem.removeBrickAt(s, s.hoverGridX, s.hoverGridY);
			}
		}
	}

	private handleContextMenu(e: MouseEvent): void {
		e.preventDefault();
	}

	private handleWheel(e: WheelEvent): void {
		e.preventDefault();
		const s = this.state;
		const template = BRICK_TEMPLATES[s.selectedTemplateIndex];

		// Only rotate if the brick is non-square
		if (template.w !== template.h) {
			s.rotated = !s.rotated;
		}
	}

	private handleKeyDown(e: KeyboardEvent): void {
		const s = this.state;

		if (e.key === "Escape") {
			if (s.helpVisible) {
				s.helpVisible = false;
			} else {
				this.onExit();
			}

			return;
		}

		if (e.key === "h" || e.key === "H") {
			s.helpVisible = !s.helpVisible;

			return;
		}

		// Number keys to select templates
		const num = parseInt(e.key, 10);

		if (num >= 1 && num <= BRICK_TEMPLATES.length) {
			s.selectedTemplateIndex = num - 1;
			s.rotated = false;

			return;
		}

		// C to cycle color
		if (e.key === "c" || e.key === "C") {
			s.selectedColorIndex = (s.selectedColorIndex + 1) % BRICK_COLORS.length;

			return;
		}

		// Delete / Backspace to clear all
		if (e.key === "Delete" || e.key === "Backspace") {
			s.bricks = [];

			return;
		}
	}

	private handlePaletteClick(mx: number, my: number): boolean {
		const s = this.state;
		const paletteX = s.gridOffsetX + GRID_COLS * CELL_SIZE + 16;
		const paletteY = s.gridOffsetY + 8;

		for (let i = 0; i < BRICK_TEMPLATES.length; i++) {
			const itemY = paletteY + i * 44;

			if (
				mx >= paletteX &&
				mx <= paletteX + 160 &&
				my >= itemY &&
				my <= itemY + 38
			) {
				s.selectedTemplateIndex = i;
				s.rotated = false;

				return true;
			}
		}

		return false;
	}

	private handleColorPickerClick(mx: number, my: number): boolean {
		const s = this.state;
		const paletteX = s.gridOffsetX + GRID_COLS * CELL_SIZE + 16;
		const colorY = s.gridOffsetY + BRICK_TEMPLATES.length * 44 + 48;
		const swatchSize = 28;
		const gap = 6;
		const perRow = 4;

		for (let i = 0; i < BRICK_COLORS.length; i++) {
			const col = i % perRow;
			const row = Math.floor(i / perRow);
			const cx = paletteX + col * (swatchSize + gap);
			const cy = colorY + row * (swatchSize + gap);

			if (
				mx >= cx &&
				mx <= cx + swatchSize &&
				my >= cy &&
				my <= cy + swatchSize
			) {
				s.selectedColorIndex = i;

				return true;
			}
		}

		return false;
	}

	private handleClearButtonClick(mx: number, my: number): boolean {
		const s = this.state;
		const paletteX = s.gridOffsetX + GRID_COLS * CELL_SIZE + 16;
		const clearY = s.gridOffsetY + BRICK_TEMPLATES.length * 44 + 48 + 80;
		const btnW = 160;
		const btnH = 32;

		if (
			mx >= paletteX &&
			mx <= paletteX + btnW &&
			my >= clearY &&
			my <= clearY + btnH
		) {
			s.bricks = [];

			return true;
		}

		return false;
	}
}
