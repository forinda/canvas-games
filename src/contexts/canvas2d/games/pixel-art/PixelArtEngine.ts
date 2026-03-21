import type { PixelArtState, GridSize } from "./types";
import { DEFAULT_GRID_SIZE, COLOR_PALETTE, createEmptyGrid } from "./types";
import { InputSystem } from "./systems/InputSystem";
import { DrawSystem } from "./systems/DrawSystem";
import { GameRenderer } from "./renderers/GameRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";
import { HelpOverlay } from "@shared/HelpOverlay";
import type { GameHelp } from "@core/GameInterface";

export class PixelArtEngine {
	private ctx: CanvasRenderingContext2D;
	private state: PixelArtState;
	private running: boolean;
	private rafId: number;

	private inputSystem: InputSystem;
	private drawSystem: DrawSystem;
	private gameRenderer: GameRenderer;
	private hudRenderer: HUDRenderer;
	private helpOverlay: HelpOverlay;
	private help: GameHelp;
	private resizeHandler: () => void;
	private helpKeyHandler: (e: KeyboardEvent) => void;

	constructor(canvas: HTMLCanvasElement, onExit: () => void, help: GameHelp) {
		this.ctx = canvas.getContext("2d")!;
		this.running = false;
		this.rafId = 0;
		this.help = help;

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		this.state = {
			grid: createEmptyGrid(DEFAULT_GRID_SIZE),
			gridSize: DEFAULT_GRID_SIZE,
			currentTool: "draw",
			currentColor: COLOR_PALETTE[0],
			hoverX: -1,
			hoverY: -1,
			hoverActive: false,
			isDrawing: false,
			canvasWidth: canvas.width,
			canvasHeight: canvas.height,
		};

		this.drawSystem = new DrawSystem();
		this.gameRenderer = new GameRenderer();
		this.hudRenderer = new HUDRenderer();
		this.helpOverlay = new HelpOverlay();

		this.inputSystem = new InputSystem(
			canvas,
			this.state,
			onExit,
			() => this.clearGrid(),
			(size: number) => this.resizeGrid(size as GridSize),
		);

		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			this.state.canvasWidth = canvas.width;
			this.state.canvasHeight = canvas.height;
		};

		this.helpKeyHandler = (e: KeyboardEvent) => {
			if (e.key === "h" || e.key === "H") {
				this.helpOverlay.toggle();
			}
		};
	}

	start(): void {
		this.running = true;
		this.inputSystem.attach();
		window.addEventListener("resize", this.resizeHandler);
		window.addEventListener("keydown", this.helpKeyHandler);
		this.loop();
	}

	destroy(): void {
		this.running = false;
		cancelAnimationFrame(this.rafId);
		this.inputSystem.detach();
		window.removeEventListener("resize", this.resizeHandler);
		window.removeEventListener("keydown", this.helpKeyHandler);
	}

	private loop(): void {
		if (!this.running) return;

		this.drawSystem.update(this.state, 0);
		this.gameRenderer.render(this.ctx, this.state);
		this.hudRenderer.render(this.ctx, this.state);
		this.helpOverlay.render(this.ctx, this.help, "Pixel Art", "#9c27b0");

		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private clearGrid(): void {
		this.state.grid = createEmptyGrid(this.state.gridSize);
	}

	private resizeGrid(size: GridSize): void {
		this.state.gridSize = size;
		this.state.grid = createEmptyGrid(size);
	}
}
