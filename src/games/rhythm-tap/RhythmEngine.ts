import type { RhythmState } from "./types";
import { ROUND_DURATION, SPAWN_INTERVAL_MAX, HS_KEY } from "./types";
import { InputSystem } from "./systems/InputSystem";
import { CircleSystem } from "./systems/CircleSystem";
import { ComboSystem } from "./systems/ComboSystem";
import { GameRenderer } from "./renderers/GameRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";
import { HelpOverlay } from "@shared/HelpOverlay";
import type { GameHelp } from "@shared/GameInterface";

const HELP: GameHelp = {
	goal: "Tap circles when the shrinking ring aligns with the target for maximum points.",
	controls: [
		{ key: "Click / Tap", action: "Hit a circle" },
		{ key: "P", action: "Pause game" },
		{ key: "H", action: "Toggle help overlay" },
		{ key: "Space", action: "Restart after game over" },
		{ key: "ESC", action: "Exit to menu" },
	],
	tips: [
		"Click when the outer ring meets the inner circle for Perfect",
		"Build combos for score multipliers (5x=2x, 10x=3x, 20x=4x, 30x=8x)",
		"Circles spawn faster as the round progresses",
		"A 60-second round — aim for the highest score!",
	],
};

export class RhythmEngine {
	private ctx: CanvasRenderingContext2D;
	private state: RhythmState;
	private running: boolean;
	private rafId: number;
	private lastTime: number;

	private inputSystem: InputSystem;
	private circleSystem: CircleSystem;
	private comboSystem: ComboSystem;
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

		let hs = 0;

		try {
			hs = parseInt(localStorage.getItem(HS_KEY) ?? "0", 10) || 0;
		} catch {
			/* noop */
		}

		this.state = this.createInitialState(canvas.width, canvas.height, hs);

		// Systems
		this.comboSystem = new ComboSystem();
		this.circleSystem = new CircleSystem(this.comboSystem);
		this.gameRenderer = new GameRenderer();
		this.hudRenderer = new HUDRenderer();
		this.helpOverlay = new HelpOverlay();

		this.inputSystem = new InputSystem(
			this.state,
			canvas,
			onExit,
			() => this.restart(),
			() => this.helpOverlay.toggle(),
		);

		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			this.state.width = canvas.width;
			this.state.height = canvas.height;
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
		const dt = Math.min(now - this.lastTime, 50);

		this.lastTime = now;

		if (this.state.started && !this.state.paused && !this.state.gameOver) {
			this.circleSystem.update(this.state, dt);

			// Save high score
			if (this.state.score > this.state.highScore) {
				this.state.highScore = this.state.score;

				try {
					localStorage.setItem(HS_KEY, String(this.state.highScore));
				} catch {
					/* noop */
				}
			}
		}

		this.render();
		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private render(): void {
		this.gameRenderer.render(this.ctx, this.state);
		this.hudRenderer.render(this.ctx, this.state);
		this.helpOverlay.render(this.ctx, HELP, "Rhythm Tap", "#e040fb");
	}

	private restart(): void {
		const hs = this.state.highScore;
		const w = this.state.width;
		const h = this.state.height;

		Object.assign(this.state, this.createInitialState(w, h, hs));
		this.state.started = true;
	}

	private createInitialState(
		width: number,
		height: number,
		highScore: number,
	): RhythmState {
		return {
			circles: [],
			hitEffects: [],
			missEffects: [],
			score: 0,
			highScore,
			combo: 0,
			maxCombo: 0,
			multiplier: 1,
			totalHits: 0,
			perfectHits: 0,
			goodHits: 0,
			okHits: 0,
			totalMisses: 0,
			timeRemaining: ROUND_DURATION,
			gameOver: false,
			started: false,
			paused: false,
			nextId: 0,
			spawnTimer: SPAWN_INTERVAL_MAX,
			width,
			height,
			pendingClick: null,
		};
	}
}
