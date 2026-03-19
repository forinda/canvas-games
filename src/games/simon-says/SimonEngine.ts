import type { SimonState } from "./types";
import { GAME_COLOR } from "./types";
import { SequenceSystem } from "./systems/SequenceSystem";
import { InputSystem } from "./systems/InputSystem";
import { GameRenderer } from "./renderers/GameRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";
import { HelpOverlay } from "@shared/HelpOverlay";
import type { GameHelp } from "@shared/GameInterface";

const HELP: GameHelp = {
	goal: "Watch the color sequence, then repeat it from memory. Each round adds one more color.",
	controls: [
		{ key: "Click", action: "Press a colored quadrant" },
		{ key: "Space", action: "Start / Play again" },
		{ key: "R", action: "Restart game" },
		{ key: "H", action: "Toggle help overlay" },
		{ key: "ESC", action: "Exit to menu" },
	],
	tips: [
		"Focus on the pattern, not just individual colors",
		"Speed increases as you progress - stay sharp!",
		"Try to build muscle memory for longer sequences",
	],
};

/**
 * Game loop orchestrator for Simon Says.
 * Owns the state, systems, and renderers.
 */
export class SimonEngine {
	private ctx: CanvasRenderingContext2D;
	private state: SimonState;
	private running: boolean;
	private rafId: number;
	private lastTime: number;

	private sequenceSystem: SequenceSystem;
	private inputSystem: InputSystem;
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

		this.state = {
			sequence: [],
			round: 0,
			currentStep: 0,
			phase: "showing",
			started: false,
			highScore: 0,
			activeColor: null,
			showTimer: 0,
			inGap: false,
			inputFlashTimer: 0,
			canvasW: canvas.width,
			canvasH: canvas.height,
		};

		this.sequenceSystem = new SequenceSystem();
		this.gameRenderer = new GameRenderer();
		this.hudRenderer = new HUDRenderer();
		this.helpOverlay = new HelpOverlay();

		this.sequenceSystem.loadHighScore(this.state);

		this.inputSystem = new InputSystem(
			this.state,
			canvas,
			this.sequenceSystem,
			onExit,
			() => this.restart(),
			() => this.helpOverlay.toggle(),
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
		const dt = now - this.lastTime;

		this.lastTime = now;

		if (this.state.started) {
			this.sequenceSystem.update(this.state, dt);
			this.updateInputFlash(dt);
		}

		this.render();
		this.rafId = requestAnimationFrame(() => this.loop());
	}

	/** Fade out the input flash after the player clicks a quadrant */
	private updateInputFlash(dt: number): void {
		if (this.state.inputFlashTimer > 0) {
			this.state.inputFlashTimer -= dt;

			if (this.state.inputFlashTimer <= 0) {
				this.state.inputFlashTimer = 0;

				// Only clear activeColor if we're in input phase (showing phase manages its own)
				if (this.state.phase === "input") {
					this.state.activeColor = null;
				}
			}
		}
	}

	private render(): void {
		const { ctx, state } = this;
		const W = state.canvasW;
		const H = state.canvasH;

		// Clear
		ctx.fillStyle = "#0f0f1a";
		ctx.fillRect(0, 0, W, H);

		this.gameRenderer.render(ctx, state);
		this.hudRenderer.render(ctx, state);
		this.helpOverlay.render(ctx, HELP, "Simon Says", GAME_COLOR);
	}

	private restart(): void {
		this.sequenceSystem.loadHighScore(this.state);
		this.sequenceSystem.startNewGame(this.state);
	}
}
