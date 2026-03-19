import {
	type InvadersState,
	type Shield,
	CANVAS_W,
	CANVAS_H,
	PLAYER_W,
	PLAYER_H,
	PLAYER_SPEED,
	PLAYER_SHOOT_COOLDOWN,
	PLAYER_START_LIVES,
	SHIELD_COLS,
	SHIELD_BLOCK_SIZE,
	SHIELD_W,
	SHIELD_H,
	SHIELD_Y,
} from "./types";
import { buildFormation } from "./data/formations";
import { InputSystem } from "./systems/InputSystem";
import { PlayerSystem } from "./systems/PlayerSystem";
import { AlienSystem } from "./systems/AlienSystem";
import { CollisionSystem } from "./systems/CollisionSystem";
import { UFOSystem, resetUfoTimer } from "./systems/UFOSystem";
import { GameRenderer } from "./renderers/GameRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";

const LS_KEY = "space-invaders-highscore";

export class InvadersEngine {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private state!: InvadersState;
	private rafId = 0;
	private lastTime = 0;

	// Systems
	private inputSystem: InputSystem;
	private playerSystem = new PlayerSystem();
	private alienSystem = new AlienSystem();
	private collisionSystem = new CollisionSystem();
	private ufoSystem = new UFOSystem();

	// Renderers
	private gameRenderer = new GameRenderer();
	private hudRenderer = new HUDRenderer();

	constructor(canvas: HTMLCanvasElement, _onExit: () => void) {
		this.canvas = canvas;
		this.canvas.width = CANVAS_W;
		this.canvas.height = CANVAS_H;
		this.ctx = this.canvas.getContext("2d")!;
		this.inputSystem = new InputSystem();
		this.initState(1, 0);
	}

	// ── Public API ──────────────────────────────────────────────────────────

	start(): void {
		this.inputSystem.attach();
		this.lastTime = performance.now();
		this.loop(this.lastTime);
	}

	destroy(): void {
		cancelAnimationFrame(this.rafId);
		this.inputSystem.detach();
		this.saveHighScore();
	}

	// ── State initialisation ────────────────────────────────────────────────

	private initState(level: number, score: number): void {
		const cw = CANVAS_W;
		const ch = CANVAS_H;

		this.state = {
			phase: "playing",
			player: {
				x: cw / 2 - PLAYER_W / 2,
				y: ch - 40,
				w: PLAYER_W,
				h: PLAYER_H,
				speed: PLAYER_SPEED,
				shootCooldown: PLAYER_SHOOT_COOLDOWN,
				cooldownLeft: 0,
				alive: true,
				respawnTimer: 0,
			},
			aliens: buildFormation(level, cw),
			bullets: [],
			shields: this.buildShields(cw),
			ufo: null,
			ufoTimer: resetUfoTimer(),

			alienDir: 1,
			alienSpeedMultiplier: 1,
			alienShootTimer: 1,

			score,
			highScore: this.loadHighScore(),
			lives:
				level === 1 && score === 0
					? PLAYER_START_LIVES
					: (this.state?.lives ?? PLAYER_START_LIVES),
			level,
			levelClearTimer: 0,

			input: { left: false, right: false, shoot: false, pause: false },

			canvasW: cw,
			canvasH: ch,
		};
	}

	private buildShields(canvasW: number): Shield[] {
		const shields: Shield[] = [];
		const gap = canvasW / (SHIELD_COLS + 1);

		// Shield template: an arch shape
		const cols = Math.floor(SHIELD_W / SHIELD_BLOCK_SIZE);
		const rows = Math.floor(SHIELD_H / SHIELD_BLOCK_SIZE);

		for (let i = 0; i < SHIELD_COLS; i++) {
			const grid: boolean[][] = [];

			for (let r = 0; r < rows; r++) {
				grid[r] = [];

				for (let c = 0; c < cols; c++) {
					// Arch: remove the bottom-center to form the notch
					const isNotch =
						r >= rows - 3 &&
						c >= Math.floor(cols / 2) - 2 &&
						c <= Math.floor(cols / 2) + 1;
					// Round top corners
					const isCorner = r === 0 && (c === 0 || c === cols - 1);

					grid[r][c] = !isNotch && !isCorner;
				}
			}

			shields.push({
				x: gap * (i + 1) - SHIELD_W / 2,
				y: SHIELD_Y,
				grid,
				rows,
				cols,
				blockSize: SHIELD_BLOCK_SIZE,
			});
		}

		return shields;
	}

	// ── Game loop ───────────────────────────────────────────────────────────

	private loop = (now: number): void => {
		const dt = Math.min((now - this.lastTime) / 1000, 0.05); // cap to avoid spiral

		this.lastTime = now;

		this.inputSystem.poll(this.state);

		// Handle pause toggle
		if (this.state.input.pause) {
			if (this.state.phase === "playing") {
				this.state.phase = "paused";
			} else if (this.state.phase === "paused") {
				this.state.phase = "playing";
			}
		}

		// Handle restart from game over
		if (this.state.phase === "gameover" && this.state.input.shoot) {
			this.saveHighScore();
			this.initState(1, 0);
		}

		// Handle level clear transition
		if (this.state.phase === "levelclear") {
			this.state.levelClearTimer -= dt;

			if (this.state.levelClearTimer <= 0) {
				const nextLevel = this.state.level + 1;
				const currentScore = this.state.score;
				const currentLives = this.state.lives;

				this.initState(nextLevel, currentScore);
				this.state.lives = currentLives;
			}
		}

		// Update systems
		this.playerSystem.update(this.state, dt);
		this.alienSystem.update(this.state, dt);
		this.ufoSystem.update(this.state, dt);
		this.collisionSystem.update(this.state, dt);

		// Render
		this.gameRenderer.render(this.ctx, this.state);
		this.hudRenderer.render(this.ctx, this.state);

		this.rafId = requestAnimationFrame(this.loop);
	};

	// ── Persistence ─────────────────────────────────────────────────────────

	private loadHighScore(): number {
		try {
			return Number(localStorage.getItem(LS_KEY)) || 0;
		} catch {
			return 0;
		}
	}

	private saveHighScore(): void {
		try {
			localStorage.setItem(LS_KEY, String(this.state.highScore));
		} catch {
			// storage unavailable – ignore
		}
	}
}
