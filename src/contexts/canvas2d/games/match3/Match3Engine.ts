import type { Match3State } from "./types";
import { ROWS, COLS, MAX_MOVES, HS_KEY } from "./types";
import { BoardSystem } from "./systems/BoardSystem";
import { InputSystem } from "./systems/InputSystem";
import { AnimationSystem } from "./systems/AnimationSystem";
import { ScoreSystem } from "./systems/ScoreSystem";
import { BoardRenderer } from "./renderers/BoardRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";
import { HelpOverlay } from "@shared/HelpOverlay";
import type { GameHelp } from "@core/GameInterface";

const GAME_COLOR = "#e91e63";

const HELP: GameHelp = {
	goal: "Swap adjacent gems to create lines of 3+ matching colours.",
	controls: [
		{ key: "Click", action: "Select a gem" },
		{ key: "Click adjacent", action: "Swap two gems" },
		{ key: "P", action: "Pause / Resume" },
		{ key: "H", action: "Toggle help overlay" },
		{ key: "Space", action: "Restart after game over" },
		{ key: "ESC", action: "Exit to menu" },
	],
	tips: [
		"Chain cascading combos for massive score multipliers",
		"Plan swaps near the bottom — gravity creates more cascades",
		"You have 30 moves per round, make each one count",
	],
};

export class Match3Engine {
	private ctx: CanvasRenderingContext2D;
	private state: Match3State;
	private running = false;
	private rafId = 0;
	private lastTime = 0;

	private boardSystem: BoardSystem;
	private inputSystem: InputSystem;
	private animationSystem: AnimationSystem;
	private scoreSystem: ScoreSystem;
	private boardRenderer: BoardRenderer;
	private hudRenderer: HUDRenderer;
	private helpOverlay: HelpOverlay;
	private resizeHandler: () => void;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.ctx = canvas.getContext("2d")!;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		const cellSize = Math.floor(
			Math.min((canvas.width - 80) / COLS, (canvas.height - 120) / ROWS),
		);
		const boardW = COLS * cellSize;
		const boardH = ROWS * cellSize;

		let hs = 0;

		try {
			hs = parseInt(localStorage.getItem(HS_KEY) ?? "0", 10) || 0;
		} catch {
			/* noop */
		}

		this.state = {
			board: [],
			rows: ROWS,
			cols: COLS,
			cellSize,
			boardOffsetX: (canvas.width - boardW) / 2,
			boardOffsetY: (canvas.height - boardH) / 2 + 24,
			selected: null,
			swapA: null,
			swapB: null,
			phase: "idle",
			phaseTimer: 0,
			score: 0,
			highScore: hs,
			combo: 0,
			movesLeft: MAX_MOVES,
			maxMoves: MAX_MOVES,
			matched: new Set(),
			paused: false,
			started: false,
			gameOver: false,
			canvasW: canvas.width,
			canvasH: canvas.height,
		};

		// Systems
		this.boardSystem = new BoardSystem();
		this.animationSystem = new AnimationSystem();
		this.scoreSystem = new ScoreSystem();
		this.helpOverlay = new HelpOverlay();

		// Init board (must happen after state is set up with cellSize/offsets)
		this.boardSystem.initBoard(this.state);

		this.inputSystem = new InputSystem(
			this.state,
			canvas,
			this.boardSystem,
			onExit,
			() => this.reset(),
			() => this.helpOverlay.toggle(),
		);

		this.boardRenderer = new BoardRenderer();
		this.hudRenderer = new HUDRenderer();

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
			this.animationSystem.update(this.state, dt);
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
		this.helpOverlay.render(ctx, HELP, "Match-3", GAME_COLOR);
	}

	private reset(): void {
		const s = this.state;

		s.score = 0;
		s.movesLeft = MAX_MOVES;
		s.combo = 0;
		s.phase = "idle";
		s.phaseTimer = 0;
		s.selected = null;
		s.swapA = null;
		s.swapB = null;
		s.matched.clear();
		s.gameOver = false;
		s.started = true;
		this.scoreSystem.reset();
		this.boardSystem.initBoard(s);
	}

	private recalcLayout(canvas: HTMLCanvasElement): void {
		const s = this.state;

		s.canvasW = canvas.width;
		s.canvasH = canvas.height;
		s.cellSize = Math.floor(
			Math.min((canvas.width - 80) / COLS, (canvas.height - 120) / ROWS),
		);
		const boardW = COLS * s.cellSize;
		const boardH = ROWS * s.cellSize;

		s.boardOffsetX = (canvas.width - boardW) / 2;
		s.boardOffsetY = (canvas.height - boardH) / 2 + 24;

		// Snap all gems to new positions
		for (let r = 0; r < ROWS; r++) {
			for (let c = 0; c < COLS; c++) {
				const gem = s.board[r]?.[c];

				if (gem) {
					gem.x = s.boardOffsetX + c * s.cellSize + s.cellSize / 2;
					gem.y = s.boardOffsetY + r * s.cellSize + s.cellSize / 2;
				}
			}
		}
	}
}
