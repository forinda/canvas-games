import type { SandState } from "./types";
import { GRID_W, GRID_H, CELL_SIZE } from "./types";
import { ParticleSystem } from "./systems/ParticleSystem";
import { InputSystem } from "./systems/InputSystem";
import { GameRenderer } from "./renderers/GameRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";
import { HelpOverlay } from "@shared/HelpOverlay";
import type { GameHelp } from "@shared/GameInterface";

const HELP: GameHelp = {
	goal: "Create and watch particles interact in a sandbox simulation.",
	controls: [
		{ key: "Click / Drag", action: "Place particles" },
		{ key: "1-5", action: "Select material type" },
		{ key: "[ / ]", action: "Decrease / increase brush size" },
		{ key: "C", action: "Clear all particles" },
		{ key: "P", action: "Pause / resume simulation" },
		{ key: "H", action: "Toggle help overlay" },
		{ key: "ESC", action: "Exit to menu" },
	],
	tips: [
		"Sand falls and piles up realistically",
		"Water flows and fills containers",
		"Fire rises and fades over time",
		"Stone is static — use it to build walls and containers",
		"Water + Fire = Steam!",
	],
};

export class SandEngine {
	private ctx: CanvasRenderingContext2D;
	private state: SandState;
	private running: boolean;
	private rafId: number;

	private particleSystem: ParticleSystem;
	private inputSystem: InputSystem;
	private gameRenderer: GameRenderer;
	private hudRenderer: HUDRenderer;
	private helpOverlay: HelpOverlay;
	private resizeHandler: () => void;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.ctx = canvas.getContext("2d")!;
		this.running = false;
		this.rafId = 0;

		canvas.width = GRID_W * CELL_SIZE;
		canvas.height = GRID_H * CELL_SIZE;

		this.state = {
			grid: new Array(GRID_W * GRID_H).fill(null),
			gridW: GRID_W,
			gridH: GRID_H,
			cellSize: CELL_SIZE,
			selectedType: "sand",
			particleCount: 0,
			paused: false,
			mouseDown: false,
			mouseX: -1,
			mouseY: -1,
			brushSize: 3,
		};

		this.particleSystem = new ParticleSystem();
		this.gameRenderer = new GameRenderer();
		this.hudRenderer = new HUDRenderer();
		this.helpOverlay = new HelpOverlay();

		this.inputSystem = new InputSystem(
			this.state,
			canvas,
			onExit,
			() => this.clearGrid(),
			() => this.helpOverlay.toggle(),
		);

		this.resizeHandler = () => {
			canvas.width = GRID_W * CELL_SIZE;
			canvas.height = GRID_H * CELL_SIZE;
		};

		this.inputSystem.attach();
		window.addEventListener("resize", this.resizeHandler);
	}

	start(): void {
		this.running = true;
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

		this.particleSystem.update(this.state, 16);
		this.gameRenderer.render(this.ctx, this.state);
		this.hudRenderer.render(this.ctx, this.state);
		this.helpOverlay.render(this.ctx, HELP, "Particle Sand", "#ffb74d");

		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private clearGrid(): void {
		const len = this.state.grid.length;

		for (let i = 0; i < len; i++) {
			this.state.grid[i] = null;
		}

		this.state.particleCount = 0;
	}
}
