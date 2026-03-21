import type { SudokuState, Difficulty } from "./types";
import { GRID } from "./types";
import { BoardSystem } from "./systems/BoardSystem";
import { InputSystem } from "./systems/InputSystem";
import { BoardRenderer } from "./renderers/BoardRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";
import { HelpOverlay } from "@shared/HelpOverlay";
import type { GameHelp } from "@core/GameInterface";

export class SudokuEngine {
	private ctx: CanvasRenderingContext2D;
	private state: SudokuState;
	private running = false;
	private rafId = 0;
	private lastTime = 0;

	private boardSystem: BoardSystem;
	private inputSystem: InputSystem;
	private boardRenderer: BoardRenderer;
	private hudRenderer: HUDRenderer;
	private helpOverlay: HelpOverlay;
	private helpData: GameHelp;
	private resizeHandler!: () => void;
	private helpKeyHandler!: (e: KeyboardEvent) => void;

	constructor(
		canvas: HTMLCanvasElement,
		onExit: () => void,
		helpData: GameHelp,
	) {
		this.ctx = canvas.getContext("2d")!;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		this.helpData = helpData;
		this.helpOverlay = new HelpOverlay();

		const defaultDifficulty: Difficulty = "easy";

		this.state = {
			board: [],
			solution: [],
			difficulty: defaultDifficulty,
			status: "playing",
			selectedRow: -1,
			selectedCol: -1,
			notesMode: false,
			timer: 0,
			undoStack: [],
			offsetX: 0,
			offsetY: 0,
			cellSize: 0,
			hudHeight: 44,
		};

		this.boardSystem = new BoardSystem();
		this.boardRenderer = new BoardRenderer();
		this.hudRenderer = new HUDRenderer();
		this.inputSystem = new InputSystem(
			this.state,
			canvas,
			this.boardSystem,
			() => {
				// Wrap onExit to check for help overlay first
				if (this.helpOverlay.visible) {
					this.helpOverlay.hide();
				} else {
					onExit();
				}
			},
			(diff?: Difficulty) => this.reset(diff),
		);

		this.helpKeyHandler = (e: KeyboardEvent) => {
			if (e.key === "h" || e.key === "H") {
				this.helpOverlay.toggle();
			}
		};

		this.boardSystem.initBoard(this.state);
		this.computeLayout();

		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			this.computeLayout();
		};

		this.inputSystem.attach();
		window.addEventListener("resize", this.resizeHandler);
		window.addEventListener("keydown", this.helpKeyHandler);
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
		window.removeEventListener("keydown", this.helpKeyHandler);
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
		this.helpOverlay.render(this.ctx, this.helpData, "Sudoku", "#7e57c2");
	}

	private reset(difficulty?: Difficulty): void {
		if (difficulty && difficulty !== this.state.difficulty) {
			this.state.difficulty = difficulty;
		}

		this.boardSystem.initBoard(this.state);
		this.computeLayout();
	}

	private computeLayout(): void {
		const W = this.ctx.canvas.width;
		const H = this.ctx.canvas.height;
		const hudTop = this.state.hudHeight;
		const padding = 20;
		const bottomPad = 80; // space for number pad + hints

		const availW = W - padding * 2;
		const availH = H - hudTop - bottomPad - padding;

		const cellSize = Math.max(
			16,
			Math.min(Math.floor(availW / GRID), Math.floor(availH / GRID), 50),
		);

		this.state.cellSize = cellSize;

		const boardW = GRID * cellSize;
		const boardH = GRID * cellSize;

		this.state.offsetX = Math.floor((W - boardW) / 2);
		this.state.offsetY = Math.floor(hudTop + (availH - boardH) / 2);
	}
}
