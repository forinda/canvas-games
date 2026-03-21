import type { ShooterState } from "./types";
import { PLAYER_RADIUS, PLAYER_MAX_HP, HS_KEY } from "./types";
import type { GameHelp } from "@core/GameInterface";
import { InputSystem } from "./systems/InputSystem";
import { PlayerSystem } from "./systems/PlayerSystem";
import { EnemySystem } from "./systems/EnemySystem";
import { BulletSystem } from "./systems/BulletSystem";
import { WaveSystem } from "./systems/WaveSystem";
import { GameRenderer } from "./renderers/GameRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";

export class ShooterEngine {
	private ctx: CanvasRenderingContext2D;
	private state: ShooterState;
	private running = false;
	private rafId = 0;
	private lastTime = 0;

	private inputSystem: InputSystem;
	private playerSystem: PlayerSystem;
	private enemySystem: EnemySystem;
	private bulletSystem: BulletSystem;
	private waveSystem: WaveSystem;
	private gameRenderer: GameRenderer;
	private hudRenderer: HUDRenderer;
	private resizeHandler: () => void;

	constructor(canvas: HTMLCanvasElement, onExit: () => void, help: GameHelp) {
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
		this.playerSystem = new PlayerSystem();
		this.enemySystem = new EnemySystem();
		this.bulletSystem = new BulletSystem();
		this.waveSystem = new WaveSystem(this.enemySystem);
		this.gameRenderer = new GameRenderer();
		this.hudRenderer = new HUDRenderer(help);

		this.inputSystem = new InputSystem(
			this.state,
			canvas,
			onExit,
			() => this.restart(),
			() => this.hudRenderer.toggleHelp(),
		);

		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			this.state.canvasW = canvas.width;
			this.state.canvasH = canvas.height;
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
		const dt = Math.min((now - this.lastTime) / 1000, 0.05); // cap at 50ms

		this.lastTime = now;

		if (
			this.state.started &&
			!this.state.paused &&
			!this.state.gameOver &&
			!this.hudRenderer.helpVisible
		) {
			this.playerSystem.update(this.state, dt);
			this.enemySystem.update(this.state, dt);
			this.bulletSystem.update(this.state, dt);
			this.waveSystem.update(this.state, dt);
		}

		this.gameRenderer.render(this.ctx, this.state);
		this.hudRenderer.render(this.ctx, this.state);

		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private restart(): void {
		// Save high score
		if (this.state.score > this.state.highScore) {
			this.state.highScore = this.state.score;

			try {
				localStorage.setItem(HS_KEY, String(this.state.highScore));
			} catch {
				/* noop */
			}
		}

		const hs = this.state.highScore;
		const w = this.state.canvasW;
		const h = this.state.canvasH;

		Object.assign(this.state, this.createInitialState(w, h, hs));
		this.state.started = true;
	}

	private createInitialState(
		w: number,
		h: number,
		highScore: number,
	): ShooterState {
		return {
			canvasW: w,
			canvasH: h,
			player: {
				pos: { x: w / 2, y: h / 2 },
				hp: PLAYER_MAX_HP,
				maxHp: PLAYER_MAX_HP,
				radius: PLAYER_RADIUS,
				shootCooldown: 0,
				invincibleTimer: 0,
			},
			bullets: [],
			enemies: [],
			particles: [],
			waveData: {
				wave: 0,
				enemiesRemaining: 0,
				spawnTimer: 0,
				spawnInterval: 1,
				betweenWaveTimer: 1.5,
				active: false,
			},
			score: 0,
			highScore,
			kills: 0,
			gameOver: false,
			paused: false,
			started: false,
			keys: new Set(),
			mouse: { x: w / 2, y: h / 2 },
			mouseDown: false,
		};
	}
}
