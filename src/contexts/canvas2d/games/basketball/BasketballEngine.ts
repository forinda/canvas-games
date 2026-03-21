import type { BasketballState } from "./types";
import {
	BALL_RADIUS,
	RIM_WIDTH,
	BACKBOARD_HEIGHT,
	BACKBOARD_WIDTH,
	NET_HEIGHT,
	SHOT_CLOCK_DURATION,
	HS_KEY,
} from "./types";
import { InputSystem } from "./systems/InputSystem";
import { PhysicsSystem } from "./systems/PhysicsSystem";
import { ScoreSystem } from "./systems/ScoreSystem";
import { GameRenderer } from "./renderers/GameRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";
import { HelpOverlay } from "@shared/HelpOverlay";
import type { GameHelp } from "@core/GameInterface";

export class BasketballEngine {
	private ctx: CanvasRenderingContext2D;
	private state: BasketballState;
	private running: boolean;
	private rafId: number;
	private lastTime: number;

	private inputSystem: InputSystem;
	private physicsSystem: PhysicsSystem;
	private scoreSystem: ScoreSystem;
	private gameRenderer: GameRenderer;
	private hudRenderer: HUDRenderer;
	private helpOverlay: HelpOverlay;
	private helpData: GameHelp;
	private resizeHandler: () => void;
	private helpKeyHandler: (e: KeyboardEvent) => void;

	constructor(
		canvas: HTMLCanvasElement,
		onExit: () => void,
		helpData: GameHelp,
	) {
		this.running = false;
		this.rafId = 0;
		this.lastTime = 0;
		this.helpData = helpData;

		this.ctx = canvas.getContext("2d")!;

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		let bestScore = 0;

		try {
			bestScore = parseInt(localStorage.getItem(HS_KEY) ?? "0", 10) || 0;
		} catch {
			/* noop */
		}

		this.state = {
			phase: "start",
			ball: {
				x: canvas.width * 0.5,
				y: canvas.height - BALL_RADIUS - 40,
				vx: 0,
				vy: 0,
				rotation: 0,
				inFlight: false,
			},
			hoop: {
				x: canvas.width * 0.6,
				y: canvas.height * 0.3,
				rimWidth: RIM_WIDTH,
				backboardHeight: BACKBOARD_HEIGHT,
				backboardWidth: BACKBOARD_WIDTH,
				netHeight: NET_HEIGHT,
			},
			aim: {
				dragging: false,
				startX: 0,
				startY: 0,
				currentX: 0,
				currentY: 0,
			},
			particles: [],
			score: 0,
			bestScore: bestScore,
			streak: 0,
			shotClock: SHOT_CLOCK_DURATION,
			shotClockMax: SHOT_CLOCK_DURATION,
			canvasW: canvas.width,
			canvasH: canvas.height,
			lastScoredTime: 0,
			showSwish: false,
			madeShot: false,
			ballPassedRim: false,
		};

		// Systems
		this.physicsSystem = new PhysicsSystem();
		this.scoreSystem = new ScoreSystem();
		this.inputSystem = new InputSystem(
			this.state,
			canvas,
			onExit,
			() => this.reset(),
			(vx: number, vy: number) => this.shoot(vx, vy),
		);

		// Renderers
		this.gameRenderer = new GameRenderer();
		this.hudRenderer = new HUDRenderer();
		this.helpOverlay = new HelpOverlay();

		// Resize handler
		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			this.state.canvasW = canvas.width;
			this.state.canvasH = canvas.height;
		};

		// Help key handler
		this.helpKeyHandler = (e: KeyboardEvent) => {
			if (e.key === "h" || e.key === "H") {
				this.helpOverlay.toggle();
			}
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
		const rawDt = (now - this.lastTime) / 1000;
		const dt = Math.min(rawDt, 0.05);

		this.lastTime = now;

		if (this.state.phase === "playing") {
			this.physicsSystem.update(this.state, dt);
			this.scoreSystem.update(this.state, dt);
			this.updateParticles(dt);

			// Update best score in localStorage
			if (this.state.score > this.state.bestScore) {
				this.state.bestScore = this.state.score;

				try {
					localStorage.setItem(HS_KEY, String(this.state.bestScore));
				} catch {
					/* noop */
				}
			}
		}

		this.render();
		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private render(): void {
		const ctx = this.ctx;

		ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);

		this.gameRenderer.render(ctx, this.state);
		this.hudRenderer.render(ctx, this.state);
		this.helpOverlay.render(ctx, this.helpData, "Basketball", "#ff7043");
	}

	private shoot(vx: number, vy: number): void {
		const ball = this.state.ball;

		ball.vx = vx;
		ball.vy = vy;
		ball.inFlight = true;
		this.state.madeShot = false;
		this.state.ballPassedRim = false;
	}

	private updateParticles(dt: number): void {
		const particles = this.state.particles;

		for (let i = particles.length - 1; i >= 0; i--) {
			const p = particles[i];

			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.vy += 200 * dt; // Particle gravity
			p.life -= dt;

			if (p.life <= 0) {
				particles.splice(i, 1);
			}
		}
	}

	private reset(): void {
		const s = this.state;

		s.score = 0;
		s.streak = 0;
		s.shotClock = SHOT_CLOCK_DURATION;
		s.particles = [];
		s.showSwish = false;
		s.madeShot = false;
		s.ballPassedRim = false;
		s.phase = "playing";

		this.scoreSystem.resetBallAndHoop(s);
	}
}
