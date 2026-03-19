import type { InputHandler } from "@shared/InputHandler";
import type { PixelArtState, Tool } from "../types";
import { HUD_HEIGHT, COLOR_PALETTE, GRID_SIZES } from "../types";

export class InputSystem implements InputHandler {
	private canvas: HTMLCanvasElement;
	private state: PixelArtState;
	private onExit: () => void;
	private onClear: () => void;
	private onGridResize: (size: number) => void;

	private boundMouseDown: (e: MouseEvent) => void;
	private boundMouseMove: (e: MouseEvent) => void;
	private boundMouseUp: (e: MouseEvent) => void;
	private boundContextMenu: (e: MouseEvent) => void;
	private boundMouseLeave: () => void;
	private boundKeyDown: (e: KeyboardEvent) => void;

	constructor(
		canvas: HTMLCanvasElement,
		state: PixelArtState,
		onExit: () => void,
		onClear: () => void,
		onGridResize: (size: number) => void,
	) {
		this.canvas = canvas;
		this.state = state;
		this.onExit = onExit;
		this.onClear = onClear;
		this.onGridResize = onGridResize;

		this.boundMouseDown = (e: MouseEvent) => this.handleMouseDown(e);
		this.boundMouseMove = (e: MouseEvent) => this.handleMouseMove(e);
		this.boundMouseUp = () => this.handleMouseUp();
		this.boundContextMenu = (e: MouseEvent) => e.preventDefault();
		this.boundMouseLeave = () => this.handleMouseLeave();
		this.boundKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
	}

	attach(): void {
		this.canvas.addEventListener("mousedown", this.boundMouseDown);
		this.canvas.addEventListener("mousemove", this.boundMouseMove);
		this.canvas.addEventListener("mouseup", this.boundMouseUp);
		this.canvas.addEventListener("contextmenu", this.boundContextMenu);
		this.canvas.addEventListener("mouseleave", this.boundMouseLeave);
		window.addEventListener("keydown", this.boundKeyDown);
	}

	detach(): void {
		this.canvas.removeEventListener("mousedown", this.boundMouseDown);
		this.canvas.removeEventListener("mousemove", this.boundMouseMove);
		this.canvas.removeEventListener("mouseup", this.boundMouseUp);
		this.canvas.removeEventListener("contextmenu", this.boundContextMenu);
		this.canvas.removeEventListener("mouseleave", this.boundMouseLeave);
		window.removeEventListener("keydown", this.boundKeyDown);
	}

	private getGridCoords(e: MouseEvent): { gx: number; gy: number } | null {
		const rect = this.canvas.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;

		const s = this.state;
		const availH = s.canvasHeight - HUD_HEIGHT;
		const cellSize = Math.floor(
			Math.min(s.canvasWidth / s.gridSize, availH / s.gridSize),
		);
		const offsetX = Math.floor((s.canvasWidth - cellSize * s.gridSize) / 2);
		const offsetY = Math.floor((availH - cellSize * s.gridSize) / 2);

		const gx = Math.floor((mx - offsetX) / cellSize);
		const gy = Math.floor((my - offsetY) / cellSize);

		if (gx < 0 || gx >= s.gridSize || gy < 0 || gy >= s.gridSize) {
			return null;
		}

		return { gx, gy };
	}

	private handleMouseDown(e: MouseEvent): void {
		const rect = this.canvas.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;

		// Check HUD clicks
		if (my >= this.state.canvasHeight - HUD_HEIGHT) {
			this.handleHUDClick(mx, my);

			return;
		}

		// Right-click always erases
		if (e.button === 2) {
			const coords = this.getGridCoords(e);

			if (coords) {
				this.state.currentTool = "erase";
				this.state.isDrawing = true;
				// Mark pending action via state — DrawSystem handles actual grid mutation
			}

			return;
		}

		const coords = this.getGridCoords(e);

		if (coords) {
			this.state.hoverX = coords.gx;
			this.state.hoverY = coords.gy;
			this.state.isDrawing = true;
		}
	}

	private handleMouseMove(e: MouseEvent): void {
		const coords = this.getGridCoords(e);

		if (coords) {
			this.state.hoverX = coords.gx;
			this.state.hoverY = coords.gy;
			this.state.hoverActive = true;
		} else {
			this.state.hoverActive = false;
		}
	}

	private handleMouseUp(): void {
		this.state.isDrawing = false;
	}

	private handleMouseLeave(): void {
		this.state.hoverActive = false;
		this.state.isDrawing = false;
	}

	private handleKeyDown(e: KeyboardEvent): void {
		switch (e.key) {
			case "Escape":
				this.onExit();
				break;
			case "d":
				this.state.currentTool = "draw";
				break;
			case "e":
				this.state.currentTool = "erase";
				break;
			case "f":
				this.state.currentTool = "fill";
				break;
			case "i":
				this.state.currentTool = "eyedropper";
				break;
			case "c":
				this.onClear();
				break;
		}
	}

	private handleHUDClick(mx: number, my: number): void {
		const s = this.state;
		const hudY = s.canvasHeight - HUD_HEIGHT;
		const relY = my - hudY;

		// Color palette: rendered as a row of swatches starting at x=10, y=hudY+8
		const swatchSize = 24;
		const swatchGap = 4;
		const paletteStartX = 10;
		const paletteStartY = 8;

		if (relY >= paletteStartY && relY <= paletteStartY + swatchSize) {
			for (let i = 0; i < COLOR_PALETTE.length; i++) {
				const sx = paletteStartX + i * (swatchSize + swatchGap);

				if (mx >= sx && mx <= sx + swatchSize) {
					s.currentColor = COLOR_PALETTE[i];

					if (s.currentTool === "erase" || s.currentTool === "eyedropper") {
						s.currentTool = "draw";
					}

					return;
				}
			}
		}

		// Tool buttons: row at y = hudY + 42
		const toolY = 42;
		const toolBtnW = 80;
		const toolBtnH = 24;
		const toolGap = 8;
		const tools: Tool[] = ["draw", "erase", "fill", "eyedropper"];

		if (relY >= toolY && relY <= toolY + toolBtnH) {
			for (let i = 0; i < tools.length; i++) {
				const tx = 10 + i * (toolBtnW + toolGap);

				if (mx >= tx && mx <= tx + toolBtnW) {
					s.currentTool = tools[i];

					return;
				}
			}
		}

		// Grid size buttons: after tools
		const gridBtnStartX = 10 + tools.length * (toolBtnW + toolGap) + 20;
		const gridBtnW = 54;

		if (relY >= toolY && relY <= toolY + toolBtnH) {
			for (let i = 0; i < GRID_SIZES.length; i++) {
				const gx = gridBtnStartX + i * (gridBtnW + toolGap);

				if (mx >= gx && mx <= gx + gridBtnW) {
					this.onGridResize(GRID_SIZES[i]);

					return;
				}
			}
		}

		// Clear button: after grid sizes
		const clearBtnX =
			gridBtnStartX + GRID_SIZES.length * (gridBtnW + toolGap) + 20;
		const clearBtnW = 60;

		if (relY >= toolY && relY <= toolY + toolBtnH) {
			if (mx >= clearBtnX && mx <= clearBtnX + clearBtnW) {
				this.onClear();

				return;
			}
		}
	}
}
