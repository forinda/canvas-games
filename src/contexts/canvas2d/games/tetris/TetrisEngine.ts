import type { TetrisState } from "./types";
import { HS_KEY, createEmptyBoard } from "./types";
import { BoardSystem } from "./systems/BoardSystem";
import { PieceSystem } from "./systems/PieceSystem";
import { ScoreSystem } from "./systems/ScoreSystem";
import { InputSystem } from "./systems/InputSystem";
import { BoardRenderer } from "./renderers/BoardRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";

export class TetrisEngine {
	private ctx: CanvasRenderingContext2D;
	private state: TetrisState;
	private running = false;
	private rafId = 0;
	private lastTime = 0;

	private boardSystem: BoardSystem;
	private scoreSystem: ScoreSystem;
	private pieceSystem: PieceSystem;
	private inputSystem: InputSystem;
	private boardRenderer: BoardRenderer;
	private hudRenderer: HUDRenderer;
	private resizeHandler: () => void;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.ctx = canvas.getContext("2d")!;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		let hs = 0;

		try {
			hs = parseInt(localStorage.getItem(HS_KEY) ?? "0", 10) || 0;
		} catch {
			/* noop */
		}

		this.state = {
			board: createEmptyBoard(),
			currentPiece: null,
			nextPieceIndex: 0,
			score: 0,
			highScore: hs,
			level: 0,
			lines: 0,
			gameOver: false,
			paused: false,
			started: false,
			dropTimer: 0,
			lockTimer: 0,
			lockDelay: 500,
			isLocking: false,
			clearingLines: [],
			clearTimer: 0,
			clearDuration: 300,
			dasKey: null,
			dasTimer: 0,
			dasDelay: 170,
			dasInterval: 50,
			dasReady: false,
		};

		// Systems
		this.boardSystem = new BoardSystem();
		this.scoreSystem = new ScoreSystem();
		this.pieceSystem = new PieceSystem(this.boardSystem, this.scoreSystem);
		this.inputSystem = new InputSystem(
			this.state,
			canvas,
			onExit,
			() => this.reset(),
			this.pieceSystem,
		);
		this.boardRenderer = new BoardRenderer(this.boardSystem);
		this.hudRenderer = new HUDRenderer();

		// Initialize pieces
		this.pieceSystem.init(this.state);

		// Resize
		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
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

		// Update DAS
		if (this.state.started && !this.state.paused && !this.state.gameOver) {
			this.inputSystem.handleDAS(dt);
		}

		// Update game logic
		this.pieceSystem.update(this.state, dt);

		// Render
		this.boardRenderer.render(this.ctx, this.state);
		this.hudRenderer.render(this.ctx, this.state);

		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private reset(): void {
		const s = this.state;

		s.board = createEmptyBoard();
		s.currentPiece = null;
		s.score = 0;
		s.level = 0;
		s.lines = 0;
		s.gameOver = false;
		s.paused = false;
		s.started = true;
		s.dropTimer = 0;
		s.lockTimer = 0;
		s.isLocking = false;
		s.clearingLines = [];
		s.clearTimer = 0;
		s.dasKey = null;
		s.dasTimer = 0;
		s.dasReady = false;
		this.pieceSystem.init(s);
	}
}
