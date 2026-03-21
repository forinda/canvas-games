import type { PipeState } from "./types";
import type { GameHelp } from "@core/GameInterface";
import { gridSizeForLevel, GAME_COLOR } from "./types";
import { generateLevel } from "./data/levels";
import { InputSystem } from "./systems/InputSystem";
import { FlowSystem } from "./systems/FlowSystem";
import { BoardRenderer } from "./renderers/BoardRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";
import { HelpOverlay } from "@shared/HelpOverlay";

export class PipeEngine {
	private ctx: CanvasRenderingContext2D;
	private state: PipeState;
	private running = false;
	private rafId = 0;
	private lastTime = 0;

	private inputSystem: InputSystem;
	private flowSystem: FlowSystem;
	private boardRenderer: BoardRenderer;
	private hudRenderer: HUDRenderer;
	private helpOverlay: HelpOverlay;
	private help: GameHelp;
	private resizeHandler: () => void;

	constructor(canvas: HTMLCanvasElement, onExit: () => void, help: GameHelp) {
		this.ctx = canvas.getContext("2d")!;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		this.help = help;

		const size = gridSizeForLevel(1);

		this.state = {
			grid: [],
			cols: size,
			rows: size,
			level: 1,
			moves: 0,
			timer: 0,
			status: "playing",
			offsetX: 0,
			offsetY: 0,
			cellSize: 0,
			sourceRow: 0,
			sourceCol: 0,
			drainRow: size - 1,
			drainCol: size - 1,
		};

		this.flowSystem = new FlowSystem();
		this.boardRenderer = new BoardRenderer();
		this.hudRenderer = new HUDRenderer();
		this.helpOverlay = new HelpOverlay();

		this.inputSystem = new InputSystem(
			this.state,
			canvas,
			onExit,
			() => this.reset(),
			() => this.nextLevel(),
			() => this.helpOverlay.toggle(),
		);

		generateLevel(this.state);
		this.computeLayout();

		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			this.computeLayout();
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

		this.flowSystem.update(this.state, dt);
		this.render();

		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private render(): void {
		this.boardRenderer.render(this.ctx, this.state);
		this.hudRenderer.render(this.ctx, this.state);
		this.helpOverlay.render(this.ctx, this.help, "Pipe Connect", GAME_COLOR);
	}

	private reset(): void {
		generateLevel(this.state);
		this.computeLayout();
		this.inputSystem.setState(this.state);
	}

	private nextLevel(): void {
		this.state.level++;
		generateLevel(this.state);
		this.computeLayout();
		this.inputSystem.setState(this.state);
	}

	private computeLayout(): void {
		const W = this.ctx.canvas.width;
		const H = this.ctx.canvas.height;
		const hudHeight = 50;
		const padding = 20;

		const availW = W - padding * 2;
		const availH = H - hudHeight - padding * 2;

		const cellW = Math.floor(availW / this.state.cols);
		const cellH = Math.floor(availH / this.state.rows);

		this.state.cellSize = Math.max(16, Math.min(cellW, cellH, 60));

		const boardW = this.state.cols * this.state.cellSize;
		const boardH = this.state.rows * this.state.cellSize;

		this.state.offsetX = Math.floor((W - boardW) / 2);
		this.state.offsetY = Math.floor(hudHeight + (H - hudHeight - boardH) / 2);
	}
}
