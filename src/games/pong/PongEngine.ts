import type { PongState } from "./types";
import {
	PADDLE_WIDTH,
	PADDLE_HEIGHT,
	PADDLE_MARGIN,
	BALL_RADIUS,
	BALL_BASE_SPEED,
} from "./types";
import { InputSystem } from "./systems/InputSystem";
import { PhysicsSystem } from "./systems/PhysicsSystem";
import { AISystem } from "./systems/AISystem";
import { ScoreSystem } from "./systems/ScoreSystem";
import { GameRenderer } from "./renderers/GameRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";

export class PongEngine {
	private ctx: CanvasRenderingContext2D;
	private state: PongState;
	private running = false;
	private rafId = 0;
	private lastTime = 0;

	private inputSystem: InputSystem;
	private physicsSystem: PhysicsSystem;
	private aiSystem: AISystem;
	private scoreSystem: ScoreSystem;
	private gameRenderer: GameRenderer;
	private hudRenderer: HUDRenderer;
	private resizeHandler: () => void;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.ctx = canvas.getContext("2d")!;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		const W = canvas.width;
		const H = canvas.height;

		this.state = {
			phase: "mode-select",
			mode: "ai",
			leftPaddle: {
				x: PADDLE_MARGIN,
				y: H / 2 - PADDLE_HEIGHT / 2,
				w: PADDLE_WIDTH,
				h: PADDLE_HEIGHT,
				dy: 0,
			},
			rightPaddle: {
				x: W - PADDLE_MARGIN - PADDLE_WIDTH,
				y: H / 2 - PADDLE_HEIGHT / 2,
				w: PADDLE_WIDTH,
				h: PADDLE_HEIGHT,
				dy: 0,
			},
			ball: this.createBall(W, H),
			leftScore: 0,
			rightScore: 0,
			winner: null,
			canvasW: W,
			canvasH: H,
			rallyHits: 0,
			showHelp: false,
		};

		// Systems
		this.physicsSystem = new PhysicsSystem();
		this.aiSystem = new AISystem();
		this.scoreSystem = new ScoreSystem();
		this.inputSystem = new InputSystem(
			this.state,
			onExit,
			() => this.restart(),
			() => this.goToModeSelect(),
		);

		// Renderers
		this.gameRenderer = new GameRenderer();
		this.hudRenderer = new HUDRenderer();

		// Resize
		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			this.state.canvasW = canvas.width;
			this.state.canvasH = canvas.height;
			this.state.rightPaddle.x = canvas.width - PADDLE_MARGIN - PADDLE_WIDTH;
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

	// ── Private ──────────────────────────────────────────────────────────────

	private loop(): void {
		if (!this.running) return;

		const now = performance.now();
		const rawDt = (now - this.lastTime) / 1000;
		const dt = Math.min(rawDt, 0.05);

		this.lastTime = now;

		if (this.state.phase === "playing") {
			this.inputSystem.applyInput();
			this.aiSystem.update(this.state, dt);
			this.physicsSystem.update(this.state, dt);
			this.scoreSystem.update(this.state, dt);
		}

		this.render();
		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private render(): void {
		this.gameRenderer.render(this.ctx, this.state);
		this.hudRenderer.render(this.ctx, this.state);
	}

	private restart(): void {
		const s = this.state;

		s.leftScore = 0;
		s.rightScore = 0;
		s.winner = null;
		s.rallyHits = 0;
		s.leftPaddle.y = s.canvasH / 2 - PADDLE_HEIGHT / 2;
		s.rightPaddle.y = s.canvasH / 2 - PADDLE_HEIGHT / 2;
		s.ball = this.createBall(s.canvasW, s.canvasH);
		s.phase = "playing";
	}

	private goToModeSelect(): void {
		const s = this.state;

		s.leftScore = 0;
		s.rightScore = 0;
		s.winner = null;
		s.rallyHits = 0;
		s.leftPaddle.y = s.canvasH / 2 - PADDLE_HEIGHT / 2;
		s.rightPaddle.y = s.canvasH / 2 - PADDLE_HEIGHT / 2;
		s.ball = this.createBall(s.canvasW, s.canvasH);
		s.phase = "mode-select";
	}

	private createBall(W: number, H: number): PongState["ball"] {
		const dir = Math.random() < 0.5 ? -1 : 1;
		const angle = ((Math.random() - 0.5) * Math.PI) / 3;

		return {
			x: W / 2,
			y: H / 2,
			vx: dir * Math.cos(angle) * BALL_BASE_SPEED,
			vy: Math.sin(angle) * BALL_BASE_SPEED,
			radius: BALL_RADIUS,
			speed: BALL_BASE_SPEED,
			trail: [],
		};
	}
}
