import type { FroggerState } from "./types";
import { COLS, ROWS, GOAL_SLOTS, HS_KEY } from "./types";
import { buildLanes } from "./data/levels";
import { InputSystem } from "./systems/InputSystem";
import { TrafficSystem } from "./systems/TrafficSystem";
import { RiverSystem } from "./systems/RiverSystem";
import { CollisionSystem } from "./systems/CollisionSystem";
import { GameRenderer } from "./renderers/GameRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";
import { HelpOverlay } from "@shared/HelpOverlay";
import type { GameHelp } from "@shared/GameInterface";

const GAME_HELP: GameHelp = {
	goal: "Guide the frog across traffic and rivers to reach all 5 lily pads.",
	controls: [
		{ key: "Arrow Keys / WASD", action: "Hop one cell" },
		{ key: "P", action: "Pause / resume" },
		{ key: "H", action: "Toggle help overlay" },
		{ key: "Space / Enter", action: "Restart after game over" },
		{ key: "ESC", action: "Exit to menu" },
	],
	tips: [
		"Time your hops — watch traffic patterns before moving",
		"On river lanes you must land on a log or you drown",
		"The frog rides logs automatically — watch out for screen edges",
		"Fill all 5 lily pads to clear the level",
		"Speed increases each level",
	],
};

export class FroggerEngine {
	private ctx: CanvasRenderingContext2D;
	private canvas: HTMLCanvasElement;
	private state: FroggerState;
	private running: boolean;
	private rafId: number;
	private lastTime: number;

	private inputSystem: InputSystem;
	private trafficSystem: TrafficSystem;
	private riverSystem: RiverSystem;
	private collisionSystem: CollisionSystem;
	private gameRenderer: GameRenderer;
	private hudRenderer: HUDRenderer;
	private helpOverlay: HelpOverlay;
	private resizeHandler: () => void;
	private helpKeyHandler: (e: KeyboardEvent) => void;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d")!;
		this.running = false;
		this.rafId = 0;
		this.lastTime = 0;

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		let hs = 0;

		try {
			hs = parseInt(localStorage.getItem(HS_KEY) ?? "0", 10) || 0;
		} catch {
			/* noop */
		}

		const cellW = canvas.width / COLS;
		const cellH = canvas.height / ROWS;
		const lanes = buildLanes(1);

		this.state = {
			frog: {
				col: Math.floor(COLS / 2),
				row: ROWS - 1,
				offsetX: 0,
				offsetY: 0,
				hopping: false,
				hopTimer: 0,
			},
			vehicles: [],
			logs: [],
			lilyPads: this.buildLilyPads(),
			lanes,
			lives: 3,
			score: 0,
			highScore: hs,
			level: 1,
			goalsReached: 0,
			cellW,
			cellH,
			canvasW: canvas.width,
			canvasH: canvas.height,
			paused: false,
			started: false,
			gameOver: false,
			dying: false,
			deathTimer: 0,
			levelComplete: false,
			levelCompleteTimer: 0,
		};

		// Systems
		this.trafficSystem = new TrafficSystem();
		this.riverSystem = new RiverSystem();
		this.collisionSystem = new CollisionSystem();
		this.inputSystem = new InputSystem(this.state, onExit, () => this.reset());
		this.gameRenderer = new GameRenderer();
		this.hudRenderer = new HUDRenderer();
		this.helpOverlay = new HelpOverlay();

		// Populate moving objects
		this.trafficSystem.populate(this.state);
		this.riverSystem.populate(this.state);

		// Resize handler
		this.resizeHandler = () => {
			this.canvas.width = window.innerWidth;
			this.canvas.height = window.innerHeight;
			this.state.canvasW = this.canvas.width;
			this.state.canvasH = this.canvas.height;
			this.state.cellW = this.canvas.width / COLS;
			this.state.cellH = this.canvas.height / ROWS;
			// Re-populate with new dimensions
			this.trafficSystem.populate(this.state);
			this.riverSystem.populate(this.state);
		};

		// Help key handler
		this.helpKeyHandler = (e: KeyboardEvent) => {
			if (e.key === "h" || e.key === "H") {
				this.helpOverlay.toggle();
			}
		};
	}

	start(): void {
		this.running = true;
		this.lastTime = performance.now();
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

		const now = performance.now();
		const dt = Math.min((now - this.lastTime) / 1000, 0.05); // seconds, capped

		this.lastTime = now;

		if (this.state.started && !this.state.paused && !this.state.gameOver) {
			this.update(dt);
		}

		this.render();
		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private update(dt: number): void {
		const s = this.state;

		// Level-complete countdown
		if (s.levelComplete) {
			s.levelCompleteTimer -= dt;

			if (s.levelCompleteTimer <= 0) {
				this.nextLevel();
			}

			return;
		}

		// Hop animation — lerp offset toward zero
		if (s.frog.hopping) {
			s.frog.hopTimer -= dt;

			if (s.frog.hopTimer <= 0) {
				s.frog.hopping = false;
				s.frog.hopTimer = 0;
				s.frog.offsetX = 0;
				s.frog.offsetY = 0;
			} else {
				const ratio = s.frog.hopTimer / 0.1;

				s.frog.offsetX =
					s.frog.offsetX > 0
						? Math.max(0, s.frog.offsetX * ratio)
						: Math.min(0, s.frog.offsetX * ratio);
				s.frog.offsetY =
					s.frog.offsetY > 0
						? Math.max(0, s.frog.offsetY * ratio)
						: Math.min(0, s.frog.offsetY * ratio);
			}
		}

		this.trafficSystem.update(s, dt);
		this.riverSystem.update(s, dt);
		this.collisionSystem.update(s, dt);
	}

	private render(): void {
		const ctx = this.ctx;

		ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);

		this.gameRenderer.render(ctx, this.state);
		this.hudRenderer.render(ctx, this.state);
		this.helpOverlay.render(ctx, GAME_HELP, "Frogger", "#4caf50");
	}

	private reset(): void {
		const s = this.state;

		s.level = 1;
		s.score = 0;
		s.lives = 3;
		s.goalsReached = 0;
		s.gameOver = false;
		s.dying = false;
		s.deathTimer = 0;
		s.paused = false;
		s.started = true;
		s.levelComplete = false;
		s.levelCompleteTimer = 0;
		s.lanes = buildLanes(1);
		s.lilyPads = this.buildLilyPads();
		s.frog.col = Math.floor(COLS / 2);
		s.frog.row = ROWS - 1;
		s.frog.offsetX = 0;
		s.frog.offsetY = 0;
		s.frog.hopping = false;
		s.frog.hopTimer = 0;
		this.trafficSystem.populate(s);
		this.riverSystem.populate(s);
	}

	private nextLevel(): void {
		const s = this.state;

		s.level++;
		s.goalsReached = 0;
		s.levelComplete = false;
		s.levelCompleteTimer = 0;
		s.dying = false;
		s.deathTimer = 0;
		s.lanes = buildLanes(s.level);
		s.lilyPads = this.buildLilyPads();
		s.frog.col = Math.floor(COLS / 2);
		s.frog.row = ROWS - 1;
		s.frog.offsetX = 0;
		s.frog.offsetY = 0;
		s.frog.hopping = false;
		s.frog.hopTimer = 0;
		this.trafficSystem.populate(s);
		this.riverSystem.populate(s);
	}

	private buildLilyPads(): FroggerState["lilyPads"] {
		const pads: FroggerState["lilyPads"] = [];
		const spacing = Math.floor(COLS / (GOAL_SLOTS + 1));

		for (let i = 1; i <= GOAL_SLOTS; i++) {
			pads.push({ col: i * spacing, occupied: false });
		}

		return pads;
	}
}
