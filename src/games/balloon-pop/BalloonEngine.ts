import type { BalloonState } from "./types";
import {
	MAX_LIVES,
	ROUND_DURATION,
	SPAWN_INTERVAL_BASE,
	HS_KEY,
} from "./types";
import { BalloonSystem } from "./systems/BalloonSystem";
import { ScoreSystem } from "./systems/ScoreSystem";
import { InputSystem } from "./systems/InputSystem";
import { GameRenderer } from "./renderers/GameRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";

export class BalloonEngine {
	private ctx: CanvasRenderingContext2D;
	private state: BalloonState;
	private running: boolean;
	private rafId: number;
	private lastFrame: number;

	private balloonSystem: BalloonSystem;
	private scoreSystem: ScoreSystem;
	private inputSystem: InputSystem;
	private gameRenderer: GameRenderer;
	private hudRenderer: HUDRenderer;
	private resizeHandler: () => void;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.ctx = canvas.getContext("2d")!;
		this.running = false;
		this.rafId = 0;
		this.lastFrame = 0;

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		let hs = 0;

		try {
			hs = parseInt(localStorage.getItem(HS_KEY) ?? "0", 10) || 0;
		} catch {
			/* noop */
		}

		this.state = this.createInitialState(hs);

		// Systems
		this.balloonSystem = new BalloonSystem(canvas.width, canvas.height);
		this.scoreSystem = new ScoreSystem();
		this.inputSystem = new InputSystem(this.state, canvas, onExit, () =>
			this.reset(),
		);
		this.gameRenderer = new GameRenderer();
		this.hudRenderer = new HUDRenderer();

		// Resize handler
		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			this.balloonSystem.resize(canvas.width, canvas.height);
		};

		this.inputSystem.attach();
		window.addEventListener("resize", this.resizeHandler);
	}

	start(): void {
		this.running = true;
		this.lastFrame = performance.now();
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
		const dt = Math.min(now - this.lastFrame, 100);

		this.lastFrame = now;

		this.update(dt);
		this.render();

		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private update(dt: number): void {
		// Always update score system (handles particles and timer)
		this.scoreSystem.update(this.state, dt);

		if (this.state.phase !== "playing" || this.state.paused) return;

		this.balloonSystem.update(this.state, dt);
	}

	private render(): void {
		this.gameRenderer.render(this.ctx, this.state);
		this.hudRenderer.render(this.ctx, this.state);
	}

	private reset(): void {
		const hs = this.state.highScore;

		Object.assign(this.state, this.createInitialState(hs));
		this.state.phase = "playing";
	}

	private createInitialState(highScore: number): BalloonState {
		return {
			balloons: [],
			score: 0,
			highScore: highScore,
			combo: 0,
			maxCombo: 0,
			comboTimer: 0,
			lives: MAX_LIVES,
			timeRemaining: ROUND_DURATION,
			phase: "ready",
			paused: false,
			particles: [],
			spawnTimer: 0,
			spawnInterval: SPAWN_INTERVAL_BASE,
			elapsed: 0,
		};
	}
}
