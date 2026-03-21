import type { GravityState } from "./types";
import { GAME_NAME, GAME_COLOR } from "./types";
import { InputSystem } from "./systems/InputSystem";
import { PhysicsSystem } from "./systems/PhysicsSystem";
import { LevelSystem } from "./systems/LevelSystem";
import { GameRenderer } from "./renderers/GameRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";
import { HelpOverlay } from "@shared/HelpOverlay";
import type { GameHelp } from "@core/GameInterface";

const HELP: GameHelp = {
	goal: "Guide the ball to the green exit by changing gravity direction.",
	controls: [
		{ key: "Arrow Keys / WASD", action: "Change gravity direction" },
		{ key: "R", action: "Restart current level" },
		{ key: "Space / Enter", action: "Next level (when complete)" },
		{ key: "H", action: "Toggle help overlay" },
		{ key: "ESC", action: "Exit to menu" },
	],
	tips: [
		"The ball rolls until it hits a wall.",
		"Plan your gravity flips ahead of time.",
		"Fewer moves = better mastery!",
		"Some levels require creative sequences.",
	],
};

export class GravityEngine {
	private ctx: CanvasRenderingContext2D;
	private state: GravityState;
	private running: boolean;
	private rafId: number;
	private lastTime: number;

	private inputSystem: InputSystem;
	private physicsSystem: PhysicsSystem;
	private levelSystem: LevelSystem;
	private gameRenderer: GameRenderer;
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

		// Initialize state with placeholder values — loadLevel fills them
		this.state = {
			gravity: "down",
			ball: { pos: { x: 0, y: 0 }, trail: [] },
			exit: { x: 0, y: 0 },
			wallSet: new Set<string>(),
			walls: [],
			gridWidth: 0,
			gridHeight: 0,
			level: 0,
			moves: 0,
			sliding: false,
			slideProgress: 0,
			slideFrom: { x: 0, y: 0 },
			slideTo: { x: 0, y: 0 },
			levelComplete: false,
			gameWon: false,
			canvasWidth: canvas.width,
			canvasHeight: canvas.height,
			queuedGravity: null,
			restartRequested: false,
			advanceRequested: false,
			completeTimer: 0,
			glowPhase: 0,
		};

		// Systems
		this.physicsSystem = new PhysicsSystem();
		this.levelSystem = new LevelSystem();
		this.helpOverlay = new HelpOverlay();

		this.inputSystem = new InputSystem(this.state, canvas, onExit, () =>
			this.helpOverlay.toggle(),
		);

		// Renderers
		this.gameRenderer = new GameRenderer();
		this.hudRenderer = new HUDRenderer();

		// Load first level
		this.levelSystem.loadLevel(this.state, 0);

		// Resize handler
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
		const dt = Math.min((now - this.lastTime) / 1000, 0.1);

		this.lastTime = now;

		this.tick(dt);
		this.render();

		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private tick(dt: number): void {
		this.physicsSystem.update(this.state, dt);
		this.levelSystem.update(this.state, dt);
	}

	private render(): void {
		this.gameRenderer.render(this.ctx, this.state);
		this.hudRenderer.render(this.ctx, this.state);
		this.helpOverlay.render(this.ctx, HELP, GAME_NAME, GAME_COLOR);
	}
}
