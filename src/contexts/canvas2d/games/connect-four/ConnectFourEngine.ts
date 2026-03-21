import type { ConnectFourState, GameMode } from "./types.ts";
import type { GameHelp } from "@core/GameInterface";
import { HelpOverlay } from "@shared/HelpOverlay.ts";
import { COLS, ROWS } from "./types.ts";
import { InputSystem } from "./systems/InputSystem.ts";
import { BoardSystem } from "./systems/BoardSystem.ts";
import { AISystem } from "./systems/AISystem.ts";
import { BoardRenderer } from "./renderers/BoardRenderer.ts";
import { HUDRenderer } from "./renderers/HUDRenderer.ts";

const HELP: GameHelp = {
	goal: "Drop discs to connect four in a row horizontally, vertically, or diagonally.",
	controls: [
		{ key: "Click", action: "Drop a disc in the selected column" },
		{ key: "R", action: "Restart current game" },
		{ key: "M", action: "Change game mode" },
		{ key: "H", action: "Toggle help overlay" },
		{ key: "ESC", action: "Exit to menu" },
	],
	tips: [
		"Control the center column for a strategic advantage",
		"Try to build multiple threats at once",
		"Block your opponent before they connect four",
	],
};

export class ConnectFourEngine {
	private ctx: CanvasRenderingContext2D;
	private state: ConnectFourState;
	private running: boolean;
	private rafId: number;
	private lastTime: number;

	private inputSystem: InputSystem;
	private boardSystem: BoardSystem;
	private aiSystem: AISystem;
	private boardRenderer: BoardRenderer;
	private hudRenderer: HUDRenderer;
	private helpOverlay: HelpOverlay;
	private resizeHandler: () => void;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.ctx = canvas.getContext("2d")!;
		this.running = false;
		this.rafId = 0;
		this.lastTime = 0;

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		this.state = this.createInitialState(canvas.width, canvas.height);

		this.boardSystem = new BoardSystem();
		this.aiSystem = new AISystem();
		this.boardRenderer = new BoardRenderer();
		this.hudRenderer = new HUDRenderer();
		this.helpOverlay = new HelpOverlay();

		this.inputSystem = new InputSystem(
			canvas,
			this.state,
			onExit,
			(col: number) => this.onColumnClick(col),
			(mode: GameMode) => this.onModeSelect(mode),
			() => this.resetBoard(),
			() => this.helpOverlay.toggle(),
		);

		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			this.state.canvasWidth = canvas.width;
			this.state.canvasHeight = canvas.height;
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

		this.update(dt);
		this.render();

		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private update(dt: number): void {
		if (this.state.showModeSelect) return;

		this.boardSystem.update(this.state, dt);
		this.aiSystem.update(this.state, dt);

		// Process queued drops when no animation is active
		if (
			this.state.activeDrop === null &&
			this.state.dropQueue.length > 0 &&
			!this.state.gameOver
		) {
			const next = this.state.dropQueue.shift()!;

			this.boardSystem.dropDisc(this.state, next.col, next.player);
		}
	}

	private render(): void {
		this.boardRenderer.render(this.ctx, this.state);
		this.hudRenderer.render(this.ctx, this.state);
		this.helpOverlay.render(this.ctx, HELP, "Connect Four", "#e53935");
	}

	private onColumnClick(col: number): void {
		if (this.state.showModeSelect) return;

		if (this.state.gameOver) return;

		if (this.state.aiThinking) return;

		if (this.state.activeDrop !== null) return;

		if (this.state.mode === "ai" && this.state.currentPlayer === "yellow")
			return;

		this.boardSystem.dropDisc(this.state, col, this.state.currentPlayer);
	}

	private onModeSelect(mode: GameMode): void {
		this.state.mode = mode;
		this.state.showModeSelect = false;
		this.state.scoreRed = 0;
		this.state.scoreYellow = 0;
		this.state.draws = 0;
		this.resetBoard();
	}

	private resetBoard(): void {
		this.state.board = this.createEmptyBoard();
		this.state.currentPlayer = "red";
		this.state.winner = null;
		this.state.winLine = null;
		this.state.isDraw = false;
		this.state.gameOver = false;
		this.state.aiThinking = false;
		this.state.activeDrop = null;
		this.state.dropQueue = [];
		this.state.hoverCol = -1;
		this.aiSystem.reset();
	}

	private createInitialState(w: number, h: number): ConnectFourState {
		return {
			board: this.createEmptyBoard(),
			currentPlayer: "red",
			mode: "ai",
			winner: null,
			winLine: null,
			isDraw: false,
			gameOver: false,
			paused: false,
			scoreRed: 0,
			scoreYellow: 0,
			draws: 0,
			canvasWidth: w,
			canvasHeight: h,
			aiThinking: false,
			showModeSelect: true,
			hoverCol: -1,
			animationTime: 0,
			activeDrop: null,
			dropQueue: [],
		};
	}

	private createEmptyBoard(): null[][] {
		const board: null[][] = [];

		for (let r = 0; r < ROWS; r++) {
			const row: null[] = [];

			for (let c = 0; c < COLS; c++) {
				row.push(null);
			}

			board.push(row);
		}

		return board;
	}
}
