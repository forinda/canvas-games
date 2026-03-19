import type { WordSearchState } from "./types";
import { GRID_ROWS, GRID_COLS, GAME_COLOR } from "./types";
import { BoardSystem } from "./systems/BoardSystem";
import { InputSystem } from "./systems/InputSystem";
import { WordSystem } from "./systems/WordSystem";
import { BoardRenderer } from "./renderers/BoardRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";
import { HelpOverlay } from "@shared/HelpOverlay";
import type { GameHelp } from "@shared/GameInterface";

const HELP: GameHelp = {
	goal: "Find all hidden words in the letter grid by clicking and dragging.",
	controls: [
		{ key: "Click + Drag", action: "Select letters in a line" },
		{ key: "R", action: "New puzzle (random theme)" },
		{ key: "H", action: "Toggle help overlay" },
		{ key: "ESC", action: "Exit to menu" },
	],
	tips: [
		"Words can be horizontal, vertical, diagonal, or reversed",
		"Drag in the direction of the word to highlight it",
		"Found words stay highlighted with a colored line",
		"Check the word list on the right to see remaining words",
	],
};

export class WordSearchEngine {
	private ctx: CanvasRenderingContext2D;
	private state: WordSearchState;
	private running = false;
	private rafId = 0;
	private lastTime = 0;

	private boardSystem: BoardSystem;
	private wordSystem: WordSystem;
	private inputSystem: InputSystem;
	private boardRenderer: BoardRenderer;
	private hudRenderer: HUDRenderer;
	private helpOverlay: HelpOverlay;
	private resizeHandler: () => void;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.ctx = canvas.getContext("2d")!;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		this.state = {
			grid: [],
			rows: GRID_ROWS,
			cols: GRID_COLS,
			placedWords: [],
			selection: [],
			dragging: false,
			dragStart: null,
			pointerPos: null,
			status: "playing",
			timer: 0,
			theme: "",
			offsetX: 0,
			offsetY: 0,
			cellSize: 0,
			foundColors: new Map(),
		};

		this.boardSystem = new BoardSystem();
		this.wordSystem = new WordSystem();
		this.boardRenderer = new BoardRenderer();
		this.hudRenderer = new HUDRenderer();
		this.helpOverlay = new HelpOverlay();

		this.inputSystem = new InputSystem(
			this.state,
			canvas,
			this.wordSystem,
			onExit,
			() => this.reset(),
			() => this.helpOverlay.toggle(),
		);

		this.boardSystem.initBoard(this.state);
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

		this.boardSystem.update(this.state, dt);
		this.render();

		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private render(): void {
		this.boardRenderer.render(this.ctx, this.state);
		this.hudRenderer.render(this.ctx, this.state);
		this.helpOverlay.render(this.ctx, HELP, "Word Search", GAME_COLOR);
	}

	private reset(): void {
		this.wordSystem.reset();
		this.boardSystem.initBoard(this.state);
		this.computeLayout();
	}

	private computeLayout(): void {
		const W = this.ctx.canvas.width;
		const H = this.ctx.canvas.height;
		const topPad = 42;
		const bottomPad = 30;
		const sidePad = 20;
		// Reserve space for word list on the right
		const wordListWidth = Math.min(160, W * 0.2);

		const availW = W - sidePad * 2 - wordListWidth;
		const availH = H - topPad - bottomPad;

		const cellW = Math.floor(availW / this.state.cols);
		const cellH = Math.floor(availH / this.state.rows);

		this.state.cellSize = Math.max(16, Math.min(cellW, cellH, 50));

		const boardW = this.state.cols * this.state.cellSize;
		const boardH = this.state.rows * this.state.cellSize;

		// Center board in available space (left of word list)
		this.state.offsetX = Math.floor((W - wordListWidth - boardW) / 2);
		this.state.offsetY = Math.floor(topPad + (availH - boardH) / 2);
	}
}
