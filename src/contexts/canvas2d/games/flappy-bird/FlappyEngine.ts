import type { FlappyState } from "./types";
import {
	BIRD_RADIUS,
	BIRD_X_RATIO,
	GROUND_HEIGHT,
	HS_KEY,
	PIPE_SPEED,
} from "./types";
import { InputSystem } from "./systems/InputSystem";
import { BirdSystem } from "./systems/BirdSystem";
import { PipeSystem } from "./systems/PipeSystem";
import { CollisionSystem } from "./systems/CollisionSystem";
import { GameRenderer } from "./renderers/GameRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";

export class FlappyEngine {
	private ctx: CanvasRenderingContext2D;
	private state: FlappyState;
	private running = false;
	private rafId = 0;
	private lastTime = 0;

	private inputSystem: InputSystem;
	private birdSystem: BirdSystem;
	private pipeSystem: PipeSystem;
	private collisionSystem: CollisionSystem;
	private gameRenderer: GameRenderer;
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

		this.state = this.createInitialState(canvas.width, canvas.height, hs);

		// Systems
		this.birdSystem = new BirdSystem();
		this.pipeSystem = new PipeSystem();
		this.collisionSystem = new CollisionSystem();
		this.gameRenderer = new GameRenderer();
		this.hudRenderer = new HUDRenderer();
		this.inputSystem = new InputSystem(this.state, canvas, onExit, () =>
			this.reset(),
		);

		// Resize
		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			this.state.canvasW = canvas.width;
			this.state.canvasH = canvas.height;
			this.state.groundY = canvas.height - GROUND_HEIGHT;
			this.state.bird.x = canvas.width * BIRD_X_RATIO;
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
		const dt = Math.min(now - this.lastTime, 32); // Cap delta to ~30fps minimum

		this.lastTime = now;

		this.update(dt);
		this.render();

		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private update(dt: number): void {
		const s = this.state;

		// Scroll background and ground continuously (except when dead)
		if (s.phase !== "dead") {
			s.backgroundOffset += PIPE_SPEED * dt * 0.5;
			s.groundOffset += PIPE_SPEED * dt;
		}

		// Flash timer countdown
		if (s.flashTimer > 0) {
			s.flashTimer = Math.max(0, s.flashTimer - dt);
		}

		// Update systems
		this.birdSystem.update(s, dt);
		this.pipeSystem.update(s, dt);
		this.collisionSystem.update(s, dt);
	}

	private render(): void {
		this.ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);
		this.gameRenderer.render(this.ctx, this.state);
		this.hudRenderer.render(this.ctx, this.state);
	}

	private reset(): void {
		const hs = this.state.highScore;
		const w = this.state.canvasW;
		const h = this.state.canvasH;
		const newState = this.createInitialState(w, h, hs);

		newState.phase = "idle";

		// Copy into existing state object so InputSystem's reference stays valid
		Object.assign(this.state, newState);
	}

	private createInitialState(
		canvasW: number,
		canvasH: number,
		highScore: number,
	): FlappyState {
		const groundY = canvasH - GROUND_HEIGHT;

		return {
			bird: {
				x: canvasW * BIRD_X_RATIO,
				y: canvasH * 0.42,
				velocity: 0,
				rotation: 0,
				radius: BIRD_RADIUS,
				wingAngle: 0,
				wingDir: 1,
			},
			pipes: [],
			phase: "idle",
			score: 0,
			highScore,
			canvasW,
			canvasH,
			groundY,
			pipeTimer: 0,
			flashTimer: 0,
			backgroundOffset: 0,
			groundOffset: 0,
		};
	}
}
