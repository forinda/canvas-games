import type { GameHelp } from "@core/GameInterface";
import type { BrickBuilderState } from "./types";
import {
	CELL_SIZE,
	GRID_COLS,
	GRID_ROWS,
	HUD_HEIGHT,
	createInitialState,
} from "./types";
import { BuildSystem } from "./systems/BuildSystem";
import { InputSystem } from "./systems/InputSystem";
import { GameRenderer } from "./renderers/GameRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";

export class BrickBuilderEngine {
	private ctx: CanvasRenderingContext2D;
	private state: BrickBuilderState;
	private running: boolean;
	private rafId: number;
	private lastTime: number;

	private buildSystem: BuildSystem;
	private inputSystem: InputSystem;
	private gameRenderer: GameRenderer;
	private hudRenderer: HUDRenderer;
	private resizeHandler: () => void;

	constructor(
		canvas: HTMLCanvasElement,
		onExit: () => void,
		helpData: GameHelp,
	) {
		this.ctx = canvas.getContext("2d")!;
		this.running = false;
		this.rafId = 0;
		this.lastTime = 0;

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		this.state = createInitialState();
		this.state.canvasWidth = canvas.width;
		this.state.canvasHeight = canvas.height;
		this.computeGridOffset();

		// Systems
		this.buildSystem = new BuildSystem();
		this.inputSystem = new InputSystem(
			this.state,
			canvas,
			onExit,
			this.buildSystem,
		);

		// Renderers
		this.gameRenderer = new GameRenderer();
		this.hudRenderer = new HUDRenderer(helpData);

		// Resize handler
		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			this.state.canvasWidth = canvas.width;
			this.state.canvasHeight = canvas.height;
			this.computeGridOffset();
		};

		this.inputSystem.attach();
		window.addEventListener("resize", this.resizeHandler);
	}

	start(): void {
		this.running = true;
		this.lastTime = performance.now();
		this.loop();
	}

	destroy(): void {
		this.running = false;
		cancelAnimationFrame(this.rafId);
		this.inputSystem.detach();
		window.removeEventListener("resize", this.resizeHandler);
	}

	private loop(): void {
		if (!this.running) return;

		const now = performance.now();
		const dt = now - this.lastTime;

		this.lastTime = now;

		// Update
		this.buildSystem.update(this.state, dt);

		// Render
		this.gameRenderer.render(this.ctx, this.state);
		this.hudRenderer.render(this.ctx, this.state);

		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private computeGridOffset(): void {
		const gridW = GRID_COLS * CELL_SIZE;
		const gridH = GRID_ROWS * CELL_SIZE;
		const availW = this.state.canvasWidth - 200; // reserve space for palette
		const availH = this.state.canvasHeight - HUD_HEIGHT;

		this.state.gridOffsetX = Math.max(16, (availW - gridW) / 2);
		this.state.gridOffsetY = HUD_HEIGHT + Math.max(16, (availH - gridH) / 2);
	}
}
