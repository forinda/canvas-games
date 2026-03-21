import type { MemoryState, Difficulty } from "./types";
import { DIFFICULTIES, GAME_COLOR } from "./types";
import { BoardSystem } from "./systems/BoardSystem";
import { InputSystem } from "./systems/InputSystem";
import { ScoreSystem } from "./systems/ScoreSystem";
import { BoardRenderer } from "./renderers/BoardRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";
import { HelpOverlay } from "@shared/HelpOverlay";
import type { GameHelp } from "@core/GameInterface";

const HELP: GameHelp = {
	goal: "Find all matching pairs of cards in as few moves and as little time as possible.",
	controls: [
		{ key: "Click", action: "Flip a card" },
		{
			key: "\u2190 / \u2192",
			action: "Change difficulty (before start / after win)",
		},
		{ key: "R", action: "Restart current game" },
		{ key: "P", action: "Pause / Resume" },
		{ key: "H", action: "Toggle help overlay" },
		{ key: "Space", action: "Start / Play again after win" },
		{ key: "ESC", action: "Exit to menu" },
	],
	tips: [
		"Start by flipping cards systematically to memorise positions",
		"Focus on remembering unmatched cards rather than random clicking",
		"Try harder difficulties once you master the smaller grids",
	],
};

/**
 * Game loop orchestrator for Memory Match.
 * Owns the state, systems, and renderers.
 */
export class MemoryEngine {
	private ctx: CanvasRenderingContext2D;
	private state: MemoryState;
	private running = false;
	private rafId = 0;
	private lastTime = 0;

	private boardSystem: BoardSystem;
	private inputSystem: InputSystem;
	private scoreSystem: ScoreSystem;
	private boardRenderer: BoardRenderer;
	private hudRenderer: HUDRenderer;
	private helpOverlay: HelpOverlay;
	private resizeHandler: () => void;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.ctx = canvas.getContext("2d")!;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		const difficulty: Difficulty = "4x4";
		const config = DIFFICULTIES[difficulty];

		this.state = {
			board: [],
			rows: config.rows,
			cols: config.cols,
			cellSize: 0,
			boardOffsetX: 0,
			boardOffsetY: 0,
			difficulty,
			phase: "idle",
			firstPick: null,
			secondPick: null,
			revealTimer: 0,
			moves: 0,
			pairsFound: 0,
			totalPairs: 0,
			elapsedTime: 0,
			timerRunning: false,
			bestMoves: null,
			bestTime: null,
			paused: false,
			started: false,
			gameOver: false,
			canvasW: canvas.width,
			canvasH: canvas.height,
		};

		this.boardSystem = new BoardSystem();
		this.scoreSystem = new ScoreSystem();
		this.helpOverlay = new HelpOverlay();
		this.boardRenderer = new BoardRenderer();
		this.hudRenderer = new HUDRenderer();

		this.recalcLayout(canvas);
		this.boardSystem.initBoard(this.state);
		this.scoreSystem.loadBest(this.state);

		this.inputSystem = new InputSystem(
			this.state,
			canvas,
			this.boardSystem,
			onExit,
			() => this.reset(),
			() => this.helpOverlay.toggle(),
			(dir: number) => this.changeDifficulty(dir),
		);

		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			this.recalcLayout(canvas);
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

		if (this.state.started && !this.state.paused) {
			this.boardSystem.update(this.state, dt);
			this.scoreSystem.update(this.state, dt);
		}

		this.render();
		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private render(): void {
		const { ctx, state } = this;
		const W = state.canvasW;
		const H = state.canvasH;

		// Clear
		ctx.fillStyle = "#0f0f1a";
		ctx.fillRect(0, 0, W, H);

		this.boardRenderer.render(ctx, state);
		this.hudRenderer.render(ctx, state);
		this.helpOverlay.render(ctx, HELP, "Memory Match", GAME_COLOR);
	}

	private reset(): void {
		const canvas = this.ctx.canvas;

		this.recalcLayout(canvas);
		this.boardSystem.initBoard(this.state);
		this.scoreSystem.loadBest(this.state);
		this.state.started = false;
	}

	private changeDifficulty(dir: number): void {
		const keys = this.boardSystem.getDifficultyKeys();
		const currentIdx = keys.indexOf(this.state.difficulty);
		const nextIdx = (currentIdx + dir + keys.length) % keys.length;

		this.state.difficulty = keys[nextIdx];
		this.reset();
	}

	private recalcLayout(canvas: HTMLCanvasElement): void {
		const s = this.state;

		s.canvasW = canvas.width;
		s.canvasH = canvas.height;

		const config = DIFFICULTIES[s.difficulty];
		const maxCellW = Math.floor((canvas.width - 60) / config.cols);
		const maxCellH = Math.floor((canvas.height - 120) / config.rows);

		s.cellSize = Math.min(maxCellW, maxCellH, 110);

		const boardW = config.cols * s.cellSize;
		const boardH = config.rows * s.cellSize;

		s.boardOffsetX = (canvas.width - boardW) / 2;
		s.boardOffsetY = (canvas.height - boardH) / 2 + 24;
	}
}
